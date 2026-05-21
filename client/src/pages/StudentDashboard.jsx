import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/AppShell';
import StudentSidebar, { studentBottomNav } from '../components/StudentSidebar';
import SessionCard from '../components/SessionCard';
import {
  filterVisibleSessions,
  hideSessionFromHistory,
  computeSessionStats
} from '../utils/hiddenSessions';
import { ArrowRight, BarChart3, Trash2, FileText } from 'lucide-react';
import NotificationToast from '../components/NotificationToast';
import { useNotifications } from '../hooks/useNotifications';

function scoreColor(score) {
  if (score == null) return 'text-slate-400';
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [allSessions, setAllSessions] = useState([]);
  const [hiddenVersion, setHiddenVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examPreview, setExamPreview] = useState({ upcoming: 0 });
  const { popup, dismissPopup, markRead, unreadCount } = useNotifications();

  useEffect(() => {
    Promise.all([
      api.get('/api/student/sessions'),
      api.get('/api/student/exams')
    ])
      .then(([sess, exams]) => {
        setAllSessions(sess.data.sessions || []);
        setExamPreview({ upcoming: (exams.data.upcoming || []).length });
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const visibleSessions = useMemo(() => {
    void hiddenVersion;
    return filterVisibleSessions(allSessions, user?.studentId);
  }, [allSessions, user?.studentId, hiddenVersion]);

  const stats = useMemo(() => computeSessionStats(visibleSessions), [visibleSessions]);

  const removeFromHistory = useCallback(
    (sessionId, title) => {
      if (
        !window.confirm(
          `Remove "${title}" from your history?\n\nThis only hides it on your device. Teachers can still see the session.`
        )
      ) {
        return;
      }
      hideSessionFromHistory(user?.studentId, sessionId);
      setHiddenVersion((v) => v + 1);
    },
    [user?.studentId]
  );

  return (
    <AppShell
      variant="student"
      sidebar={<StudentSidebar />}
      bottomNav={studentBottomNav}
    >
      <NotificationToast notification={popup} onDismiss={dismissPopup} onRead={markRead} />
      <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Welcome, {user?.fullName}</h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 font-mono truncate">{user?.studentId}</p>

        {loading && <p className="text-slate-400 mt-8">Loading...</p>}
        {error && <p className="text-red-400 mt-8 text-sm">{error}</p>}

        {!loading && !error && (
          <>
            {unreadCount > 0 && (
              <p className="mt-4 text-sm text-blue-300 border border-blue-500/30 rounded-lg px-4 py-2 bg-blue-950/30">
                You have {unreadCount} new notification{unreadCount > 1 ? 's' : ''} — check My Exams.
              </p>
            )}

            <Link
              to="/student/exams"
              className="mt-6 glass-panel rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-emerald-500/25 hover:border-emerald-500/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="font-semibold text-white">My Exams</p>
                  <p className="text-xs text-slate-400">
                    {examPreview.upcoming > 0
                      ? `${examPreview.upcoming} exam(s) waiting`
                      : 'View assigned and completed exams'}
                  </p>
                </div>
              </div>
              <span className="text-emerald-400 text-sm flex items-center gap-1">
                Open <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
              <div className="glass-panel rounded-xl p-4 sm:p-5">
                <p className="text-xs text-slate-500 uppercase">Sessions</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{stats.totalSessions}</p>
              </div>
              <div className="glass-panel rounded-xl p-4 sm:p-5">
                <p className="text-xs text-slate-500 uppercase">Average Score</p>
                <p className={`text-2xl sm:text-3xl font-bold mt-1 ${scoreColor(stats.averageScore)}`}>
                  {stats.averageScore ?? '—'}
                </p>
              </div>
              <Link
                to="/upload"
                className="glass-panel rounded-xl p-4 sm:p-5 flex flex-col justify-center items-center gap-2 border-blue-500/30 hover:border-blue-500/60 transition-colors group min-h-[88px] col-span-2 sm:col-span-1"
              >
                <BarChart3 className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-blue-300 font-semibold text-sm flex items-center gap-1">
                  Start New Viva <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>

            <div className="mt-6 sm:mt-8 glass-panel rounded-xl overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 flex justify-between items-center gap-2">
                <h2 className="font-semibold text-white text-sm sm:text-base">Session History</h2>
                <p className="text-[10px] text-slate-500 hidden sm:block">Remove hides locally only</p>
              </div>
              {visibleSessions.length === 0 ? (
                <p className="p-5 sm:p-6 text-slate-400 text-sm">
                  {allSessions.length > 0
                    ? 'All sessions are hidden from your view. Upload a new assignment to start fresh.'
                    : 'No completed vivas yet. Start your first assessment!'}
                </p>
              ) : (
                <>
                  <div className="p-3 space-y-3 sm:hidden">
                    {visibleSessions.map((s) => (
                      <SessionCard
                        key={s._id}
                        assignmentTitle={s.assignmentTitle}
                        overallScore={s.overallScore}
                        depthRating={s.depthRating}
                        completedAt={s.completedAt}
                        resultLink={`/result/${s._id}`}
                        scoreColor={scoreColor}
                        onRemove={() => removeFromHistory(s._id, s.assignmentTitle)}
                      />
                    ))}
                  </div>
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead className="text-slate-500 text-xs uppercase bg-slate-900/50">
                        <tr>
                          <th className="text-left px-5 py-3">Assignment</th>
                          <th className="text-left px-5 py-3">Score</th>
                          <th className="text-left px-5 py-3">Depth</th>
                          <th className="text-left px-5 py-3">Date</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSessions.map((s) => (
                          <tr key={s._id} className="border-t border-slate-800/80 hover:bg-slate-800/20">
                            <td className="px-5 py-3 text-white max-w-[200px] truncate">{s.assignmentTitle}</td>
                            <td className={`px-5 py-3 font-mono ${scoreColor(s.overallScore)}`}>
                              {s.overallScore ?? '—'}
                            </td>
                            <td className="px-5 py-3 text-slate-300">{s.depthRating || '—'}</td>
                            <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                              {s.completedAt ? new Date(s.completedAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <Link
                                  to={`/result/${s._id}`}
                                  className="text-blue-400 hover:underline text-xs tap-target py-1"
                                >
                                  View
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => removeFromHistory(s._id, s.assignmentTitle)}
                                  className="tap-target p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-950/40 transition-colors"
                                  title="Remove from your history"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
