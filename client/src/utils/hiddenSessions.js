const PREFIX = 'av-hidden-sessions-';

export function getHiddenSessionIds(studentId) {
  if (!studentId) return [];
  try {
    const raw = localStorage.getItem(`${PREFIX}${studentId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function hideSessionFromHistory(studentId, sessionId) {
  if (!studentId || !sessionId) return;
  const hidden = new Set(getHiddenSessionIds(studentId));
  hidden.add(sessionId);
  localStorage.setItem(`${PREFIX}${studentId}`, JSON.stringify([...hidden]));
}

export function filterVisibleSessions(sessions, studentId) {
  const hidden = new Set(getHiddenSessionIds(studentId));
  return (sessions || []).filter((s) => !hidden.has(s._id));
}

export function computeSessionStats(sessions) {
  const list = sessions || [];
  const scores = list.map((s) => s.overallScore).filter((n) => typeof n === 'number');
  const averageScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;
  return { totalSessions: list.length, averageScore };
}
