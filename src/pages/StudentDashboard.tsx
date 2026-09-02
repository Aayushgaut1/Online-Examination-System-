import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  Timer,
  Award,
  CheckCircle2,
  Play,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  FileText,
  Layers,
  ChevronRight,
} from 'lucide-react';

import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

import { MetricCard } from '../components/3d/MetricCard';
import { TiltCard } from '../components/3d/TiltCard';

import { StudentDashboardStats } from '../types';

interface StudentDashboardProps {
  onNavigate: (view: string, params?: any) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onNavigate,
}) => {
  const { user, student, isAuthenticated } = useAuth();

  const [stats, setStats] =
    useState<StudentDashboardStats | null>(null);

  const [loading, setLoading] = useState(true);

  const [startingExamId, setStartingExamId] =
    useState<number | null>(null);

  const [refreshingExams, setRefreshingExams] =
    useState(false);

  const toast = useToast();

  /**
   * Check whether an exam is published.
   *
   * Supports both:
   * - status = "PUBLISHED"
   * - is_published = true
   *
   * This keeps the dashboard compatible with the
   * current Supabase database structure.
   */
  const isExamPublished = useCallback((exam: any) => {
    if (!exam) return false;

    return (
      exam.is_published === true ||
      String(exam.status || '').toUpperCase() === 'PUBLISHED'
    );
  }, []);

  /**
   * Fetch dashboard data.
   */
  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated) {
      setStats(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const data = await api.getStudentDashboard();

      /**
       * Normalize exams coming from the API.
       *
       * If API already returns available exams,
       * keep their attempt information.
       */
      const dashboardExams = Array.isArray(data?.available_exams)
        ? data.available_exams
        : [];

      /**
       * The API may currently filter using the old
       * is_published field.
       *
       * Fetch exams directly as well so that exams
       * using status = PUBLISHED are also visible.
       */
      let allExams: any[] = [];

      try {
        allExams = await api.getExams();
      } catch (examError) {
        console.warn(
          '[StudentDashboard] Could not directly refresh exams:',
          examError
        );
      }

      /**
       * Use direct exams when available.
       * Otherwise fall back to dashboard exams.
       */
      const sourceExams =
        allExams.length > 0
          ? allExams
          : dashboardExams;

      /**
       * Only show published examinations.
       */
      const publishedExams = sourceExams
        .filter((exam: any) => isExamPublished(exam))
        .map((exam: any) => {
          /**
           * Preserve attempt information from the
           * dashboard API if it already exists.
           */
          const existingExam = dashboardExams.find(
            (item: any) =>
              Number(item.exam_id) === Number(exam.exam_id)
          );

          return {
            ...exam,

            is_published: true,

            user_attempt_status:
              existingExam?.user_attempt_status ?? null,

            user_attempt_id:
              existingExam?.user_attempt_id ?? null,

            user_last_score:
              existingExam?.user_last_score ?? null,

            user_last_percentage:
              existingExam?.user_last_percentage ?? null,

            user_last_result_id:
              existingExam?.user_last_result_id ?? null,
          };
        });

      setStats({
        ...data,
        available_exams: publishedExams,
      });
    } catch (err: any) {
      console.error(
        '[StudentDashboard] Failed to load dashboard:',
        err
      );

      toast.error(
        err?.message ||
          'Unable to load your examination dashboard.'
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, toast, isExamPublished]);

  /**
   * Load dashboard whenever authentication changes.
   */
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /**
   * Start or resume an examination.
   */
  const handleStartOrResumeExam = async (examId: number) => {
    if (!isAuthenticated) {
      toast.error(
        'Please sign in to start an examination.'
      );

      onNavigate('auth', {
        tab: 'login',
        role: 'STUDENT',
      });

      return;
    }

    try {
      setStartingExamId(examId);

      const res = await api.startAttempt(examId);

      if (res.is_resumed) {
        toast.info(
          'Resumed active attempt with your saved answers.',
          'Attempt Resumed'
        );
      } else {
        toast.success(
          'Exam session initiated! Good luck.',
          'Session Started'
        );
      }

      onNavigate('exam-interface', {
        attemptId: res.attempt.attempt_id,
      });
    } catch (err: any) {
      console.error(
        '[StudentDashboard] Start exam error:',
        err
      );

      toast.error(
        err?.message ||
          'Could not start exam attempt.'
      );
    } finally {
      setStartingExamId(null);
    }
  };

  /**
   * Manual refresh for published exams.
   */
  const handleRefreshExams = async () => {
    if (!isAuthenticated) return;

    try {
      setRefreshingExams(true);

      const exams = await api.getExams();

      const publishedExams = (exams || [])
        .filter((exam: any) => isExamPublished(exam))
        .map((exam: any) => ({
          ...exam,
          is_published: true,
        }));

      setStats((previous) => {
        if (!previous) return previous;

        return {
          ...previous,
          available_exams: publishedExams,
        };
      });

      toast.success(
        `${publishedExams.length} published exam${
          publishedExams.length === 1 ? '' : 's'
        } found.`,
        'Exams Refreshed'
      );
    } catch (err: any) {
      console.error(
        '[StudentDashboard] Refresh exams error:',
        err
      );

      toast.error(
        err?.message ||
          'Unable to refresh examinations.'
      );
    } finally {
      setRefreshingExams(false);
    }
  };

  /**
   * Authentication guard.
   */
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-white/10 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30">
            <BookOpen className="w-6 h-6" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-['Outfit']">
              Student Portal Authentication
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed">
              Please sign in with your student account to access
              active examinations, view progress, and review scored
              attempts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() =>
                onNavigate('auth', {
                  tab: 'login',
                  role: 'STUDENT',
                })
              }
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
            >
              Sign In
            </button>

            <button
              onClick={() =>
                onNavigate('auth', {
                  tab: 'register',
                  role: 'STUDENT',
                })
              }
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
            >
              Register as Student
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Loading state.
   */
  if (loading && !stats) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />

        <p className="text-xs text-slate-400 font-mono">
          Loading student dashboard & examination records...
        </p>
      </div>
    );
  }

  /**
   * No dashboard data.
   */
  if (!stats) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
        <div className="glass-panel max-w-md w-full p-8 rounded-3xl border border-white/10 text-center space-y-4">
          <BookOpen className="w-10 h-10 text-cyan-400 mx-auto" />

          <h2 className="text-xl font-bold text-white">
            Unable to load dashboard
          </h2>

          <p className="text-sm text-slate-400">
            Your account is signed in, but your examination data
            could not be loaded.
          </p>

          <button
            onClick={fetchDashboardData}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const availableExams = Array.isArray(stats.available_exams)
    ? stats.available_exams
    : [];

  const activeExam = availableExams.find(
    (e: any) => e.user_attempt_status === 'IN_PROGRESS'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* HEADER */}
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

            <span className="text-xs text-slate-400 font-mono">
              ROLL: {student?.roll_no || 'N/A'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
            Welcome back,{' '}
            {student?.name ||
              user?.name ||
              stats.student?.name ||
              'Student'}
            !
          </h1>

          <p className="text-xs text-slate-400 max-w-xl">
            Track your upcoming examinations, continue in-progress
            tests, and review detailed answer breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onNavigate('student-analytics')
            }
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Performance Insights
          </button>
        </div>
      </motion.div>

      {/* ACTIVE EXAM */}
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
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Active Exam in Progress
                </span>

                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              </div>

              <h4 className="text-sm sm:text-base font-bold text-white font-['Outfit']">
                {activeExam.title}
              </h4>
            </div>
          </div>

          <button
            onClick={() =>
              onNavigate('exam-interface', {
                attemptId: activeExam.user_attempt_id,
              })
            }
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Resume Attempt</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Exams Attempted"
          value={stats.total_attempts || 0}
          subtitle={`${stats.completed_exams || 0} completed`}
          icon={BookOpen}
          color="indigo"
        />

        <MetricCard
          title="Average Score"
          value={`${stats.average_percentage || 0}%`}
          subtitle={`Avg ${stats.average_score || 0} marks`}
          icon={Award}
          color="cyan"
          trend="+4.2% cohort rank"
        />

        <MetricCard
          title="Exams Passed"
          value={stats.pass_count || 0}
          subtitle={`${stats.fail_count || 0} failed`}
          icon={CheckCircle2}
          color="emerald"
        />

        <MetricCard
          title="Overall Pass Rate"
          value={`${stats.pass_rate || 0}%`}
          subtitle="Evaluation criteria"
          icon={TrendingUp}
          color="violet"
        />
      </div>

      {/* AVAILABLE EXAMS */}
      <section className="space-y-4">

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Available Examinations
            </h2>

            <p className="text-xs text-slate-400">
              Select an examination to initiate your real-time
              testing attempt.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-indigo-300">
              {availableExams.length} Published Tests
            </span>

            <button
              onClick={handleRefreshExams}
              disabled={refreshingExams}
              className="px-3 py-2 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {refreshingExams ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {availableExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {availableExams.map((exam: any) => {
              const isCompleted =
                exam.user_attempt_status === 'SUBMITTED';

              const isInProgress =
                exam.user_attempt_status === 'IN_PROGRESS';

              const isStarting =
                startingExamId === exam.exam_id;

              return (
                <TiltCard
                  key={exam.exam_id}
                  maxTilt={8}
                  scale={1.02}
                >
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

                      <div
                        className="flex items-start justify-between gap-2"
                        style={{
                          transform: 'translateZ(15px)',
                        }}
                      >
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                          EXAM ID #{exam.exam_id}
                        </span>

                        {isCompleted ? (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        ) : isInProgress ? (
                          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            <Timer className="w-3 h-3" />
                            In Progress
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                            Ready
                          </span>
                        )}
                      </div>

                      <h3
                        className="text-base font-bold text-white font-['Outfit'] line-clamp-1"
                        style={{
                          transform: 'translateZ(20px)',
                        }}
                      >
                        {exam.title}
                      </h3>

                      <p
                        className="text-xs text-slate-300 line-clamp-2 leading-relaxed"
                        style={{
                          transform: 'translateZ(10px)',
                        }}
                      >
                        {exam.description || 'No description available.'}
                      </p>

                      <div
                        className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-300 font-mono"
                        style={{
                          transform: 'translateZ(12px)',
                        }}
                      >
                        <div className="p-2 rounded-lg bg-white/[0.02]">
                          <span className="block text-[10px] text-slate-400">
                            Duration
                          </span>

                          <span className="font-bold text-white">
                            {exam.duration_minutes || 0} Mins
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-white/[0.02]">
                          <span className="block text-[10px] text-slate-400">
                            Marks
                          </span>

                          <span className="font-bold text-white">
                            {exam.total_marks || 0} Pts
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-white/[0.02]">
                          <span className="block text-[10px] text-slate-400">
                            Pass
                          </span>

                          <span className="font-bold text-emerald-400">
                            {exam.passing_percentage || 0}%
                          </span>
                        </div>
                      </div>

                      {isCompleted &&
                        exam.user_last_score !== null &&
                        exam.user_last_score !== undefined && (
                          <div
                            className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs font-semibold"
                            style={{
                              transform: 'translateZ(15px)',
                            }}
                          >
                            <span className="text-slate-300">
                              Last Score:
                            </span>

                            <span className="text-emerald-300 font-bold font-mono">
                              {exam.user_last_score} Marks (
                              {exam.user_last_percentage}%)
                            </span>
                          </div>
                        )}
                    </div>

                    <div
                      className="pt-4 mt-4 border-t border-white/5"
                      style={{
                        transform: 'translateZ(20px)',
                      }}
                    >

                      {isInProgress ? (
                        <button
                          onClick={() =>
                            onNavigate('exam-interface', {
                              attemptId:
                                exam.user_attempt_id,
                            })
                          }
                          className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Resume Exam Now
                        </button>
                      ) : isCompleted ? (
                        <div className="flex items-center gap-2">

                          <button
                            onClick={() =>
                              onNavigate(
                                'result-analysis',
                                {
                                  resultId:
                                    exam.user_last_result_id,
                                }
                              )
                            }
                            className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                          >
                            View Result
                          </button>

                          <button
                            onClick={() =>
                              handleStartOrResumeExam(
                                exam.exam_id
                              )
                            }
                            disabled={isStarting}
                            className="p-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 transition-colors cursor-pointer"
                            title="Retake Exam"
                          >
                            <RotateCcw
                              className={`w-4 h-4 ${
                                isStarting
                                  ? 'animate-spin'
                                  : ''
                              }`}
                            />
                          </button>

                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            handleStartOrResumeExam(
                              exam.exam_id
                            )
                          }
                          disabled={isStarting}
                          className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 btn-3d disabled:opacity-50 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />

                          {isStarting
                            ? 'Starting Exam...'
                            : 'Start Examination'}
                        </button>
                      )}

                    </div>
                  </div>
                </TiltCard>
              );
            })}

          </div>
        ) : (
          <div className="p-8 rounded-2xl glass-card border border-white/10 text-center space-y-3">

            <Layers className="w-8 h-8 text-indigo-400 mx-auto" />

            <p className="text-sm text-slate-300">
              No published examinations are available yet.
            </p>

            <p className="text-xs text-slate-500">
              Ask your teacher to publish an examination, then
              click Refresh.
            </p>

            <button
              onClick={handleRefreshExams}
              disabled={refreshingExams}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              {refreshingExams
                ? 'Checking...'
                : 'Check for Exams'}
            </button>

          </div>
        )}
      </section>

      {/* RECENT RESULTS */}
      <section className="space-y-4">

        <div className="flex items-center justify-between">

          <div className="space-y-0.5">
            <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Recent Examination Results
            </h2>

            <p className="text-xs text-slate-400">
              Direct breakdown of your completed tests and score
              calculations.
            </p>
          </div>

          <button
            onClick={() =>
              onNavigate('student-analytics')
            }
            className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            Full Analytics
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

        </div>

        {stats.recent_results &&
        stats.recent_results.length > 0 ? (

          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">

            <div className="overflow-x-auto">

              <table className="w-full text-left text-xs">

                <thead className="bg-white/5 text-slate-400 font-mono border-b border-white/10">
                  <tr>

                    <th className="py-3.5 px-4 font-semibold">
                      EXAM TITLE
                    </th>

                    <th className="py-3.5 px-4 font-semibold">
                      SCORE OBTAINED
                    </th>

                    <th className="py-3.5 px-4 font-semibold">
                      PERCENTAGE
                    </th>

                    <th className="py-3.5 px-4 font-semibold">
                      STATUS
                    </th>

                    <th className="py-3.5 px-4 font-semibold">
                      DATE & TIME
                    </th>

                    <th className="py-3.5 px-4 text-right font-semibold">
                      ACTION
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5 text-slate-200">

                  {stats.recent_results.map((res) => (

                    <tr
                      key={res.result_id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >

                      <td className="py-3.5 px-4 font-semibold text-white font-['Outfit']">
                        {res.exam_title}
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {res.score} / {res.total_marks} Marks
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {res.percentage}%
                      </td>

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

                        {new Date(
                          res.created_at
                        ).toLocaleDateString()}{' '}
                        at{' '}
                        {new Date(
                          res.created_at
                        ).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}

                      </td>

                      <td className="py-3.5 px-4 text-right">

                        <button
                          onClick={() =>
                            onNavigate(
                              'result-analysis',
                              {
                                resultId:
                                  res.result_id,
                              }
                            )
                          }
                          className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
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

            <p className="text-xs text-slate-400">
              You haven't completed any examinations yet.
            </p>

            <button
              onClick={() => {
                if (availableExams.length > 0) {
                  handleStartOrResumeExam(
                    availableExams[0].exam_id
                  );
                } else {
                  toast.info(
                    'No published examinations are available right now. Please check back after your teacher publishes an exam.',
                    'No Exam Available'
                  );
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              Start Your First Exam
            </button>

          </div>

        )}

      </section>

    </div>
  );
};