import { Router, Response } from 'express';
import fs from 'fs';
import { db } from '../db.js';
import { postgresAdapter } from '../postgresAdapter.js';
import { postgresService } from '../postgresService.js';
import { authenticateToken, requireRole, AuthRequest } from '../auth.js';

const router = Router();

// GET /api/dashboard/student - Aggregated stats for the logged-in student
router.get('/student', authenticateToken, requireRole(['STUDENT']), async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.student_id;
    if (!studentId) {
      return res.status(400).json({ error: 'Student profile not associated with user.' });
    }

    if (postgresAdapter.isConnected) {
      const stats = await postgresService.getStudentDashboardStats(studentId);
      if (!stats || !stats.student) {
        return res.status(404).json({ error: 'Student not found.' });
      }

      const availableExams = await postgresService.listExams(false, studentId);
      const studentResults = await postgresService.getResultsForStudent(studentId);

      return res.json({
        student: stats.student,
        total_attempts: stats.total_attempts,
        completed_exams: stats.completed_exams,
        average_score: stats.average_score,
        average_percentage: stats.average_percentage,
        pass_count: stats.pass_count,
        fail_count: stats.fail_count,
        pass_rate: stats.pass_rate,
        recent_results: studentResults.slice(0, 5),
        available_exams: availableExams
      });
    }

    const student = db.students.find(s => s.student_id === studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const studentAttempts = db.attempts.filter(a => a.student_id === studentId);
    const studentAttemptIds = studentAttempts.map(a => a.attempt_id);
    const studentResults = db.results.filter(r => studentAttemptIds.includes(r.attempt_id));

    const totalAttempts = studentAttempts.length;
    const completedExams = studentResults.length;
    const passCount = studentResults.filter(r => r.pass_status === 'PASSED').length;
    const failCount = studentResults.filter(r => r.pass_status === 'FAILED').length;

    const avgScore = completedExams > 0 
      ? Number((studentResults.reduce((acc, r) => acc + r.score, 0) / completedExams).toFixed(1)) 
      : 0;

    const avgPercentage = completedExams > 0 
      ? Number((studentResults.reduce((acc, r) => acc + r.percentage, 0) / completedExams).toFixed(1)) 
      : 0;

    const passRate = completedExams > 0 
      ? Number(((passCount / completedExams) * 100).toFixed(1)) 
      : 0;

    // Recent results with exam names
    const recentResults = studentResults
      .map(r => {
        const att = studentAttempts.find(a => a.attempt_id === r.attempt_id);
        const exam = att ? db.exams.find(e => e.exam_id === att.exam_id) : null;
        return {
          ...r,
          exam_title: exam?.title || 'Unknown Exam',
          total_marks: exam?.total_marks || 0,
          passing_percentage: exam?.passing_percentage || 40,
          attempt_date: att?.start_time
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    // Available exams with attempt status
    const availableExams = db.exams
      .filter(e => e.is_published)
      .map(e => {
        const qCount = db.questions.filter(q => q.exam_id === e.exam_id).length;
        const attemptsForExam = studentAttempts.filter(a => a.exam_id === e.exam_id);
        const lastAttempt = attemptsForExam[attemptsForExam.length - 1];
        const lastResult = lastAttempt ? db.results.find(r => r.attempt_id === lastAttempt.attempt_id) : null;

        return {
          ...e,
          question_count: qCount,
          user_attempt_status: lastAttempt ? lastAttempt.status : null,
          user_attempt_id: lastAttempt ? lastAttempt.attempt_id : null,
          user_last_score: lastResult ? lastResult.score : null,
          user_last_percentage: lastResult ? lastResult.percentage : null,
          user_last_result_id: lastResult ? lastResult.result_id : null
        };
      });

    return res.json({
      student,
      total_attempts: totalAttempts,
      completed_exams: completedExams,
      average_score: avgScore,
      average_percentage: avgPercentage,
      pass_count: passCount,
      fail_count: failCount,
      pass_rate: passRate,
      recent_results: recentResults,
      available_exams: availableExams
    });
  } catch (err: any) {
    console.error('Student dashboard stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve student dashboard data.' });
  }
});

// GET /api/dashboard/teacher - Comprehensive faculty analytics
router.get('/teacher', authenticateToken, requireRole(['TEACHER', 'ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    if (postgresAdapter.isConnected) {
      const stats = await postgresService.getTeacherDashboardStats();
      const students = await postgresService.listStudents();
      return res.json({
        ...stats,
        total_students: students.length
      });
    }

    const totalExams = db.exams.length;
    const totalStudents = db.students.length;
    const totalAttempts = db.attempts.length;
    const allResults = db.results;

    const totalPassed = allResults.filter(r => r.pass_status === 'PASSED').length;
    const totalFailed = allResults.filter(r => r.pass_status === 'FAILED').length;

    const avgScore = allResults.length > 0 
      ? Number((allResults.reduce((acc, r) => acc + r.score, 0) / allResults.length).toFixed(1)) 
      : 0;

    const avgPercentage = allResults.length > 0 
      ? Number((allResults.reduce((acc, r) => acc + r.percentage, 0) / allResults.length).toFixed(1)) 
      : 0;

    const passRate = allResults.length > 0 
      ? Number(((totalPassed / allResults.length) * 100).toFixed(1)) 
      : 0;

    // Exam performance breakdown
    const examPerformance = db.exams.map(e => {
      const examAttempts = db.attempts.filter(a => a.exam_id === e.exam_id);
      const attemptIds = examAttempts.map(a => a.attempt_id);
      const examResults = db.results.filter(r => attemptIds.includes(r.attempt_id));

      const examPassCount = examResults.filter(r => r.pass_status === 'PASSED').length;
      const examAvgPerc = examResults.length > 0
        ? Number((examResults.reduce((acc, r) => acc + r.percentage, 0) / examResults.length).toFixed(1))
        : 0;
      const examPassRate = examResults.length > 0
        ? Number(((examPassCount / examResults.length) * 100).toFixed(1))
        : 0;

      return {
        exam_id: e.exam_id,
        title: e.title,
        duration_minutes: e.duration_minutes,
        total_marks: e.total_marks,
        is_published: e.is_published,
        attempts_count: examAttempts.length,
        results_count: examResults.length,
        avg_percentage: examAvgPerc,
        pass_rate: examPassRate
      };
    });

    // Recent attempts with student and exam details
    const recentAttempts = db.attempts
      .slice(-10)
      .reverse()
      .map(att => {
        const student = db.students.find(s => s.student_id === att.student_id);
        const exam = db.exams.find(e => e.exam_id === att.exam_id);
        const result = db.results.find(r => r.attempt_id === att.attempt_id);

        return {
          ...att,
          student_name: student?.name || 'Unknown Student',
          student_roll_no: student?.roll_no || 'N/A',
          exam_title: exam?.title || 'Unknown Exam',
          total_marks: exam?.total_marks || 0,
          result: result || null
        };
      });

    return res.json({
      total_exams: totalExams,
      total_students: totalStudents,
      total_attempts: totalAttempts,
      average_score: avgScore,
      average_percentage: avgPercentage,
      total_passed: totalPassed,
      total_failed: totalFailed,
      pass_rate: passRate,
      exam_performance: examPerformance,
      recent_attempts: recentAttempts
    });
  } catch (err: any) {
    console.error('Teacher dashboard stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve teacher dashboard data.' });
  }
});

