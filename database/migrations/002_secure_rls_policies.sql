-- ============================================================================
-- Migration 002: Secure Row-Level Security (RLS) Policies for NexusExam
-- Supabase PostgreSQL Engine (jwnhapdvdsvwbyumtjun)
--
-- Core Architecture Relationships:
--   auth.users (UUID, email)
--     -> public.users (user_id [INT], email [VARCHAR], role [STUDENT|TEACHER|ADMIN])
--       -> public.students (student_id [INT], user_id [INT], email [VARCHAR], roll_no)
--         -> public.attempts (attempt_id [INT], exam_id [INT], student_id [INT], status)
--           -> public.answers (answer_id [INT], attempt_id [INT], question_id [INT], selected_option_id [INT])
--           -> public.results (result_id [INT], attempt_id [INT], score, percentage, pass_status)
--
-- Security Guarantees:
-- 1. No DISABLE ROW LEVEL SECURITY.
-- 2. No unsafe WITH CHECK (true) or USING (true) on student writes.
-- 3. Students can only INSERT, SELECT, and UPDATE their own attempts and answers.
-- 4. Correct resolution between auth.uid() / auth.jwt() and integer student_id.
-- 5. Preserves existing faculty/teacher capabilities.
-- ============================================================================

-- Ensure Row Level Security is enabled on all tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.results ENABLE ROW LEVEL SECURITY;

-- Helper security function: Get current user_id from auth token
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.user_id
  FROM public.users u
  WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$$;

-- Helper security function: Get current student_id from auth token
CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.student_id
  FROM public.students s
  JOIN public.users u ON s.user_id = u.user_id
  WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     OR lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$$;

-- Helper security function: Check if current user is faculty (teacher or admin)
CREATE OR REPLACE FUNCTION public.is_current_user_faculty()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND u.role IN ('TEACHER', 'ADMIN')
  );
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_student_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_faculty() TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 1. ATTEMPTS POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "attempts_student_insert" ON public.attempts;
DROP POLICY IF EXISTS "attempts_student_select" ON public.attempts;
DROP POLICY IF EXISTS "attempts_student_update" ON public.attempts;
DROP POLICY IF EXISTS "attempts_faculty_select" ON public.attempts;
DROP POLICY IF EXISTS "Students can insert own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Students can view own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Students can update own attempts" ON public.attempts;

-- INSERT: Students can ONLY start an attempt for their own student_id
CREATE POLICY "attempts_student_insert"
ON public.attempts
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = public.get_current_student_id()
);

-- SELECT: Students can view their own attempts; faculty can view all attempts
CREATE POLICY "attempts_student_select"
ON public.attempts
FOR SELECT
TO authenticated
USING (
  student_id = public.get_current_student_id()
  OR public.is_current_user_faculty()
);

-- UPDATE: Students can update their own in-progress attempts (e.g. status transition to SUBMITTED)
CREATE POLICY "attempts_student_update"
ON public.attempts
FOR UPDATE
TO authenticated
USING (
  student_id = public.get_current_student_id()
  OR public.is_current_user_faculty()
)
WITH CHECK (
  student_id = public.get_current_student_id()
  OR public.is_current_user_faculty()
);

-- ----------------------------------------------------------------------------
-- 2. ANSWERS POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "answers_student_insert" ON public.answers;
DROP POLICY IF EXISTS "answers_student_select" ON public.answers;
DROP POLICY IF EXISTS "answers_student_update" ON public.answers;
DROP POLICY IF EXISTS "Students can insert own answers" ON public.answers;
DROP POLICY IF EXISTS "Students can view own answers" ON public.answers;
DROP POLICY IF EXISTS "Students can update own answers" ON public.answers;

-- INSERT: Students can ONLY record answers for an active attempt belonging to them
CREATE POLICY "answers_student_insert"
ON public.answers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.attempts a
    WHERE a.attempt_id = answers.attempt_id
      AND a.student_id = public.get_current_student_id()
      AND a.status = 'IN_PROGRESS'
  )
);

