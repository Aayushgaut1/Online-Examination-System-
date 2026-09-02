import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  BookOpen,
  LayoutDashboard,
  Award,
  Database,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  PlusCircle,
  Users,
  BarChart3,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DatabaseModal } from './DatabaseModal';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, params?: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, student, isAuthenticated, isTeacher, isStudent, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbModalOpen, setDbModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/75 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            onClick={() => onNavigate(isAuthenticated ? (isTeacher ? 'teacher-dashboard' : 'student-dashboard') : 'landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white font-['Outfit']">
                Nexus<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Exam</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                PROD v2.4
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/10 p-1 rounded-xl">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => onNavigate('landing')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    currentView === 'landing' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => onNavigate('auth', { tab: 'login' })}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Explore Platform
                </button>
              </>
            ) : isStudent ? (
              <>
                <button
                  onClick={() => onNavigate('student-dashboard')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    currentView === 'student-dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Available Exams
                </button>
                <button
                  onClick={() => onNavigate('student-analytics')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    currentView === 'student-analytics' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  My Results & Analytics
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('teacher-dashboard')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    currentView === 'teacher-dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Faculty Dashboard
                </button>
                <button
                  onClick={() => onNavigate('create-exam')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    currentView === 'create-exam' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-cyan-300" />
                  Create Exam
                </button>
              </>
            )}

            {/* Database Inspector Modal Trigger */}
            <button
              onClick={() => setDbModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10 transition-all border border-cyan-500/20"
            >
              <Database className="w-3.5 h-3.5" />
              Supabase Schema
            </button>
          </nav>

          {/* Right Action & Profile Area */}
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('auth', { tab: 'login' })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/5 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('auth', { tab: 'register' })}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-indigo-400 transition-all btn-3d"
                >
                  Get Started
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-xs text-white shadow">
                    {user?.name.charAt(0) || 'U'}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-white leading-tight">{user?.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {isTeacher ? 'FACULTY' : student?.roll_no || 'STUDENT'}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl border border-white/10 p-2 shadow-2xl z-50"
                    >
                      <div className="px-3 py-2 border-b border-white/10 mb-1">
                        <p className="text-xs font-bold text-white">{user?.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                        <div className="mt-1.5 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Role: {user?.role}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setDbModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/5 transition-colors"
                      >
                        <Database className="w-4 h-4 text-cyan-400" />
                        Inspect Database Schema
                      </button>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                          onNavigate('landing');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors mt-1"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-white/5 text-slate-300"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-b border-white/10 bg-slate-950 px-4 py-4 space-y-2"
            >
              {isAuthenticated ? (
                <>
                  {isStudent ? (
                    <>
                      <button
                        onClick={() => {
                          onNavigate('student-dashboard');
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200"
                      >
                        Available Exams
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('student-analytics');
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200"
                      >
                        My Results & Analytics
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          onNavigate('teacher-dashboard');
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200"
                      >
                        Faculty Dashboard
                      </button>
                      <button
                        onClick={() => {
                          onNavigate('create-exam');
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200"
                      >
                        Create Exam
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onNavigate('landing');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200"
                  >
                    Home
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('auth', { tab: 'login' });
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200"
                  >
                    Sign In
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setDbModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-cyan-300 font-semibold"
              >
                View Supabase Schema
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Database Schema Inspector Modal */}
      <DatabaseModal isOpen={dbModalOpen} onClose={() => setDbModalOpen(false)} />
    </>
  );
};
