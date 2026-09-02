import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Award, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

interface ScoreGaugeProps {
  score: number;
  totalMarks: number;
  percentage: number;
  passStatus: 'PASSED' | 'FAILED';
  size?: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  totalMarks,
  percentage,
  passStatus,
  size = 240
}) => {
  const isPassed = passStatus === 'PASSED';
  const strokeWidth = 14;
  const radius = (size - strokeWidth - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = percentage;
    if (end === 0) return;
    const duration = 1500;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = end / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setAnimatedScore(end);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [percentage]);

  return (
    <div className="relative flex flex-col items-center justify-center p-4 perspective-1000">
      {/* Ambient background glow ring */}
      <div
        className={`absolute rounded-full blur-2xl opacity-40 pointer-events-none ${
          isPassed ? 'bg-emerald-500/30' : 'bg-rose-500/30'
        }`}
        style={{ width: size * 0.8, height: size * 0.8 }}
      />

      {/* 3D Circular SVG Gauge with Layered Depth */}
      <motion.div
        initial={{ rotateX: 15, scale: 0.9, opacity: 0 }}
        animate={{ rotateX: 0, scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, type: 'spring' }}
        className="relative flex items-center justify-center rounded-full p-3"
        style={{ width: size, height: size, transformStyle: 'preserve-3d' }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]"
        >
          <defs>
            <linearGradient id="scoreGradientPass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="scoreGradientFail" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
          </defs>

          {/* Outer subtle decorative dashed ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 8}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={2}
            strokeDasharray="4 6"
          />

          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth={strokeWidth}
          />

          {/* Animated score arc with vibrant gradient */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={isPassed ? 'url(#scoreGradientPass)' : 'url(#scoreGradientFail)'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
          />
        </svg>

        {/* Inner Content overlay with 3D elevation */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center select-none"
          style={{ transform: 'translateZ(30px)' }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-1">
              <span className="text-4xl sm:text-5xl font-black tracking-tight font-['Outfit'] text-white">
                {animatedScore}%
              </span>
            </div>

            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5 font-mono">
              {score} / {totalMarks} Marks
            </span>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={`mt-2.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg ${
                isPassed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-emerald-950/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-rose-950/40'
              }`}
            >
              {isPassed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PASSED</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>NEEDS RETAKE</span>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