-- SELECT: Students can read their own answers; faculty can read all
CREATE POLICY "answers_student_select"
ON public.answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.attempts a
    WHERE a.attempt_id = answers.attempt_id
      AND a.student_id = public.get_current_student_id()
  )
  OR public.is_current_user_faculty()
);

-- UPDATE: Students can update their choices while their attempt is IN_PROGRESS
CREATE POLICY "answers_student_update"
ON public.answers
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.attempts a
    WHERE a.attempt_id = answers.attempt_id
      AND a.student_id = public.get_current_student_id()
      AND a.status = 'IN_PROGRESS'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.attempts a
    WHERE a.attempt_id = answers.attempt_id
      AND a.student_id = public.get_current_student_id()
      AND a.status = 'IN_PROGRESS'
  )
);

-- ----------------------------------------------------------------------------
-- 3. RESULTS POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "results_student_select" ON public.results;
DROP POLICY IF EXISTS "results_student_insert" ON public.results;
DROP POLICY IF EXISTS "Students can view own results" ON public.results;

-- SELECT: Students can read their own examination results; faculty can read all
CREATE POLICY "results_student_select"
ON public.results
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.attempts a
    WHERE a.attempt_id = results.attempt_id
      AND a.student_id = public.get_current_student_id()
  )
  OR public.is_current_user_faculty()
);

-- INSERT: Result creation restricted to student's own finalized attempt
CREATE POLICY "results_student_insert"
ON public.results
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.attempts a
    WHERE a.attempt_id = results.attempt_id
      AND a.student_id = public.get_current_student_id()
  )
  OR public.is_current_user_faculty()
);

-- ----------------------------------------------------------------------------
-- 4. EXAMS, QUESTIONS & OPTIONS POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "exams_public_read" ON public.exams;
DROP POLICY IF EXISTS "exams_faculty_all" ON public.exams;
DROP POLICY IF EXISTS "questions_read" ON public.questions;
DROP POLICY IF EXISTS "questions_faculty_all" ON public.questions;
DROP POLICY IF EXISTS "options_read" ON public.options;
DROP POLICY IF EXISTS "options_faculty_all" ON public.options;

CREATE POLICY "exams_public_read"
ON public.exams
FOR SELECT
TO authenticated, anon
USING (
  status = 'PUBLISHED'
  OR public.is_current_user_faculty()
);

CREATE POLICY "exams_faculty_all"
ON public.exams
FOR ALL
TO authenticated
USING (
  public.is_current_user_faculty()
)
WITH CHECK (
  public.is_current_user_faculty()
);

CREATE POLICY "questions_read"
ON public.questions
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    WHERE e.exam_id = questions.exam_id
      AND (e.status = 'PUBLISHED' OR public.is_current_user_faculty())
  )
);

CREATE POLICY "questions_faculty_all"
ON public.questions
FOR ALL
TO authenticated
USING (
  public.is_current_user_faculty()
)
WITH CHECK (
  public.is_current_user_faculty()
);

CREATE POLICY "options_read"
ON public.options
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.exams e ON e.exam_id = q.exam_id
    WHERE q.question_id = options.question_id
      AND (e.status = 'PUBLISHED' OR public.is_current_user_faculty())
  )
);

CREATE POLICY "options_faculty_all"
ON public.options
FOR ALL
TO authenticated
USING (
  public.is_current_user_faculty()
)
WITH CHECK (
  public.is_current_user_faculty()
);

-- ----------------------------------------------------------------------------
-- 5. STUDENTS & USERS READ POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "users_read_own_or_faculty" ON public.users;
CREATE POLICY "users_read_own_or_faculty"
ON public.users
FOR SELECT
TO authenticated
USING (
  user_id = public.get_current_user_id()
  OR public.is_current_user_faculty()
);

DROP POLICY IF EXISTS "students_read_own_or_faculty" ON public.students;
CREATE POLICY "students_read_own_or_faculty"
ON public.students
FOR SELECT
TO authenticated
USING (
  student_id = public.get_current_student_id()
  OR public.is_current_user_faculty()
);
