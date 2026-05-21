import { motion } from 'framer-motion';

export default function CircularMetric({ label, value, color = '#3b82f6', delay = 0 }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-panel rounded-2xl p-4 flex flex-col items-center"
    >
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-800" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay }}
        />
      </svg>
      <p className="text-2xl font-bold text-white -mt-14 relative z-10">{value}%</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-8 text-center">{label}</p>
    </motion.div>
  );
}
