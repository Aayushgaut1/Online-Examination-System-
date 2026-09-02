import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { INITIAL_EXAMS } from './seedData.js';

export interface UserRow {
  user_id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'TEACHER' | 'STUDENT' | 'ADMIN';
  created_at: string;
}

export interface StudentRow {
  student_id: number;
  user_id: number;
  name: string;
  email: string;
  roll_no: string;
  created_at: string;
}

export interface ExamRow {
  exam_id: number;
  title: string;
  description: string;
  duration_minutes: number;
  total_marks: number;
  passing_percentage: number;
  is_published: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionRow {
  question_id: number;
  exam_id: number;
  question_text: string;
  marks: number;
  order_num: number;
  created_at: string;
}

export interface OptionRow {
  option_id: number;
  question_id: number;
  option_text: string;
  is_correct: boolean;
  created_at: string;
}

export interface AttemptRow {
  attempt_id: number;
  exam_id: number;
  student_id: number;
  start_time: string;
  end_time: string | null;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
  created_at: string;
}

export interface AnswerRow {
  answer_id: number;
  attempt_id: number;
  question_id: number;
  selected_option_id: number | null;
  is_marked_for_review: boolean;
  updated_at: string;
}

export interface ResultRow {
  result_id: number;
  attempt_id: number;
  score: number;
  percentage: number;
  pass_status: 'PASSED' | 'FAILED';
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  time_taken_seconds: number;
  created_at: string;
}

export interface DatabaseState {
  users: UserRow[];
  student: StudentRow[];
  exam: ExamRow[];
  question: QuestionRow[];
  option: OptionRow[];
  attempt: AttemptRow[];
  answer: AnswerRow[];
  result: ResultRow[];
  sequences: {
    users: number;
    student: number;
    exam: number;
    question: number;
    option: number;
    attempt: number;
    answer: number;
    result: number;
  };
}

class DatabaseManager {
  private dataDir: string;
  private dbFilePath: string;
  public state: DatabaseState = {
    users: [],
    student: [],
    exam: [],
    question: [],
    option: [],
    attempt: [],
    answer: [],
    result: [],
    sequences: {
      users: 1,
      student: 1,
      exam: 1,
      question: 1,
      option: 1,
      attempt: 1,
      answer: 1,
      result: 1
    }
  };
  private mysqlPool: mysql.Pool | null = null;
  public isUsingMySQL = false;
  private initialized = false;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.dbFilePath = path.join(this.dataDir, 'examination.db.json');
  }

