import {
  User,
  Student,
  Exam,
  Question,
  Option,
  Attempt,
  Result,
  DetailedResultResponse,
  QuestionAnalysis,
  StudentDashboardStats,
  TeacherDashboardStats
} from '../types';
import { supabase, isSupabaseConfigured, checkSupabaseConfig, SUPABASE_PROJECT_URL, SUPABASE_PROJECT_REF } from './supabase';

/**
 * Universal table runner to support standard plural tables (users, students, exams, questions, options, attempts, answers, results)
 * with graceful fallback to singular if a schema variation exists.
 */
async function selectFromTable<T = any>(
  primaryTable: string,
  fallbackTable: string,
  queryBuilder: (tableName: string) => Promise<{ data: T | null; error: any; count?: number | null }>
): Promise<{ data: T | null; error: any; count?: number | null }> {
  const firstAttempt = await queryBuilder(primaryTable);
  if (
    firstAttempt.error &&
    typeof firstAttempt.error.message === 'string' &&
    (firstAttempt.error.message.includes('does not exist') || firstAttempt.error.code === '42P01')
  ) {
    console.warn(`[Supabase Table Fallback] Table "${primaryTable}" not found, trying "${fallbackTable}"`);
    return await queryBuilder(fallbackTable);
  }
  return firstAttempt;
}

function handleSupabaseError(error: any, contextMsg: string): never {
  console.error(`[Supabase Query Error] ${contextMsg}:`, error);
  const message = error?.message || error?.details || 'Database operation failed';
  throw new Error(`${contextMsg}: ${message}`);
}

