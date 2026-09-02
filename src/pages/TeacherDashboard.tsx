import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Users,
  Award,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Filter,
  Layers,
  GraduationCap,
  TrendingUp,
  FileText,
  Clock,
  ChevronRight,
  Database,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MetricCard } from '../components/3d/MetricCard';
import { TeacherDashboardStats, Exam, Question, Student } from '../types';

interface TeacherDashboardProps {
  onNavigate: (view: string, params?: any) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate }) => {
  const { user, isTeacher, switchQuickAccount } = useAuth();
  const [stats, setStats] = useState<TeacherDashboardStats | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'exams' | 'questions' | 'students' | 'results'>('exams');

  // Question Management State
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // New Question Form Modal State
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [qText, setQText] = useState('');
  const [qMarks, setQMarks] = useState(2);
  const [qOptions, setQOptions] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Search filters
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Student Details Modal
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any | null>(null);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);

  const toast = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      if (!isTeacher && !localStorage.getItem('nexusexam_token')) {
        await switchQuickAccount('teacher');
      }
      const [dashData, examsList, studentsList] = await Promise.all([
        api.getTeacherDashboard(),
        api.getExams(),
        api.getStudents()
      ]);
      setStats(dashData);
      setExams(examsList);
      setStudents(studentsList);
      if (examsList.length > 0 && !selectedExamId) {
        setSelectedExamId(examsList[0].exam_id);
      }
    } catch (err: any) {
      console.warn('Teacher load notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isTeacher]);

  // Fetch questions when selectedExamId changes in questions tab
  useEffect(() => {
    if (selectedExamId && activeTab === 'questions') {
      const fetchQuestions = async () => {
        try {
          setLoadingQuestions(true);
          const qList = await api.getExamQuestions(selectedExamId);
          setExamQuestions(qList);
        } catch (err: any) {
          toast.error('Failed to load questions.');
        } finally {
          setLoadingQuestions(false);
        }
      };
      fetchQuestions();
    }
  }, [selectedExamId, activeTab]);

  // Handle Publish/Unpublish toggle
  const handleTogglePublish = async (examId: number) => {
    try {
      const res = await api.togglePublishExam(examId);
      toast.success(res.message);
      setExams((prev) =>
        prev.map((e) => (e.exam_id === examId ? { ...e, is_published: res.is_published } : e))
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update publishing state.');
    }
  };

  // Handle Delete Exam
  const handleDeleteExam = async (examId: number) => {
    if (!window.confirm('Are you sure you want to delete this exam and all its questions and student attempts?')) {
      return;
    }
    try {
      await api.deleteExam(examId);
      toast.success('Exam successfully removed from database.');
      loadData();
    } catch (err: any) {
      toast.error('Failed to delete exam: ' + err.message);
    }
  };

  // Handle Add Question
  const handleAddQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;

    if (!qText.trim()) {
      toast.warning('Question text is required.');
      return;
    }

    if (qOptions.some((o) => !o.text.trim())) {
      toast.warning('All 4 option choices must have text.');
      return;
    }

    try {
      setSavingQuestion(true);
      await api.addQuestion(selectedExamId, {
        question_text: qText,
        marks: Number(qMarks),
        options: qOptions.map((o) => ({
          option_text: o.text,
          is_correct: o.isCorrect
        }))
      });
      toast.success('Question added to exam question bank.');
      setShowAddQuestionModal(false);
      setQText('');
      setQOptions([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]);
      // Refresh questions list
      const updated = await api.getExamQuestions(selectedExamId);
      setExamQuestions(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save question.');
    } finally {
      setSavingQuestion(false);
    }
  };

  // Handle Delete Question
  const handleDeleteQuestion = async (qId: number) => {
    if (!window.confirm('Delete this question and its options?')) return;
    try {
      await api.deleteQuestion(qId);
      toast.success('Question deleted.');
      setExamQuestions((prev) => prev.filter((q) => q.question_id !== qId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete question.');
    }
  };

  // View Student details
  const handleViewStudent = async (studentId: number) => {
    try {
      setLoadingStudentDetail(true);
      const detail = await api.getStudentById(studentId);
      setSelectedStudentDetail(detail);
    } catch (err: any) {
      toast.error('Failed to fetch student details.');
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Loading Faculty Portal & Cohort Performance...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/30 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              FACULTY COMMAND CENTER
            </span>
            <span className="text-xs text-slate-400 font-mono">ROLE: {user?.role || 'TEACHER'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            Faculty Dashboard
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Design exams, manage question banks, review student submissions, and inspect cohort pass rates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('create-exam')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/30 transition-all btn-3d"
          >
            <PlusCircle className="w-4 h-4" />
            Create New Examination
          </button>
        </div>
      </motion.div>

      {/* 2. Top KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        <MetricCard
          title="Total Exams"
          value={stats?.total_exams || 0}
          subtitle="In Question Bank"
          icon={BookOpen}
          color="indigo"
        />
        <MetricCard
          title="Total Students"
          value={stats?.total_students || 0}
          subtitle="Enrolled cohort"
          icon={Users}
          color="cyan"
        />
        <MetricCard
          title="Exam Attempts"
          value={stats?.total_attempts || 0}
          subtitle="Evaluated tests"
          icon={Layers}
          color="violet"
        />
        <MetricCard
          title="Average Score"
          value={`${stats?.average_percentage || 0}%`}
          subtitle="Across all cohorts"
          icon={Award}
          color="emerald"
        />
        <MetricCard
          title="Pass Rate"
          value={`${stats?.pass_rate || 0}%`}
          subtitle={`${stats?.total_passed || 0} passed / ${stats?.total_failed || 0} failed`}
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* 3. Tabbed Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'exams'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Exam Management ({exams.length})
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'questions'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          Question Bank
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'students'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          Student Directory ({students.length})
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'results'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4" />
          Result Audits & Submissions
        </button>
      </div>

      {/* 4. TAB 1: EXAM MANAGEMENT */}
      {activeTab === 'exams' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white font-['Outfit']">All Examinations</h2>
              <p className="text-xs text-slate-400">Manage published status, timings, marks, and questions.</p>
            </div>
            <button
              onClick={() => onNavigate('create-exam')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <PlusCircle className="w-4 h-4" /> Add New Exam
            </button>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 font-mono border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">EXAM TITLE</th>
                    <th className="py-3.5 px-4 font-semibold">DURATION</th>
                    <th className="py-3.5 px-4 font-semibold">TOTAL MARKS</th>
                    <th className="py-3.5 px-4 font-semibold">PASS %</th>
                    <th className="py-3.5 px-4 font-semibold">STATUS</th>
                    <th className="py-3.5 px-4 text-right font-semibold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {exams.map((exam) => (
                    <tr key={exam.exam_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white font-['Outfit']">{exam.title}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{exam.description}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{exam.duration_minutes} Mins</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">{exam.total_marks} Pts</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400">{exam.passing_percentage}%</td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleTogglePublish(exam.exam_id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono transition-all flex items-center gap-1.5 ${
                            exam.is_published
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                          }`}
                        >
                          {exam.is_published ? (
                            <>
                              <Eye className="w-3 h-3" /> Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" /> Draft / Hidden
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedExamId(exam.exam_id);
                              setActiveTab('questions');
                            }}
                            className="p-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs transition-colors"
                            title="Manage Questions"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExam(exam.exam_id)}
                            className="p-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 text-xs transition-colors"
                            title="Delete Exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 5. TAB 2: QUESTION BANK */}
      {activeTab === 'questions' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl font-bold text-white font-['Outfit']">Question Bank Manager</h2>
                <p className="text-xs text-slate-400">Select an exam to review or add multiple-choice questions.</p>
              </div>
            </div>

            {/* Exam Selector Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={selectedExamId || ''}
                onChange={(e) => setSelectedExamId(Number(e.target.value))}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
              >
                {exams.map((e) => (
                  <option key={e.exam_id} value={e.exam_id}>
                    {e.title} (#{e.exam_id})
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowAddQuestionModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Add Question
              </button>
            </div>
          </div>

          {loadingQuestions ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">Loading question sets...</div>
          ) : examQuestions.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl border border-white/10 text-center space-y-3">
              <p className="text-xs text-slate-400">No questions found in this examination yet.</p>
              <button
                onClick={() => setShowAddQuestionModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Create First Question
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {examQuestions.map((q, idx) => (
                <div key={q.question_id} className="glass-card p-6 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 font-mono">
                        Q{idx + 1}
                      </span>
                      <h4 className="text-sm sm:text-base font-semibold text-white font-['Outfit']">
                        {q.question_text}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">+{q.marks} Marks</span>
                      <button
                        onClick={() => handleDeleteQuestion(q.question_id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={opt.option_id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          opt.is_correct
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-semibold'
                            : 'bg-white/[0.02] border-white/5 text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded bg-white/10 flex items-center justify-center font-bold font-mono text-[10px]">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt.option_text}</span>
                        </span>
                        {opt.is_correct && (
                          <span className="text-[10px] font-bold text-emerald-400 uppercase">Correct Answer</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 6. TAB 3: STUDENT DIRECTORY */}
      {activeTab === 'students' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white font-['Outfit']">Enrolled Student Cohort</h2>
              <p className="text-xs text-slate-400">Audit individual student attempts, pass counts, and averages.</p>
            </div>
            <div className="text-xs font-mono text-indigo-300">{students.length} Registered Students</div>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 font-mono border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">STUDENT NAME</th>
                    <th className="py-3.5 px-4 font-semibold">ROLL NUMBER</th>
                    <th className="py-3.5 px-4 font-semibold">EMAIL</th>
                    <th className="py-3.5 px-4 font-semibold">ATTEMPTS</th>
                    <th className="py-3.5 px-4 font-semibold">AVG SCORE</th>
                    <th className="py-3.5 px-4 text-right font-semibold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {students.map((st) => (
                    <tr key={st.student_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white font-['Outfit']">{st.name}</td>
                      <td className="py-3.5 px-4 font-mono text-cyan-300">{st.roll_no}</td>
                      <td className="py-3.5 px-4 text-slate-400">{st.email}</td>
                      <td className="py-3.5 px-4 font-mono">{st.total_attempts} Attempts</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{st.average_percentage}%</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleViewStudent(st.student_id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold transition-colors"
                        >
                          View Profile & Tests
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 7. TAB 4: RESULT AUDITS */}
      {activeTab === 'results' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white font-['Outfit']">Submissions & Result Audits</h2>
              <p className="text-xs text-slate-400">Live submission records automatically graded by the server engine.</p>
            </div>
            <span className="text-xs font-mono text-cyan-300">
              {stats?.recent_attempts.length || 0} Recent Attempt Logs
            </span>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 font-mono border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">STUDENT</th>
                    <th className="py-3.5 px-4 font-semibold">EXAM</th>
                    <th className="py-3.5 px-4 font-semibold">SCORE / TOTAL</th>
                    <th className="py-3.5 px-4 font-semibold">PERCENTAGE</th>
                    <th className="py-3.5 px-4 font-semibold">STATUS</th>
                    <th className="py-3.5 px-4 font-semibold">TIMESTAMP</th>
                    <th className="py-3.5 px-4 text-right font-semibold">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {stats?.recent_attempts.map((att: any) => (
                    <tr key={att.attempt_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{att.student_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{att.student_roll_no}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300 font-['Outfit']">{att.exam_title}</td>
                      <td className="py-3.5 px-4 font-mono">
                        {att.result ? `${att.result.score} / ${att.total_marks}` : 'In Progress'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {att.result ? `${att.result.percentage}%` : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        {att.result ? (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              att.result.pass_status === 'PASSED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {att.result.pass_status}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {att.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(att.start_time).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {att.result && (
                          <button
                            onClick={() => onNavigate('result-analysis', { resultId: att.result.result_id })}
                            className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold transition-colors"
                          >
                            Audit Result
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 8. MODAL: ADD QUESTION */}
      <AnimatePresence>
        {showAddQuestionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddQuestionModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-lg font-bold text-white font-['Outfit']">Add Question to Exam</h3>
                <button
                  onClick={() => setShowAddQuestionModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddQuestionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Question Text</label>
                  <textarea
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="Enter the question statement..."
                    rows={3}
                    required
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="w-1/3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Marks Awarded</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={qMarks}
                    onChange={(e) => setQMarks(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Options & Correct Answer (Select radio for the correct option)
                  </label>
                  <div className="space-y-2.5">
                    {qOptions.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={opt.isCorrect}
                          onChange={() => {
                            setQOptions((prev) =>
                              prev.map((o, idx) => ({
                                ...o,
                                isCorrect: idx === oIdx
                              }))
                            );
                          }}
                          className="w-4 h-4 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="w-6 font-mono text-xs font-bold text-slate-400">
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setQOptions((prev) =>
                              prev.map((o, idx) => (idx === oIdx ? { ...o, text: val } : o))
                            );
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)} text...`}
                          required
                          className="flex-1 p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddQuestionModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingQuestion}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    {savingQuestion ? 'Saving...' : 'Save Question to Bank'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. MODAL: INDIVIDUAL STUDENT AUDIT */}
      <AnimatePresence>
        {selectedStudentDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudentDetail(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl z-10 max-h-[85vh] flex flex-col space-y-5"
            >
              <div className="flex items-start justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-white font-['Outfit']">
                    Student Profile: {selectedStudentDetail.student.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Roll No: <span className="text-cyan-300">{selectedStudentDetail.student.roll_no}</span> •{' '}
                    {selectedStudentDetail.student.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudentDetail(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats matrix */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-lg font-bold text-white">{selectedStudentDetail.total_attempts}</span>
                  <span className="block text-[10px] text-slate-400">Attempts</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-lg font-bold text-white">{selectedStudentDetail.completed_exams}</span>
                  <span className="block text-[10px] text-slate-400">Completed</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/20">
                  <span className="text-lg font-bold text-emerald-300">{selectedStudentDetail.average_percentage}%</span>
                  <span className="block text-[10px] text-slate-400">Avg Score</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20">
                  <span className="text-lg font-bold text-indigo-300">{selectedStudentDetail.pass_rate}%</span>
                  <span className="block text-[10px] text-slate-400">Pass Rate</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Exam History</h4>
                {selectedStudentDetail.attempts.map((att: any) => (
                  <div
                    key={att.attempt_id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white font-['Outfit']">{att.exam_title}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {new Date(att.start_time).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {att.result ? (
                        <div className="text-right font-mono">
                          <span className="font-bold text-emerald-400">{att.result.percentage}%</span>
                          <span className="text-[10px] text-slate-400 block">({att.result.score} Marks)</span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono text-amber-400">{att.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
