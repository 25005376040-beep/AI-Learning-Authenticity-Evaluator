import React, { useEffect, useState } from 'react';
import { Award, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

function ScoreCard({ score, depthRating, authenticityFlag, summary }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate the score counter on mount
  useEffect(() => {
    const duration = 1200; // ms
    const steps = 60;
    const stepTime = Math.round(duration / steps);
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const val = Math.round((score * currentStep) / steps);
      if (currentStep >= steps) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(val);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  // Determine colors based on evaluation
  const getRatingConfig = () => {
    if (authenticityFlag) {
      return {
        text: 'Surface Understanding',
        colorClass: 'text-red-400 bg-red-500/10 border-red-500/20',
        strokeColor: '#f87171', // tailwind red-400
        icon: <AlertTriangle className="w-5 h-5 text-red-400" />
      };
    }
    if (depthRating === 'Deep') {
      return {
        text: 'Deep Comprehension',
        colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        strokeColor: '#34d399', // tailwind emerald-400
        icon: <CheckCircle className="w-5 h-5 text-emerald-400" />
      };
    }
    return {
      text: 'Moderate Understanding',
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      strokeColor: '#fbbf24', // tailwind amber-400
      icon: <Award className="w-5 h-5 text-amber-400" />
    };
  };

  const config = getRatingConfig();

  // SVG parameters
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="w-full flex flex-col md:flex-row gap-6 items-center p-6 rounded-2xl glass-panel relative overflow-hidden">
      
      {/* Decorative backing glow */}
      <div 
        className="absolute -top-12 -left-12 w-28 h-28 rounded-full blur-2xl opacity-15 pointer-events-none"
        style={{ backgroundColor: config.strokeColor }}
      />

      {/* SVG Score Circle */}
      <div className="relative shrink-0 flex items-center justify-center w-36 h-36">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="10"
            fill="transparent"
          />
          {/* Foreground progress */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            stroke={config.strokeColor}
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-white tracking-tight">{animatedScore}</span>
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Score</span>
        </div>
      </div>

      {/* Evaluation Text/Metrics */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.colorClass}`}>
            {config.icon}
            {config.text}
          </span>
          
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            Depth: {depthRating}
          </span>
        </div>

        <h3 className="text-lg font-bold text-white mb-2">Academic Integrity Summary</h3>
        <p className="text-slate-300 text-sm leading-relaxed text-pretty">
          {summary}
        </p>
      </div>

    </div>
  );
}

export default ScoreCard;
