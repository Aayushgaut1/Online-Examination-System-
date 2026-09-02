import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Timer,
  Calendar,
  RotateCcw,
  LayoutDashboard,
  Printer,
  ChevronLeft,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { ScoreGauge } from '../components/3d/ScoreGauge';
import { DetailedResultResponse } from '../types';

interface ResultPageProps {
  resultId: number;
  onNavigate: (view: string, params?: any) => void;
}

export const ResultPage: React.FC<ResultPageProps> = ({ resultId, onNavigate }) => {
  const [data, setData] = useState<DetailedResultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const toast = useToast();

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const res = await api.getResultById(resultId);
        setData(res);
      } catch (err: any) {
        toast.error('Failed to load examination result: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [resultId]);

  if (loading || !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Compiling evaluation & question-by-question analysis...</p>
      </div>
    );
  }

  const { result, exam, student, attempt, analysis } = data;
  const isPassed = result.pass_status === 'PASSED';

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const filteredQuestions = analysis.filter((q) => {
    if (filter === 'correct') return q.is_correct;
    if (filter === 'incorrect') return !q.is_correct && q.selected_option_id !== null;
    if (filter === 'unanswered') return q.selected_option_id === null;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => onNavigate('student-dashboard')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print Result
          </button>
          <button
            onClick={async () => {
              try {
                const res = await api.startAttempt(exam.exam_id);
                onNavigate('exam-interface', { attemptId: res.attempt.attempt_id });
              } catch (err: any) {
                toast.error(err.message);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Retake Exam
          </button>
        </div>
      </div>

      {/* 2. Main 3D Score & Evaluation Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel p-6 sm:p-10 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-8 items-center"
      >
        {/* Left Side: Score Gauge */}
        <div className="md:col-span-5 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 pb-6 md:pb-0 md:pr-8">
          <ScoreGauge
            score={result.score}
            totalMarks={result.total_marks}
            percentage={result.percentage}
            passStatus={result.pass_status}
            size={210}
          />
        </div>

        {/* Right Side: Metadata & Metric Grid */}
        <div className="md:col-span-7 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                RESULT ID #{result.result_id}
              </span>
              <span className="text-xs text-slate-400 font-mono">ATTEMPT #{attempt.attempt_id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit']">{exam.title}</h1>
            <p className="text-xs text-slate-300 mt-1">
              Candidate: <strong className="text-white">{student.name}</strong> • Roll No:{' '}
              <span className="font-mono text-cyan-300">{student.roll_no}</span>
            </p>
          </div>

          {/* Metric Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
              <div className="flex items-center gap-1 text-emerald-400 font-semibold mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
              </div>
              <span className="text-lg font-bold text-white">{result.correct_answers}</span>
              <span className="text-[10px] text-slate-400 block">Questions</span>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30">
              <div className="flex items-center gap-1 text-rose-400 font-semibold mb-0.5">
                <XCircle className="w-3.5 h-3.5" /> Incorrect
              </div>
              <span className="text-lg font-bold text-white">{result.incorrect_answers}</span>
              <span className="text-[10px] text-slate-400 block">Questions</span>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-1 text-slate-400 font-semibold mb-0.5">
                <HelpCircle className="w-3.5 h-3.5" /> Skipped
              </div>
              <span className="text-lg font-bold text-white">{result.unanswered_questions}</span>
              <span className="text-[10px] text-slate-400 block">Questions</span>
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
              <div className="flex items-center gap-1 text-indigo-300 font-semibold mb-0.5">
                <Timer className="w-3.5 h-3.5" /> Time Taken
              </div>
              <span className="text-base font-bold text-white">{formatDuration(result.time_taken_seconds)}</span>
              <span className="text-[10px] text-slate-400 block">of {exam.duration_minutes}m</span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Evaluation validated with ACID referential consistency on Supabase PostgreSQL.</span>
          </div>
        </div>
      </motion.div>

      {/* 3. Detailed Question-by-Question Breakdown */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white font-['Outfit']">Question-by-Question Analysis</h2>
            <p className="text-xs text-slate-400">Review your answers against the official correct options.</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({analysis.length})
            </button>
            <button
              onClick={() => setFilter('correct')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'correct' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Correct ({result.correct_answers})
            </button>
            <button
              onClick={() => setFilter('incorrect')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'incorrect' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Incorrect ({result.incorrect_answers})
            </button>
            <button
              onClick={() => setFilter('unanswered')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filter === 'unanswered' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Skipped ({result.unanswered_questions})
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.map((q, idx) => {
            const isAnswered = q.selected_option_id !== null;

            return (
              <div
                key={q.question_id}
                className={`glass-card p-6 rounded-2xl border transition-all space-y-4 ${
                  q.is_correct
                    ? 'border-emerald-500/30 bg-emerald-950/5'
                    : isAnswered
                    ? 'border-rose-500/30 bg-rose-950/5'
                    : 'border-white/10'
                }`}
              >
                {/* Question Item Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white/10 font-mono text-slate-300">
                      Q{idx + 1}
                    </span>
                    <h3 className="text-sm sm:text-base font-semibold text-white font-['Outfit']">
                      {q.question_text}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                        q.is_correct
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isAnswered
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {q.is_correct ? `+${q.marks} Marks` : '0 Marks'}
                    </span>
                  </div>
                </div>

                {/* Options List with Color Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {q.options.map((opt, oIdx) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    const isStudentChoice = q.selected_option_id === opt.option_id;
                    const isCorrectAnswer = opt.is_correct;

                    let optBg = 'bg-white/[0.02] border-white/5 text-slate-300';
                    if (isCorrectAnswer) {
                      optBg = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-100 font-semibold shadow-sm';
                    } else if (isStudentChoice && !isCorrectAnswer) {
                      optBg = 'bg-rose-500/20 border-rose-500/50 text-rose-100 font-semibold shadow-sm';
                    }

                    return (
                      <div
                        key={opt.option_id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${optBg}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-md bg-black/20 flex items-center justify-center font-bold text-xs font-mono">
                            {letter}
                          </span>
                          <span>{opt.option_text}</span>
                        </div>

                        {isCorrectAnswer && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct Answer
                          </span>
                        )}
                        {isStudentChoice && !isCorrectAnswer && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                            <XCircle className="w-3.5 h-3.5" /> Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
