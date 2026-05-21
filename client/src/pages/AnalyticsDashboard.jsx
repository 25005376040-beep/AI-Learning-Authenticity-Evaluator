import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import api from '../api/client';
import { usePortalConfig } from '../hooks/usePortalConfig';
import CircularMetric from '../components/analytics/CircularMetric';
import { ArrowLeft, BarChart3, Loader2, FileText } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsDashboard() {
  const { apiBase, paths, canViewReport, isTeacher } = usePortalConfig();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`${apiBase}/analytics`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, [apiBase]);

  const backTo = paths.result || paths.dashboard;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <span className="text-slate-400 text-sm">Building AI confidence analytics...</span>
      </div>
    );
  }

  if (error || !data?.analytics) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-red-400 text-sm">{error || 'No analytics data.'}</p>
        <Link to={backTo} className="text-blue-400 text-sm hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
    );
  }

  const a = data.analytics;
  const radarData = Object.entries(a.skillRadar || {}).map(([skill, value]) => ({ skill, value }));
  const topicData = (a.topicBreakdown || []).map((t) => ({
    name: t.topic?.slice(0, 12) || 'Topic',
    mastery: t.mastery
  }));

  const metrics = [
    { label: 'Understanding', value: a.understandingScore, color: '#3b82f6' },
    { label: 'Confidence', value: a.confidenceScore, color: '#8b5cf6' },
    { label: 'Originality', value: a.originalityScore, color: '#10b981' },
    { label: 'Communication', value: a.communicationScore, color: '#06b6d4' },
    { label: 'Topic Mastery', value: a.topicMastery, color: '#f59e0b' },
    { label: 'AI Suspicion', value: a.aiSuspicionLevel, color: '#ef4444' }
  ];

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to={backTo} className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> {isTeacher ? 'Dashboard' : 'Results'}
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className={`w-7 h-7 ${isTeacher ? 'text-amber-400' : 'text-blue-400'}`} />
            AI Confidence Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {data.assignmentTitle}
            {data.studentName && isTeacher ? ` · ${data.studentName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={paths.recommendations}
            className="tap-target px-4 py-2 rounded-xl border border-slate-700 text-sm text-slate-300 hover:bg-slate-800"
          >
            Learning Path
          </Link>
          {canViewReport && paths.report && (
            <Link
              to={paths.report}
              className="tap-target px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-500 flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" /> Full Report
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m, i) => (
          <CircularMetric key={m.label} label={m.label} value={m.value} color={m.color} delay={i * 0.05} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Skill Radar</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-4">Topic Mastery</h3>
          <div className="h-64">
            {topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} />
                  <Bar dataKey="mastery" radius={4}>
                    {topicData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm">No topic breakdown available.</p>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-red-400 mb-3">Weak Areas</h3>
          <ul className="space-y-2">
            {(a.weakAreas || []).length ? (
              a.weakAreas.map((w, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-red-400">•</span> {w}
                </li>
              ))
            ) : (
              <li className="text-slate-500 text-sm">None flagged</li>
            )}
          </ul>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-emerald-400 mb-3">Strong Areas</h3>
          <ul className="space-y-2">
            {(a.strongAreas || []).map((s, i) => (
              <li key={i} className="text-sm text-slate-300 flex gap-2">
                <span className="text-emerald-400">•</span> {s}
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-900/60 p-2 border border-slate-800">
              <p className="text-slate-500">Response Accuracy</p>
              <p className="text-white font-bold">{a.responseAccuracy}%</p>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-2 border border-slate-800">
              <p className="text-slate-500">Completion</p>
              <p className="text-white font-bold">{a.completionRate}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
