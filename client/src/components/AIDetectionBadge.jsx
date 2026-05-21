import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

function colors(aiProbability) {
  if (aiProbability >= 70) {
    return {
      ring: 'text-red-400',
      bg: 'bg-red-500/15 border-red-500/30',
      text: 'text-red-300',
      icon: AlertTriangle
    };
  }
  if (aiProbability >= 40) {
    return {
      ring: 'text-amber-400',
      bg: 'bg-amber-500/15 border-amber-500/30',
      text: 'text-amber-300',
      icon: AlertCircle
    };
  }
  return {
    ring: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/30',
    text: 'text-emerald-300',
    icon: CheckCircle
  };
}

export default function AIDetectionBadge({ verdict, aiProbability, riskLevel, confidenceLevel, compact }) {
  if (aiProbability == null) return null;
  const c = colors(aiProbability);
  const Icon = c.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {aiProbability}% · {verdict}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${c.bg}`}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full border-4 flex items-center justify-center font-bold text-base sm:text-lg ${c.ring} border-current`}>
          {aiProbability}%
        </div>
        <div className="min-w-0 flex-1">
          <p className={`font-bold text-sm sm:text-base ${c.text}`}>{verdict}</p>
          <p className="text-xs text-slate-400 mt-0.5">{riskLevel} · {confidenceLevel} confidence</p>
        </div>
        <Icon className={`w-7 h-7 sm:w-8 sm:h-8 shrink-0 ${c.ring}`} />
      </div>
    </div>
  );
}
