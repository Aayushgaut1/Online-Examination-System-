import { Router, Response } from 'express';
import { db, ExamRow, QuestionRow, OptionRow } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/exams - List exams (with student attempt status if logged in as student)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    let user: any = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'nexusexam_jwt_secret_key_2026_super_secure';
        user = jwt.default.verify(token, JWT_SECRET);
      } catch (e) {
        // guest
      }
    }

    const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';
    const studentId = user?.student_id;

    // Filter exams: Teachers see all, students/guests see only published
    const examsList = db.exams.filter(e => isTeacher || e.is_published);

    const enrichedExams = examsList.map(e => {
      const qList = db.questions.filter(q => q.exam_id === e.exam_id);
      const creator = db.users.find(u => u.user_id === e.created_by);

      let userAttempt = null;
      let userResult = null;

      if (studentId) {
        const studentAttempts = db.attempts.filter(a => a.exam_id === e.exam_id && a.student_id === studentId);
        // Get the latest attempt
        if (studentAttempts.length > 0) {
          userAttempt = studentAttempts[studentAttempts.length - 1];
          userResult = db.results.find(r => r.attempt_id === userAttempt.attempt_id) || null;
        }
      }

      return {
        ...e,
        question_count: qList.length,
        created_by_name: creator ? creator.name : 'Faculty Member',
        user_attempt_status: userAttempt ? userAttempt.status : null,
        user_attempt_id: userAttempt ? userAttempt.attempt_id : null,
        user_last_score: userResult ? userResult.score : null,
        user_last_percentage: userResult ? userResult.percentage : null,
        user_last_result_id: userResult ? userResult.result_id : null
      };
    });

    return res.json(enrichedExams);
  } catch (err: any) {
    console.error('Fetch exams error:', err);
    return res.status(500).json({ error: 'Failed to retrieve exams.' });
  }
});

// GET /api/exams/:id - Single exam details with questions
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const examId = Number(req.params.id);
    const exam = db.exams.find(e => e.exam_id === examId);

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const authHeader = req.headers['authorization'];
    let user: any = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = await import('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'nexusexam_jwt_secret_key_2026_super_secure';
        user = jwt.default.verify(token, JWT_SECRET);
      } catch (e) {
        // guest
      }
    }

    const isTeacher = user?.role === 'TEACHER' || user?.role === 'ADMIN';

    // Questions and options
    const questions = db.questions
      .filter(q => q.exam_id === examId)
      .sort((a, b) => a.order_num - b.order_num)
      .map(q => {
        const rawOptions = db.options.filter(o => o.question_id === q.question_id);
        const safeOptions = rawOptions.map(o => ({
          option_id: o.option_id,
          question_id: o.question_id,
          option_text: o.option_text,
          // Hide is_correct unless teacher
          ...(isTeacher ? { is_correct: o.is_correct } : {})
        }));

        return {
          ...q,
          options: safeOptions
        };
      });

    const creator = db.users.find(u => u.user_id === exam.created_by);

    return res.json({
      ...exam,
      question_count: questions.length,
      created_by_name: creator ? creator.name : 'Faculty Member',
      questions
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve exam details.' });
  }
});

