import {
  User,
  Student,
  Exam,
  Question,
  Attempt,
  Result,
  DetailedResultResponse,
  StudentDashboardStats,
  TeacherDashboardStats
} from '../types';

const BASE_URL = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('nexusexam_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User; student?: Student }> {
    return await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async register(data: { name: string; email: string; password: string; role?: string; roll_no?: string }): Promise<{ token: string; user: User; student?: Student }> {
    return await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getMe(): Promise<{ user: User; student?: Student }> {
    return await request('/auth/me');
  },

  async forgotPassword(email: string, new_password?: string): Promise<{ message: string }> {
    return await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, new_password })
    });
  },

  // Exams
  async getExams(): Promise<Exam[]> {
    return await request('/exams');
  },

  async getExamById(id: number): Promise<Exam & { questions?: Question[] }> {
    return await request(`/exams/${id}`);
  },

  async createExam(examData: Partial<Exam> & { questions?: any[] }): Promise<{ message: string; exam: Exam }> {
    return await request('/exams', {
      method: 'POST',
      body: JSON.stringify(examData)
    });
  },

  async updateExam(id: number, examData: Partial<Exam>): Promise<{ message: string; exam: Exam }> {
    return await request(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(examData)
    });
  },

  async togglePublishExam(id: number): Promise<{ message: string; is_published: boolean }> {
    return await request(`/exams/${id}/publish`, {
      method: 'PATCH'
    });
  },

  async deleteExam(id: number): Promise<{ message: string }> {
    return await request(`/exams/${id}`, {
      method: 'DELETE'
    });
  },

  // Questions
  async getExamQuestions(examId: number): Promise<Question[]> {
    return await request(`/exams/${examId}/questions`);
  },

  async addQuestion(examId: number, questionData: { question_text: string; marks: number; options: { option_label?: string; option_text: string; is_correct: boolean }[] }): Promise<{ message: string; question: Question }> {
    return await request(`/exams/${examId}/questions`, {
      method: 'POST',
      body: JSON.stringify(questionData)
    });
  },

  async updateQuestion(questionId: number, questionData: { question_text?: string; marks?: number; options?: { option_id?: number; option_label?: string; option_text: string; is_correct: boolean }[] }): Promise<{ message: string; question: Question }> {
    return await request(`/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(questionData)
    });
  },

  async deleteQuestion(questionId: number): Promise<{ message: string }> {
    return await request(`/questions/${questionId}`, {
      method: 'DELETE'
    });
  },

  // Attempts & Live Examination
  async startAttempt(examId: number): Promise<{ message: string; attempt: Attempt; remaining_seconds: number; is_resumed: boolean }> {
    return await request(`/exams/${examId}/attempts`, {
      method: 'POST'
    });
  },

  async getAttempt(attemptId: number): Promise<{
    attempt: Attempt;
    exam: Exam;
    student: Student;
    questions: Question[];
    answers: Array<{ answer_id: number; attempt_id: number; question_id: number; selected_option_id: number | null; is_marked_for_review: boolean }>;
    result?: Result;
    remaining_seconds: number;
  }> {
    return await request(`/attempts/${attemptId}`);
  },

  async saveAnswer(attemptId: number, data: { question_id: number; selected_option_id: number | null; is_marked_for_review?: boolean }): Promise<{ message: string }> {
    return await request(`/attempts/${attemptId}/answers`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async submitAttempt(attemptId: number, data?: { answers?: Array<{ question_id: number; selected_option_id: number | null }> }): Promise<{ message: string; result: Result; attempt: Attempt }> {
    return await request(`/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  },

  // Results
  async getResultById(resultId: number): Promise<DetailedResultResponse> {
    return await request(`/results/${resultId}`);
  },

  async getStudentResults(studentId: number): Promise<Result[]> {
    return await request(`/students/${studentId}/results`);
  },

  async getExamResults(examId: number): Promise<{ exam: Exam; total_attempts: number; attempts: any[] }> {
    return await request(`/exams/${examId}/results`);
  },

  // Students & Directory
  async getStudents(): Promise<Array<Student & { total_attempts: number; completed_attempts: number; passed_count: number; average_percentage: number }>> {
    return await request('/students');
  },

  async getStudentById(id: number): Promise<{ student: Student; total_attempts: number; completed_exams: number; average_score: number; average_percentage: number; pass_rate: number; attempts: any[] }> {
    return await request(`/students/${id}`);
  },

  // Dashboards
  async getStudentDashboard(): Promise<StudentDashboardStats> {
    return await request('/dashboard/student');
  },

  async getTeacherDashboard(): Promise<TeacherDashboardStats> {
    return await request('/dashboard/teacher');
  },

  // Database Management & Live Schema Status
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
    return await request('/database/status');
  },

  async resetSeedDatabase(): Promise<{ message: string }> {
    return await request('/dashboard/database/seed-reset', {
      method: 'POST'
    });
  },

  async recreateDatabase(): Promise<{ message: string }> {
    return await request('/dashboard/database/recreate', {
      method: 'POST'
    });
  }
};
