import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Award,
  Eye,
  Send,
  ChevronLeft,
  ChevronRight,
  Database,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface CreateExamPageProps {
  onNavigate: (view: string, params?: any) => void;
}

interface QuestionFormItem {
  id: string;
  question_text: string;
  marks: number;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
}

export const CreateExamPage: React.FC<CreateExamPageProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  // Step 1: Exam Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passingPercentage, setPassingPercentage] = useState(40);
  const [isPublished, setIsPublished] = useState(true);

  // Step 2: Questions
  const [questions, setQuestions] = useState<QuestionFormItem[]>([
    {
      id: 'q1',
      question_text: 'What is the primary purpose of encapsulation in Object-Oriented Programming?',
      marks: 3,
      options: [
        { text: 'To bind data and functions together while restricting direct access to internal state', isCorrect: true },
        { text: 'To allow multiple classes to inherit from a single parent class', isCorrect: false },
        { text: 'To execute polymorphic methods at compile time', isCorrect: false },
        { text: 'To convert high-level code directly into machine bytecode', isCorrect: false }
      ]
    },
    {
      id: 'q2',
      question_text: 'Which design pattern ensures a class has only one instance and provides a global access point to it?',
      marks: 3,
      options: [
        { text: 'Factory Method', isCorrect: false },
        { text: 'Singleton Pattern', isCorrect: true },
        { text: 'Observer Pattern', isCorrect: false },
        { text: 'Adapter Pattern', isCorrect: false }
      ]
    }
  ]);

  const totalCalculatedMarks = questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);

  // Add Question helper
  const handleAddQuestion = () => {
    const newQ: QuestionFormItem = {
      id: 'q_' + Math.random().toString(36).substring(2, 7),
      question_text: '',
      marks: 2,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    };
    setQuestions([...questions, newQ]);
  };

  // Remove Question
  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      toast.warning('Exam must contain at least 1 question.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  // Publish to Database
  const handlePublishToDatabase = async () => {
    if (!title.trim()) {
      toast.warning('Please provide an exam title.');
      setStep(1);
      return;
    }

    if (questions.some((q) => !q.question_text.trim())) {
      toast.warning('All questions must have question text.');
      setStep(2);
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        title,
        description,
        duration_minutes: Number(durationMinutes),
        total_marks: totalCalculatedMarks > 0 ? totalCalculatedMarks : 10,
        passing_percentage: Number(passingPercentage),
        is_published: isPublished,
        questions: questions.map((q, idx) => ({
          question_text: q.question_text,
          marks: Number(q.marks),
          order_num: idx + 1,
          options: q.options.map((o) => ({
            option_text: o.text || 'Option choice',
            is_correct: o.isCorrect
          }))
        }))
      };

      const res = await api.createExam(payload);
      toast.success(`Exam "${title}" successfully stored in MySQL!`, 'Published');
      onNavigate('teacher-dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save exam to database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('teacher-dashboard')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Faculty Portal
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">STEP {step} OF 4</span>
        </div>
      </div>

      {/* Step Wizard Tracker */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: 'Exam Details' },
          { num: 2, label: 'Questions & MCQs' },
          { num: 3, label: 'Student Preview' },
          { num: 4, label: 'Publish to MySQL' }
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num as any)}
            className={`p-3 rounded-2xl border text-left transition-all ${
              step === s.num
                ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-950/50'
                : step > s.num
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-white/[0.02] border-white/5 text-slate-500'
            }`}
          >
            <span className="text-[10px] font-mono font-bold block">STEP 0{s.num}</span>
            <span className="text-xs font-semibold font-['Outfit']">{s.label}</span>
          </button>
        ))}
      </div>

      {/* STEP 1: EXAM METADATA */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6"
        >
          <div>
            <h2 className="text-xl font-bold text-white font-['Outfit']">Step 1: Examination Configuration</h2>
            <p className="text-xs text-slate-400">Specify core assessment parameters, timings, and pass criteria.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Exam Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Distributed Systems & Cloud Architecture Final"
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description & Syllabus</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief guidelines, covered chapters, and instructions for students..."
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Duration (Minutes)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400 font-mono">Mins</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Passing Percentage</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400 font-mono">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Publication Status</label>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${
                    isPublished
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isPublished ? 'Published to Students' : 'Draft / Private'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                if (!title.trim()) {
                  toast.warning('Please enter an exam title.');
                  return;
                }
                setStep(2);
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Next: Add Questions <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: QUESTIONS & MCQ OPTIONS */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white font-['Outfit']">Step 2: Question Set & MCQs</h2>
              <p className="text-xs text-slate-400">
                Total Questions: {questions.length} • Total Calculated Marks: {totalCalculatedMarks}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIdx) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4 relative"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 font-mono">
                      Q{qIdx + 1}
                    </span>
                    <span className="text-xs text-slate-400">Multiple Choice Question</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-mono">Marks:</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={q.marks}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setQuestions((prev) =>
                            prev.map((item, idx) => (idx === qIdx ? { ...item, marks: val } : item))
                          );
                        }}
                        className="w-16 p-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-mono text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={q.question_text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestions((prev) =>
                        prev.map((item, idx) => (idx === qIdx ? { ...item, question_text: val } : item))
                      );
                    }}
                    placeholder={`Enter Question ${qIdx + 1} statement...`}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* 4 Options */}
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold block">
                    Options (Select radio for the correct option):
                  </span>
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name={`correct_${q.id}`}
                        checked={opt.isCorrect}
                        onChange={() => {
                          setQuestions((prev) =>
                            prev.map((item, idx) =>
                              idx === qIdx
                                ? {
                                    ...item,
                                    options: item.options.map((o, optIndex) => ({
                                      ...o,
                                      isCorrect: optIndex === oIdx
                                    }))
                                  }
                                : item
                            )
                          );
                        }}
                        className="w-4 h-4 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span className="w-5 font-mono text-xs font-bold text-slate-400">
                        {String.fromCharCode(65 + oIdx)}.
                      </span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions((prev) =>
                            prev.map((item, idx) =>
                              idx === qIdx
                                ? {
                                    ...item,
                                    options: item.options.map((o, optIndex) =>
                                      optIndex === oIdx ? { ...o, text: val } : o
                                    )
                                  }
                                : item
                            )
                          );
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + oIdx)} text...`}
                        className="flex-1 p-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Details
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Next: Student Preview <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: STUDENT PREVIEW */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-indigo-300">STUDENT VIEW SIMULATION</span>
              <p className="text-[11px] text-slate-400">
                This is exactly how candidates will experience this examination in real-time.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 font-mono">
              Live Mockup
            </span>
          </div>

          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit']">{title || 'Untitled Exam'}</h3>
                <p className="text-xs text-slate-400">{description || 'No description provided.'}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-cyan-300 font-mono text-xs font-bold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {durationMinutes}:00 Remaining
              </div>
            </div>

            {/* Questions preview */}
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 font-mono">QUESTION #{idx + 1}</span>
                    <span className="text-xs font-mono text-slate-400">+{q.marks} Marks</span>
                  </div>
                  <p className="text-sm font-medium text-white">{q.question_text || 'Empty question statement'}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          opt.isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                            : 'bg-white/[0.02] border-white/5 text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center font-bold font-mono text-[10px]">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt.text || `Option ${String.fromCharCode(65 + oIdx)}`}</span>
                        </span>
                        {opt.isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-400">Correct Choice</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" /> Edit Questions
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Proceed to Publish <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 4: FINAL PUBLISH SUMMARY */}
      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 sm:p-10 rounded-3xl border border-emerald-500/30 shadow-2xl space-y-6 text-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-950/50">
            <Database className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-2xl font-bold text-white font-['Outfit']">Ready to Store in MySQL</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Upon confirmation, the relational database will insert the `exam` entity and cascade insert all {questions.length} associated `question` and {questions.length * 4} `option` records.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-center font-mono text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-lg font-bold text-white">{questions.length}</span>
              <span className="block text-[10px] text-slate-400 uppercase">Questions</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-lg font-bold text-white">{durationMinutes}m</span>
              <span className="block text-[10px] text-slate-400 uppercase">Duration</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              <span className="text-lg font-bold text-emerald-400">{totalCalculatedMarks}</span>
              <span className="block text-[10px] text-slate-400 uppercase">Total Marks</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-semibold bg-white/5 text-slate-300 hover:bg-white/10"
            >
              Back to Preview
            </button>

            <button
              type="button"
              onClick={handlePublishToDatabase}
              disabled={isSaving}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 btn-3d disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSaving ? 'Writing to MySQL Database...' : 'Confirm & Save Examination'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
