import { supabaseAdmin } from './supabaseClient.js';
import { UserRow, StudentRow, ExamRow, QuestionRow, OptionRow, AttemptRow, AnswerRow, ResultRow } from './db.js';

export class PostgresService {
  // 1. AUTHENTICATION & USERS
  public async findUserByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error || !data) return null;

    return {
      user_id: data.user_id,
      name: data.name,
      email: data.email,
      password_hash: data.password_hash,
      role: data.role,
      created_at: data.created_at
    };
  }

  public async listUsers(): Promise<Omit<UserRow, 'password_hash'>[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('user_id, name, email, role, created_at')
      .order('user_id', { ascending: true });

    if (error || !data) return [];
    return data;
  }

  public async findUserById(userId: number): Promise<UserRow | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      user_id: data.user_id,
      name: data.name,
      email: data.email,
      password_hash: data.password_hash,
      role: data.role,
      created_at: data.created_at
    };
  }

  public async createUser(name: string, email: string, passwordHash: string, role: string, rawPassword?: string): Promise<UserRow> {
    // 1. Ensure user in Supabase Auth if raw password is available (using standard anon key signUp)
    if (rawPassword) {
      try {
        await supabaseAdmin.auth.signUp({
          email: email.trim().toLowerCase(),
          password: rawPassword,
          options: {
            data: { name: name.trim(), role: role.toUpperCase() }
          }
        });
      } catch (authErr: any) {
        console.warn('[Supabase Auth] Note on auth user signup:', authErr?.message);
      }
    }

    // 2. Insert into users table
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role: role.toUpperCase(),
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user in Supabase: ${error.message}`);
    }

    return {
      user_id: data.user_id,
      name: data.name,
      email: data.email,
      password_hash: data.password_hash,
      role: data.role,
      created_at: data.created_at
    };
  }

  public async updateUserPassword(userId: number, newHash: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update password in Supabase: ${error.message}`);
    }
  }

  // 2. STUDENTS
  public async findStudentByUserId(userId: number): Promise<StudentRow | null> {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      student_id: data.student_id,
      user_id: data.user_id,
      name: data.name,
      email: data.email,
      roll_no: data.roll_no,
      created_at: data.created_at
    };
  }

  public async findStudentById(studentId: number): Promise<StudentRow | null> {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      student_id: data.student_id,
      user_id: data.user_id,
      name: data.name,
      email: data.email,
      roll_no: data.roll_no,
      created_at: data.created_at
    };
  }

  public async createStudent(userId: number, name: string, email: string, rollNo: string): Promise<StudentRow> {
    const { data, error } = await supabaseAdmin
      .from('students')
      .insert({
        user_id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        roll_no: rollNo.trim()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create student in Supabase: ${error.message}`);
    }

    return {
      student_id: data.student_id,
      user_id: data.user_id,
      name: data.name,
      email: data.email,
      roll_no: data.roll_no,
      created_at: data.created_at
    };
  }

  public async listStudents(): Promise<any[]> {
    const { data: students, error: sErr } = await supabaseAdmin
      .from('students')
      .select('*')
      .order('student_id', { ascending: true });

    if (sErr) throw new Error(sErr.message);

    const { data: attempts } = await supabaseAdmin.from('attempts').select('attempt_id, student_id, status');
    const { data: results } = await supabaseAdmin.from('results').select('result_id, attempt_id, percentage, pass_status');

    return (students || []).map((s) => {
      const studentAttempts = (attempts || []).filter((a) => a.student_id === s.student_id);
      const studentAttemptIds = new Set(studentAttempts.map((a) => a.attempt_id));
      const studentResults = (results || []).filter((r) => studentAttemptIds.has(r.attempt_id));

      const totalAttempts = studentAttempts.length;
      const completedAttempts = studentAttempts.filter((a) => a.status === 'SUBMITTED').length;
      const passedCount = studentResults.filter((r) => r.pass_status === 'PASSED').length;
      const avgPct = studentResults.length
        ? Math.round((studentResults.reduce((sum, r) => sum + Number(r.percentage), 0) / studentResults.length) * 10) / 10
        : 0;

      return {
        student_id: s.student_id,
        user_id: s.user_id,
        name: s.name,
        email: s.email,
        roll_no: s.roll_no,
        created_at: s.created_at,
        total_attempts: totalAttempts,
        completed_attempts: completedAttempts,
        passed_count: passedCount,
        average_percentage: avgPct
      };
    });
  }

  // 3. EXAMS
  public async listExams(isTeacher: boolean, studentId?: number): Promise<any[]> {
    let query = supabaseAdmin.from('exams').select('*').order('exam_id', { ascending: false });
    if (!isTeacher) {
      query = query.eq('status', 'PUBLISHED');
    }

    const { data: exams, error } = await query;
    if (error) throw new Error(error.message);

    const { data: questions } = await supabaseAdmin.from('questions').select('question_id, exam_id');
    const { data: users } = await supabaseAdmin.from('users').select('user_id, name');

    let studentAttempts: any[] = [];
    let studentResults: any[] = [];

    if (studentId) {
      const { data: atts } = await supabaseAdmin
        .from('attempts')
        .select('*')
        .eq('student_id', studentId)
        .order('attempt_id', { ascending: false });
      studentAttempts = atts || [];

      if (studentAttempts.length > 0) {
        const attIds = studentAttempts.map((a) => a.attempt_id);
        const { data: res } = await supabaseAdmin
          .from('results')
          .select('*')
          .in('attempt_id', attIds);
        studentResults = res || [];
      }
    }

    return (exams || []).map((e) => {
      const qList = (questions || []).filter((q) => q.exam_id === e.exam_id);
      const creator = (users || []).find((u) => u.user_id === e.created_by);

      let userAttempt = null;
      let userResult = null;

      if (studentId) {
        userAttempt = studentAttempts.find((a) => a.exam_id === e.exam_id) || null;
        if (userAttempt) {
          userResult = studentResults.find((r) => r.attempt_id === userAttempt.attempt_id) || null;
        }
      }

      return {
        exam_id: e.exam_id,
        title: e.title,
        description: e.description,
        duration_minutes: Number(e.duration_minutes),
        total_marks: Number(e.total_marks),
        passing_percentage: Number(e.passing_percentage),
        status: e.status,
        is_published: e.status === 'PUBLISHED',
        created_by: e.created_by,
        created_by_name: creator ? creator.name : 'Faculty Member',
        question_count: qList.length,
        created_at: e.created_at,
        updated_at: e.updated_at,
        user_attempt_status: userAttempt ? userAttempt.status : null,
        user_attempt_id: userAttempt ? userAttempt.attempt_id : null,
        user_last_score: userResult ? Number(userResult.score) : null,
        user_last_percentage: userResult ? Number(userResult.percentage) : null,
        user_last_result_id: userResult ? userResult.result_id : null
      };
    });
  }

  public async getExamById(examId: number, isTeacher: boolean): Promise<any | null> {
    const { data: exam, error } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle();

    if (error || !exam) return null;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('user_id', exam.created_by)
      .maybeSingle();

    const questions = await this.getQuestionsForExam(examId, isTeacher);

    return {
      exam_id: exam.exam_id,
      title: exam.title,
      description: exam.description,
      duration_minutes: Number(exam.duration_minutes),
      total_marks: Number(exam.total_marks),
      passing_percentage: Number(exam.passing_percentage),
      status: exam.status,
      is_published: exam.status === 'PUBLISHED',
      created_by: exam.created_by,
      created_by_name: user ? user.name : 'Faculty Member',
      created_at: exam.created_at,
      updated_at: exam.updated_at,
      question_count: questions.length,
      questions
    };
  }

  public async createExam(data: {
    title: string;
    description: string;
    duration_minutes: number;
    total_marks?: number;
    passing_percentage?: number;
    is_published?: boolean;
    created_by: number;
    questions?: any[];
  }): Promise<any> {
    let computedTotalMarks = Number(data.total_marks ?? 0);
    if (data.questions && data.questions.length > 0) {
      computedTotalMarks = data.questions.reduce((sum: number, q: any) => sum + (Number(q.marks) || 1), 0);
    }

    const { data: newExam, error } = await supabaseAdmin
      .from('exams')
      .insert({
        title: data.title.trim(),
        description: data.description || '',
        duration_minutes: Number(data.duration_minutes),
        total_marks: computedTotalMarks,
        passing_percentage: Number(data.passing_percentage ?? 40),
        status: data.is_published ? 'PUBLISHED' : 'DRAFT',
        created_by: data.created_by
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const insertedQuestions: any[] = [];
    if (data.questions && data.questions.length > 0) {
      for (const q of data.questions) {
        const { data: qData, error: qErr } = await supabaseAdmin
          .from('questions')
          .insert({
            exam_id: newExam.exam_id,
            question_text: q.question_text || q.text,
            marks: Number(q.marks) || 1
          })
          .select()
          .single();

        if (!qErr && qData && q.options && q.options.length > 0) {
          const optsToInsert = q.options.map((opt: any, idx: number) => ({
            question_id: qData.question_id,
            option_text: opt.option_text || opt.text,
            option_label: opt.option_label || String.fromCharCode(65 + idx),
            is_correct: Boolean(opt.is_correct ?? opt.isCorrect)
          }));
          const { data: optData } = await supabaseAdmin
            .from('options')
            .insert(optsToInsert)
            .select();

          insertedQuestions.push({
            ...qData,
            options: optData || []
          });
        }
      }
    }

    return {
      ...newExam,
      total_marks: computedTotalMarks,
      is_published: newExam.status === 'PUBLISHED',
      questions: insertedQuestions,
      question_count: insertedQuestions.length
    };
  }

  public async updateExam(
    examId: number,
    data: {
      title?: string;
      description?: string;
      duration_minutes?: number;
      passing_percentage?: number;
      is_published?: boolean;
    }
  ): Promise<any> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) updates.title = data.title.trim();
    if (data.description !== undefined) updates.description = data.description;
    if (data.duration_minutes !== undefined) updates.duration_minutes = Number(data.duration_minutes);
    if (data.passing_percentage !== undefined) updates.passing_percentage = Number(data.passing_percentage);
    if (data.is_published !== undefined) updates.status = data.is_published ? 'PUBLISHED' : 'DRAFT';

    const { data: updated, error } = await supabaseAdmin
      .from('exams')
      .update(updates)
      .eq('exam_id', examId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      ...updated,
      is_published: updated.status === 'PUBLISHED'
    };
  }

  public async toggleExamPublish(examId: number): Promise<any> {
    const exam = await this.getExamById(examId, true);
    if (!exam) throw new Error('Exam not found');

    const newStatus = exam.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const { data: updated, error } = await supabaseAdmin
      .from('exams')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('exam_id', examId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      ...updated,
      is_published: updated.status === 'PUBLISHED'
    };
  }

  public async deleteExam(examId: number): Promise<void> {
    const { data: atts } = await supabaseAdmin.from('attempts').select('attempt_id').eq('exam_id', examId);
    const attemptIds = (atts || []).map((a) => a.attempt_id);

    if (attemptIds.length > 0) {
      await supabaseAdmin.from('results').delete().in('attempt_id', attemptIds);
      await supabaseAdmin.from('answers').delete().in('attempt_id', attemptIds);
      await supabaseAdmin.from('attempts').delete().in('attempt_id', attemptIds);
    }

    const { data: qs } = await supabaseAdmin.from('questions').select('question_id').eq('exam_id', examId);
    const questionIds = (qs || []).map((q) => q.question_id);

    if (questionIds.length > 0) {
      await supabaseAdmin.from('options').delete().in('question_id', questionIds);
      await supabaseAdmin.from('questions').delete().in('question_id', questionIds);
    }

    const { error } = await supabaseAdmin.from('exams').delete().eq('exam_id', examId);
    if (error) throw new Error(error.message);
  }

  // 4. QUESTIONS & OPTIONS
  public async getQuestionsForExam(examId: number, isTeacher: boolean): Promise<any[]> {
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('question_order', { ascending: true });

    if (qErr) throw new Error(qErr.message);
    if (!questions || questions.length === 0) return [];

    const questionIds = questions.map((q) => q.question_id);
    const { data: options, error: oErr } = await supabaseAdmin
      .from('options')
      .select('*')
      .in('question_id', questionIds)
      .order('option_id', { ascending: true });

    if (oErr) throw new Error(oErr.message);

    return questions.map((q) => {
      const qOptions = (options || [])
        .filter((o) => o.question_id === q.question_id)
        .map((o) => {
          // Security: strip is_correct from student payload
          if (!isTeacher) {
            return {
              option_id: o.option_id,
              question_id: o.question_id,
              option_label: o.option_label,
              option_text: o.option_text
            };
          }
          return {
            option_id: o.option_id,
            question_id: o.question_id,
            option_label: o.option_label,
            option_text: o.option_text,
            is_correct: Boolean(o.is_correct)
          };
        });

      return {
        question_id: q.question_id,
        exam_id: q.exam_id,
        question_text: q.question_text,
        marks: Number(q.marks),
        question_order: q.question_order,
        order_num: q.question_order,
        created_at: q.created_at,
        updated_at: q.updated_at,
        options: qOptions
      };
    });
  }

  public async addQuestion(
    examId: number,
    data: {
      question_text: string;
      marks?: number;
      options: Array<{ option_label?: string; option_text: string; is_correct: boolean }>;
    }
  ): Promise<any> {
    const { count } = await supabaseAdmin
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', examId);

    const nextOrder = (count ?? 0) + 1;
    const marks = Number(data.marks ?? 1);

    const { data: newQ, error: qErr } = await supabaseAdmin
      .from('questions')
      .insert({
        exam_id: examId,
        question_text: data.question_text.trim(),
        marks: marks,
        question_order: nextOrder
      })
      .select()
      .single();

    if (qErr) throw new Error(qErr.message);

    const optionRows = data.options.map((opt, idx) => ({
      question_id: newQ.question_id,
      option_label: opt.option_label || String.fromCharCode(65 + idx),
      option_text: opt.option_text.trim(),
      is_correct: Boolean(opt.is_correct)
    }));

    const { data: insertedOpts, error: oErr } = await supabaseAdmin
      .from('options')
      .insert(optionRows)
      .select();

    if (oErr) throw new Error(oErr.message);

    await this.recalculateExamMarks(examId);

    return {
      ...newQ,
      order_num: newQ.question_order,
      options: insertedOpts
    };
  }

  public async updateQuestion(
    questionId: number,
    data: {
      question_text?: string;
      marks?: number;
      options?: Array<{ option_id?: number; option_label?: string; option_text: string; is_correct: boolean }>;
    }
  ): Promise<any> {
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.question_text !== undefined) updates.question_text = data.question_text.trim();
    if (data.marks !== undefined) updates.marks = Number(data.marks);

    const { data: updatedQ, error: qErr } = await supabaseAdmin
      .from('questions')
      .update(updates)
      .eq('question_id', questionId)
      .select()
      .single();

    if (qErr) throw new Error(qErr.message);

    if (data.options && data.options.length > 0) {
      await supabaseAdmin.from('options').delete().eq('question_id', questionId);

      const optionRows = data.options.map((opt, idx) => ({
        question_id: questionId,
        option_label: opt.option_label || String.fromCharCode(65 + idx),
        option_text: opt.option_text.trim(),
        is_correct: Boolean(opt.is_correct)
      }));

      await supabaseAdmin.from('options').insert(optionRows);
    }

    await this.recalculateExamMarks(updatedQ.exam_id);
    return await this.getQuestionsForExam(updatedQ.exam_id, true);
  }

  public async deleteQuestion(questionId: number): Promise<void> {
    const { data: q } = await supabaseAdmin
      .from('questions')
      .select('exam_id')
      .eq('question_id', questionId)
      .maybeSingle();

    if (!q) return;

    await supabaseAdmin.from('options').delete().eq('question_id', questionId);
    await supabaseAdmin.from('questions').delete().eq('question_id', questionId);

    await this.recalculateExamMarks(q.exam_id);
  }

  private async recalculateExamMarks(examId: number): Promise<void> {
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select('marks')
      .eq('exam_id', examId);

    const total = (questions || []).reduce((sum, q) => sum + Number(q.marks || 0), 0);

    await supabaseAdmin
      .from('exams')
      .update({ total_marks: total, updated_at: new Date().toISOString() })
      .eq('exam_id', examId);
  }

  // 5. EXAM ATTEMPTS & PERSISTENT ANSWERS
  public async findActiveAttempt(examId: number, studentId: number): Promise<any | null> {
    const { data: attempts, error } = await supabaseAdmin
      .from('attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .eq('status', 'IN_PROGRESS')
      .order('attempt_id', { ascending: false });

    if (error || !attempts || attempts.length === 0) return null;

    const attempt = attempts[0];
    const { data: exam } = await supabaseAdmin
      .from('exams')
      .select('duration_minutes')
      .eq('exam_id', examId)
      .single();

    if (!exam) return attempt;

    const startTime = new Date(attempt.start_time).getTime();
    const durationMs = Number(exam.duration_minutes) * 60 * 1000;
    const elapsedMs = Date.now() - startTime;

    if (elapsedMs > durationMs) {
      console.log(`[Exam Timer Expired] Auto-submitting attempt ${attempt.attempt_id}`);
      const res = await this.submitAttemptAndGrade(attempt.attempt_id);
      return res.attempt || attempt;
    }

    return attempt;
  }

  public async createAttempt(examId: number, studentId: number): Promise<any> {
    // 1. Check for existing active attempt (progress survives refresh)
    const existing = await this.findActiveAttempt(examId, studentId);
    if (existing) {
      if (existing.status === 'SUBMITTED') {
        throw new Error('This exam attempt has already been submitted and completed.');
      }
      return existing;
    }

    // 2. Check if student already submitted this exam
    const { data: submitted } = await supabaseAdmin
      .from('attempts')
      .select('attempt_id')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .eq('status', 'SUBMITTED')
      .maybeSingle();

    if (submitted) {
      throw new Error('You have already completed this exam.');
    }

    // 3. Create fresh attempt
    const { data: attempt, error } = await supabaseAdmin
      .from('attempts')
      .insert({
        exam_id: examId,
        student_id: studentId,
        start_time: new Date().toISOString(),
        status: 'IN_PROGRESS'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return attempt;
  }

  public async getAttemptById(attemptId: number): Promise<any | null> {
    const { data: attempt, error } = await supabaseAdmin
      .from('attempts')
      .select('*')
      .eq('attempt_id', attemptId)
      .maybeSingle();

    if (error || !attempt) return null;

    const { data: exam } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('exam_id', attempt.exam_id)
      .single();

    if (!exam) return attempt;

    const startTime = new Date(attempt.start_time).getTime();
    const durationMs = Number(exam.duration_minutes) * 60 * 1000;
    const elapsedMs = Date.now() - startTime;
    const remainingSeconds = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));

    return {
      ...attempt,
      exam,
      remaining_seconds: remainingSeconds,
      has_expired: remainingSeconds <= 0
    };
  }

  public async expireAttempt(attemptId: number): Promise<any> {
    return await this.submitAttemptAndGrade(attemptId);
  }

  public async saveAnswer(
    attemptId: number,
    questionId: number,
    selectedOptionId: number | null,
    isMarkedForReview: boolean = false
  ): Promise<any> {
    const attempt = await this.getAttemptById(attemptId);
    if (!attempt) throw new Error('Attempt not found');

    if (attempt.status === 'SUBMITTED') {
      throw new Error('Attempt is already submitted and locked against modifications.');
    }

    if (attempt.remaining_seconds <= 0) {
      await this.expireAttempt(attemptId);
      throw new Error('Exam time limit has expired. Your answers have been automatically submitted.');
    }

    const { data: existing } = await supabaseAdmin
      .from('answers')
      .select('answer_id')
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await supabaseAdmin
        .from('answers')
        .update({
          selected_option_id: selectedOptionId,
          answered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('answer_id', existing.answer_id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { ...updated, is_marked_for_review: isMarkedForReview };
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from('answers')
        .insert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_option_id: selectedOptionId,
          answered_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { ...inserted, is_marked_for_review: isMarkedForReview };
    }
  }

  public async getAnswersForAttempt(attemptId: number): Promise<any[]> {
    const { data: answers, error } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('attempt_id', attemptId);

    if (error) throw new Error(error.message);
    return answers || [];
  }

  // 6. AUTO-GRADING, PERCENTAGE & RESULTS STORAGE
  public async submitAttemptAndGrade(attemptId: number, finalAnswers?: any[]): Promise<{ result: any; attempt: any }> {
    const { data: attempt, error: aErr } = await supabaseAdmin
      .from('attempts')
      .select('*')
      .eq('attempt_id', attemptId)
      .single();

    if (aErr || !attempt) throw new Error('Attempt not found.');

    // If finalAnswers provided, save any that are not already recorded
    if (Array.isArray(finalAnswers) && finalAnswers.length > 0 && attempt.status !== 'SUBMITTED') {
      for (const item of finalAnswers) {
        if (!item.question_id) continue;
        const qId = Number(item.question_id);
        const optId = item.selected_option_id ? Number(item.selected_option_id) : null;
        try {
          await this.saveAnswer(attemptId, qId, optId, Boolean(item.is_marked_for_review));
        } catch {
          // ignore if expired during batch
        }
      }
    }

    // If already submitted and result exists, return existing result
    if (attempt.status === 'SUBMITTED') {
      const existingRes = await this.getResultByAttemptId(attemptId);
      return { result: existingRes, attempt };
    }

    const { data: exam, error: eErr } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('exam_id', attempt.exam_id)
      .single();

    if (eErr || !exam) throw new Error('Exam not found for attempt.');

    // Fetch questions and options with is_correct for server-side evaluation
    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select('*, options(*)')
      .eq('exam_id', exam.exam_id);

    const { data: answers } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('attempt_id', attemptId);

    let score = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    for (const q of questions || []) {
      const userAns = (answers || []).find((a) => a.question_id === q.question_id);
      if (!userAns || !userAns.selected_option_id) {
        unansweredCount++;
      } else {
        const selected = (q.options || []).find((o: any) => o.option_id === userAns.selected_option_id);
        if (selected && selected.is_correct) {
          score += Number(q.marks || 1);
          correctCount++;
        } else {
          incorrectCount++;
        }
      }
    }

    const totalMarks = Number(exam.total_marks) > 0 ? Number(exam.total_marks) : 10;
    const percentage = Math.round(((score / totalMarks) * 100) * 10) / 10;
    const passingPct = Number(exam.passing_percentage) || 40;
    const passStatus = percentage >= passingPct ? 'PASSED' : 'FAILED';

    // Store result in results table
    const { data: resultRecord, error: rErr } = await supabaseAdmin
      .from('results')
      .insert({
        attempt_id: attemptId,
        score,
        percentage,
        pass_status: passStatus,
        correct_answers: correctCount,
        incorrect_answers: incorrectCount,
        unanswered_answers: unansweredCount,
        evaluated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (rErr) throw new Error(`Grading failed to record result: ${rErr.message}`);

    // Lock attempt as SUBMITTED
    const { data: updatedAttempt } = await supabaseAdmin
      .from('attempts')
      .update({
        status: 'SUBMITTED',
        end_time: new Date().toISOString()
      })
      .eq('attempt_id', attemptId)
      .select()
      .single();

    const fullResult = await this.getResultByAttemptId(attemptId);
    return {
      result: fullResult,
      attempt: updatedAttempt || { ...attempt, status: 'SUBMITTED' }
    };
  }

  // 7. RESULTS RETRIEVAL
  public async getResultById(resultId: number): Promise<any | null> {
    const { data: result, error } = await supabaseAdmin
      .from('results')
      .select('*')
      .eq('result_id', resultId)
      .maybeSingle();

    if (error || !result) return null;
    return {
      ...result,
      score: Number(result.score),
      percentage: Number(result.percentage)
    };
  }

  public async getResultByAttemptId(attemptId: number): Promise<any | null> {
    const { data: result, error: rErr } = await supabaseAdmin
      .from('results')
      .select('*')
      .eq('attempt_id', attemptId)
      .maybeSingle();

    if (rErr || !result) return null;

    const { data: attempt } = await supabaseAdmin
      .from('attempts')
      .select('*')
      .eq('attempt_id', attemptId)
      .single();

    if (!attempt) return null;

    const { data: exam } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('exam_id', attempt.exam_id)
      .single();

    const { data: student } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('student_id', attempt.student_id)
      .single();

    const { data: questions } = await supabaseAdmin
      .from('questions')
      .select('*, options(*)')
      .eq('exam_id', attempt.exam_id)
      .order('question_order', { ascending: true });

    const { data: answers } = await supabaseAdmin
      .from('answers')
      .select('*')
      .eq('attempt_id', attemptId);

    const questionBreakdown = (questions || []).map((q) => {
      const userAns = (answers || []).find((a) => a.question_id === q.question_id);
      const selectedOption = userAns ? (q.options || []).find((o: any) => o.option_id === userAns.selected_option_id) : null;
      const correctOption = (q.options || []).find((o: any) => o.is_correct);

      return {
        question_id: q.question_id,
        question_text: q.question_text,
        marks: Number(q.marks),
        user_answer_id: userAns?.answer_id || null,
        user_selected_option_id: userAns?.selected_option_id || null,
        user_selected_label: selectedOption?.option_label || null,
        user_selected_text: selectedOption?.option_text || 'Not Answered',
        correct_option_id: correctOption?.option_id || null,
        correct_option_label: correctOption?.option_label || null,
        correct_option_text: correctOption?.option_text || null,
        is_correct: selectedOption ? Boolean(selectedOption.is_correct) : false,
        options: (q.options || []).map((o: any) => ({
          option_id: o.option_id,
          option_label: o.option_label,
          option_text: o.option_text,
          is_correct: Boolean(o.is_correct)
        }))
      };
    });

    return {
      result_id: result.result_id,
      attempt_id: result.attempt_id,
      score: Number(result.score),
      percentage: Number(result.percentage),
      pass_status: result.pass_status,
      correct_answers: result.correct_answers,
      incorrect_answers: result.incorrect_answers,
      unanswered_answers: result.unanswered_answers,
      evaluated_at: result.evaluated_at,
      attempt: {
        attempt_id: attempt.attempt_id,
        exam_id: attempt.exam_id,
        student_id: attempt.student_id,
        start_time: attempt.start_time,
        end_time: attempt.end_time,
        status: attempt.status
      },
      exam: exam
        ? {
            exam_id: exam.exam_id,
            title: exam.title,
            description: exam.description,
            duration_minutes: exam.duration_minutes,
            total_marks: Number(exam.total_marks),
            passing_percentage: Number(exam.passing_percentage)
          }
        : null,
      student: student
        ? {
            student_id: student.student_id,
            name: student.name,
            email: student.email,
            roll_no: student.roll_no
          }
        : null,
      breakdown: questionBreakdown
    };
  }

  public async getResultsForStudent(studentId: number): Promise<any[]> {
    const { data: viewResults, error } = await supabaseAdmin
      .from('v_student_results')
      .select('*')
      .eq('student_id', studentId)
      .order('evaluated_at', { ascending: false });

    if (!error && viewResults && viewResults.length > 0) {
      return viewResults;
    }

    const { data: attempts } = await supabaseAdmin
      .from('attempts')
      .select('attempt_id, exam_id, start_time, end_time, status')
      .eq('student_id', studentId);

    if (!attempts || attempts.length === 0) return [];

    const attemptIds = attempts.map((a) => a.attempt_id);
    const { data: results } = await supabaseAdmin
      .from('results')
      .select('*')
      .in('attempt_id', attemptIds)
      .order('evaluated_at', { ascending: false });

    const { data: exams } = await supabaseAdmin.from('exams').select('exam_id, title, total_marks');

    return (results || []).map((r) => {
      const att = attempts.find((a) => a.attempt_id === r.attempt_id);
      const exam = att ? (exams || []).find((e) => e.exam_id === att.exam_id) : null;
      return {
        result_id: r.result_id,
        attempt_id: r.attempt_id,
        student_id: studentId,
        exam_id: exam?.exam_id,
        exam_title: exam?.title || 'Examination',
        total_marks: exam ? Number(exam.total_marks) : 10,
        score: Number(r.score),
        percentage: Number(r.percentage),
        pass_status: r.pass_status,
        correct_answers: r.correct_answers,
        incorrect_answers: r.incorrect_answers,
        unanswered_answers: r.unanswered_answers,
        evaluated_at: r.evaluated_at
      };
    });
  }

  public async getResultsForExam(examId: number): Promise<any[]> {
    const { data: viewResults, error } = await supabaseAdmin
      .from('v_student_results')
      .select('*')
      .eq('exam_id', examId)
      .order('score', { ascending: false });

    if (!error && viewResults && viewResults.length > 0) {
      return viewResults;
    }

    const { data: attempts } = await supabaseAdmin
      .from('attempts')
      .select('attempt_id, student_id, start_time, end_time, status')
      .eq('exam_id', examId);

    if (!attempts || attempts.length === 0) return [];

    const attemptIds = attempts.map((a) => a.attempt_id);
    const { data: results } = await supabaseAdmin
      .from('results')
      .select('*')
      .in('attempt_id', attemptIds);

    const { data: students } = await supabaseAdmin.from('students').select('*');
    const { data: exam } = await supabaseAdmin.from('exams').select('title, total_marks').eq('exam_id', examId).single();

    return (results || []).map((r) => {
      const att = attempts.find((a) => a.attempt_id === r.attempt_id);
      const student = att ? (students || []).find((s) => s.student_id === att.student_id) : null;
      return {
        result_id: r.result_id,
        attempt_id: r.attempt_id,
        student_id: student?.student_id,
        student_name: student?.name || 'Student',
        roll_no: student?.roll_no || 'N/A',
        exam_id: examId,
        exam_title: exam?.title || 'Examination',
        total_marks: exam ? Number(exam.total_marks) : 10,
        score: Number(r.score),
        percentage: Number(r.percentage),
        pass_status: r.pass_status,
        correct_answers: r.correct_answers,
        incorrect_answers: r.incorrect_answers,
        unanswered_answers: r.unanswered_answers,
        evaluated_at: r.evaluated_at
      };
    });
  }

  // 8. DASHBOARD STATISTICS
  public async getTeacherDashboardStats(): Promise<any> {
    const { count: examCount } = await supabaseAdmin.from('exams').select('*', { count: 'exact', head: true });
    const { count: studentCount } = await supabaseAdmin.from('students').select('*', { count: 'exact', head: true });
    const { count: attemptCount } = await supabaseAdmin.from('attempts').select('*', { count: 'exact', head: true });
    const { count: questionCount } = await supabaseAdmin.from('questions').select('*', { count: 'exact', head: true });

    const { data: results } = await supabaseAdmin.from('results').select('score, percentage, pass_status, evaluated_at');

    const totalResults = results?.length || 0;
    const passCount = (results || []).filter((r) => r.pass_status === 'PASSED').length;
    const failCount = totalResults - passCount;
    const passRate = totalResults > 0 ? Math.round((passCount / totalResults) * 100) : 0;
    const avgPercentage = totalResults > 0 ? Math.round(((results || []).reduce((sum, r) => sum + Number(r.percentage), 0) / totalResults) * 10) / 10 : 0;

    const { data: recentAttempts } = await supabaseAdmin
      .from('attempts')
      .select('attempt_id, exam_id, student_id, start_time, end_time, status')
      .order('attempt_id', { ascending: false })
      .limit(6);

    const { data: students } = await supabaseAdmin.from('students').select('student_id, name, roll_no');
    const { data: exams } = await supabaseAdmin.from('exams').select('exam_id, title');
    const { data: resList } = await supabaseAdmin.from('results').select('*');

    const enrichedRecent = (recentAttempts || []).map((a) => {
      const student = (students || []).find((s) => s.student_id === a.student_id);
      const exam = (exams || []).find((e) => e.exam_id === a.exam_id);
      const res = (resList || []).find((r) => r.attempt_id === a.attempt_id);

      return {
        attempt_id: a.attempt_id,
        exam_id: a.exam_id,
        exam_title: exam?.title || 'Exam',
        student_id: a.student_id,
        student_name: student?.name || 'Student',
        student_roll: student?.roll_no || 'N/A',
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        score: res ? Number(res.score) : null,
        percentage: res ? Number(res.percentage) : null,
        pass_status: res?.pass_status || null
      };
    });

    return {
      total_exams: examCount ?? 0,
      total_students: studentCount ?? 0,
      total_attempts: attemptCount ?? 0,
      total_questions: questionCount ?? 0,
      pass_count: passCount,
      fail_count: failCount,
      pass_rate: passRate,
      average_percentage: avgPercentage,
      recent_attempts: enrichedRecent
    };
  }

  public async getStudentDashboardStats(studentId: number): Promise<any> {
    const student = await this.findStudentById(studentId);
    if (!student) return null;

    const { data: attempts } = await supabaseAdmin
      .from('attempts')
      .select('*')
      .eq('student_id', studentId);

    const attemptIds = (attempts || []).map((a) => a.attempt_id);
    let results: any[] = [];
    if (attemptIds.length > 0) {
      const { data: rList } = await supabaseAdmin
        .from('results')
        .select('*')
        .in('attempt_id', attemptIds);
      results = rList || [];
    }

    const totalAttempts = attempts?.length || 0;
    const completedExams = (attempts || []).filter((a) => a.status === 'SUBMITTED').length;
    const passCount = results.filter((r) => r.pass_status === 'PASSED').length;
    const failCount = results.filter((r) => r.pass_status === 'FAILED').length;
    const passRate = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;
    const avgScore = results.length > 0 ? Math.round(((results.reduce((sum, r) => sum + Number(r.score), 0) / results.length)) * 10) / 10 : 0;
    const avgPercentage = results.length > 0 ? Math.round(((results.reduce((sum, r) => sum + Number(r.percentage), 0) / results.length)) * 10) / 10 : 0;

    return {
      student,
      total_attempts: totalAttempts,
      completed_exams: completedExams,
      average_score: avgScore,
      average_percentage: avgPercentage,
      pass_count: passCount,
      fail_count: failCount,
      pass_rate: passRate
    };
  }
}

export const postgresService = new PostgresService();
