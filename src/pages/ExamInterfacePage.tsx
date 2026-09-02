import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Timer,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Exam, Question, Attempt } from '../types';

interface ExamInterfacePageProps {
  attemptId: number;
  onNavigate: (view: string, params?: any) => void;
}

export const ExamInterfacePage: React.FC<ExamInterfacePageProps> = ({ attemptId, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Local answers state: map of question_id -> { selected_option_id, is_marked_for_review }
  const [answersMap, setAnswersMap] = useState<Record<number, { selected_option_id: number | null; is_marked_for_review: boolean }>>({});

  // Countdown timer in seconds (server-synchronized)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [savingState, setSavingState] = useState<'saved' | 'saving' | 'error'>('saved');

  const toast = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Attempt Data from Server
  const loadAttempt = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAttempt(attemptId);

      if (data.attempt.status === 'SUBMITTED' && data.result) {
        toast.info('This exam was already submitted.');
        onNavigate('result-analysis', { resultId: data.result.result_id });
        return;
      }

      setExam(data.exam);
      setQuestions(data.questions);
      setAttempt(data.attempt);
      setRemainingSeconds(data.remaining_seconds);

      // Hydrate answers map from server records
      const initialMap: Record<number, { selected_option_id: number | null; is_marked_for_review: boolean }> = {};
      data.questions.forEach((q) => {
        const savedAnswer = data.answers.find((a) => a.question_id === q.question_id);
        initialMap[q.question_id] = {
          selected_option_id: savedAnswer ? savedAnswer.selected_option_id : null,
          is_marked_for_review: savedAnswer ? savedAnswer.is_marked_for_review : false
        };
      });
      setAnswersMap(initialMap);
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize exam environment.');
      onNavigate('student-dashboard');
    } finally {
      setLoading(false);
    }
  }, [attemptId, onNavigate]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  // 2. Real-time Countdown Timer with Auto-Submit
  useEffect(() => {
    if (loading || remainingSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, remainingSeconds]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 3. Save Answer Handler (Immediate Server Sync)
  const handleSelectOption = async (questionId: number, optionId: number) => {
    const current = answersMap[questionId] || { selected_option_id: null, is_marked_for_review: false };
    const newSelected = current.selected_option_id === optionId ? null : optionId; // toggle

    // Optimistic UI update
    setAnswersMap((prev) => ({
      ...prev,
      [questionId]: {
        ...current,
        selected_option_id: newSelected
      }
    }));

    // Server API Sync
    try {
      setSavingState('saving');
      await api.saveAnswer(attemptId, {
        question_id: questionId,
        selected_option_id: newSelected,
        is_marked_for_review: current.is_marked_for_review
      });
      setSavingState('saved');
    } catch (err: any) {
      setSavingState('error');
      toast.error('Failed to sync answer to database.');
    }
  };

  // 4. Mark for Review Toggle
  const handleToggleReview = async (questionId: number) => {
    const current = answersMap[questionId] || { selected_option_id: null, is_marked_for_review: false };
    const newReview = !current.is_marked_for_review;

    setAnswersMap((prev) => ({
      ...prev,
      [questionId]: {
        ...current,
        is_marked_for_review: newReview
      }
    }));

    try {
      await api.saveAnswer(attemptId, {
        question_id: questionId,
        selected_option_id: current.selected_option_id,
        is_marked_for_review: newReview
      });
    } catch (err) {
      toast.error('Failed to update review flag.');
    }
  };

  // 5. Clear Choice Handler
  const handleClearChoice = async (questionId: number) => {
    const current = answersMap[questionId] || { selected_option_id: null, is_marked_for_review: false };
    setAnswersMap((prev) => ({
      ...prev,
      [questionId]: {
        ...current,
        selected_option_id: null
      }
    }));

    try {
      await api.saveAnswer(attemptId, {
        question_id: questionId,
        selected_option_id: null,
        is_marked_for_review: current.is_marked_for_review
      });
    } catch (err) {
      toast.error('Failed to clear choice.');
    }
  };

  // 6. Submit Exam & Automatic Grading
  const handleSubmitExam = async () => {
    try {
      setIsSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);

      // Prepare final answers array
      const payloadAnswers = Object.entries(answersMap).map(([qId, ans]) => ({
        question_id: Number(qId),
        selected_option_id: (ans as { selected_option_id: number | null; is_marked_for_review: boolean }).selected_option_id
      }));

      const res = await api.submitAttempt(attemptId, { answers: payloadAnswers });
      toast.success('Exam successfully graded!', 'Submission Complete');
      setShowSubmitModal(false);
      onNavigate('result-analysis', { resultId: res.result.result_id });
    } catch (err: any) {
      toast.error(err.message || 'Submission failed.');
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    toast.warning('Time has expired! Automatically submitting your examination.', 'Time Expired');
    handleSubmitExam();
  };

  if (loading || !exam || questions.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Initializing secure examination room...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswerState = answersMap[currentQuestion?.question_id] || { selected_option_id: null, is_marked_for_review: false };

  // Calculate stats
  const answeredCount = Object.values(answersMap).filter((a: any) => a.selected_option_id !== null).length;
  const reviewCount = Object.values(answersMap).filter((a: any) => a.is_marked_for_review).length;
  const unansweredCount = questions.length - answeredCount;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  const isTimerCritical = remainingSeconds <= 300; // Under 5 mins

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* 1. Exam Top Control Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-white/10 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Exam Title & Index */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white font-['Outfit'] line-clamp-1">{exam.title}</h1>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span>QUESTION {currentIndex + 1} OF {questions.length}</span>
                <span>•</span>
                <span className="text-indigo-300">{exam.total_marks} TOTAL MARKS</span>
              </div>
            </div>
          </div>

          {/* Center Timer Display */}
          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all ${
              isTimerCritical
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse shadow-lg shadow-rose-950/50'
                : 'bg-slate-950 border-indigo-500/30 text-cyan-300'
            }`}
          >
            <Timer className={`w-4 h-4 ${isTimerCritical ? 'text-rose-400' : 'text-cyan-400'}`} />
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Remaining Time</span>
              <span className="text-base font-mono font-bold">{formatTime(remainingSeconds)}</span>
            </div>
          </div>

          {/* Right Action: Finish & Submit */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span className={`w-2 h-2 rounded-full ${savingState === 'saving' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              {savingState === 'saving' ? 'Saving...' : 'Database Sync Active'}
            </div>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/25 transition-all btn-3d"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Exam</span>
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-white/5 h-1 rounded-full mt-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* 2. Main Exam Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Question & Options Stage (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
            {/* Question Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  QUESTION #{currentIndex + 1}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Marks: <strong className="text-white">+{currentQuestion.marks}</strong>
                </span>
              </div>

              <button
                onClick={() => handleToggleReview(currentQuestion.question_id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  currentAnswerState.is_marked_for_review
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:text-white'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" />
                {currentAnswerState.is_marked_for_review ? 'Marked for Review' : 'Mark for Review'}
              </button>
            </div>

            {/* Question Text & Options with AnimatePresence */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.question_id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="space-y-6"
              >
                <div className="text-base sm:text-lg font-medium text-white leading-relaxed font-['Outfit']">
                  {currentQuestion.question_text}
                </div>

                {/* Options List */}
                <div className="space-y-3 pt-2">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = currentAnswerState.selected_option_id === option.option_id;
                    const letter = String.fromCharCode(65 + optIdx);

                    return (
                      <motion.div
                        key={option.option_id}
                        whileHover={{ scale: 1.01, y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelectOption(currentQuestion.question_id, option.option_id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-xl shadow-indigo-950/60 font-medium'
                            : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-indigo-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs font-mono transition-colors shadow ${
                              isSelected
                                ? 'bg-indigo-500 text-white shadow-indigo-500/40'
                                : 'bg-white/10 text-slate-400'
                            }`}
                          >
                            {letter}
                          </div>
                          <span className="text-sm font-medium leading-normal">{option.option_text}</span>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected ? 'border-indigo-400 bg-indigo-500 text-white scale-110 shadow-sm' : 'border-slate-600'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white animate-scale" />}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Question Footer Actions */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => handleClearChoice(currentQuestion.question_id)}
                disabled={currentAnswerState.selected_option_id === null}
                className="text-xs text-slate-400 hover:text-rose-400 font-semibold transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Clear My Choice
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="flex items-center gap-1 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
                  >
                    Save & Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
                  >
                    Review & Submit <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Question Navigator & Summary Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-5">
            <h3 className="text-sm font-bold text-white font-['Outfit'] uppercase tracking-wider">
              Question Navigator
            </h3>

            {/* Status Indicator Chips */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/40 border border-amber-500/20 text-amber-300">
                <span className="w-3 h-3 rounded-md bg-amber-500" />
                <span>Review ({reviewCount})</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400">
                <span className="w-3 h-3 rounded-md bg-slate-700" />
                <span>Unanswered ({unansweredCount})</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-indigo-300">
                <span className="w-3 h-3 rounded-md bg-indigo-500 ring-2 ring-indigo-300" />
                <span>Current (# {currentIndex + 1})</span>
              </div>
            </div>

            {/* Number Matrix */}
            <div className="grid grid-cols-5 gap-2 pt-2 border-t border-white/5">
              {questions.map((q, idx) => {
                const ans = answersMap[q.question_id];
                const isAnswered = ans && ans.selected_option_id !== null;
                const isReview = ans && ans.is_marked_for_review;
                const isCurrent = idx === currentIndex;

                let btnBg = 'bg-white/5 text-slate-400 hover:bg-white/10';
                if (isReview) {
                  btnBg = 'bg-amber-500/30 text-amber-200 border border-amber-500/50';
                } else if (isAnswered) {
                  btnBg = 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50';
                }

                return (
                  <button
                    key={q.question_id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 rounded-xl font-mono text-xs font-bold transition-all relative ${btnBg} ${
                      isCurrent ? 'ring-2 ring-indigo-400 scale-105 shadow-md shadow-indigo-500/30' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Quick Submit Trigger */}
            <div className="pt-4 border-t border-white/5">
              <button
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 btn-3d"
              >
                <Send className="w-4 h-4" />
                Submit Final Answers
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 3. SUBMISSION CONFIRMATION MODAL */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubmitModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-['Outfit']">Submit Examination?</h3>
                    <p className="text-xs text-slate-400">Your answers will be finalized and automatically graded.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Stats Matrix */}
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                  <span className="text-xl font-bold text-emerald-300">{answeredCount}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase">Answered</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30">
                  <span className="text-xl font-bold text-amber-300">{reviewCount}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase">Review</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30">
                  <span className="text-xl font-bold text-rose-300">{unansweredCount}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5 uppercase">Unanswered</p>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  ⚠️ You have <strong>{unansweredCount} unanswered questions</strong>. They will receive 0 marks.
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                >
                  Return to Exam
                </button>
                <button
                  onClick={handleSubmitExam}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 btn-3d disabled:opacity-50"
                >
                  {isSubmitting ? 'Grading Answers...' : 'Confirm Submission'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
