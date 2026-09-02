// Core Domain Types & Database Entities based on Reference ER Diagram

export type Role = 'TEACHER' | 'STUDENT' | 'ADMIN';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
export type PassStatus = 'PASSED' | 'FAILED';

export interface User {
  user_id: number;
  name: string;
  email: string;
  role: Role;
  created_at?: string;
}

export interface Student {
  student_id: number;
  user_id: number;
  name: string;
  email: string;
  roll_no: string;
  created_at?: string;
}

export interface Exam {
  exam_id: number;
  title: string;
  description?: string;
  duration_minutes: number;
  total_marks: number;
  passing_percentage: number;
  is_published: boolean;
  created_by: number;
  created_by_name?: string;
  question_count?: number;
  created_at?: string;
  updated_at?: string;
  // Student-specific context
  user_attempt_status?: AttemptStatus | null;
  user_last_score?: number | null;
  user_last_percentage?: number | null;
  user_last_result_id?: number | null;
  user_attempt_id?: number | null;
}

export interface Option {
  option_id: number;
  question_id: number;
  option_text: string;
  is_correct?: boolean; // Hidden from students during active exam
  created_at?: string;
}

export interface Question {
  question_id: number;
  exam_id: number;
  question_text: string;
  marks: number;
  order_num?: number;
  options: Option[];
  created_at?: string;
}

export interface Answer {
  answer_id: number;
  attempt_id: number;
  question_id: number;
  selected_option_id: number | null;
  is_marked_for_review: boolean;
  updated_at?: string;
}

export interface Attempt {
  attempt_id: number;
  exam_id: number;
  student_id: number;
  start_time: string;
  end_time?: string | null;
  status: AttemptStatus;
  created_at?: string;
  // Join fields
  exam_title?: string;
  duration_minutes?: number;
  total_marks?: number;
  passing_percentage?: number;
  student_name?: string;
  student_roll_no?: string;
  student_email?: string;
  answers?: Answer[];
  result?: Result;
}

export interface Result {
  result_id: number;
  attempt_id: number;
  score: number;
  percentage: number;
  pass_status: PassStatus;
  total_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  unanswered_questions: number;
  time_taken_seconds: number;
  created_at?: string;
  // Associated metadata
  exam_id?: number;
  exam_title?: string;
  total_marks?: number;
  passing_percentage?: number;
  student_id?: number;
  student_name?: string;
  student_roll_no?: string;
}

export interface QuestionAnalysis {
  question_id: number;
  question_text: string;
  marks: number;
  selected_option_id: number | null;
  selected_option_text: string | null;
  correct_option_id: number;
  correct_option_text: string;
  is_correct: boolean;
  marks_obtained: number;
  is_marked_for_review: boolean;
  options: Option[];
}

export interface DetailedResultResponse {
  result: Result;
  attempt: Attempt;
  exam: Exam;
  student: Student;
  analysis: QuestionAnalysis[];
}

export interface StudentDashboardStats {
  student: Student;
  total_attempts: number;
  completed_exams: number;
  average_score: number;
  average_percentage: number;
  pass_count: number;
  fail_count: number;
  pass_rate: number;
  recent_results: Result[];
  available_exams: Exam[];
}

export interface TeacherDashboardStats {
  total_exams: number;
  total_students: number;
  total_attempts: number;
  average_score: number;
  average_percentage: number;
  total_passed: number;
  total_failed: number;
  pass_rate: number;
  recent_attempts: Attempt[];
  exam_performance: Array<{
    exam_id: number;
    title: string;
    attempts_count: number;
    avg_percentage: number;
    pass_rate: number;
  }>;
}

export interface AuthState {
  user: User | null;
  student: Student | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