export const api = {
  // --------------------------------------------------------------------------
  // AUTHENTICATION (Uses Supabase Auth as the primary source of truth)
  // --------------------------------------------------------------------------
  async login(email: string, password: string): Promise<{ token: string; user: User; student?: Student }> {
    const config = checkSupabaseConfig();
    if (!config.valid) {
      throw new Error(config.message);
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password.trim()
    });

    if (authError || !authData.user) {
      handleSupabaseError(authError || { message: 'Authentication failed' }, 'Login failed');
    }

    const token = authData.session?.access_token || '';

    // 2. Fetch the user profile created by the database trigger.
    // The frontend must never create a public.users row during login.
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (userError) {
      handleSupabaseError(userError, 'Failed to fetch user profile');
    }

    if (!userProfile) {
      throw new Error('User profile not found. Please contact support.');
    }

    // 3. If student, fetch Student profile
    let studentProfile: Student | undefined = undefined;
    if (userProfile.role === 'STUDENT') {
      const studentRes = await selectFromTable<Student>('students', 'student', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();
      });

      if (studentRes.data) {
        studentProfile = studentRes.data;
      } else {
        // Auto-create student profile if missing
        const meta = authData.user?.user_metadata || {};
        const rollNo = meta.roll_no || `ROLL-${Math.floor(1000 + Math.random() * 9000)}`;

        const createStudentRes = await selectFromTable<Student>('students', 'student', async (tbl) => {
          return await supabase
            .from(tbl)
            .insert({
              user_id: userProfile.user_id,
              name: userProfile.name,
              email: cleanEmail,
              roll_no: rollNo,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
        });

        if (createStudentRes.data) {
          studentProfile = createStudentRes.data;
        } else {
          // If it was created concurrently, fetch it again.
          const fetchStudentRes = await selectFromTable<Student>('students', 'student', async (tbl) => {
            return await supabase
              .from(tbl)
              .select('*')
              .ilike('email', cleanEmail)
              .maybeSingle();
          });
          studentProfile = fetchStudentRes.data || undefined;
        }
      }
    }

    return {
      token,
      user: userProfile as User,
      student: studentProfile
    };
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    roll_no?: string;
  }): Promise<{ token: string; user: User; student?: Student }> {
    const config = checkSupabaseConfig();
    if (!config.valid) {
      throw new Error(config.message);
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();
    const role = (data.role || 'STUDENT').toUpperCase();
    const rollNo = data.roll_no?.trim() || `ROLL-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Create the user in Supabase Auth.
    // The database trigger on auth.users automatically creates public.users.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: data.password.trim(),
      options: {
        data: {
          name: cleanName,
          role,
          roll_no: rollNo
        }
      }
    });

    if (authError) {
      handleSupabaseError(authError, 'Registration failed in Supabase Auth');
    }

    if (!authData.user) {
      throw new Error('Registration failed: Supabase did not create the user.');
    }

    // 2. IMPORTANT: Do NOT insert into public.users here.
    // The database trigger handle_new_auth_user() creates that row.
    // This avoids the RLS violation caused by a frontend INSERT.
    let createdUser: User | null = null;

    // If email confirmation is disabled, Supabase gives us a session immediately.
    // In that case we can fetch the profile created by the trigger.
    if (authData.session) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (userError) {
        handleSupabaseError(userError, 'Failed to fetch user profile');
      }

      createdUser = userData;

      // Give the trigger a moment if the row is not visible immediately.
      if (!createdUser) {
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 300));

          const { data: retryUser } = await supabase
            .from('users')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (retryUser) {
            createdUser = retryUser;
            break;
          }
        }
      }
    }

    // Email confirmation is enabled: Auth user exists but there is no session yet.
    // The trigger has still created public.users. The user can log in after confirming.
    if (!authData.session) {
      return {
        token: '',
        user: {
          user_id: 0,
          name: cleanName,
          email: cleanEmail,
          role: role as any,
          created_at: new Date().toISOString()
        } as User,
        student: undefined
      };
    }

    if (!createdUser) {
      throw new Error(
        'Account created, but the user profile could not be loaded. Please try logging in.'
      );
    }

    // 3. If STUDENT, create the student profile using the real user_id
    // generated by public.users. This is NOT a users-table insert.
    let createdStudent: Student | undefined = undefined;

    if (role === 'STUDENT') {
      const studentRes = await selectFromTable<Student>('students', 'student', async (tbl) => {
        return await supabase
          .from(tbl)
          .insert({
            user_id: createdUser!.user_id,
            name: cleanName,
            email: cleanEmail,
            roll_no: rollNo,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
      });

      if (studentRes.error) {
        // If a student row already exists, fetch it instead.
        const fetchRes = await selectFromTable<Student>('students', 'student', async (tbl) => {
          return await supabase
            .from(tbl)
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();
        });

        createdStudent = fetchRes.data || undefined;
      } else {
        createdStudent = studentRes.data || undefined;
      }
    }

    const token = authData.session.access_token;

    return {
      token,
      user: createdUser,
      student: createdStudent
    };
  },

  async getMe(): Promise<{ user: User; student?: Student }> {
    const config = checkSupabaseConfig();
    if (!config.valid) {
      throw new Error(config.message);
    }

    // Verify current authenticated session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser || !authUser.email) {
      throw new Error('Not authenticated');
    }

    const cleanEmail = authUser.email.toLowerCase();

    // Fetch the user profile created by the database trigger.
    // Never use a fake user_id fallback and never create users here.
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (userError) {
      handleSupabaseError(userError, 'Failed to fetch user profile');
    }

    if (!userProfile) {
      throw new Error('User profile not found. Please contact support.');
    }

    // Fetch student profile if student
    let studentProfile: Student | undefined = undefined;
    if (userProfile.role === 'STUDENT') {
      const studentRes = await selectFromTable<Student>('students', 'student', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('user_id', userProfile.user_id)
          .maybeSingle();
      });

      if (studentRes.data) {
        studentProfile = studentRes.data;
      } else {
        const studentByEmail = await selectFromTable<Student>('students', 'student', async (tbl) => {
          return await supabase
            .from(tbl)
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();
        });
        studentProfile = studentByEmail.data || undefined;
      }

      if (!studentProfile) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const beRes = await fetch('/api/auth/me', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (beRes.ok) {
              const beData = await beRes.json();
              if (beData.student) {
                studentProfile = beData.student;
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    return {
      user: userProfile as User,
      student: studentProfile
    };
  },

  async forgotPassword(email: string, newPassword?: string): Promise<{ message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (newPassword) {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) handleSupabaseError(error, 'Password reset request failed');
      return { message: 'Password reset link sent to your registered email.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) handleSupabaseError(error, 'Password reset request failed');
    return { message: 'Password reset link sent to your registered email.' };
  },

  // --------------------------------------------------------------------------
  // EXAMS (Direct Supabase SELECT, INSERT, UPDATE, DELETE with Server Fallbacks)
  // --------------------------------------------------------------------------
  async createExam(data: {
    title: string;
    description?: string;
    duration_minutes: number | string;
    total_marks?: number | string;
    passing_percentage?: number | string;
    is_published?: boolean;
    status?: string;
    questions?: Array<{
      question_text: string;
      marks?: number | string;
      order_num?: number;
      question_order?: number;
      options?: Array<{
        option_text: string;
        option_label?: string;
        is_correct?: boolean;
        isCorrect?: boolean;
      }>;
    }>;
  }): Promise<{ message: string; exam: Exam }> {
    // 1. Verify current authenticated user via Supabase Auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser || !authUser.email) {
      throw new Error('Authentication required: Please log in as faculty to create an exam.');
    }

    // 2. Fetch authenticated faculty user's profile from database
    const cleanEmail = authUser.email.toLowerCase();
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (userError || !userProfile) {
      throw new Error('User profile not found in database. Please log in again.');
    }

    // 3. Verify teacher/faculty or admin role
    const roleUpper = String(userProfile.role || '').toUpperCase();
    if (roleUpper !== 'TEACHER' && roleUpper !== 'ADMIN') {
      throw new Error('Unauthorized: Only faculty members (teachers/admins) are permitted to create examinations.');
    }

    const facultyUserId = userProfile.user_id;

    // 4. Validate input values
    if (!data.title || !data.title.trim()) {
      throw new Error('Exam title is required.');
    }

    const durationMinutes = Math.max(1, Number(data.duration_minutes) || 30);
    const passingPercentage = Math.min(100, Math.max(0, Number(data.passing_percentage ?? 40)));
    const initialStatus = data.status || (data.is_published !== false ? 'PUBLISHED' : 'DRAFT');

    // Calculate marks from questions if provided
    let totalMarks = Number(data.total_marks) || 0;
    if (Array.isArray(data.questions) && data.questions.length > 0) {
      const computed = data.questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
      if (computed > 0) totalMarks = computed;
    }
    if (totalMarks <= 0) totalMarks = 100;

    // 5. Insert exam row into Supabase 'exams' table
    let createdExamRow: any = null;
    let insertError: any = null;

    const res = await selectFromTable<any>('exams', 'exam', async (tbl) => {
      return await supabase
        .from(tbl)
        .insert({
          title: data.title.trim(),
          description: (data.description || '').trim(),
          duration_minutes: durationMinutes,
          total_marks: totalMarks,
          passing_percentage: passingPercentage,
          status: initialStatus,
          created_by: facultyUserId,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
    });

    if (!res.error && res.data) {
      createdExamRow = res.data;
    } else {
      insertError = res.error;
    }

    // If direct Supabase insert encountered RLS or error, use server-side authenticated creation fallback
    if (insertError || !createdExamRow) {
      console.warn('[api.createExam] Direct Supabase insert policy guard, executing backend Supabase creation handler:', insertError?.message);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const apiRes = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: data.title.trim(),
          description: (data.description || '').trim(),
          duration_minutes: durationMinutes,
          total_marks: totalMarks,
          passing_percentage: passingPercentage,
          is_published: initialStatus === 'PUBLISHED',
          status: initialStatus,
          questions: data.questions
        })
      });

      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        handleSupabaseError(insertError || errJson, 'Failed to create exam in Supabase');
      }

      const resBody = await apiRes.json();
      const serverExam: Exam = {
        ...resBody.exam,
        is_published: resBody.exam.is_published === true || String(resBody.exam.status || '').toUpperCase() === 'PUBLISHED',
        status: resBody.exam.status || initialStatus
      };

      return {
        message: resBody.message || 'Exam created successfully',
        exam: serverExam
      };
    }

    // 6. Direct insert of questions and options if provided
    const examId = createdExamRow.exam_id;
    let questionsCount = 0;

    if (Array.isArray(data.questions) && data.questions.length > 0) {
      for (let idx = 0; idx < data.questions.length; idx++) {
        const q = data.questions[idx];
        const qOrder = q.question_order ?? q.order_num ?? (idx + 1);
        const qMarks = Number(q.marks) || 1;

        const qRes = await selectFromTable<any>('questions', 'question', async (tbl) => {
          return await supabase
            .from(tbl)
            .insert({
              exam_id: examId,
              question_text: q.question_text.trim(),
              marks: qMarks,
              question_order: qOrder,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
        });

        if (!qRes.error && qRes.data) {
          questionsCount++;
          const createdQ = qRes.data;
          const rawOpts = q.options || [];
          const optionsToInsert = rawOpts.map((opt, optIdx) => ({
            question_id: createdQ.question_id,
            option_label: opt.option_label || String.fromCharCode(65 + optIdx),
            option_text: opt.option_text.trim(),
            is_correct: Boolean(opt.is_correct ?? opt.isCorrect),
            created_at: new Date().toISOString()
          }));

          if (optionsToInsert.length > 0) {
            await selectFromTable('options', 'option', async (tbl) => {
              return await supabase.from(tbl).insert(optionsToInsert);
            });
          }
        }
      }
    }

    const createdExam: Exam = {
      ...createdExamRow,
      is_published: createdExamRow.is_published === true || String(createdExamRow.status || '').toUpperCase() === 'PUBLISHED',
      status: createdExamRow.status || initialStatus,
      question_count: questionsCount
    };

    return {
      message: 'Exam created successfully',
      exam: createdExam
    };
  },

  async getExams(): Promise<Exam[]> {
    let exams: Exam[] = [];

    const res = await selectFromTable<any[]>(
      'exams',
      'exam',
      async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .order('exam_id', { ascending: true });
      }
    );

    if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
      exams = res.data.map((exam: any) => ({
        ...exam,
        is_published:
          exam.is_published === true ||
          String(exam.status || '').toUpperCase() === 'PUBLISHED',
        status: exam.status || (exam.is_published ? 'PUBLISHED' : 'DRAFT')
      }));
    } else {
      // If direct client query returns empty (e.g. Supabase RLS restrictions), fetch from server
      try {
        const response = await fetch('/api/exams');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            exams = data.map((exam: any) => ({
              ...exam,
              is_published:
                exam.is_published === true ||
                String(exam.status || '').toUpperCase() === 'PUBLISHED',
              status: exam.status || (exam.is_published ? 'PUBLISHED' : 'DRAFT')
            }));
          }
        }
      } catch (err) {
        console.warn('[api.getExams] Server fallback fetch:', err);
      }
    }

    // Populate question counts
    for (const exam of exams) {
      if (exam.question_count === undefined) {
        const qRes = await selectFromTable(
          'questions',
          'question',
          async (qTbl) => {
            return await supabase
              .from(qTbl)
              .select('question_id', {
                count: 'exact',
                head: true,
              })
              .eq('exam_id', exam.exam_id);
          }
        );

        exam.question_count = qRes.count ?? 0;
      }
    }

    return exams;
  },

  async getExamById(examId: number): Promise<Exam> {
    const res = await selectFromTable<any>('exams', 'exam', async (tbl) => {
      return await supabase
        .from(tbl)
        .select('*')
        .eq('exam_id', examId)
        .single();
    });

    if (!res.error && res.data) {
      return {
        ...res.data,
        is_published:
          res.data.is_published === true ||
          String(res.data.status || '').toUpperCase() === 'PUBLISHED',
        status: res.data.status || (res.data.is_published ? 'PUBLISHED' : 'DRAFT')
      } as Exam;
    }

    // Server fallback
    try {
      const response = await fetch(`/api/exams/${examId}`);
      if (response.ok) {
        const data = await response.json();
        return {
          ...data,
          is_published:
            data.is_published === true ||
            String(data.status || '').toUpperCase() === 'PUBLISHED',
          status: data.status || (data.is_published ? 'PUBLISHED' : 'DRAFT')
        } as Exam;
      }
    } catch (err) {
      console.warn(`[api.getExamById] Server fallback for #${examId}:`, err);
    }

    handleSupabaseError(res.error, `Exam #${examId} not found`);
  },

  async togglePublishExam(examId: number): Promise<{
    message: string;
    is_published: boolean;
    status: string;
    exam?: Exam;
  }> {
    const current = await this.getExamById(examId);
    const currentlyPublished =
      current.is_published ||
      String(current.status || '').toUpperCase() === 'PUBLISHED';
    const newStatus = currentlyPublished ? 'DRAFT' : 'PUBLISHED';
    const newIsPublished = !currentlyPublished;

    const res = await selectFromTable<any>('exams', 'exam', async (tbl) => {
      return await supabase
        .from(tbl)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('exam_id', examId)
        .select()
        .single();
    });

    if (!res.error && res.data) {
      return {
        message: `Exam status successfully updated to ${newStatus}`,
        is_published: newIsPublished,
        status: newStatus,
        exam: {
          ...res.data,
          is_published: newIsPublished,
          status: newStatus
        }
      };
    }

    // Fallback to server route PATCH /api/exams/:id/publish
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    const response = await fetch(`/api/exams/${examId}/publish`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ is_published: newIsPublished })
    });

    if (response.ok) {
      const json = await response.json();
      return {
        message: json.message || `Exam status changed to ${newStatus}`,
        is_published: newIsPublished,
        status: newStatus,
        exam: {
          ...json.exam,
          is_published: newIsPublished,
          status: newStatus
        }
      };
    }

    handleSupabaseError(res.error, `Failed to toggle publish status for exam #${examId}`);
  },

  async deleteExam(examId: number): Promise<{ message: string }> {
    const res = await selectFromTable('exams', 'exam', async (tbl) => {
      return await supabase.from(tbl).delete().eq('exam_id', examId);
    });

    if (!res.error) {
      return { message: `Exam #${examId} deleted successfully` };
    }

    // Fallback to server route DELETE /api/exams/:id
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    const response = await fetch(`/api/exams/${examId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      return { message: `Exam #${examId} deleted successfully` };
    }

    handleSupabaseError(res.error, `Failed to delete exam #${examId}`);
  },

  // --------------------------------------------------------------------------
  // QUESTIONS & OPTIONS
  // --------------------------------------------------------------------------
  async getExamQuestions(examId: number): Promise<Question[]> {
    const qRes = await selectFromTable<any[]>('questions', 'question', async (tbl) => {
      return await supabase
        .from(tbl)
        .select('*')
        .eq('exam_id', examId)
        .order('question_order', { ascending: true });
    });

    let questionRows = qRes.data || [];

    // Fallback to server route if empty or error
    if (questionRows.length === 0) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || '';
        const srvRes = await fetch(`/api/exams/${examId}/questions`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (srvRes.ok) {
          const srvData = await srvRes.json();
          if (Array.isArray(srvData) && srvData.length > 0) {
            return srvData.map((q: any) => ({
              question_id: q.question_id,
              exam_id: q.exam_id,
              question_text: q.question_text,
              marks: Number(q.marks) || 1,
              order_num: q.question_order ?? q.order_num,
              created_at: q.created_at,
              options: (q.options || []).map((o: any) => ({
                option_id: o.option_id,
                question_id: o.question_id,
                option_label: o.option_label,
                option_text: o.option_text,
                is_correct: Boolean(o.is_correct)
              }))
            }));
          }
        }
      } catch (err) {
        console.warn(`[api.getExamQuestions] Server questions fallback #${examId}:`, err);
      }
    }

    if (questionRows.length === 0) return [];

    const questionIds = questionRows.map((q) => q.question_id);

    // Fetch options for all question IDs
    const optRes = await selectFromTable<Option[]>('options', 'option', async (tbl) => {
      return await supabase
        .from(tbl)
        .select('*')
        .in('question_id', questionIds);
    });

    const optionRows: Option[] = optRes.data || [];

    return questionRows.map((q) => ({
      question_id: q.question_id,
      exam_id: q.exam_id,
      question_text: q.question_text,
      marks: Number(q.marks) || 1,
      order_num: q.question_order ?? q.order_num,
      created_at: q.created_at,
      options: optionRows
        .filter((opt) => opt.question_id === q.question_id)
        .map((opt) => ({
          option_id: opt.option_id,
          question_id: opt.question_id,
          option_label: (opt as any).option_label,
          option_text: opt.option_text,
          is_correct: Boolean(opt.is_correct),
          created_at: opt.created_at
        }))
    }));
  },

  async addQuestion(
    examId: number,
    data: {
      question_text: string;
      marks: number;
      options: { option_label?: string; option_text: string; is_correct: boolean }[];
    }
  ): Promise<{ message: string; question: Question }> {
    // 1. Get next question_order
    let nextOrder = 1;
    try {
      const existing = await this.getExamQuestions(examId);
      nextOrder = existing.length + 1;
    } catch {
      nextOrder = 1;
    }

    // 2. Insert question row
    const qRes = await selectFromTable<any>('questions', 'question', async (tbl) => {
      return await supabase
        .from(tbl)
        .insert({
          exam_id: examId,
          question_text: data.question_text.trim(),
          marks: Number(data.marks) || 1,
          question_order: nextOrder,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
    });

    if (!qRes.error && qRes.data) {
      const createdQuestion = qRes.data;

      // 3. Insert options
      const optionsToInsert = (data.options || []).map((opt, optIdx) => ({
        question_id: createdQuestion.question_id,
        option_label: opt.option_label || String.fromCharCode(65 + optIdx),
        option_text: opt.option_text.trim(),
        is_correct: Boolean(opt.is_correct),
        created_at: new Date().toISOString()
      }));

      let insertedOptions: Option[] = [];
      if (optionsToInsert.length > 0) {
        const optRes = await selectFromTable<Option[]>('options', 'option', async (tbl) => {
          return await supabase
            .from(tbl)
            .insert(optionsToInsert)
            .select();
        });
        if (optRes.data) {
          insertedOptions = optRes.data;
        }
      }

      return {
        message: 'Question added successfully',
        question: {
          question_id: createdQuestion.question_id,
          exam_id: examId,
          question_text: createdQuestion.question_text,
          marks: createdQuestion.marks,
          order_num: createdQuestion.question_order ?? nextOrder,
          created_at: createdQuestion.created_at,
          options: insertedOptions
        }
      };
    }

    // Fallback to server route POST /api/exams/:examId/questions
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    const response = await fetch(`/api/exams/${examId}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        question_text: data.question_text.trim(),
        marks: Number(data.marks) || 1,
        options: data.options
      })
    });

    if (response.ok) {
      const json = await response.json();
      return {
        message: json.message || 'Question added successfully',
        question: json.question
      };
    }

    handleSupabaseError(qRes.error, 'Failed to add question');
  },

  async updateQuestion(
    questionId: number,
    data: {
      question_text?: string;
      marks?: number;
      options?: { option_id?: number; option_label?: string; option_text: string; is_correct: boolean }[];
    }
  ): Promise<{ message: string; question: Question }> {
    const qUpdate: any = {};
    if (data.question_text !== undefined) qUpdate.question_text = data.question_text;
    if (data.marks !== undefined) qUpdate.marks = Number(data.marks);

    let updatedSuccess = false;

    if (Object.keys(qUpdate).length > 0) {
      const qRes = await selectFromTable('questions', 'question', async (tbl) => {
        return await supabase
          .from(tbl)
          .update(qUpdate)
          .eq('question_id', questionId);
      });
      if (!qRes.error) updatedSuccess = true;
    }

    // If options provided, update them
    if (Array.isArray(data.options)) {
      await selectFromTable('options', 'option', async (tbl) => {
        return await supabase.from(tbl).delete().eq('question_id', questionId);
      });

      const optionsToInsert = data.options.map((opt, optIdx) => ({
        question_id: questionId,
        option_label: opt.option_label || String.fromCharCode(65 + optIdx),
        option_text: opt.option_text,
        is_correct: Boolean(opt.is_correct),
        created_at: new Date().toISOString()
      }));

      await selectFromTable('options', 'option', async (tbl) => {
        return await supabase.from(tbl).insert(optionsToInsert);
      });
      updatedSuccess = true;
    }

    if (updatedSuccess) {
      const questions = await this.getExamQuestions(questionId);
      const updated = questions.find((q) => q.question_id === questionId);

      return {
        message: 'Question updated successfully',
        question: updated || ({} as Question)
      };
    }

    // Fallback to server route PUT /api/questions/:id
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    const response = await fetch(`/api/questions/${questionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      const json = await response.json();
      return {
        message: json.message || 'Question updated successfully',
        question: json.question
      };
    }

    throw new Error(`Failed to update question #${questionId}`);
  },

  async deleteQuestion(questionId: number): Promise<{ message: string }> {
    const res = await selectFromTable('questions', 'question', async (tbl) => {
      return await supabase
        .from(tbl)
        .delete()
        .eq('question_id', questionId);
    });

    if (!res.error) {
      return { message: `Question #${questionId} deleted successfully` };
    }

    // Fallback to server route DELETE /api/questions/:id
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    const response = await fetch(`/api/questions/${questionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      return { message: `Question #${questionId} deleted successfully` };
    }

    handleSupabaseError(res.error, `Failed to delete question #${questionId}`);
  },

  // --------------------------------------------------------------------------
  // ATTEMPTS & ANSWERS (LIVE EXAMINATION WORKFLOW)
  // --------------------------------------------------------------------------
  async startAttempt(examId: number): Promise<{
    message: string;
    attempt: Attempt;
    remaining_seconds: number;
    is_resumed: boolean;
  }> {
    // 1. Get authenticated student
    const me = await this.getMe();
    if (!me.student) {
      throw new Error('Only registered students can take examinations.');
    }
    const studentId = me.student.student_id;

    // 2. Fetch exam info
    const exam = await this.getExamById(examId);

    // 3. Check for existing active attempt
    const existingRes = await selectFromTable<Attempt>('attempts', 'attempt', async (tbl) => {
      return await supabase
        .from(tbl)
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', studentId)
        .eq('status', 'IN_PROGRESS')
        .order('created_at', { ascending: false })
        .maybeSingle();
    });

    if (existingRes.data) {
      const startTime = new Date(existingRes.data.start_time).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const totalAllowed = (exam.duration_minutes || 30) * 60;
      const remaining = Math.max(0, totalAllowed - elapsed);

      return {
        message: 'Resuming ongoing examination attempt',
        attempt: existingRes.data,
        remaining_seconds: remaining,
        is_resumed: true
      };
    }

    // 4. Create new attempt.
    // Prefer the authenticated server handler first. This avoids making the
    // student-facing client depend on a table-specific INSERT RLS policy.
    // The server route must verify the same Supabase session and student
    // ownership before inserting the attempt.
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';

    if (!token) {
      throw new Error('Authenticated session not found. Please log in again.');
    }

    try {
      const apiRes = await fetch(`/api/exams/${examId}/attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (apiRes.ok) {
        const resBody = await apiRes.json();

        if (resBody?.attempt) {
          return {
            message: resBody.message || 'Exam attempt started',
            attempt: resBody.attempt,
            remaining_seconds:
              Number(resBody.remaining_seconds) ||
              (exam.duration_minutes || 30) * 60,
            is_resumed: Boolean(resBody.is_resumed)
          };
        }
      } else {
        const errJson = await apiRes.json().catch(() => ({}));
        console.warn(
          '[api.startAttempt] Server attempt handler failed:',
          errJson?.error || errJson?.message || apiRes.statusText
        );
      }
    } catch (serverErr: any) {
      console.warn(
        '[api.startAttempt] Server attempt handler unavailable:',
        serverErr?.message || serverErr
      );
    }

    // 5. Client fallback. This is kept for deployments where the server
    // route is unavailable. It still relies on the existing RLS policy.
    try {
      const newAttemptRes = await selectFromTable<Attempt>('attempts', 'attempt', async (tbl) => {
        return await supabase
          .from(tbl)
          .insert({
            exam_id: examId,
            student_id: studentId,
            start_time: new Date().toISOString(),
            status: 'IN_PROGRESS',
            created_at: new Date().toISOString()
          })
          .select()
          .single();
      });

      if (!newAttemptRes.error && newAttemptRes.data) {
        const newAttemptRow = newAttemptRes.data;

        return {
          message: 'Examination session initiated',
          attempt: newAttemptRow,
          remaining_seconds: (exam.duration_minutes || 30) * 60,
          is_resumed: false
        };
      }

      handleSupabaseError(
        newAttemptRes.error,
        `Failed to start examination attempt for exam #${examId}`
      );
    } catch (clientErr: any) {
      handleSupabaseError(
        clientErr,
        `Failed to start examination attempt for exam #${examId}`
      );
    }
  },

  async getAttempt(attemptId: number): Promise<{
    attempt: Attempt;
    exam: Exam;
    student: Student;
    questions: Question[];
    answers: Array<{
      answer_id: number;
      attempt_id: number;
      question_id: number;
      selected_option_id: number | null;
      is_marked_for_review: boolean;
    }>;
    result?: Result;
    remaining_seconds: number;
  }> {
    try {
      // 1. Fetch attempt
      const attRes = await selectFromTable<Attempt>('attempts', 'attempt', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('attempt_id', attemptId)
          .single();
      });

      if (attRes.error || !attRes.data) {
        throw attRes.error || new Error(`Attempt #${attemptId} not found`);
      }

      const attempt = attRes.data;

      // 2. Fetch exam & student
      const exam = await this.getExamById(attempt.exam_id);
      const stuRes = await selectFromTable<Student>('students', 'student', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('student_id', attempt.student_id)
          .single();
      });
      const student = stuRes.data || ({} as Student);

      // 3. Fetch questions (mask is_correct for students during active exam)
      const questions = (await this.getExamQuestions(attempt.exam_id)).map((q) => ({
        ...q,
        options: q.options.map((opt) => ({
          ...opt,
          is_correct: attempt.status === 'SUBMITTED' ? opt.is_correct : undefined
        }))
      }));

      // 4. Fetch existing answers
      const ansRes = await selectFromTable<any[]>('answers', 'answer', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('attempt_id', attemptId);
      });
      const answers = ansRes.data || [];

      // Calculate remaining time
      const startTime = new Date(attempt.start_time).getTime();
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const totalDurationSeconds = (exam.duration_minutes || 30) * 60;
      const remaining_seconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

      return {
        attempt,
        exam,
        student,
        questions,
        answers,
        remaining_seconds
      };
    } catch (clientErr: any) {
      // Direct query fallback to backend authenticated handler
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const apiRes = await fetch(`/api/attempts/${attemptId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        handleSupabaseError(clientErr || errJson, errJson?.error || `Failed to fetch attempt #${attemptId}`);
      }

      const body = await apiRes.json();
      return body;
    }
  },

  async saveAnswer(
    attemptId: number,
    data: { question_id: number; selected_option_id: number | null; is_marked_for_review?: boolean }
  ): Promise<{ message: string }> {
    let saveErr: any = null;
    try {
      // Check if answer already exists
      const existing = await selectFromTable<any>('answers', 'answer', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('attempt_id', attemptId)
          .eq('question_id', data.question_id)
          .maybeSingle();
      });

      if (existing.data) {
        const updateRes = await selectFromTable('answers', 'answer', async (tbl) => {
          return await supabase
            .from(tbl)
            .update({
              selected_option_id: data.selected_option_id,
              is_marked_for_review: Boolean(data.is_marked_for_review),
              updated_at: new Date().toISOString()
            })
            .eq('answer_id', existing.data.answer_id);
        });
        if (updateRes.error) saveErr = updateRes.error;
      } else {
        const insertRes = await selectFromTable('answers', 'answer', async (tbl) => {
          return await supabase
            .from(tbl)
            .insert({
              attempt_id: attemptId,
              question_id: data.question_id,
              selected_option_id: data.selected_option_id,
              is_marked_for_review: Boolean(data.is_marked_for_review),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
        });
        if (insertRes.error) saveErr = insertRes.error;
      }
    } catch (e) {
      saveErr = e;
    }

    if (saveErr) {
      // Direct update/insert encountered RLS or error, use server-side authenticated handler
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const apiRes = await fetch(`/api/attempts/${attemptId}/answers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        handleSupabaseError(saveErr || errJson, errJson?.error || 'Failed to save answer');
      }
    }

    return { message: 'Answer saved' };
  },

  async submitAttempt(
    attemptId: number,
    data?: { answers?: Array<{ question_id: number; selected_option_id: number | null }> }
  ): Promise<{ message: string; result: Result; attempt: Attempt }> {
    try {
      // 1. Save any submitted answers
      if (data?.answers && Array.isArray(data.answers)) {
        for (const ans of data.answers) {
          await this.saveAnswer(attemptId, ans);
        }
      }

      // 2. Fetch attempt & exam info
      const attRes = await selectFromTable<Attempt>('attempts', 'attempt', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('attempt_id', attemptId)
          .single();
      });

      if (attRes.error || !attRes.data) {
        throw attRes.error || new Error('Attempt not found during submission');
      }

      const attempt = attRes.data;
      const exam = await this.getExamById(attempt.exam_id);

      // 3. Fetch questions and evaluate
      const questions = await this.getExamQuestions(attempt.exam_id);
      const ansRes = await selectFromTable<any[]>('answers', 'answer', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('attempt_id', attemptId);
      });
      const savedAnswers = ansRes.data || [];

      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;
      let earnedMarks = 0;
      let totalPossibleMarks = 0;

      for (const q of questions) {
        const qMarks = q.marks || 1;
        totalPossibleMarks += qMarks;

        const ans = savedAnswers.find((a) => a.question_id === q.question_id);
        if (!ans || ans.selected_option_id === null || ans.selected_option_id === undefined) {
          unansweredCount++;
        } else {
          const correctOpt = q.options.find((o) => o.is_correct);
          if (correctOpt && correctOpt.option_id === ans.selected_option_id) {
            correctCount++;
            earnedMarks += qMarks;
          } else {
            incorrectCount++;
          }
        }
      }

      const percentage = totalPossibleMarks > 0
        ? Math.round((earnedMarks / totalPossibleMarks) * 100 * 100) / 100
        : 0;
      const passStatus = percentage >= (exam.passing_percentage || 40) ? 'PASSED' : 'FAILED';

      const endTime = new Date().toISOString();
      const startTime = new Date(attempt.start_time).getTime();
      const timeTakenSeconds = Math.max(1, Math.floor((Date.now() - startTime) / 1000));

      // 4. Update attempt status to SUBMITTED
      const updatedAttRes = await selectFromTable<Attempt>('attempts', 'attempt', async (tbl) => {
        return await supabase
          .from(tbl)
          .update({
            status: 'SUBMITTED',
            end_time: endTime
          })
          .eq('attempt_id', attemptId)
          .select()
          .single();
      });

      const updatedAttempt = updatedAttRes.data || attempt;

      // 5. Insert result record in 'results' table
      const resultPayload = {
        attempt_id: attemptId,
        score: earnedMarks,
        percentage,
        pass_status: passStatus,
        total_questions: questions.length,
        correct_answers: correctCount,
        incorrect_answers: incorrectCount,
        unanswered_questions: unansweredCount,
        time_taken_seconds: timeTakenSeconds,
        created_at: endTime
      };

      const resRes = await selectFromTable<Result>('results', 'result', async (tbl) => {
        return await supabase
          .from(tbl)
          .upsert(resultPayload, { onConflict: 'attempt_id' })
          .select()
          .single();
      });

      if (resRes.error || !resRes.data) {
        throw resRes.error || new Error('Failed to save evaluation result in Supabase');
      }

      return {
        message: 'Examination submitted and evaluated successfully',
        result: resRes.data,
        attempt: updatedAttempt
      };
    } catch (submitErr: any) {
      console.warn('[api.submitAttempt] Direct Supabase submission fallback to backend evaluation handler:', submitErr?.message);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const apiRes = await fetch(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: data?.answers || [] })
      });

      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        handleSupabaseError(submitErr || errJson, errJson?.error || 'Failed to submit examination');
      }

      const resBody = await apiRes.json();
      return {
        message: resBody.message || 'Examination submitted and evaluated successfully',
        result: resBody.result,
        attempt: resBody.attempt
      };
    }
  },

  // --------------------------------------------------------------------------
  // RESULTS & ANALYTICS
  // --------------------------------------------------------------------------
  async getResultById(resultId: number): Promise<DetailedResultResponse> {
    try {
      const res = await selectFromTable<Result>('results', 'result', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('result_id', resultId)
          .single();
      });

      if (res.error || !res.data) {
        throw res.error || new Error(`Result #${resultId} not found`);
      }

      const result = res.data;

      // Fetch attempt
      const attRes = await selectFromTable<Attempt>('attempts', 'attempt', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('attempt_id', result.attempt_id)
          .single();
      });
      const attempt = attRes.data || ({} as Attempt);

      // Fetch exam & student
      const exam = await this.getExamById(attempt.exam_id);
      const stuRes = await selectFromTable<Student>('students', 'student', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('student_id', attempt.student_id)
          .single();
      });
      const student = stuRes.data || ({} as Student);

      // Fetch questions & answers for analysis
      const questions = await this.getExamQuestions(attempt.exam_id);
      const ansRes = await selectFromTable<any[]>('answers', 'answer', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('attempt_id', attempt.attempt_id);
      });
      const answers = ansRes.data || [];

      const analysis: QuestionAnalysis[] = questions.map((q) => {
        const studentAns = answers.find((a) => a.question_id === q.question_id);
        const selectedOpt = q.options.find((o) => o.option_id === studentAns?.selected_option_id);
        const correctOpt = q.options.find((o) => o.is_correct);
        const isCorrect = Boolean(selectedOpt && selectedOpt.is_correct);

        return {
          question_id: q.question_id,
          question_text: q.question_text,
          marks: q.marks,
          selected_option_id: studentAns?.selected_option_id ?? null,
          selected_option_text: selectedOpt?.option_text || null,
          correct_option_id: correctOpt?.option_id || 0,
          correct_option_text: correctOpt?.option_text || '',
          is_correct: isCorrect,
          marks_obtained: isCorrect ? q.marks : 0,
          is_marked_for_review: Boolean(studentAns?.is_marked_for_review),
          options: q.options
        };
      });

      return {
        result,
        attempt,
        exam,
        student,
        analysis
      };
    } catch (clientErr: any) {
      // Direct query fallback to backend authenticated handler
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const apiRes = await fetch(`/api/results/${resultId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!apiRes.ok) {
        const errJson = await apiRes.json().catch(() => ({}));
        handleSupabaseError(clientErr || errJson, errJson?.error || `Failed to fetch result #${resultId}`);
      }

      const body = await apiRes.json();
      return body;
    }
  },

  async getStudentResults(studentId: number): Promise<Result[]> {
    try {
      // 1. Get attempts for this student
      const attRes = await selectFromTable<Attempt[]>('attempts', 'attempt', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('student_id', studentId);
      });

      const attempts = attRes.data || [];
      if (attempts.length === 0) return [];

      const attemptIds = attempts.map((a) => a.attempt_id);

      // 2. Get results for these attempts
      const resRes = await selectFromTable<Result[]>('results', 'result', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .in('attempt_id', attemptIds);
      });

      if (resRes.error) {
        throw resRes.error;
      }

      const results = resRes.data || [];

      // Attach exam metadata
      for (const r of results) {
        const att = attempts.find((a) => a.attempt_id === r.attempt_id);
        if (att) {
          try {
            const ex = await this.getExamById(att.exam_id);
            r.exam_id = ex.exam_id;
            r.exam_title = ex.title;
            r.total_marks = ex.total_marks;
            r.passing_percentage = ex.passing_percentage;
          } catch {}
        }
      }

      return results;
    } catch {
      // Direct query fallback to backend authenticated handler
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const apiRes = await fetch(`/api/students/${studentId}/results`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (apiRes.ok) {
        const body = await apiRes.json();
        return body || [];
      }
      return [];
    }
  },

  async getExamResults(examId: number): Promise<{ exam: Exam; total_attempts: number; attempts: any[] }> {
    const exam = await this.getExamById(examId);

    const attRes = await selectFromTable<Attempt[]>('attempts', 'attempt', async (tbl) => {
      return await supabase
        .from(tbl)
        .select('*')
        .eq('exam_id', examId);
    });

    const attempts = attRes.data || [];
    return {
      exam,
      total_attempts: attempts.length,
      attempts
    };
  },

  // --------------------------------------------------------------------------
  // STUDENTS DIRECTORY
  // --------------------------------------------------------------------------
  async getStudents(): Promise<
    Array<Student & { total_attempts: number; completed_attempts: number; passed_count: number; average_percentage: number }>
  > {
    const res = await selectFromTable<Student[]>('students', 'student', async (tbl) => {
      return await supabase
        .from(tbl)
        .select('*')
        .order('created_at', { ascending: false });
    });

    if (res.error) {
      handleSupabaseError(res.error, 'Failed to fetch students');
    }

    const students = res.data || [];
    const enriched: any[] = [];

    for (const s of students) {
      const attRes = await selectFromTable<any[]>('attempts', 'attempt', async (tbl) => {
        return await supabase
          .from(tbl)
          .select('attempt_id, status')
          .eq('student_id', s.student_id);
      });

      const attempts = attRes.data || [];
      const completed = attempts.filter((a) => a.status === 'SUBMITTED');

      enriched.push({
        ...s,
        total_attempts: attempts.length,
        completed_attempts: completed.length,
        passed_count: 0,
        average_percentage: 0
      });
    }

    return enriched;
  },

  async getStudentById(id: number): Promise<{
    student: Student;
    total_attempts: number;
    completed_exams: number;
    average_score: number;
    average_percentage: number;
    pass_rate: number;
    attempts: any[];
  }> {
    const stuRes = await selectFromTable<Student>('students', 'student', async (tbl) => {
      return await supabase
        .from(tbl)
        .select('*')
        .eq('student_id', id)
        .single();
    });

    if (stuRes.error || !stuRes.data) {
      handleSupabaseError(stuRes.error, `Student #${id} not found`);
    }

    const student = stuRes.data;
    const results = await this.getStudentResults(id);

    const totalAttempts = results.length;
    const passCount = results.filter((r) => r.pass_status === 'PASSED').length;
    const avgScore = totalAttempts > 0 ? results.reduce((acc, r) => acc + Number(r.score), 0) / totalAttempts : 0;
    const avgPct = totalAttempts > 0 ? results.reduce((acc, r) => acc + Number(r.percentage), 0) / totalAttempts : 0;
    const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;

    return {
      student,
      total_attempts: totalAttempts,
      completed_exams: totalAttempts,
      average_score: Math.round(avgScore * 10) / 10,
      average_percentage: Math.round(avgPct * 10) / 10,
      pass_rate: passRate,
      attempts: results
    };
  },

  // --------------------------------------------------------------------------
  // DASHBOARDS
  // --------------------------------------------------------------------------
  async getStudentDashboard(): Promise<StudentDashboardStats> {
  const me = await this.getMe();

  if (!me.student) {
    throw new Error('Student profile not found');
  }

  const student = me.student;

  // Get ALL exams from Supabase
  const allExams = await this.getExams();

  // Your database uses status = PUBLISHED
  const availableExams = allExams.filter((exam: any) => {
    return (
      String(exam.status || '').toUpperCase() === 'PUBLISHED' ||
      exam.is_published === true
    );
  });

  const recentResults =
    await this.getStudentResults(student.student_id);

  // Add student's attempt information
  for (const exam of availableExams) {
    const attRes = await selectFromTable<Attempt>(
      'attempts',
      'attempt',
      async (tbl) => {
        return await supabase
          .from(tbl)
          .select('*')
          .eq('exam_id', exam.exam_id)
          .eq('student_id', student.student_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      }
    );

    if (attRes.data) {
      exam.user_attempt_status = attRes.data.status;
      exam.user_attempt_id = attRes.data.attempt_id;

      const resRes = await selectFromTable<Result>(
        'results',
        'result',
        async (tbl) => {
          return await supabase
            .from(tbl)
            .select('*')
            .eq('attempt_id', attRes.data!.attempt_id)
            .maybeSingle();
        }
      );

      if (resRes.data) {
        exam.user_last_score = resRes.data.score;
        exam.user_last_percentage = resRes.data.percentage;
        exam.user_last_result_id = resRes.data.result_id;
      }
    }
  }

  const total = recentResults.length;

  const passCount = recentResults.filter(
    (r) => r.pass_status === 'PASSED'
  ).length;

  const failCount = total - passCount;

  const avgScore =
    total > 0
      ? recentResults.reduce(
          (acc, r) => acc + Number(r.score),
          0
        ) / total
      : 0;

  const avgPct =
    total > 0
      ? recentResults.reduce(
          (acc, r) => acc + Number(r.percentage),
          0
        ) / total
      : 0;

  return {
    student,
    total_attempts: total,
    completed_exams: total,
    average_score: Math.round(avgScore * 10) / 10,
    average_percentage: Math.round(avgPct * 10) / 10,
    pass_count: passCount,
    fail_count: failCount,
    pass_rate:
      total > 0
        ? Math.round((passCount / total) * 100)
        : 0,
    recent_results: recentResults.slice(0, 5),
    available_exams: availableExams,
  };
},

  async getTeacherDashboard(): Promise<TeacherDashboardStats> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const response = await fetch('/api/dashboard/teacher', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('[api.getTeacherDashboard] Server fetch fallback:', err);
    }

    // Direct client fallback
    const [allExams, allStudents] = await Promise.all([
      this.getExams(),
      this.getStudents().catch(() => [])
    ]);

    const attRes = await selectFromTable<Attempt[]>('attempts', 'attempt', async (tbl) => {
      return await supabase.from(tbl).select('*').order('created_at', { ascending: false });
    });
    const attempts = attRes.data || [];

    const resRes = await selectFromTable<Result[]>('results', 'result', async (tbl) => {
      return await supabase.from(tbl).select('*');
    });
    const results = resRes.data || [];

    const totalPassed = results.filter((r) => r.pass_status === 'PASSED').length;
    const totalFailed = results.filter((r) => r.pass_status === 'FAILED').length;
    const avgScore = results.length > 0
      ? Number((results.reduce((acc, r) => acc + Number(r.score || 0), 0) / results.length).toFixed(1))
      : 0;
    const avgPerc = results.length > 0
      ? Number((results.reduce((acc, r) => acc + Number(r.percentage || 0), 0) / results.length).toFixed(1))
      : 0;
    const passRate = results.length > 0
      ? Number(((totalPassed / results.length) * 100).toFixed(1))
      : 0;

    const examPerformance = allExams.map((e) => {
      const examAtts = attempts.filter((a) => a.exam_id === e.exam_id);
      const attIds = examAtts.map((a) => a.attempt_id);
      const examResults = results.filter((r) => attIds.includes(r.attempt_id));
      const passed = examResults.filter((r) => r.pass_status === 'PASSED').length;
      const avg = examResults.length > 0
        ? Number((examResults.reduce((acc, r) => acc + Number(r.percentage || 0), 0) / examResults.length).toFixed(1))
        : 0;
      const rate = examResults.length > 0
        ? Number(((passed / examResults.length) * 100).toFixed(1))
        : 0;

      return {
        exam_id: e.exam_id,
        title: e.title,
        attempts_count: examAtts.length,
        avg_percentage: avg,
        pass_rate: rate
      };
    });

    return {
      total_exams: allExams.length,
      total_students: allStudents.length,
      total_attempts: attempts.length,
      average_score: avgScore,
      average_percentage: avgPerc,
      total_passed: totalPassed,
      total_failed: totalFailed,
      pass_rate: passRate,
      recent_attempts: attempts.slice(0, 10),
      exam_performance: examPerformance
    };
  },
  // --------------------------------------------------------------------------
  // DATABASE STATUS & RECORD INSPECTION (Direct Supabase Queries)
  // --------------------------------------------------------------------------
  async getDatabaseStatus(): Promise<{
    status: string;
    engine: string;
    is_postgres?: boolean;
    is_supabase?: boolean;
    table_counts: Record<string, number>;
    database_name: string;
    supabase_project_ref?: string;
    supabase_url?: string;
    schema_tables: Array<{ name: string; rows: number; columns: string[] }>;
  }> {
    const tableNames = ['users', 'students', 'exams', 'questions', 'options', 'attempts', 'answers', 'results'];
    const tableCounts: Record<string, number> = {};

    for (const tbl of tableNames) {
      const res = await selectFromTable(tbl, tbl.slice(0, -1), async (t) => {
        return await supabase.from(t).select('*', { count: 'exact', head: true });
      });
      tableCounts[tbl] = res.count ?? 0;
    }

    const schemaTables = tableNames.map((name) => ({
      name,
      rows: tableCounts[name] || 0,
      columns: ['id', 'created_at']
    }));

    return {
      status: isSupabaseConfigured ? 'connected' : 'unconfigured',
      engine: 'Supabase PostgreSQL Cloud Database',
      is_postgres: true,
      is_supabase: true,
      table_counts: tableCounts,
      database_name: 'postgres',
      supabase_project_ref: SUPABASE_PROJECT_REF,
      supabase_url: SUPABASE_PROJECT_URL,
      schema_tables: schemaTables
    };
  },

  async getDatabaseRecords(table: string): Promise<{ table: string; count: number; rows: any[] }> {
    const res = await selectFromTable<any[]>(table, table.slice(0, -1), async (tbl) => {
      return await supabase
        .from(tbl)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
    });

    if (res.error) {
      handleSupabaseError(res.error, `Failed to load records from table "${table}"`);
    }

    return {
      table,
      count: res.data?.length || 0,
      rows: res.data || []
    };
  },

  async resetSeedDatabase(): Promise<{ message: string }> {
    return { message: 'Database reset requested. Supabase tables maintain cloud persistence.' };
  },

  async recreateDatabase(): Promise<{ message: string }> {
    return { message: 'Database migration requested. Schema is active on Supabase project.' };
  }
};
