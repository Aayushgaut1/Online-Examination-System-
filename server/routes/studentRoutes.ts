import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/students - List all students (Teacher only)
router.get('/', authenticateToken, requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const students = db.students.map(s => {
      const studentAttempts = db.attempts.filter(a => a.student_id === s.student_id);
      const studentResults = db.results.filter(r => studentAttempts.some(a => a.attempt_id === r.attempt_id));

      const totalAttempts = studentAttempts.length;
      const completedAttempts = studentAttempts.filter(a => a.status === 'SUBMITTED').length;
      const passedCount = studentResults.filter(r => r.pass_status === 'PASSED').length;

      const avgPercentage = studentResults.length > 0
        ? Number((studentResults.reduce((acc, r) => acc + r.percentage, 0) / studentResults.length).toFixed(1))
        : 0;

      return {
        ...s,
        total_attempts: totalAttempts,
        completed_attempts: completedAttempts,
        passed_count: passedCount,
        average_percentage: avgPercentage,
        results_count: studentResults.length
      };
    });

    return res.json(students);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch students list.' });
  }
});

// GET /api/students/:id - Detailed student stats & history
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const studentId = Number(req.params.id);
    const isTeacher = req.user?.role === 'TEACHER' || req.user?.role === 'ADMIN';
    const isOwner = req.user?.student_id === studentId;

    if (!isTeacher && !isOwner) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const student = db.students.find(s => s.student_id === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const attempts = db.attempts
      .filter(a => a.student_id === studentId)
      .map(att => {
        const exam = db.exams.find(e => e.exam_id === att.exam_id);
        const result = db.results.find(r => r.attempt_id === att.attempt_id);
        return {
          ...att,
          exam_title: exam?.title || 'Unknown Exam',
          total_marks: exam?.total_marks || 0,
          passing_percentage: exam?.passing_percentage || 40,
          result: result || null
        };
      })
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const results = db.results.filter(r => attempts.some(a => a.attempt_id === r.attempt_id));

    const totalScore = results.reduce((acc, r) => acc + r.score, 0);
    const totalPossible = attempts
      .filter(a => a.result)
      .reduce((acc, a) => acc + (a.total_marks || 0), 0);

    const avgScore = results.length > 0 ? Number((totalScore / results.length).toFixed(1)) : 0;
    const avgPercentage = results.length > 0 
      ? Number((results.reduce((acc, r) => acc + r.percentage, 0) / results.length).toFixed(1))
      : 0;

    const passCount = results.filter(r => r.pass_status === 'PASSED').length;
    const failCount = results.filter(r => r.pass_status === 'FAILED').length;
    const passRate = results.length > 0 ? Number(((passCount / results.length) * 100).toFixed(1)) : 0;

    return res.json({
      student,
      total_attempts: attempts.length,
      completed_exams: results.length,
      average_score: avgScore,
      average_percentage: avgPercentage,
      pass_count: passCount,
      fail_count: failCount,
      pass_rate: passRate,
      attempts
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch student details.' });
  }
});

export default router;
