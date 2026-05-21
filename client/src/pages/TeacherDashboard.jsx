import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import AIDetectionBadge from '../components/AIDetectionBadge';
import { AlertTriangle, X, Eye, Download, Trash2, BarChart3, GraduationCap, FileText } from 'lucide-react';

function scoreClass(score) {
  if (score == null) return 'text-slate-400';
  if (score >= 70) return 'text-emerald-400 bg-emerald-500/10';
  if (score >= 40) return 'text-amber-400 bg-amber-500/10';
  return 'text-red-400 bg-red-500/10';
}

function rowHighlight(risk) {
  if (risk === 'High Risk') return 'bg-red-950/20';
  if (risk === 'Medium Risk') return 'bg-amber-950/10';
  return '';
}

function SessionMobileCard({ session, onView }) {
  return (
    <div
      className={`rounded-xl border border-slate-800 p-4 space-y-3 sm:hidden ${rowHighlight(session.aiDetection?.riskLevel)}`}
    >
      <div>
        <p className="text-white font-medium text-sm">{session.studentName}</p>
        <p className="text-xs text-slate-500 truncate">{session.studentEmail}</p>
      </div>
      <p className="text-sm text-slate-300 line-clamp-2">{session.assignmentTitle}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`px-2 py-0.5 rounded font-mono ${scoreClass(session.overallScore)}`}>
          {session.overallScore ?? '—'}
        </span>
        {session.aiDetection ? (
          <AIDetectionBadge {...session.aiDetection} compact />
        ) : (
          <span className="text-slate-600">No AI scan</span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : '—'}
        </span>
        <button
          type="button"
          onClick={() => onView(session._id)}
          className="tap-target text-amber-400 text-xs flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-500/30"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </button>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const [tab, setTab] = useState('sessions');
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [riskReport, setRiskReport] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [examStats, setExamStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/teacher/dashboard'),
      api.get('/api/teacher/sessions'),
      api.get('/api/teacher/students'),
      api.get('/api/teacher/ai-risk-report'),
      api.get('/api/teacher/exams/analytics')
    ])
      .then(([d, s, st, r, ex]) => {
        setStats(d.data);
        setSessions(s.data);
        setStudents(st.data);
        setRiskReport(r.data);
        setExamStats(ex.data);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const refreshDashboard = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/teacher/dashboard'),
      api.get('/api/teacher/sessions'),
      api.get('/api/teacher/students'),
      api.get('/api/teacher/ai-risk-report')
    ])
      .then(([d, s, st, r]) => {
        setStats(d.data);
        setSessions(s.data);
        setStudents(st.data);
        setRiskReport(r.data);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  };

  const deleteStudent = async (studentId, fullName) => {
    if (!window.confirm(`Delete student "${fullName}" and all their sessions? This cannot be undone.`)) {
      return;
    }
    setDeletingId(studentId);
    setError('');
    try {
      await api.delete(`/api/teacher/students/${studentId}`);
      setStudents((prev) => prev.filter((s) => s.studentId !== studentId));
      refreshDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete student.');
    } finally {
      setDeletingId(null);
    }
  };

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/api/teacher/sessions/${id}`);
      setDetail(data);
    } catch {
      setError('Could not load session details.');
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto text-slate-200">
      <h1 className="text-xl sm:text-2xl font-bold text-white">Teacher Dashboard</h1>
      <p className="text-slate-500 text-xs sm:text-sm mt-1">Review student authenticity assessments</p>

      {loading && <p className="mt-8 text-slate-500">Loading...</p>}
      {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-6 sm:mt-8">
          {[
            ['Students', stats.totalStudents, 'text-white'],
            ['Sessions', stats.totalSessions, 'text-white'],
            ['Avg Score', stats.averageScore, 'text-white'],
            ['Viva Flagged', stats.flaggedSessions, stats.flaggedSessions > 0 ? 'text-red-400' : 'text-white'],
            ['AI Flagged', stats.aiFlagged ?? 0, (stats.aiFlagged ?? 0) > 0 ? 'text-red-400' : 'text-white']
          ].map(([label, val, color]) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-[#0a1020] p-4 sm:p-5 col-span-1 last:col-span-2 sm:last:col-span-1 lg:last:col-span-1">
              <p className="text-[10px] sm:text-xs text-slate-500 uppercase">{label}</p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${color}`}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {examStats && (
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Exams Assigned', examStats.totalExamsAssigned],
            ['Submission Rate', `${examStats.submissionRate}%`],
            ['Class Avg (Exams)', examStats.averageClassScore ?? '—'],
            ['Pending Reviews', examStats.pendingReviews]
          ].map(([label, val]) => (
            <div key={label} className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
              <p className="text-[10px] text-amber-200/70 uppercase">{label}</p>
              <p className="text-xl font-bold text-amber-100 mt-1">{val}</p>
            </div>
          ))}
          <Link
            to="/teacher/exams"
            className="sm:col-span-2 lg:col-span-4 rounded-xl border border-amber-500/30 p-4 flex items-center justify-between hover:bg-amber-950/20 transition-colors"
          >
            <span className="text-amber-200 font-medium text-sm">AI Smart Exam Generator & assignments</span>
            <span className="text-amber-400 text-xs">Open →</span>
          </Link>
        </div>
      )}

      <div className="flex gap-1 sm:gap-2 mt-6 sm:mt-8 border-b border-slate-800 overflow-x-auto scrollbar-none">
        {['sessions', 'ai-risk'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`tap-target shrink-0 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {t === 'sessions' ? 'All Sessions' : 'AI Risk Report'}
          </button>
        ))}
      </div>

      {tab === 'sessions' && (
        <div className="mt-4 rounded-xl border border-slate-800 bg-[#0a1020] overflow-hidden">
          <div className="p-3 space-y-3 sm:hidden">
            {sessions.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No completed sessions.</p>
            ) : (
              sessions.map((s) => (
                <SessionMobileCard key={s._id} session={s} onView={openDetail} />
              ))
            )}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="text-slate-500 text-xs uppercase bg-[#0f1628]">
                <tr>
                  <th className="text-left px-4 py-3">Student</th>
                  <th className="text-left px-4 py-3">Assignment</th>
                  <th className="text-left px-4 py-3">Score</th>
                  <th className="text-left px-4 py-3">AI Detection</th>
                  <th className="text-left px-4 py-3">Depth</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-slate-500 text-center">No completed sessions.</td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr
                      key={s._id}
                      className={`border-t border-slate-800/60 hover:bg-[#0f1628]/50 ${rowHighlight(s.aiDetection?.riskLevel)}`}
                    >
                      <td className="px-4 py-3">
                        <p className="text-white">{s.studentName}</p>
                        <p className="text-xs text-slate-500">{s.studentEmail}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[140px] truncate">{s.assignmentTitle}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-xs ${scoreClass(s.overallScore)}`}>
                          {s.overallScore ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {s.aiDetection ? (
                          <AIDetectionBadge {...s.aiDetection} compact />
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{s.depthRating || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                        {s.completedAt ? new Date(s.completedAt).toLocaleString() : '—'}
                      </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 justify-end">
                            <button type="button" onClick={() => openDetail(s._id)} className="text-amber-400 text-xs flex items-center gap-1 tap-target py-1">
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          </div>
                        </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ai-risk' && riskReport && (
        <div className="mt-4 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              ['High Risk', riskReport.summary.highRiskCount, 'text-red-400 border-red-500/30'],
              ['Medium Risk', riskReport.summary.mediumRiskCount, 'text-amber-400 border-amber-500/30'],
              ['Low Risk', riskReport.summary.lowRiskCount, 'text-emerald-400 border-emerald-500/30']
            ].map(([label, count, style]) => (
              <div key={label} className={`rounded-xl border p-4 sm:p-5 bg-[#0a1020] ${style}`}>
                <p className="text-xs uppercase opacity-70">{label}</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{count}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="tap-target flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 text-slate-400 text-xs hover:bg-slate-800"
              title="Export coming in a future update"
            >
              <Download className="w-3.5 h-3.5" /> Export (soon)
            </button>
          </div>

          {['highRisk', 'mediumRisk'].map((key) => (
            <div key={key} className="rounded-xl border border-slate-800 bg-[#0a1020] overflow-hidden">
              <div className="px-4 sm:px-5 py-3 border-b border-slate-800">
                <h3 className="font-semibold text-amber-200 text-sm sm:text-base capitalize">
                  {key.replace('Risk', ' Risk')} Submissions
                </h3>
              </div>
              <div className="sm:hidden p-3 space-y-2">
                {riskReport[key].length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">None</p>
                ) : (
                  riskReport[key].map((r) => (
                    <div key={r.submissionId} className={`rounded-lg border border-slate-800 p-3 ${rowHighlight(r.riskLevel)}`}>
                      <p className="text-white text-sm font-medium">{r.studentName}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{r.fileName}</p>
                      <p className="text-sm mt-2 font-mono text-red-300">{r.aiProbability}% AI</p>
                      <p className="text-xs text-slate-400 mt-1">{r.verdict}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="text-xs text-slate-500 uppercase bg-[#0f1628]">
                    <tr>
                      <th className="text-left px-4 py-2">Student</th>
                      <th className="text-left px-4 py-2">File</th>
                      <th className="text-left px-4 py-2">AI %</th>
                      <th className="text-left px-4 py-2">Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskReport[key].length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-6 text-slate-500 text-center">None</td></tr>
                    ) : (
                      riskReport[key].map((r) => (
                        <tr key={r.submissionId} className={`border-t border-slate-800/60 ${rowHighlight(r.riskLevel)}`}>
                          <td className="px-4 py-2 text-white">{r.studentName}</td>
                          <td className="px-4 py-2 max-w-[160px] truncate">{r.fileName}</td>
                          <td className="px-4 py-2 font-mono text-red-300">{r.aiProbability}%</td>
                          <td className="px-4 py-2">{r.verdict}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="mt-6 sm:mt-8 rounded-xl border border-slate-800 bg-[#0a1020] p-4 sm:p-5">
          <h2 className="font-semibold text-amber-200 mb-4 text-sm sm:text-base">Registered Students</h2>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((st) => (
              <div key={st.studentId} className="rounded-lg border border-slate-800 p-4 flex flex-col">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium truncate">{st.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{st.email}</p>
                    <p className="text-xs text-slate-600 font-mono mt-0.5 truncate">{st.studentId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteStudent(st.studentId, st.fullName)}
                    disabled={deletingId === st.studentId}
                    className="tap-target shrink-0 p-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                    title="Delete student"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm mt-3 text-slate-400">{st.totalSessions} sessions · avg {st.averageScore ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70" onClick={() => setDetail(null)}>
          <div
            className="w-full sm:max-w-2xl max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-slate-700 bg-[#0a1020] p-5 sm:p-6 safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">{detail.assignmentTitle}</h3>
                <p className="text-sm text-slate-400 truncate">{detail.studentName}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="tap-target p-2 text-slate-500 hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            {detail.aiDetection && (
              <div className="mb-4">
                <AIDetectionBadge {...detail.aiDetection} />
                <p className="text-xs text-slate-500 mt-2">{detail.aiDetection.detailedReason}</p>
              </div>
            )}
            {detail.authenticityFlag && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-sm flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Viva authenticity concern flagged.
              </div>
            )}

            {(detail.hasAnalytics || detail.score) && (
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {detail.hasAnalytics && (
                  <Link
                    to={`/teacher/session/${detail._id}/analytics`}
                    onClick={() => setDetail(null)}
                    className="tap-target flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs font-medium hover:bg-amber-950/40"
                  >
                    <BarChart3 className="w-4 h-4 shrink-0" />
                    Confidence Dashboard
                  </Link>
                )}
                {detail.hasRecommendations && (
                  <Link
                    to={`/teacher/session/${detail._id}/recommendations`}
                    onClick={() => setDetail(null)}
                    className="tap-target flex items-center gap-2 p-3 rounded-xl border border-violet-500/30 bg-violet-950/20 text-violet-200 text-xs font-medium hover:bg-violet-950/40"
                  >
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    Learning Path
                  </Link>
                )}
                <Link
                  to={`/teacher/session/${detail._id}/report`}
                  onClick={() => setDetail(null)}
                  className="tap-target flex items-center gap-2 p-3 rounded-xl border border-blue-500/30 bg-blue-950/20 text-blue-200 text-xs font-medium hover:bg-blue-950/40"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  Full Report (PDF)
                </Link>
              </div>
            )}

            {!detail.hasAnalytics && (
              <p className="mb-4 text-xs text-slate-500">
                Analytics available for sessions completed after the latest update.
              </p>
            )}

            <div className="space-y-3">
              {detail.qnas?.map((q, i) => (
                <div key={i} className="rounded-lg border border-slate-800 p-3 text-sm">
                  <p className="text-amber-200/90">Q{i + 1}: {q.question}</p>
                  <p className="text-slate-400 mt-1 break-words">A: {q.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