// GET /api/database/status - Database health & schema inspector
router.get('/database/status', async (req: AuthRequest, res: Response) => {
  try {
    if (postgresAdapter.isConnected) {
      const inspection = await postgresAdapter.inspectSchema();
      const tableCounts: Record<string, number> = {};
      const schemaTables = Object.entries(inspection.tables).map(([entity, info]) => {
        tableCounts[entity] = info.row_count;
        return {
          name: info.actual_table_name,
          entity: entity,
          rows: info.row_count,
          columns: info.columns
        };
      });

      return res.json({
        status: 'ONLINE',
        engine: `PostgreSQL (${postgresAdapter.connectionType === 'SUPABASE' ? 'Supabase' : 'Direct Cloud Instance'})`,
        is_postgres: true,
        is_supabase: postgresAdapter.connectionType === 'SUPABASE',
        table_counts: tableCounts,
        database_name: postgresAdapter.connectionType === 'SUPABASE' ? 'Supabase (jwnhapdvdsvwbyumtjun)' : (process.env.PGDATABASE || 'postgres'),
        supabase_project_ref: 'jwnhapdvdsvwbyumtjun',
        supabase_url: 'https://jwnhapdvdsvwbyumtjun.supabase.co',
        schema_tables: schemaTables,
        table_mapping: postgresAdapter.tableMap
      });
    }

    const tableCounts = {
      users: db.users.length,
      student: db.students.length,
      exam: db.exams.length,
      question: db.questions.length,
      option: db.options.length,
      attempt: db.attempts.length,
      answer: db.answers.length,
      result: db.results.length
    };

    let lastSavedAt = new Date().toISOString();
    try {
      if (fs.existsSync('data/examination.db.json')) {
        const stats = fs.statSync('data/examination.db.json');
        lastSavedAt = stats.mtime.toISOString();
      }
    } catch (_) {}

    return res.json({
      status: 'ONLINE',
      engine: db.isUsingMySQL ? 'MySQL (External Server Pool)' : 'Persistent Relational SQL Engine (ACID JSON Storage)',
      is_mysql: db.isUsingMySQL,
      is_postgres: false,
      table_counts: tableCounts,
      database_name: 'online_exam_db',
      file_path: 'data/examination.db.json',
      last_saved_at: lastSavedAt,
      schema_tables: [
        { name: 'users', rows: db.users.length, columns: ['user_id (PK)', 'name', 'email (UQ)', 'password_hash', 'role', 'created_at'] },
        { name: 'student', rows: db.students.length, columns: ['student_id (PK)', 'user_id (FK)', 'name', 'email (UQ)', 'roll_no (UQ)', 'created_at'] },
        { name: 'exam', rows: db.exams.length, columns: ['exam_id (PK)', 'title', 'description', 'duration_minutes', 'total_marks', 'passing_percentage', 'is_published', 'created_by (FK)', 'created_at'] },
        { name: 'question', rows: db.questions.length, columns: ['question_id (PK)', 'exam_id (FK)', 'question_text', 'marks', 'order_num', 'created_at'] },
        { name: 'option', rows: db.options.length, columns: ['option_id (PK)', 'question_id (FK)', 'option_text', 'is_correct', 'created_at'] },
        { name: 'attempt', rows: db.attempts.length, columns: ['attempt_id (PK)', 'exam_id (FK)', 'student_id (FK)', 'start_time', 'end_time', 'status', 'created_at'] },
        { name: 'answer', rows: db.answers.length, columns: ['answer_id (PK)', 'attempt_id (FK)', 'question_id (FK)', 'selected_option_id (FK)', 'is_marked_for_review', 'updated_at'] },
        { name: 'result', rows: db.results.length, columns: ['result_id (PK)', 'attempt_id (FK, UQ)', 'score', 'percentage', 'pass_status', 'total_questions', 'correct_answers', 'incorrect_answers', 'unanswered_questions', 'time_taken_seconds', 'created_at'] }
      ]
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to inspect database status.' });
  }
});

// GET /api/database/records/:table - Live data viewer for inspection
router.get('/database/records/:table', async (req: AuthRequest, res: Response) => {
  try {
    const table = req.params.table.toLowerCase();

    if (postgresAdapter.isConnected) {
      if (table === 'users') {
        const users = await postgresService.listUsers();
        return res.json({ table, count: users.length, rows: users });
      } else if (table === 'student') {
        const students = await postgresService.listStudents();
        return res.json({ table, count: students.length, rows: students });
      } else if (table === 'exam') {
        const exams = await postgresService.listExams(true);
        return res.json({ table, count: exams.length, rows: exams });
      }
    }

    let rows: any[] = [];
    switch (table) {
      case 'users':
        rows = db.users.map(({ password_hash, ...u }) => ({
          ...u,
          password_hash: '[PROTECTED_BCRYPT_HASH]'
        }));
        break;
      case 'student':
        rows = db.students;
        break;
      case 'exam':
        rows = db.exams;
        break;
      case 'question':
        rows = db.questions;
        break;
      case 'option':
        rows = db.options;
        break;
      case 'attempt':
        rows = db.attempts;
        break;
      case 'answer':
        rows = db.answers;
        break;
      case 'result':
        rows = db.results;
        break;
      default:
        return res.status(400).json({ error: `Unknown table: ${table}` });
    }

    return res.json({
      table,
      count: rows.length,
      rows: rows.slice(-50) // Return up to 50 most recent records
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch table records.' });
  }
});

// POST /api/database/seed-reset - Reset and re-seed database
router.post('/database/seed-reset', async (req: AuthRequest, res: Response) => {
  try {
    if (postgresAdapter.isConnected) {
      return res.status(400).json({
        error: 'Database reset disabled for production PostgreSQL/Supabase database to preserve existing tables.'
      });
    }
    await db.seedDatabase(true);
    return res.json({ message: 'Database reset and re-seeded successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to re-seed database.' });
  }
});

// POST /api/database/recreate - Create a brand new clean database
router.post('/database/recreate', async (req: AuthRequest, res: Response) => {
  try {
    if (postgresAdapter.isConnected) {
      return res.status(400).json({
        error: 'Database recreation disabled for production PostgreSQL/Supabase database.'
      });
    }
    await db.clearDatabase();
    await db.seedDatabase(true);
    return res.json({ message: 'Brand new database created and initialized successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to recreate database.' });
  }
});

export default router;

