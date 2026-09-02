import { supabaseAdmin, SUPABASE_PROJECT_URL, SUPABASE_REF } from './supabaseClient.js';

export interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export interface SchemaInspection {
  connected: boolean;
  database_type: 'POSTGRESQL' | 'SUPABASE' | 'NONE';
  error: string | null;
  supabase_url: string;
  supabase_ref: string;
  tables: Record<string, {
    actual_table_name: string;
    columns: string[];
    row_count: number;
  }>;
}

export class PostgresAdapter {
  public isConnected = false;
  public connectionType: 'POSTGRESQL' | 'SUPABASE' | 'NONE' = 'NONE';
  public lastError: string | null = null;

  // Table mapping cache (entity name -> actual table name in Supabase PostgreSQL)
  public tableMap = {
    users: 'users',
    students: 'students',
    exams: 'exams',
    questions: 'questions',
    options: 'options',
    attempts: 'attempts',
    answers: 'answers',
    results: 'results'
  };

  public columnMap: Record<string, string[]> = {
    users: ['user_id', 'name', 'email', 'role', 'is_active', 'created_at', 'updated_at'],
    students: ['student_id', 'user_id', 'name', 'email', 'roll_no', 'created_at'],
    exams: ['exam_id', 'title', 'description', 'duration_minutes', 'total_marks', 'passing_percentage', 'created_by', 'status', 'created_at', 'updated_at'],
    questions: ['question_id', 'exam_id', 'question_text', 'marks', 'question_order', 'created_at', 'updated_at'],
    options: ['option_id', 'question_id', 'option_label', 'option_text', 'is_correct'],
    attempts: ['attempt_id', 'exam_id', 'student_id', 'start_time', 'end_time', 'status', 'created_at'],
    answers: ['answer_id', 'attempt_id', 'question_id', 'selected_option_id', 'answered_at', 'created_at', 'updated_at'],
    results: ['result_id', 'attempt_id', 'score', 'percentage', 'pass_status', 'correct_answers', 'incorrect_answers', 'unanswered_answers', 'evaluated_at']
  };

  public async init(): Promise<boolean> {
    try {
      // Test Supabase connectivity by querying users count
      const { count, error } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        this.isConnected = false;
        this.connectionType = 'NONE';
        this.lastError = `Supabase error: ${error.message}`;
        console.warn(`[Supabase Connection Failed]: ${error.message}`);
        return false;
      }

      this.isConnected = true;
      this.connectionType = 'SUPABASE';
      this.lastError = null;
      console.log(`[Supabase Connected] Successfully connected to project "${SUPABASE_REF}" at ${SUPABASE_PROJECT_URL}`);
      return true;
    } catch (err: any) {
      this.isConnected = false;
      this.connectionType = 'NONE';
      this.lastError = err.message || 'Failed to connect to Supabase';
      console.warn(`[Supabase Connection Exception]: ${err.message}`);
      return false;
    }
  }

  public async inspectSchema(): Promise<SchemaInspection> {
    const inspection: SchemaInspection = {
      connected: this.isConnected,
      database_type: this.connectionType,
      error: this.lastError,
      supabase_url: SUPABASE_PROJECT_URL,
      supabase_ref: SUPABASE_REF,
      tables: {}
    };

    const tables = ['users', 'students', 'exams', 'questions', 'options', 'attempts', 'answers', 'results'] as const;

    await Promise.all(
      tables.map(async (table) => {
        try {
          const { count, error } = await supabaseAdmin
            .from(table)
            .select('*', { count: 'exact', head: true });

          inspection.tables[table] = {
            actual_table_name: table,
            columns: this.columnMap[table] || [],
            row_count: error ? 0 : (count ?? 0)
          };
        } catch {
          inspection.tables[table] = {
            actual_table_name: table,
            columns: this.columnMap[table] || [],
            row_count: 0
          };
        }
      })
    );

    return inspection;
  }

  public getTable(entity: keyof typeof this.tableMap): string {
    return this.tableMap[entity] || entity;
  }
}

export const postgresAdapter = new PostgresAdapter();
