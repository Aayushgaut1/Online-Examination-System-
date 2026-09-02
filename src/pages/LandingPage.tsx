import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Timer,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Lock,
  Layers,
  GraduationCap,
  Users,
  Database,
  Cpu,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { HeroVisual } from '../components/3d/HeroVisual';
import { TiltCard } from '../components/3d/TiltCard';
import { Geometric3DBackground } from '../components/3d/Geometric3DBackground';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  onNavigate: (view: string, params?: any) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { switchQuickAccount, isAuthenticated, isTeacher } = useAuth();

  const handleStartExam = () => {
    if (isAuthenticated) {
      onNavigate(isTeacher ? 'teacher-dashboard' : 'student-dashboard');
    } else {
      onNavigate('auth', { tab: 'login' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col cyber-grid relative overflow-hidden">
      {/* 3D Geometric Interactive Background */}
      <Geometric3DBackground />

      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-indigo-950/40 via-purple-950/20 to-transparent pointer-events-none blur-3xl -z-10" />

      {/* 1. HERO SECTION */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Typography & CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="lg:col-span-6 space-y-6 text-left"
          >
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold backdrop-blur-md shadow-lg shadow-indigo-950/40"
            >
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Next-Generation Testing Infrastructure</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white font-['Outfit'] tracking-tight leading-[1.08]">
              Exams, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
                Reimagined.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 max-w-xl font-normal leading-relaxed">
              An intelligent online examination platform built for seamless testing, real-time evaluation and smarter performance insights.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartExam}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 text-white shadow-xl shadow-indigo-600/30 btn-3d cursor-pointer"
              >
                <span>Start Exam</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const el = document.getElementById('how-it-works');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-all cursor-pointer"
              >
                Explore Platform
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('auth', { tab: 'login' })}
                className="px-5 py-3.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Login
              </motion.button>
            </div>

            {/* 1-Click Fast Demonstration Logins */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs font-mono text-slate-400 mb-2">⚡ Instant One-Click Demo Logins:</p>
              <div className="flex flex-wrap gap-2">
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    const ok = await switchQuickAccount('teacher');
                    if (ok) onNavigate('teacher-dashboard');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs font-semibold hover:bg-indigo-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  Dr. Sarah (Teacher)
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    const ok = await switchQuickAccount('alex');
                    if (ok) onNavigate('student-dashboard');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 text-xs font-semibold hover:bg-cyan-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  Alex Turner (Student)
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    const ok = await switchQuickAccount('maya');
                    if (ok) onNavigate('student-dashboard');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-semibold hover:bg-emerald-900 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Maya Patel (Student)
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Right Column: 3D Visual Composition */}
          <div className="lg:col-span-6 flex justify-center">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* 2. SECTION 1: HOW IT WORKS with 3D Tilt Cards */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
            WORKFLOW ARCHITECTURE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit']">
            How NexusExam Works
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            A frictionless, verified pipeline engineered for flawless online test delivery and grading.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Exam Creation',
              desc: 'Teachers define duration, marks, and MCQ options with a 4-step wizard with real-time preview.',
              icon: BookOpen,
              color: 'text-indigo-400',
              border: 'border-indigo-500/30',
              glow: 'rgba(99, 102, 241, 0.15)'
            },
            {
              step: '02',
              title: 'Secure Attempt Initiation',
              desc: 'Students begin testing with server-authoritative timestamps, live countdown, and state restoration.',
              icon: Timer,
              color: 'text-cyan-400',
              border: 'border-cyan-500/30',
              glow: 'rgba(6, 182, 212, 0.15)'
            },
            {
              step: '03',
              title: 'Auto-Grading & Locking',
              desc: 'Instant server-side grading computes score, percentage, and pass/fail against Supabase PostgreSQL tables.',
              icon: Zap,
              color: 'text-emerald-400',
              border: 'border-emerald-500/30',
              glow: 'rgba(168, 85, 247, 0.15)'
            },
            {
              step: '04',
              title: 'Deep Result Analytics',
              desc: 'Comprehensive question breakdowns, correct answer comparisons, and cohort statistics.',
              icon: BarChart3,
              color: 'text-purple-400',
              border: 'border-purple-500/30',
              glow: 'rgba(168, 85, 247, 0.15)'
            }
          ].map((item, idx) => (
            <TiltCard key={item.step} maxTilt={10} scale={1.03}>
              <div className={`glass-card p-6 rounded-2xl border ${item.border} relative overflow-hidden flex flex-col justify-between h-full shadow-lg`}>
                <div>
                  <div className="flex items-center justify-between mb-4" style={{ transform: 'translateZ(20px)' }}>
                    <span className="text-2xl font-black font-mono text-white/20">{item.step}</span>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white font-['Outfit'] mb-2" style={{ transform: 'translateZ(15px)' }}>
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed" style={{ transform: 'translateZ(10px)' }}>
                    {item.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center text-[11px] text-slate-400 font-mono" style={{ transform: 'translateZ(10px)' }}>
                  Verified Step • ACID Safe
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* 3. SECTION 2: FEATURES */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
            CORE CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit']">
            Built for Modern Academic Excellence
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Engineered with deep attention to reliability, security, and delightful user experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TiltCard maxTilt={8} scale={1.02}>
            <div className="glass-card p-7 rounded-2xl border border-indigo-500/30 hover:border-indigo-500/60 transition-all space-y-4 h-full shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner" style={{ transform: 'translateZ(25px)' }}>
                <Timer className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Outfit']" style={{ transform: 'translateZ(20px)' }}>
                Persistent Live Countdown Timer
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed" style={{ transform: 'translateZ(15px)' }}>
                Timers are validated server-side. Refreshing the browser or network blips seamlessly restores remaining time and previously selected answers.
              </p>
            </div>
          </TiltCard>

          <TiltCard maxTilt={8} scale={1.02}>
            <div className="glass-card p-7 rounded-2xl border border-cyan-500/30 hover:border-cyan-500/60 transition-all space-y-4 h-full shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner" style={{ transform: 'translateZ(25px)' }}>
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Outfit']" style={{ transform: 'translateZ(20px)' }}>
                Sub-Second Automatic Grading
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed" style={{ transform: 'translateZ(15px)' }}>
                Every answer is evaluated by the backend database against correct option definitions, calculating score, percentage, and pass/fail instantly.
              </p>
            </div>
          </TiltCard>

          <TiltCard maxTilt={8} scale={1.02}>
            <div className="glass-card p-7 rounded-2xl border border-emerald-500/30 hover:border-emerald-500/60 transition-all space-y-4 h-full shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner" style={{ transform: 'translateZ(25px)' }}>
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Outfit']" style={{ transform: 'translateZ(20px)' }}>
                Real Supabase PostgreSQL Storage
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed" style={{ transform: 'translateZ(15px)' }}>
                Preserves referential integrity across 8 relational tables (exams, questions, options, students, attempts, answers, results, users) with foreign keys and cascade deletes.
              </p>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* 4 & 5. SECTIONS 3 & 4: FOR TEACHERS & FOR STUDENTS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* For Teachers Card */}
          <TiltCard maxTilt={6} scale={1.01}>
            <div className="glass-panel p-8 rounded-3xl border border-indigo-500/30 relative overflow-hidden flex flex-col justify-between h-full shadow-2xl">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold" style={{ transform: 'translateZ(20px)' }}>
                  <GraduationCap className="w-4 h-4" />
                  FACULTY SUITE
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']" style={{ transform: 'translateZ(25px)' }}>
                  For Teachers & Instructors
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed" style={{ transform: 'translateZ(15px)' }}>
                  Take complete command of your examinations. Create multi-option question sets, set custom durations, manage publishing status, and monitor student performance in real time.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-200" style={{ transform: 'translateZ(15px)' }}>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    Multi-step visual exam creator with live student preview
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    Rich question bank with single-choice radio correct selectors
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    Live cohort score distributions, pass rates, and individual attempt audits
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-white/10" style={{ transform: 'translateZ(20px)' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    await switchQuickAccount('teacher');
                    onNavigate('teacher-dashboard');
                  }}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
                >
                  Access Faculty Portal <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </TiltCard>

          {/* For Students Card */}
          <TiltCard maxTilt={6} scale={1.01}>
            <div className="glass-panel p-8 rounded-3xl border border-cyan-500/30 relative overflow-hidden flex flex-col justify-between h-full shadow-2xl">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold" style={{ transform: 'translateZ(20px)' }}>
                  <Users className="w-4 h-4" />
                  STUDENT EXPERIENCE
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']" style={{ transform: 'translateZ(25px)' }}>
                  For Enrolled Students
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed" style={{ transform: 'translateZ(15px)' }}>
                  Step into a distraction-free, 3D testing environment designed to maximize concentration, keep you updated on remaining time, and deliver immediate post-exam clarity.
                </p>
                <ul className="space-y-2.5 text-xs text-slate-200" style={{ transform: 'translateZ(15px)' }}>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    Distraction-free exam room with visual question navigator
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    Real-time answer auto-saving with instant marked-for-review tags
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    3D score visualization with question-by-question answer analysis
                  </li>
                </ul>
              </div>
              <div className="pt-6 mt-6 border-t border-white/10" style={{ transform: 'translateZ(20px)' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    await switchQuickAccount('alex');
                    onNavigate('student-dashboard');
                  }}
                  className="w-full py-3 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-600/30"
                >
                  Launch Student Portal <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full relative z-10">
        <TiltCard maxTilt={4} scale={1.01}>
          <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-white/10 text-center space-y-8 relative overflow-hidden shadow-2xl">
            <div className="max-w-2xl mx-auto space-y-4">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit']" style={{ transform: 'translateZ(20px)' }}>
                Ready to experience modern testing?
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed" style={{ transform: 'translateZ(15px)' }}>
                Explore realistic exams in Computer Networks, DBMS, Object-Oriented Programming, Operating Systems, and AI.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4" style={{ transform: 'translateZ(25px)' }}>
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartExam}
                className="px-8 py-4 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-xl shadow-indigo-600/30 btn-3d cursor-pointer"
              >
                Enter Examination System
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate('auth', { tab: 'register' })}
                className="px-8 py-4 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors cursor-pointer"
              >
                Create Free Account
              </motion.button>
            </div>
          </div>
        </TiltCard>
      </section>
    </div>
  );
};
