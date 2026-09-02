import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/results/:id - Detailed Result & Question Analysis
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const resultId = Number(req.params.id);
    const result = db.results.find(r => r.result_id === resultId);

    if (!result) {
      return res.status(404).json({ error: 'Result record not found.' });
    }

    const attempt = db.attempts.find(a => a.attempt_id === result.attempt_id);
    if (!attempt) {
      return res.status(404).json({ error: 'Associated exam attempt not found.' });
    }

    const isTeacher = req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN';
    const isOwner = attempt.student_id === req.user?.student_id;

    if (!isTeacher && !isOwner) {
      return res.status(403).json({ error: 'Access denied to this result.' });
    }

    const exam = db.exams.find(e => e.exam_id === attempt.exam_id);
    const student = db.students.find(s => s.student_id === attempt.student_id);

    if (!exam || !student) {
      return res.status(404).json({ error: 'Exam or student profile not found.' });
    }

    // Build Question-by-Question Analysis
    const questions = db.questions
      .filter(q => q.exam_id === exam.exam_id)
      .sort((a, b) => a.order_num - b.order_num);

    const answers = db.answers.filter(a => a.attempt_id === attempt.attempt_id);

    const analysis = questions.map(q => {
      const qOptions = db.options.filter(o => o.question_id === q.question_id);
      const studentAnswer = answers.find(a => a.question_id === q.question_id);
      const correctOption = qOptions.find(o => o.is_correct);
      const selectedOption = studentAnswer && studentAnswer.selected_option_id 
        ? qOptions.find(o => o.option_id === studentAnswer.selected_option_id)
        : null;

      const isCorrect = Boolean(selectedOption && correctOption && selectedOption.option_id === correctOption.option_id);
      const marksObtained = isCorrect ? q.marks : 0;

      return {
        question_id: q.question_id,
        question_text: q.question_text,
        marks: q.marks,
        selected_option_id: selectedOption ? selectedOption.option_id : null,
        selected_option_text: selectedOption ? selectedOption.option_text : null,
        correct_option_id: correctOption ? correctOption.option_id : 0,
        correct_option_text: correctOption ? correctOption.option_text : 'N/A',
        is_correct: isCorrect,
        marks_obtained: marksObtained,
        is_marked_for_review: studentAnswer ? studentAnswer.is_marked_for_review : false,
        options: qOptions.map(o => ({
          option_id: o.option_id,
          question_id: o.question_id,
          option_text: o.option_text,
          is_correct: o.is_correct
        }))
      };
    });

    return res.json({
      result: {
        ...result,
        exam_id: exam.exam_id,
        exam_title: exam.title,
        total_marks: exam.total_marks,
        passing_percentage: exam.passing_percentage,
        student_id: student.student_id,
        student_name: student.name,
        student_roll_no: student.roll_no
      },
      attempt,
      exam,
      student,
      analysis
    });
  } catch (err: any) {
    console.error('Fetch result analysis error:', err);
    return res.status(500).json({ error: 'Failed to retrieve result analysis.' });
  }
});

// GET /api/students/:studentId/results - List results for a student
router.get('/students/:studentId/results', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const studentId = Number(req.params.studentId);
    const isTeacher = req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN';
    const isOwner = req.user?.student_id === studentId;

    if (!isTeacher && !isOwner) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const studentAttempts = db.attempts.filter(a => a.student_id === studentId);
    const studentAttemptIds = studentAttempts.map(a => a.attempt_id);
    const studentResults = db.results.filter(r => studentAttemptIds.includes(r.attempt_id));

    const enriched = studentResults.map(r => {
      const attempt = db.attempts.find(a => a.attempt_id === r.attempt_id);
      const exam = attempt ? db.exams.find(e => e.exam_id === attempt.exam_id) : null;
      return {
        ...r,
        exam_id: exam?.exam_id,
        exam_title: exam?.title || 'Unknown Exam',
        total_marks: exam?.total_marks || 0,
        passing_percentage: exam?.passing_percentage || 40,
        attempt_date: attempt?.start_time
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.json(enriched);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch student results.' });
  }
});

// GET /api/exams/:examId/results - List results for an exam (Teacher only)
router.get('/exams/:examId/results', authenticateToken, requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const examId = Number(req.params.examId);
    const exam = db.exams.find(e => e.exam_id === examId);

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    const examAttempts = db.attempts.filter(a => a.exam_id === examId);
    const results = examAttempts.map(att => {
      const student = db.students.find(s => s.student_id === att.student_id);
      const resRecord = db.results.find(r => r.attempt_id === att.attempt_id);
      return {
        attempt_id: att.attempt_id,
        student_id: att.student_id,
        student_name: student?.name || 'Unknown',
        student_roll_no: student?.roll_no || 'N/A',
        student_email: student?.email || 'N/A',
        start_time: att.start_time,
        end_time: att.end_time,
        status: att.status,
        result: resRecord || null
      };
    });

    return res.json({
      exam,
      total_attempts: examAttempts.length,
      attempts: results
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch exam results.' });
  }
});

export default router;
