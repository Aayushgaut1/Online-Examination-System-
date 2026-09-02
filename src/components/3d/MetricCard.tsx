import React, { useRef, useState, MouseEvent } from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'cyan' | 'amber' | 'rose' | 'violet';
  trend?: string;
  onClick?: () => void;
  id?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
  trend,
  onClick,
  id
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const colorMap = {
    indigo: {
      bg: 'from-indigo-600/15 via-indigo-950/30 to-slate-900/80',
      border: 'border-indigo-500/30',
      iconBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      glow: 'hover:border-indigo-500/60 hover:shadow-indigo-500/25',
      accent: 'text-indigo-400'
    },
    emerald: {
      bg: 'from-emerald-600/15 via-emerald-950/30 to-slate-900/80',
      border: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      glow: 'hover:border-emerald-500/60 hover:shadow-emerald-500/25',
      accent: 'text-emerald-400'
    },
    cyan: {
      bg: 'from-cyan-600/15 via-cyan-950/30 to-slate-900/80',
      border: 'border-cyan-500/30',
      iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      glow: 'hover:border-cyan-500/60 hover:shadow-cyan-500/25',
      accent: 'text-cyan-400'
    },
    amber: {
      bg: 'from-amber-600/15 via-amber-950/30 to-slate-900/80',
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      glow: 'hover:border-amber-500/60 hover:shadow-amber-500/25',
      accent: 'text-amber-400'
    },
    rose: {
      bg: 'from-rose-600/15 via-rose-950/30 to-slate-900/80',
      border: 'border-rose-500/30',
      iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      glow: 'hover:border-rose-500/60 hover:shadow-rose-500/25',
      accent: 'text-rose-400'
    },
    violet: {
      bg: 'from-violet-600/15 via-violet-950/30 to-slate-900/80',
      border: 'border-violet-500/30',
      iconBg: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      glow: 'hover:border-violet-500/60 hover:shadow-violet-500/25',
      accent: 'text-violet-400'
    }
  };

  const scheme = colorMap[color];

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setRotateX(((y - centerY) / centerY) * -10);
    setRotateY(((x - centerX) / centerX) * 10);
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.14
    });
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <motion.div
      id={id}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      animate={{
        rotateX,
        rotateY,
        scale: glare.opacity > 0 ? 1.02 : 1
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 24,
        mass: 0.5
      }}
      style={{
        transformStyle: 'preserve-3d',
        perspective: 1000
      }}
      className={`glass-card p-5 rounded-2xl border ${scheme.border} bg-gradient-to-br ${scheme.bg} ${scheme.glow} ${
        onClick ? 'cursor-pointer' : ''
      } transition-all duration-300 relative overflow-hidden`}
    >
      {/* Specular glare */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-30 overflow-hidden"
        style={{
          opacity: glare.opacity,
          background: `radial-gradient(circle 200px at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.4), transparent 75%)`
        }}
      />

      <div className="flex items-start justify-between relative z-10" style={{ transform: 'translateZ(20px)' }}>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${scheme.iconBg} border shadow-lg transform transition-transform hover:rotate-6`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-xs font-medium text-emerald-400 relative z-10" style={{ transform: 'translateZ(10px)' }}>
          <span>{trend}</span>
        </div>
      )}
    </motion.div>
  );
};
