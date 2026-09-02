import React from 'react';
import { Sparkles, Database, ShieldCheck, Heart, Terminal } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string, params?: any) => void;
  onOpenDbModal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenDbModal }) => {
  return (
    <footer className="w-full bg-slate-950 border-t border-white/10 mt-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Col 1: Brand */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-white font-['Outfit']">
              Nexus<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Exam</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            A production-grade, 3D online examination and testing engine built with Node.js, Express, React, and Supabase PostgreSQL. Featuring server-authoritative timers, instantaneous automatic grading, and comprehensive student & faculty analytics.
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" /> ACID Relational Integrity
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Database className="w-4 h-4" /> Supabase PostgreSQL Connected
            </span>
          </div>
        </div>

        {/* Col 2: Core Entities */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">ER Database Entities</h4>
          <ul className="space-y-1.5 text-xs text-slate-400 font-mono">
            <li className="hover:text-indigo-300 transition-colors cursor-pointer">• EXAM (1:N Questions)</li>
            <li className="hover:text-indigo-300 transition-colors cursor-pointer">• QUESTION (1:N Options)</li>
            <li className="hover:text-indigo-300 transition-colors cursor-pointer">• STUDENT (1:N Attempts)</li>
            <li className="hover:text-indigo-300 transition-colors cursor-pointer">• ATTEMPT (1:1 Result)</li>
            <li className="hover:text-indigo-300 transition-colors cursor-pointer">• ANSWER (N:1 Option)</li>
          </ul>
        </div>

        {/* Col 3: Test Accounts */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Test Credentials</h4>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs text-slate-300 font-mono">
            <p><span className="text-indigo-400 font-semibold">Teacher:</span> teacher@examverse.com</p>
            <p><span className="text-cyan-400 font-semibold">Student:</span> aarav@example.com</p>
            <p><span className="text-amber-400 font-semibold">Pass:</span> password123</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
        <p>© 2026 NexusExam Online Examination System. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-slate-400">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Full-Stack Architecture
          </span>
        </div>
      </div>
    </footer>
  );
};
