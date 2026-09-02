import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  GraduationCap,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface AuthPageProps {
  initialTab?: 'login' | 'register' | 'forgot';
  initialRole?: 'STUDENT' | 'TEACHER';
  onNavigate: (view: string, params?: any) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialTab = 'login', initialRole = 'STUDENT', onNavigate }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>(initialTab);
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>(initialRole);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, isSupabaseConfigured } = useAuth();
  const toast = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const loggedUser = await login(email, password);
    setLoading(false);

    if (loggedUser) {
      if (loggedUser.role === 'TEACHER' || loggedUser.role === 'ADMIN') {
        onNavigate('teacher-dashboard');
      } else {
        onNavigate('student-dashboard');
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.warning('Please complete all required fields.');
      return;
    }

    if (role === 'STUDENT' && !rollNo) {
      toast.warning('Roll number is required for student registration.');
      return;
    }

    setLoading(true);
    const loggedUser = await register({
      name,
      email,
      password,
      role,
      roll_no: role === 'STUDENT' ? rollNo : undefined
    });
    setLoading(false);

    if (loggedUser) {
      if (loggedUser.role === 'TEACHER' || loggedUser.role === 'ADMIN') {
        onNavigate('teacher-dashboard');
      } else {
        onNavigate('student-dashboard');
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
      >
        {/* Top Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white font-['Outfit']">
            {tab === 'login' ? 'Welcome to NexusExam' : tab === 'register' ? 'Create Your Account' : 'Reset Password'}
          </h2>
          <p className="text-xs text-slate-400">
            {tab === 'login'
              ? 'Access your examinations, question bank, and real-time results.'
              : tab === 'register'
              ? 'Create your account to access examination portals and records.'
              : 'Enter your email to receive recovery instructions.'}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-200">Supabase API Key Required</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                To connect to your Supabase project (<span className="text-amber-200 font-mono">jwnhapdvdsvwbyumtjun</span>), configure <span className="text-amber-200 font-mono">VITE_SUPABASE_ANON_KEY</span> in your <span className="text-amber-200 font-mono">.env</span> file.
              </p>
            </div>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${
              tab === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setTab('forgot')}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-indigo-400 transition-all flex items-center justify-center gap-2 btn-3d disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Register As</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('STUDENT')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    role === 'STUDENT'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('TEACHER')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    role === 'TEACHER'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  Faculty / Teacher
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Hayes"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {role === 'STUDENT' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Student Roll Number</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="e.g. CS-2026-104"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-indigo-400 transition-all flex items-center justify-center gap-2 btn-3d disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <span>Create {role === 'STUDENT' ? 'Student' : 'Faculty'} Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {tab === 'forgot' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success('Password reset link sent to registered email address.');
              setTab('login');
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Account Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Send Reset Instructions
            </button>

            <button
              type="button"
              onClick={() => setTab('login')}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Back to Sign In
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