// POST /api/exams - Create new exam (Teacher only)
router.post('/', authenticateToken, requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, duration_minutes, total_marks, passing_percentage = 40, is_published = true, questions } = req.body;

    if (!title || !duration_minutes) {
      return res.status(400).json({ error: 'Exam title and duration in minutes are required.' });
    }

    const now = new Date().toISOString();
    const examId = db.nextId('exam');

    let calculatedTotalMarks = 0;

    // Create exam entry
    const newExam: ExamRow = {
      exam_id: examId,
      title: title.trim(),
      description: (description || '').trim(),
      duration_minutes: Number(duration_minutes),
      total_marks: Number(total_marks) || 100,
      passing_percentage: Number(passing_percentage) || 40,
      is_published: Boolean(is_published),
      created_by: req.user!.user_id,
      created_at: now,
      updated_at: now
    };

    // If questions were provided in the payload (multi-step creation)
    if (Array.isArray(questions) && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const qData = questions[i];
        const qId = db.nextId('question');
        const qMarks = Number(qData.marks) || 1;
        calculatedTotalMarks += qMarks;

        const newQ: QuestionRow = {
          question_id: qId,
          exam_id: examId,
          question_text: qData.question_text || `Question ${i + 1}`,
          marks: qMarks,
          order_num: i + 1,
          created_at: now
        };
        db.questions.push(newQ);

        if (Array.isArray(qData.options)) {
          for (const optData of qData.options) {
            const optId = db.nextId('option');
            const newOpt: OptionRow = {
              option_id: optId,
              question_id: qId,
              option_text: optData.option_text || '',
              is_correct: Boolean(optData.is_correct),
              created_at: now
            };
            db.options.push(newOpt);
          }
        }
      }

      if (calculatedTotalMarks > 0) {
        newExam.total_marks = calculatedTotalMarks;
      }
    }

    db.exams.push(newExam);
    await db.save();

    return res.status(201).json({
      message: 'Exam created successfully',
      exam: newExam
    });
  } catch (err: any) {
    console.error('Create exam error:', err);
    return res.status(500).json({ error: 'Failed to create exam.' });
  }
});

// PUT /api/exams/:id - Update exam (Teacher only)
router.put('/:id', authenticateToken, requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const examId = Number(req.params.id);
    const exam = db.exams.find(e => e.exam_id === examId);

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    // Check authorization: creator or admin
    if (exam.created_by !== req.user!.user_id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'You are not authorized to edit this exam.' });
    }

    const { title, description, duration_minutes, total_marks, passing_percentage, is_published } = req.body;

    if (title) exam.title = title.trim();
    if (description !== undefined) exam.description = description.trim();
    if (duration_minutes) exam.duration_minutes = Number(duration_minutes);
    if (total_marks) exam.total_marks = Number(total_marks);
    if (passing_percentage) exam.passing_percentage = Number(passing_percentage);
    if (is_published !== undefined) exam.is_published = Boolean(is_published);
    exam.updated_at = new Date().toISOString();

    await db.save();

    return res.json({ message: 'Exam updated successfully', exam });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update exam.' });
  }
});

// PATCH /api/exams/:id/publish - Toggle publish status
router.patch('/:id/publish', authenticateToken, requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const examId = Number(req.params.id);
    const exam = db.exams.find(e => e.exam_id === examId);

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    exam.is_published = !exam.is_published;
    exam.updated_at = new Date().toISOString();
    await db.save();

    return res.json({
      message: `Exam ${exam.is_published ? 'published' : 'unpublished'} successfully`,
      is_published: exam.is_published
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update exam publish state.' });
  }
});

// DELETE /api/exams/:id - Delete exam & cascade questions, options, attempts
router.delete('/:id', authenticateToken, requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const examId = Number(req.params.id);
    const examIndex = db.exams.findIndex(e => e.exam_id === examId);

    if (examIndex === -1) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    // Cascade delete questions & options
    const questionIds = db.questions.filter(q => q.exam_id === examId).map(q => q.question_id);
    
    // Remove options
    const filteredOptions = db.options.filter(o => !questionIds.includes(o.question_id));
    // Remove questions
    const filteredQuestions = db.questions.filter(q => q.exam_id !== examId);
    // Remove attempts & answers & results
    const attemptIds = db.attempts.filter(a => a.exam_id === examId).map(a => a.attempt_id);
    const filteredAnswers = db.answers.filter(a => !attemptIds.includes(a.attempt_id));
    const filteredResults = db.results.filter(r => !attemptIds.includes(r.attempt_id));
    const filteredAttempts = db.attempts.filter(a => a.exam_id !== examId);

    db.state.option = filteredOptions;
    db.state.question = filteredQuestions;
    db.state.answer = filteredAnswers;
    db.state.result = filteredResults;
    db.state.attempt = filteredAttempts;
    db.exams.splice(examIndex, 1);

    await db.save();

    return res.json({ message: 'Exam and all associated questions & attempts deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete exam.' });
  }
});

export default router;
