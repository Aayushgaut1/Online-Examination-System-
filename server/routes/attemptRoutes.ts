import { Router, Response } from 'express';
import { db, AttemptRow, AnswerRow, ResultRow } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';

const router = Router();

// Helper: Calculate remaining time in seconds
function calculateRemainingSeconds(attempt: AttemptRow, durationMinutes: number): number {
  const startTime = new Date(attempt.start_time).getTime();
  const totalAllowedMs = durationMinutes * 60 * 1000;
  const elapsedMs = Date.now() - startTime;
  const remainingMs = totalAllowedMs - elapsedMs;
  return Math.max(0, Math.floor(remainingMs / 1000));
}

// POST /api/exams/:examId/attempts - Start or resume an exam attempt
router.post('/exams/:examId/attempts', authenticateToken, requireRole(['STUDENT']), async (req: AuthRequest, res: Response) => {
  try {
    const examId = Number(req.params.examId);
    const studentId = req.user!.student_id;

    if (!studentId) {
      return res.status(400).json({ error: 'Student profile not linked to user account.' });
    }

    const exam = db.exams.find(e => e.exam_id === examId);
    if (!exam || !exam.is_published) {
      return res.status(404).json({ error: 'Exam not found or is currently unpublished.' });
    }

    // Check if student has an existing IN_PROGRESS attempt
    const existingAttempt = db.attempts.find(
      a => a.exam_id === examId && a.student_id === studentId && a.status === 'IN_PROGRESS'
    );

    if (existingAttempt) {
      const remainingSeconds = calculateRemainingSeconds(existingAttempt, exam.duration_minutes);
      // If time has completely expired (> 60s past), automatically finalize it
      if (remainingSeconds <= 0) {
        existingAttempt.status = 'EXPIRED';
        existingAttempt.end_time = new Date().toISOString();
        await db.save();
      } else {
        // Resume existing active attempt
        return res.json({
          message: 'Resuming active exam attempt',
          attempt: existingAttempt,
          remaining_seconds: remainingSeconds,
          is_resumed: true
        });
      }
    }

    // Create a brand new attempt
    const now = new Date().toISOString();
    const newAttempt: AttemptRow = {
      attempt_id: db.nextId('attempt'),
      exam_id: examId,
      student_id: studentId,
      start_time: now,
      end_time: null,
      status: 'IN_PROGRESS',
      created_at: now
    };

    db.attempts.push(newAttempt);
    await db.save();

    return res.status(201).json({
      message: 'Exam attempt started',
      attempt: newAttempt,
      remaining_seconds: exam.duration_minutes * 60,
      is_resumed: false
    });
  } catch (err: any) {
    console.error('Start attempt error:', err);
    return res.status(500).json({ error: 'Failed to initiate exam attempt.' });
  }
});

// GET /api/attempts/:id - Get attempt state, questions, saved answers, remaining timer
router.get('/attempts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = Number(req.params.id);
    const attempt = db.attempts.find(a => a.attempt_id === attemptId);

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found.' });
    }

    const isTeacher = req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN';
    const isOwner = attempt.student_id === req.user?.student_id;

    if (!isTeacher && !isOwner) {
      return res.status(403).json({ error: 'Access denied to this exam attempt.' });
    }

    const exam = db.exams.find(e => e.exam_id === attempt.exam_id);
    if (!exam) {
      return res.status(404).json({ error: 'Associated exam not found.' });
    }

    const student = db.students.find(s => s.student_id === attempt.student_id);

    // Calculate server remaining time
    let remainingSeconds = 0;
    if (attempt.status === 'IN_PROGRESS') {
      remainingSeconds = calculateRemainingSeconds(attempt, exam.duration_minutes);
      if (remainingSeconds <= 0) {
        // Auto-finalize if time expired
        attempt.status = 'EXPIRED';
        attempt.end_time = new Date().toISOString();
        await db.save();
      }
    }

    // Get questions & options (hide is_correct if attempt is in progress or user is student)
    const questions = db.questions
      .filter(q => q.exam_id === exam.exam_id)
      .sort((a, b) => a.order_num - b.order_num)
      .map(q => {
        const options = db.options.filter(o => o.question_id === q.question_id);
        return {
          question_id: q.question_id,
          exam_id: q.exam_id,
          question_text: q.question_text,
          marks: q.marks,
          order_num: q.order_num,
          options: options.map(o => ({
            option_id: o.option_id,
            question_id: o.question_id,
            option_text: o.option_text,
            ...(attempt.status === 'SUBMITTED' || isTeacher ? { is_correct: o.is_correct } : {})
          }))
        };
      });

    // Get answers for this attempt
    const answers = db.answers.filter(a => a.attempt_id === attemptId);

    // Get result if already submitted
    const result = db.results.find(r => r.attempt_id === attemptId) || null;

    return res.json({
      attempt,
      exam,
      student,
      questions,
      answers,
      result,
      remaining_seconds: remainingSeconds
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve attempt details.' });
  }
});