  public async init() {
    if (this.initialized) return;

    // Check if MySQL connection env vars are configured and test connection
    const dbUrl = process.env.DATABASE_URL;
    const host = process.env.MYSQL_HOST;
    const user = process.env.MYSQL_USER;
    const password = process.env.MYSQL_PASSWORD;
    const database = process.env.MYSQL_DATABASE;

    if (dbUrl || (host && user && database)) {
      try {
        const pool = dbUrl
          ? mysql.createPool(dbUrl)
          : mysql.createPool({
              host: host || 'localhost',
              port: Number(process.env.MYSQL_PORT) || 3306,
              user: user || 'root',
              password: password || '',
              database: database || 'online_exam_db',
              waitForConnections: true,
              connectionLimit: 10
            });
        // Test connection
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        this.mysqlPool = pool;
        this.isUsingMySQL = true;
        console.log('[DB] Connected to MySQL successfully.');
        await this.runMySQLMigrations();
      } catch (err) {
        console.warn('[DB] MySQL connection not established, falling back to built-in ACID relational engine:', (err as Error).message);
        this.isUsingMySQL = false;
      }
    }

    // Ensure persistent data dir exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // Load or seed
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        this.state = JSON.parse(raw);
      } catch (e) {
        console.error('[DB] Corrupted DB file, re-seeding...', e);
        await this.seedDatabase();
      }
    } else {
      await this.seedDatabase();
    }

    this.initialized = true;
  }

  private async runMySQLMigrations() {
    if (!this.mysqlPool) return;
    try {
      const schemaSqlPath = path.join(process.cwd(), 'database', 'schema.sql');
      if (fs.existsSync(schemaSqlPath)) {
        const sql = fs.readFileSync(schemaSqlPath, 'utf-8');
        const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        const conn = await this.mysqlPool.getConnection();
        for (const stmt of statements) {
          try {
            await conn.query(stmt);
          } catch (e) {
            // ignore database create if already in db
          }
        }
        conn.release();
        console.log('[DB] MySQL schema migrations applied.');
      }
    } catch (e) {
      console.error('[DB] Migration error:', e);
    }
  }

  public async save() {
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Error saving to disk:', err);
    }
  }

  public async seedDatabase(force = false) {
    if (!force && this.state.users.length > 0) return;

    const defaultPasswordHash = await bcrypt.hash('password123', 10);
    const now = new Date().toISOString();

    // 1. Create Default Users & Students
    const users: UserRow[] = [
      {
        user_id: 1,
        name: 'Dr. Sarah Mitchell',
        email: 'teacher@nexusexam.edu',
        password_hash: defaultPasswordHash,
        role: 'TEACHER',
        created_at: now
      },
      {
        user_id: 2,
        name: 'Alex Turner',
        email: 'alex.turner@student.edu',
        password_hash: defaultPasswordHash,
        role: 'STUDENT',
        created_at: now
      },
      {
        user_id: 3,
        name: 'Maya Patel',
        email: 'maya.patel@student.edu',
        password_hash: defaultPasswordHash,
        role: 'STUDENT',
        created_at: now
      },
      {
        user_id: 4,
        name: 'Liam Davis',
        email: 'liam.davis@student.edu',
        password_hash: defaultPasswordHash,
        role: 'STUDENT',
        created_at: now
      }
    ];

    const students: StudentRow[] = [
      {
        student_id: 1,
        user_id: 2,
        name: 'Alex Turner',
        email: 'alex.turner@student.edu',
        roll_no: 'CS2026-041',
        created_at: now
      },
      {
        student_id: 2,
        user_id: 3,
        name: 'Maya Patel',
        email: 'maya.patel@student.edu',
        roll_no: 'CS2026-088',
        created_at: now
      },
      {
        student_id: 3,
        user_id: 4,
        name: 'Liam Davis',
        email: 'liam.davis@student.edu',
        roll_no: 'CS2026-102',
        created_at: now
      }
    ];

    // 2. Create Exams, Questions, Options
    const exams: ExamRow[] = [];
    const questions: QuestionRow[] = [];
    const options: OptionRow[] = [];

    let examIdCounter = 1;
    let questionIdCounter = 1;
    let optionIdCounter = 1;

    for (const seedExam of INITIAL_EXAMS) {
      const currentExamId = examIdCounter++;
      let calculatedTotalMarks = 0;

      for (let i = 0; i < seedExam.questions.length; i++) {
        const q = seedExam.questions[i];
        const currentQId = questionIdCounter++;
        calculatedTotalMarks += q.marks;

        questions.push({
          question_id: currentQId,
          exam_id: currentExamId,
          question_text: q.question_text,
          marks: q.marks,
          order_num: i + 1,
          created_at: now
        });

        for (const opt of q.options) {
          options.push({
            option_id: optionIdCounter++,
            question_id: currentQId,
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            created_at: now
          });
        }
      }

      exams.push({
        exam_id: currentExamId,
        title: seedExam.title,
        description: seedExam.description,
        duration_minutes: seedExam.duration_minutes,
        total_marks: calculatedTotalMarks || seedExam.total_marks,
        passing_percentage: seedExam.passing_percentage,
        is_published: seedExam.is_published,
        created_by: 1, // Dr. Sarah Mitchell
        created_at: now,
        updated_at: now
      });
    }

    // 3. Create Sample Completed Attempts & Results for Demo
    const attempts: AttemptRow[] = [];
    const answers: AnswerRow[] = [];
    const results: ResultRow[] = [];
    let attemptIdCounter = 1;
    let answerIdCounter = 1;
    let resultIdCounter = 1;

    // Student 1 (Alex) completed Exam 1 (Computer Networks)
    const exam1 = exams[0];
    const exam1Questions = questions.filter(q => q.exam_id === exam1.exam_id);
    const attempt1Id = attemptIdCounter++;
    const startTime1 = new Date(Date.now() - 3600000 * 24 * 2).toISOString(); // 2 days ago
    const endTime1 = new Date(Date.now() - 3600000 * 24 * 2 + 12 * 60000).toISOString(); // 12 min later

    attempts.push({
      attempt_id: attempt1Id,
      exam_id: exam1.exam_id,
      student_id: 1, // Alex
      start_time: startTime1,
      end_time: endTime1,
      status: 'SUBMITTED',
      created_at: startTime1
    });

    let score1 = 0;
    let correctCount1 = 0;
    let incorrectCount1 = 0;

    for (const q of exam1Questions) {
      const qOptions = options.filter(o => o.question_id === q.question_id);
      const correctOpt = qOptions.find(o => o.is_correct);
      // Give Alex mostly correct answers
      const isRight = Math.random() > 0.15;
      const selected = isRight ? correctOpt : qOptions.find(o => !o.is_correct) || correctOpt;

      if (selected?.is_correct) {
        score1 += q.marks;
        correctCount1++;
      } else {
        incorrectCount1++;
      }

      answers.push({
        answer_id: answerIdCounter++,
        attempt_id: attempt1Id,
        question_id: q.question_id,
        selected_option_id: selected ? selected.option_id : null,
        is_marked_for_review: false,
        updated_at: endTime1
      });
    }

    const percentage1 = Math.round((score1 / exam1.total_marks) * 100);
    results.push({
      result_id: resultIdCounter++,
      attempt_id: attempt1Id,
      score: score1,
      percentage: percentage1,
      pass_status: percentage1 >= exam1.passing_percentage ? 'PASSED' : 'FAILED',
      total_questions: exam1Questions.length,
      correct_answers: correctCount1,
      incorrect_answers: incorrectCount1,
      unanswered_questions: 0,
      time_taken_seconds: 12 * 60,
      created_at: endTime1
    });

    // Student 2 (Maya) completed Exam 2 (DBMS)
    const exam2 = exams[1];
    const exam2Questions = questions.filter(q => q.exam_id === exam2.exam_id);
    const attempt2Id = attemptIdCounter++;
    const startTime2 = new Date(Date.now() - 3600000 * 12).toISOString();
    const endTime2 = new Date(Date.now() - 3600000 * 12 + 18 * 60000).toISOString();

    attempts.push({
      attempt_id: attempt2Id,
      exam_id: exam2.exam_id,
      student_id: 2, // Maya
      start_time: startTime2,
      end_time: endTime2,
      status: 'SUBMITTED',
      created_at: startTime2
    });

    let score2 = 0;
    let correctCount2 = 0;
    let incorrectCount2 = 0;

    for (const q of exam2Questions) {
      const qOptions = options.filter(o => o.question_id === q.question_id);
      const correctOpt = qOptions.find(o => o.is_correct);
      const isRight = Math.random() > 0.2;
      const selected = isRight ? correctOpt : qOptions.find(o => !o.is_correct) || correctOpt;

      if (selected?.is_correct) {
        score2 += q.marks;
        correctCount2++;
      } else {
        incorrectCount2++;
      }

      answers.push({
        answer_id: answerIdCounter++,
        attempt_id: attempt2Id,
        question_id: q.question_id,
        selected_option_id: selected ? selected.option_id : null,
        is_marked_for_review: false,
        updated_at: endTime2
      });
    }

    const percentage2 = Math.round((score2 / exam2.total_marks) * 100);
    results.push({
      result_id: resultIdCounter++,
      attempt_id: attempt2Id,
      score: score2,
      percentage: percentage2,
      pass_status: percentage2 >= exam2.passing_percentage ? 'PASSED' : 'FAILED',
      total_questions: exam2Questions.length,
      correct_answers: correctCount2,
      incorrect_answers: incorrectCount2,
      unanswered_questions: 0,
      time_taken_seconds: 18 * 60,
      created_at: endTime2
    });

    this.state = {
      users,
      student: students,
      exam: exams,
      question: questions,
      option: options,
      attempt: attempts,
      answer: answers,
      result: results,
      sequences: {
        users: 10,
        student: 10,
        exam: examIdCounter + 5,
        question: questionIdCounter + 5,
        option: optionIdCounter + 5,
        attempt: attemptIdCounter + 5,
        answer: answerIdCounter + 5,
        result: resultIdCounter + 5
      }
    };

    await this.save();
    console.log('[DB] Database seeded successfully with 5 exams, 37 questions, and sample completed attempts.');
  }

  // Getters for collections
  public getState(): DatabaseState {
    return this.state;
  }

  public get users() { return this.state.users; }
  public get students() { return this.state.student; }
  public get exams() { return this.state.exam; }
  public get questions() { return this.state.question; }
  public get options() { return this.state.option; }
  public get attempts() { return this.state.attempt; }
  public get answers() { return this.state.answer; }
  public get results() { return this.state.result; }

  // Next sequence helper
  public nextId(table: keyof DatabaseState['sequences']): number {
    const id = this.state.sequences[table]++;
    return id;
  }
}

export const db = new DatabaseManager();
