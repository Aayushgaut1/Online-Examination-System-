import React, { useState, useRef, MouseEvent } from 'react';
import { motion } from 'motion/react';
import { Timer, CheckCircle2, Award, Sparkles, TrendingUp, Cpu, ShieldCheck, Database, Zap } from 'lucide-react';

export const HeroVisual: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D'>('B');

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 14;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.18
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-xl mx-auto lg:max-w-none perspective-1000 py-6 select-none"
    >
      {/* Background ambient multi-color glow spheres */}
      <div className="absolute -top-12 -left-12 w-72 h-72 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-12 -right-12 w-72 h-72 bg-cyan-600/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main 3D Container with Dynamic Physics Spring */}
      <motion.div
        animate={{
          rotateX: rotateX,
          rotateY: rotateY,
          scale: glare.opacity > 0 ? 1.02 : 1
        }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 24,
          mass: 0.6
        }}
        className="relative z-10 preserve-3d"
      >
        {/* Dynamic Specular Glare Overlay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-30 overflow-hidden"
          style={{
            opacity: glare.opacity,
            background: `radial-gradient(circle 300px at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.45), transparent 70%)`
          }}
        />

        {/* Main Central Exam Stage Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-white/12 shadow-2xl relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-indigo-950/40">
          {/* Card Header with 3D Depth */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10" style={{ transform: 'translateZ(20px)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 transform hover:rotate-6 transition-transform">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white font-['Outfit']">Computer Networks & Systems</h4>
                <p className="text-xs text-indigo-300 font-mono">CODE: CS-402 • Q3 OF 20</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-indigo-950/70 border border-indigo-500/40 px-3 py-1.5 rounded-lg shadow-inner">
              <Timer className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="text-xs font-mono font-bold text-cyan-300 tracking-wider">18:42 REMAINING</span>
            </div>
          </div>

          {/* Question Preview Body */}
          <div className="my-6" style={{ transform: 'translateZ(25px)' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                QUESTION 03
              </span>
              <span className="text-xs text-slate-400 font-medium">Single Choice • 3 Marks</span>
            </div>
            <p className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed">
              Which protocol operates at the Transport Layer to guarantee reliable, connection-oriented ordered delivery?
            </p>

            {/* Interactive Options with 3D Bevel feedback */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
              {[
                { key: 'A', text: 'UDP (User Datagram Protocol)' },
                { key: 'B', text: 'TCP (Transmission Control Protocol)', correct: true },
                { key: 'C', text: 'ICMP (Control Message Protocol)' },
                { key: 'D', text: 'ARP (Address Resolution Protocol)' }
              ].map((opt) => {
                const isSelected = selectedOption === opt.key;
                return (
                  <motion.button
                    key={opt.key}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedOption(opt.key as any)}
                    className={`p-3 rounded-xl text-xs text-left flex items-center justify-between transition-all duration-200 border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-400/70 text-indigo-100 shadow-lg shadow-indigo-900/40 font-semibold'
                        : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-indigo-500/40 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                          isSelected ? 'bg-indigo-500 text-white shadow' : 'bg-white/10 text-slate-400'
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Progress Bar & Status Footer with 3D Depth */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs" style={{ transform: 'translateZ(15px)' }}>
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Real-time Autosave to MySQL Active</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-slate-400">
              Progress: <span className="text-white font-bold">15%</span>
            </div>
          </div>
        </div>

        {/* Floating Element 1: Score & Evaluation Badge */}
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotateZ: [0, 1.5, 0]
          }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
          className="absolute -top-6 -right-4 sm:-right-8 bg-slate-900/95 border border-emerald-500/50 p-3.5 rounded-2xl shadow-2xl shadow-emerald-950/60 backdrop-blur-xl flex items-center gap-3 z-30"
          style={{ transform: 'translateZ(40px)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-white font-['Outfit']">Score: 94%</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-300">PASSED</span>
            </div>
            <p className="text-[11px] text-slate-400">Instant Backend Auto-Grading</p>
          </div>
        </motion.div>

        {/* Floating Element 2: Verified Integrity Badge */}
        <motion.div
          animate={{
            y: [0, 10, 0],
            rotateZ: [0, -1.5, 0]
          }}
          transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 0.6 }}
          className="absolute -bottom-6 -left-4 sm:-left-8 bg-slate-900/95 border border-cyan-500/50 p-3.5 rounded-2xl shadow-2xl shadow-cyan-950/60 backdrop-blur-xl flex items-center gap-3 z-30"
          style={{ transform: 'translateZ(45px)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white font-['Outfit']">ACID Relational Integrity</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-[11px] text-slate-400">Zero duplicate attempts</p>
          </div>
        </motion.div>

        {/* Floating Element 3: Realtime Analytics Sparkline */}
        <motion.div
          animate={{
            x: [0, 8, 0],
            y: [0, -4, 0]
          }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 1 }}
          className="hidden sm:flex absolute -bottom-10 right-6 bg-slate-900/95 border border-violet-500/50 px-4 py-2.5 rounded-xl shadow-2xl shadow-violet-950/60 backdrop-blur-xl items-center gap-3 z-30"
          style={{ transform: 'translateZ(35px)' }}
        >
          <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-200">
            Avg Cohort Performance: <span className="text-violet-300 font-bold">+18.4%</span>
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
};
