import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  BarChart3,
  Sparkles,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MetricCard } from '../components/3d/MetricCard';
import { Result } from '../types';

interface StudentAnalyticsPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const StudentAnalyticsPage: React.FC<StudentAnalyticsPageProps> = ({ onNavigate }) => {
  const { student } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!student) return;
      try {
        setLoading(true);
        const data = await api.getStudentResults(student.student_id);
        setResults(data);
      } catch (err: any) {
        toast.error('Failed to load performance analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [student]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Computing score distributions & longitudinal metrics...</p>
      </div>
    );
  }

  const completedCount = results.length;
  const totalScoreObtained = results.reduce((acc, r) => acc + r.score, 0);
  const totalMarksPossible = results.reduce((acc, r) => acc + (r.total_marks || 0), 0);
  const avgPercentage = completedCount > 0
    ? Number((results.reduce((acc, r) => acc + r.percentage, 0) / completedCount).toFixed(1))
    : 0;
  const passCount = results.filter((r) => r.pass_status === 'PASSED').length;
  const passRate = completedCount > 0 ? Number(((passCount / completedCount) * 100).toFixed(1)) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => onNavigate('student-dashboard')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
            STUDENT ROLL: {student?.roll_no}
          </span>
        </div>
      </div>

      {/* Main Analytics Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">
              Performance & Examination History
            </h1>
            <p className="text-xs text-slate-400">
              Longitudinal tracking of assessment scores, accuracy rates, and question outcomes.
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/5">
          <MetricCard
            title="Total Exams Completed"
            value={completedCount}
            subtitle={`${totalScoreObtained} marks earned`}
            icon={BookOpen}
            color="indigo"
          />
          <MetricCard
            title="Cumulative Average"
            value={`${avgPercentage}%`}
            subtitle="Overall academic score"
            icon={Award}
            color="cyan"
          />
          <MetricCard
            title="Tests Passed"
            value={passCount}
            subtitle={`${completedCount - passCount} tests failed`}
            icon={CheckCircle2}
            color="emerald"
          />
          <MetricCard
            title="Passing Ratio"
            value={`${passRate}%`}
            subtitle="Academic standing"
            icon={TrendingUp}
            color="violet"
          />
        </div>
      </motion.div>

      {/* Score Progression Bars */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Score Progression
        </h2>

        {results.length > 0 ? (
          <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
            <div className="space-y-3">
              {results.map((res) => {
                const isPass = res.pass_status === 'PASSED';
                return (
                  <div key={res.result_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-['Outfit']">{res.exam_title}</span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            isPass
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {res.pass_status}
                        </span>
                      </div>
                      <div className="font-mono text-slate-300">
                        <strong className="text-white">{res.percentage}%</strong> ({res.score}/{res.total_marks} Marks)
                      </div>
                    </div>

                    {/* Score Bar */}
                    <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(0, res.percentage))}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          isPass
                            ? 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400'
                            : 'bg-gradient-to-r from-rose-600 to-rose-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl glass-card border border-white/10 text-center text-xs text-slate-400">
            No completed exams yet to generate progression trends.
          </div>
        )}
      </section>

      {/* Historical Attempts Table */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          Examination Records
        </h2>

        {results.length > 0 && (
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-slate-400 font-mono border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">EXAM</th>
                    <th className="py-3.5 px-4 font-semibold">SCORE OBTAINED</th>
                    <th className="py-3.5 px-4 font-semibold">PERCENTAGE</th>
                    <th className="py-3.5 px-4 font-semibold">STATUS</th>
                    <th className="py-3.5 px-4 font-semibold">DATE OF ATTEMPT</th>
                    <th className="py-3.5 px-4 text-right font-semibold">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {results.map((res) => (
                    <tr key={res.result_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white font-['Outfit']">{res.exam_title}</td>
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
                          className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold transition-colors flex items-center gap-1 ml-auto"
                        >
                          <span>Analysis</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
