import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Clock, Award } from 'lucide-react';

const STATUS_STYLE = {
  assigned: 'text-blue-400',
  pending: 'text-amber-400',
  in_progress: 'text-orange-400',
  submitted: 'text-purple-400',
  reviewed: 'text-cyan-400',
  graded: 'text-emerald-400'
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export default function StudentMyExams() {
  const [data, setData] = useState({ exams: [], upcoming: [], completed: [], scoreHistory: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/student/exams')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load exams'))
      .finally(() => setLoading(false));
  }, []);

  const chartData = (data.scoreHistory || []).map((s, i) => ({
    name: s.title?.slice(0, 12) || `Exam ${i + 1}`,
    score: s.percentage
  }));

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <FileText className="w-7 h-7 text-blue-400" />
        My Exams
      </h1>
      <p className="text-slate-400 text-sm mt-1">Assigned exams, deadlines, and results</p>

      {loading && <p className="text-slate-400 mt-8">Loading…</p>}
      {error && <p className="text-red-400 mt-8">{error}</p>}

      {!loading && !error && (
        <>
          {chartData.length > 1 && (
            <div className="glass-panel rounded-xl p-4 mt-6 h-48">
              <p className="text-xs text-slate-500 uppercase mb-2">Score trend</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                  <Line type="monotone" dataKey="score" stroke="#60a5fa" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">Upcoming</h2>
          <div className="grid gap-3">
            {(data.upcoming || []).map((ex) => (
              <div key={ex._id} className="glass-panel rounded-xl p-4 flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{ex.title}</p>
                  <p className={`text-xs mt-1 capitalize ${STATUS_STYLE[ex.status]}`}>{ex.status.replace('_', ' ')}</p>
                  <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Due {formatDate(ex.dueDate)}
                  </p>
                </div>
                <Link
                  to={`/student/exams/${ex._id}/take`}
                  className="tap-target self-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
                >
                  {ex.status === 'in_progress' ? 'Continue' : 'Start exam'}
                </Link>
              </div>
            ))}
            {!data.upcoming?.length && (
              <p className="text-slate-500 text-sm">No upcoming exams.</p>
            )}
          </div>

          <h2 className="text-lg font-semibold text-white mt-8 mb-3">Completed</h2>
          <div className="grid gap-3">
            {(data.completed || []).map((ex) => (
              <div key={ex._id} className="glass-panel rounded-xl p-4 flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{ex.title}</p>
                  <p className={`text-xs mt-1 capitalize ${STATUS_STYLE[ex.status]}`}>{ex.status}</p>
                  {ex.status === 'graded' && (
                    <p className="text-sm text-emerald-400 mt-2 flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      {ex.marksObtained}/{ex.maxMarks} ({ex.percentage}%)
                    </p>
                  )}
                </div>
                {ex.status === 'graded' && (
                  <Link
                    to={`/student/exams/${ex._id}/result`}
                    className="tap-target self-center text-sm text-blue-400 hover:underline"
                  >
                    View result
                  </Link>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
