import { Router, Response } from 'express';
import { db, QuestionRow, OptionRow } from '../db.js';
import { postgresAdapter } from '../postgresAdapter.js';
import { postgresService } from '../postgresService.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/exams/:examId/questions
router.get('/exams/:examId/questions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const examId = Number(req.params.examId);
    const isTeacher = req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN';

    if (postgresAdapter.isConnected) {
      const questions = await postgresService.getQuestionsForExam(examId, isTeacher);
      return res.json(questions);
    }

    const exam = db.exams.find(e => e.exam_id === examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const questions = db.questions
      .filter(q => q.exam_id === examId)
      .sort((a, b) => a.order_num - b.order_num)
      .map(q => {
        const options = db.options.filter(o => o.question_id === q.question_id);
        return {
          ...q,
          options: options.map(o => ({
            option_id: o.option_id,
            question_id: o.question_id,
            option_text: o.option_text,
            ...(isTeacher ? { is_correct: o.is_correct } : {})
          }))
        };
      });

    return res.json(questions);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch questions.' });
  }
});

// POST /api/exams/:examId/questions - Add single question with options (Teacher only)
router.post('/exams/:examId/questions', authenticateToken, requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const examId = Number(req.params.examId);
    const { question_text, marks = 1, options } = req.body;

    if (!question_text || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question text and at least 2 options are required.' });
    }

    const hasCorrect = options.some(o => o.is_correct === true);
    if (!hasCorrect) {
      return res.status(400).json({ error: 'Please mark exactly one option as the correct answer.' });
    }

    if (postgresAdapter.isConnected) {
      const createdQuestion = await postgresService.addQuestion(examId, {
        question_text,
        marks: Number(marks),
        options
      });
      return res.status(201).json({
        message: 'Question added successfully',
        question: createdQuestion
      });
    }

    const exam = db.exams.find(e => e.exam_id === examId);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const now = new Date().toISOString();
    const existingQuestions = db.questions.filter(q => q.exam_id === examId);
    const qId = db.nextId('question');

    const newQ: QuestionRow = {
      question_id: qId,
      exam_id: examId,
      question_text: question_text.trim(),
      marks: Number(marks) || 1,
      order_num: existingQuestions.length + 1,
      created_at: now
    };

    db.questions.push(newQ);

    const createdOptions: OptionRow[] = [];
    for (const opt of options) {
      const optId = db.nextId('option');
      const newOpt: OptionRow = {
        option_id: optId,
        question_id: qId,
        option_text: opt.option_text ? opt.option_text.trim() : '',
        is_correct: Boolean(opt.is_correct),
        created_at: now
      };
      db.options.push(newOpt);
      createdOptions.push(newOpt);
    }

    // Recalculate exam total marks
    const allExamQuestions = db.questions.filter(q => q.exam_id === examId);
    exam.total_marks = allExamQuestions.reduce((acc, curr) => acc + curr.marks, 0);
    exam.updated_at = now;

    await db.save();

    return res.status(201).json({
      message: 'Question added successfully',
      question: {
        ...newQ,
        options: createdOptions
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add question.' });
  }
});

// PUT /api/questions/:id - Edit question (Teacher only)
router.put('/questions/:id', authenticateToken, requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const qId = Number(req.params.id);
    const { question_text, marks, options } = req.body;

    if (postgresAdapter.isConnected) {
      const updatedQuestion = await postgresService.updateQuestion(qId, {
        question_text,
        marks: marks !== undefined ? Number(marks) : undefined,
        options
      });
      return res.json({
        message: 'Question updated successfully',
        question: updatedQuestion
      });
    }

    const question = db.questions.find(q => q.question_id === qId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    if (question_text) question.question_text = question_text.trim();
    if (marks) question.marks = Number(marks);

    if (Array.isArray(options) && options.length >= 2) {
      // Remove old options and insert new
      db.state.option = db.options.filter(o => o.question_id !== qId);
      const now = new Date().toISOString();
      for (const opt of options) {
        const optId = opt.option_id || db.nextId('option');
        db.options.push({
          option_id: optId,
          question_id: qId,
          option_text: opt.option_text ? opt.option_text.trim() : '',
          is_correct: Boolean(opt.is_correct),
          created_at: now
        });
      }
    }

    // Recalculate exam total marks
    const exam = db.exams.find(e => e.exam_id === question.exam_id);
    if (exam) {
      const allExamQuestions = db.questions.filter(q => q.exam_id === exam.exam_id);
      exam.total_marks = allExamQuestions.reduce((acc, curr) => acc + curr.marks, 0);
      exam.updated_at = new Date().toISOString();
    }

    await db.save();

    const updatedOptions = db.options.filter(o => o.question_id === qId);
    return res.json({
      message: 'Question updated successfully',
      question: {
        ...question,
        options: updatedOptions
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update question.' });
  }
});

// DELETE /api/questions/:id - Delete question (Teacher only)
router.delete('/questions/:id', authenticateToken, requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const qId = Number(req.params.id);

    if (postgresAdapter.isConnected) {
      await postgresService.deleteQuestion(qId);
      return res.json({ message: 'Question deleted successfully.' });
    }

    const qIndex = db.questions.findIndex(q => q.question_id === qId);
    if (qIndex === -1) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    const examId = db.questions[qIndex].exam_id;

    // Delete options & answers for this question
    db.state.option = db.options.filter(o => o.question_id !== qId);
    db.state.answer = db.answers.filter(a => a.question_id !== qId);
    db.questions.splice(qIndex, 1);

    // Recalculate exam total marks
    const exam = db.exams.find(e => e.exam_id === examId);
    if (exam) {
      const allExamQuestions = db.questions.filter(q => q.exam_id === exam.exam_id);
      exam.total_marks = allExamQuestions.reduce((acc, curr) => acc + curr.marks, 0);
      exam.updated_at = new Date().toISOString();
    }

    await db.save();

    return res.json({ message: 'Question deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete question.' });
  }
});

export default router;

