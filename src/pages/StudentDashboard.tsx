import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  Timer,
  Award,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertCircle,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MetricCard } from '../components/3d/MetricCard';
import { TiltCard } from '../components/3d/TiltCard';
import { StudentDashboardStats, Exam } from '../types';

interface StudentDashboardProps {
  onNavigate: (view: string, params?: any) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { user, student } = useAuth();
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingExamId, setStartingExamId] = useState<number | null>(null);
  const toast = useToast();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await api.getStudentDashboard();
      setStats(data);
    } catch (err: any) {
      toast.error('Failed to load student dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleStartOrResumeExam = async (examId: number) => {
    try {
      setStartingExamId(examId);
      const res = await api.startAttempt(examId);
      if (res.is_resumed) {
        toast.info('Resumed active attempt with your saved answers.', 'Attempt Resumed');
      } else {
        toast.success('Exam session initiated! Good luck.', 'Session Started');
      }
      onNavigate('exam-interface', { attemptId: res.attempt.attempt_id });
    } catch (err: any) {
      toast.error(err.message || 'Could not start exam attempt.');
    } finally {
      setStartingExamId(null);
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Loading student dashboard & examination records...</p>
      </div>
    );
  }

  // Check if any exam is actively in progress
  const activeExam = stats?.available_exams.find((e) => e.user_attempt_status === 'IN_PROGRESS');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header Greeting Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              STUDENT PORTAL
            </span>
            <span className="text-xs text-slate-400 font-mono">ROLL: {student?.roll_no || 'CS-2026-001'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            Welcome back, {student?.name || user?.name}!
          </h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Track your upcoming examinations, continue in-progress tests, and review detailed answer breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('student-analytics')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
          >
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Performance Insights
          </button>
        </div>
      </motion.div>

      {/* 2. Active In-Progress Exam Alert Banner */}
      {activeExam && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-indigo-950/40 to-slate-900 border border-amber-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Active Exam in Progress</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-white font-['Outfit']">{activeExam.title}</h4>
            </div>
          </div>
          <button
            onClick={() => onNavigate('exam-interface', { attemptId: activeExam.user_attempt_id })}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-2"
          >
            <span>Resume Attempt</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* 3. Top KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Exams Attempted"
          value={stats?.total_attempts || 0}
          subtitle={`${stats?.completed_exams || 0} completed`}
          icon={BookOpen}
          color="indigo"
        />
        <MetricCard
          title="Average Score"
          value={`${stats?.average_percentage || 0}%`}
          subtitle={`Avg ${stats?.average_score || 0} marks`}
          icon={Award}
          color="cyan"
          trend="+4.2% cohort rank"
        />
        <MetricCard
          title="Exams Passed"
          value={stats?.pass_count || 0}
          subtitle={`${stats?.fail_count || 0} failed`}
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Overall Pass Rate"
          value={`${stats?.pass_rate || 0}%`}
          subtitle="Evaluation criteria"
          icon={TrendingUp}
          color="violet"
        />
      </div>

      {/* 4. Available Examinations Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Available Examinations
            </h2>
            <p className="text-xs text-slate-400">Select an examination to initiate your real-time testing attempt.</p>
          </div>
          <span className="text-xs font-mono text-indigo-300">
            {stats?.available_exams.length || 0} Published Tests
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats?.available_exams.map((exam) => {
            const isCompleted = exam.user_attempt_status === 'SUBMITTED';
            const isInProgress = exam.user_attempt_status === 'IN_PROGRESS';
            const isStarting = startingExamId === exam.exam_id;

            return (
              <TiltCard key={exam.exam_id} maxTilt={8} scale={1.02}>
                <div
                  className={`glass-card p-6 rounded-2xl border transition-all flex flex-col justify-between h-full shadow-lg ${
                    isInProgress
                      ? 'border-amber-500/50 bg-amber-950/15'
                      : isCompleted
                      ? 'border-emerald-500/30'
                      : 'border-white/10 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2" style={{ transform: 'translateZ(15px)' }}>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                        EXAM ID #{exam.exam_id}
                      </span>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : isInProgress ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          <Timer className="w-3 h-3" /> In Progress
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                          Ready
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white font-['Outfit'] line-clamp-1" style={{ transform: 'translateZ(20px)' }}>
                      {exam.title}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed" style={{ transform: 'translateZ(10px)' }}>
                      {exam.description}
                    </p>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-300 font-mono" style={{ transform: 'translateZ(12px)' }}>
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <span className="block text-[10px] text-slate-400">Duration</span>
                        <span className="font-bold text-white">{exam.duration_minutes} Mins</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <span className="block text-[10px] text-slate-400">Marks</span>
                        <span className="font-bold text-white">{exam.total_marks} Pts</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <span className="block text-[10px] text-slate-400">Pass</span>
                        <span className="font-bold text-emerald-400">{exam.passing_percentage}%</span>
                      </div>
                    </div>

                    {isCompleted && exam.user_last_score !== null && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs font-semibold" style={{ transform: 'translateZ(15px)' }}>
                        <span className="text-slate-300">Last Score:</span>
                        <span className="text-emerald-300 font-bold font-mono">
                          {exam.user_last_score} Marks ({exam.user_last_percentage}%)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/5" style={{ transform: 'translateZ(20px)' }}>
                    {isInProgress ? (
                      <button
                        onClick={() => onNavigate('exam-interface', { attemptId: exam.user_attempt_id })}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Resume Exam Now
                      </button>
                    ) : isCompleted ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigate('result-analysis', { resultId: exam.user_last_result_id })}
                          className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                        >
                          View Result
                        </button>
                        <button
                          onClick={() => handleStartOrResumeExam(exam.exam_id)}
                          disabled={isStarting}
                          className="p-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 transition-colors cursor-pointer"
                          title="Retake Exam"
                        >
                          <RotateCcw className={`w-4 h-4 ${isStarting ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartOrResumeExam(exam.exam_id)}
                        disabled={isStarting}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 btn-3d disabled:opacity-50 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {isStarting ? 'Starting Exam...' : 'Start Examination'}
                      </button>
                    )}
                  </div>
                </div>
              </TiltCard>
            );
          })}
        </div>
      </section>

      {/* 5. Recent Results & Performance History */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Recent Examination Results
            </h2>
            <p className="text-xs text-slate-400">Direct breakdown of your completed tests and score calculations.</p>
          </div>
          <button
            onClick={() => onNavigate('student-analytics')}
            className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"
          >
            Full Analytics <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats?.recent_results && stats.recent_results.length > 0 ? (
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 font-mono border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">EXAM TITLE</th>
                    <th className="py-3.5 px-4 font-semibold">SCORE OBTAINED</th>
                    <th className="py-3.5 px-4 font-semibold">PERCENTAGE</th>
                    <th className="py-3.5 px-4 font-semibold">STATUS</th>
                    <th className="py-3.5 px-4 font-semibold">DATE & TIME</th>
                    <th className="py-3.5 px-4 text-right font-semibold">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {stats.recent_results.map((res) => (
                    <tr key={res.result_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white font-['Outfit']">{res.exam_title}</td>
                      <td className="py-3.5 px-4 font-mono">
                        {res.score} / {res.total_marks} Marks
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">{res.percentage}%</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            res.pass_status === 'PASSED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {res.pass_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(res.created_at).toLocaleDateString()} at{' '}
                        {new Date(res.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onNavigate('result-analysis', { resultId: res.result_id })}
                          className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold transition-colors"
                        >
                          View Breakdown
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl glass-card border border-white/10 text-center space-y-3">
            <p className="text-xs text-slate-400">You haven't completed any examinations yet.</p>
            <button
              onClick={() => {
                if (stats?.available_exams?.[0]) {
                  handleStartOrResumeExam(stats.available_exams[0].exam_id);
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              Start Your First Exam
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