// PUT /api/attempts/:id/answers - Save/Update answers in real-time
router.put('/attempts/:id/answers', authenticateToken, requireRole(['STUDENT']), async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = Number(req.params.id);
    const attempt = db.attempts.find(a => a.attempt_id === attemptId);

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found.' });
    }

    if (attempt.student_id !== req.user?.student_id) {
      return res.status(403).json({ error: 'Unauthorized attempt access.' });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Cannot save answers for an attempt that is already completed or expired.' });
    }

    const exam = db.exams.find(e => e.exam_id === attempt.exam_id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    // Verify time has not expired
    const remainingSeconds = calculateRemainingSeconds(attempt, exam.duration_minutes);
    if (remainingSeconds <= 0) {
      attempt.status = 'EXPIRED';
      attempt.end_time = new Date().toISOString();
      await db.save();
      return res.status(400).json({ error: 'Exam duration has expired. Answers can no longer be modified.' });
    }

    const { question_id, selected_option_id, is_marked_for_review } = req.body;

    if (!question_id) {
      return res.status(400).json({ error: 'question_id is required.' });
    }

    const qId = Number(question_id);
    const now = new Date().toISOString();

    // Check if answer already exists
    let answer = db.answers.find(a => a.attempt_id === attemptId && a.question_id === qId);

    if (answer) {
      answer.selected_option_id = selected_option_id !== undefined ? (selected_option_id ? Number(selected_option_id) : null) : answer.selected_option_id;
      if (is_marked_for_review !== undefined) {
        answer.is_marked_for_review = Boolean(is_marked_for_review);
      }
      answer.updated_at = now;
    } else {
      answer = {
        answer_id: db.nextId('answer'),
        attempt_id: attemptId,
        question_id: qId,
        selected_option_id: selected_option_id ? Number(selected_option_id) : null,
        is_marked_for_review: Boolean(is_marked_for_review),
        updated_at: now
      };
      db.answers.push(answer);
    }

    await db.save();

    return res.json({
      message: 'Answer recorded successfully',
      answer
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to record answer.' });
  }
});

// POST /api/attempts/:id/submit - Finalize attempt with automatic grading
router.post('/attempts/:id/submit', authenticateToken, requireRole(['STUDENT']), async (req: AuthRequest, res: Response) => {
  try {
    const attemptId = Number(req.params.id);
    const attempt = db.attempts.find(a => a.attempt_id === attemptId);

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found.' });
    }

    if (attempt.student_id !== req.user?.student_id) {
      return res.status(403).json({ error: 'Unauthorized attempt access.' });
    }

    // If already submitted and result exists, return existing result
    if (attempt.status === 'SUBMITTED') {
      const existingResult = db.results.find(r => r.attempt_id === attemptId);
      if (existingResult) {
        return res.json({
          message: 'Exam was already submitted',
          result: existingResult
        });
      }
    }

    const exam = db.exams.find(e => e.exam_id === attempt.exam_id);
    if (!exam) {
      return res.status(404).json({ error: 'Associated exam not found.' });
    }

    const now = new Date().toISOString();
    attempt.end_time = now;
    attempt.status = 'SUBMITTED';

    // If answers were passed in final submit payload, save any unsaved answers
    const { answers: finalAnswers } = req.body;
    if (Array.isArray(finalAnswers)) {
      for (const item of finalAnswers) {
        if (!item.question_id) continue;
        const qId = Number(item.question_id);
        const optId = item.selected_option_id ? Number(item.selected_option_id) : null;
        let ans = db.answers.find(a => a.attempt_id === attemptId && a.question_id === qId);
        if (ans) {
          ans.selected_option_id = optId;
          ans.updated_at = now;
        } else {
          db.answers.push({
            answer_id: db.nextId('answer'),
            attempt_id: attemptId,
            question_id: qId,
            selected_option_id: optId,
            is_marked_for_review: false,
            updated_at: now
          });
        }
      }
    }

    // -------------------------------------------------------------
    // AUTOMATIC GRADING LOGIC (Pure Database / Server-authoritative)
    // -------------------------------------------------------------
    const examQuestions = db.questions.filter(q => q.exam_id === exam.exam_id);
    const attemptAnswers = db.answers.filter(a => a.attempt_id === attemptId);

    let totalScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    for (const question of examQuestions) {
      const studentAnswer = attemptAnswers.find(a => a.question_id === question.question_id);
      
      if (!studentAnswer || studentAnswer.selected_option_id === null) {
        unansweredCount++;
        continue;
      }

      // Find the correct option for this question
      const correctOption = db.options.find(
        o => o.question_id === question.question_id && o.is_correct === true
      );

      if (correctOption && studentAnswer.selected_option_id === correctOption.option_id) {
        totalScore += question.marks;
        correctCount++;
      } else {
        incorrectCount++;
      }
    }

    const totalExamMarks = exam.total_marks > 0 ? exam.total_marks : 1;
    const percentage = Number(((totalScore / totalExamMarks) * 100).toFixed(2));
    const passStatus: 'PASSED' | 'FAILED' = percentage >= exam.passing_percentage ? 'PASSED' : 'FAILED';

    const startTimeMs = new Date(attempt.start_time).getTime();
    const endTimeMs = new Date(now).getTime();
    const timeTakenSeconds = Math.max(1, Math.round((endTimeMs - startTimeMs) / 1000));

    // Remove any older duplicate result for this attempt if exists
    db.state.result = db.results.filter(r => r.attempt_id !== attemptId);

    const newResult: ResultRow = {
      result_id: db.nextId('result'),
      attempt_id: attemptId,
      score: totalScore,
      percentage: percentage,
      pass_status: passStatus,
      total_questions: examQuestions.length,
      correct_answers: correctCount,
      incorrect_answers: incorrectCount,
      unanswered_questions: unansweredCount,
      time_taken_seconds: timeTakenSeconds,
      created_at: now
    };

    db.results.push(newResult);
    await db.save();

    return res.status(200).json({
      message: 'Exam successfully submitted and automatically evaluated.',
      result: newResult,
      attempt
    });
  } catch (err: any) {
    console.error('Submit exam error:', err);
    return res.status(500).json({ error: 'Failed to process exam submission and grading.' });
  }
});

export default router;
