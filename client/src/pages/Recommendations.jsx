import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import { usePortalConfig } from '../hooks/usePortalConfig';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Code,
  GraduationCap,
  Loader2,
  PlayCircle,
  Target
} from 'lucide-react';

const TYPE_ICONS = {
  topic: BookOpen,
  video: PlayCircle,
  exercise: Target,
  article: BookOpen,
  coding: Code
};

const CAT_STYLES = {
  Beginner: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
  Intermediate: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
  Advanced: 'border-red-500/30 bg-red-950/20 text-red-300'
};

export default function Recommendations() {
  const { apiBase, paths, isTeacher } = usePortalConfig();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`${apiBase}/recommendations`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load recommendations.'))
      .finally(() => setLoading(false));
  }, [apiBase]);

  const backTo = paths.result || paths.dashboard;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <span className="text-slate-400 text-sm">Generating personalized learning path...</span>
      </div>
    );
  }

  if (error || !data?.recommendations) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <Link to={backTo} className="text-blue-400 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
    );
  }

  const rec = data.recommendations;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6 pb-8">
      <div>
        <Link to={backTo} className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> {isTeacher ? 'Dashboard' : 'Results'}
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <GraduationCap className={`w-7 h-7 ${isTeacher ? 'text-amber-400' : 'text-violet-400'}`} />
          AI Learning Recommendations
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {data.assignmentTitle}
          {data.studentName && isTeacher ? ` · ${data.studentName}` : ''}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel-glow rounded-2xl p-5 sm:p-6 border border-violet-500/20"
      >
        <h2 className="text-sm font-semibold text-violet-300 uppercase tracking-wider mb-2">Study Roadmap</h2>
        <p className="text-slate-200 text-sm leading-relaxed">{rec.studyRoadmap}</p>
        <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
          <Clock className="w-4 h-4" />
          Estimated improvement: ~{rec.estimatedImprovementWeeks} weeks
        </div>
      </motion.div>

      {rec.weakConcepts?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {rec.weakConcepts.map((c, i) => (
            <span key={i} className="px-3 py-1 rounded-full text-xs border border-red-500/30 bg-red-950/20 text-red-300">
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {(rec.recommendations || []).map((item, i) => {
          const Icon = TYPE_ICONS[item.type] || BookOpen;
          const catClass = CAT_STYLES[item.category] || CAT_STYLES.Intermediate;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-panel rounded-xl p-4 border border-slate-800/80"
            >
              <div className="flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${catClass}`}>
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  {item.url && (
                    <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">Resource: {item.url}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">~{item.estimatedHours}h · {item.type}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Link to={paths.analytics} className="block text-center text-sm text-blue-400 hover:underline">
        View confidence analytics →
      </Link>
    </div>
  );
}
