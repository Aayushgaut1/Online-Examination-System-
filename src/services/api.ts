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
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async register(data: { name: string; email: string; password: string; role?: string; roll_no?: string }): Promise<{ token: string; user: User; student?: Student }> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getMe(): Promise<{ user: User; student?: Student }> {
    return request('/auth/me');
  },

  async forgotPassword(email: string, new_password?: string): Promise<{ message: string }> {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, new_password })
    });
  },

  // Exams
  async getExams(): Promise<Exam[]> {
    return request('/exams');
  },

  async getExamById(id: number): Promise<Exam & { questions?: Question[] }> {
    return request(`/exams/${id}`);
  },

  async createExam(examData: Partial<Exam> & { questions?: any[] }): Promise<{ message: string; exam: Exam }> {
    return request('/exams', {
      method: 'POST',
      body: JSON.stringify(examData)
    });
  },

  async updateExam(id: number, examData: Partial<Exam>): Promise<{ message: string; exam: Exam }> {
    return request(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(examData)
    });
  },

  async togglePublishExam(id: number): Promise<{ message: string; is_published: boolean }> {
    return request(`/exams/${id}/publish`, {
      method: 'PATCH'
    });
  },

  async deleteExam(id: number): Promise<{ message: string }> {
    return request(`/exams/${id}`, {
      method: 'DELETE'
    });
  },

  // Questions
  async getExamQuestions(examId: number): Promise<Question[]> {
    return request(`/exams/${examId}/questions`);
  },

  async addQuestion(examId: number, questionData: { question_text: string; marks: number; options: { option_text: string; is_correct: boolean }[] }): Promise<{ message: string; question: Question }> {
    return request(`/exams/${examId}/questions`, {
      method: 'POST',
      body: JSON.stringify(questionData)
    });
  },

  async updateQuestion(questionId: number, questionData: { question_text?: string; marks?: number; options?: { option_id?: number; option_text: string; is_correct: boolean }[] }): Promise<{ message: string; question: Question }> {
    return request(`/questions/${questionId}`, {
      method: 'PUT',
      body: JSON.stringify(questionData)
    });
  },

  async deleteQuestion(questionId: number): Promise<{ message: string }> {
    return request(`/questions/${questionId}`, {
      method: 'DELETE'
    });
  },

  // Attempts & Live Examination
  async startAttempt(examId: number): Promise<{ message: string; attempt: Attempt; remaining_seconds: number; is_resumed: boolean }> {
    return request(`/exams/${examId}/attempts`, {
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
    return request(`/attempts/${attemptId}`);
  },

  async saveAnswer(attemptId: number, data: { question_id: number; selected_option_id: number | null; is_marked_for_review?: boolean }): Promise<{ message: string }> {
    return request(`/attempts/${attemptId}/answers`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async submitAttempt(attemptId: number, data?: { answers?: Array<{ question_id: number; selected_option_id: number | null }> }): Promise<{ message: string; result: Result; attempt: Attempt }> {
    return request(`/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data || {})
    });
  },

  // Results
  async getResultById(resultId: number): Promise<DetailedResultResponse> {
    return request(`/results/${resultId}`);
  },

  async getStudentResults(studentId: number): Promise<Result[]> {
    return request(`/results/students/${studentId}/results`);
  },

  async getExamResults(examId: number): Promise<{ exam: Exam; total_attempts: number; attempts: any[] }> {
    return request(`/results/exams/${examId}/results`);
  },

  // Students & Directory
  async getStudents(): Promise<Array<Student & { total_attempts: number; completed_attempts: number; passed_count: number; average_percentage: number }>> {
    return request('/students');
  },

  async getStudentById(id: number): Promise<{ student: Student; total_attempts: number; completed_exams: number; average_score: number; average_percentage: number; pass_rate: number; attempts: any[] }> {
    return request(`/students/${id}`);
  },

  // Dashboards
  async getStudentDashboard(): Promise<StudentDashboardStats> {
    return request('/dashboard/student');
  },

  async getTeacherDashboard(): Promise<TeacherDashboardStats> {
    return request('/dashboard/teacher');
  },

  // Database Management
  async getDatabaseStatus(): Promise<{
    status: string;
    engine: string;
    is_mysql: boolean;
    table_counts: Record<string, number>;
    database_name: string;
    schema_tables: Array<{ name: string; rows: number; columns: string[] }>;
  }> {
    return request('/dashboard/database/status');
  },

  async resetSeedDatabase(): Promise<{ message: string }> {
    return request('/dashboard/database/seed-reset', {
      method: 'POST'
    });
  }
};
