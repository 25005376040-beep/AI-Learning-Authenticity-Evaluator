import { useLocation, useParams } from 'react-router-dom';

/**
 * Student vs teacher portal paths and API prefixes.
 */
export function usePortalConfig() {
  const { sessionId } = useParams();
  const location = useLocation();
  const isTeacher = location.pathname.startsWith('/teacher/session');

  const apiBase = isTeacher
    ? `/api/teacher/sessions/${sessionId}`
    : `/api/session/${sessionId}`;

  const paths = isTeacher
    ? {
        dashboard: '/teacher/dashboard',
        analytics: `/teacher/session/${sessionId}/analytics`,
        recommendations: `/teacher/session/${sessionId}/recommendations`,
        report: `/teacher/session/${sessionId}/report`,
        result: null
      }
    : {
        dashboard: '/student/dashboard',
        analytics: `/result/${sessionId}/analytics`,
        recommendations: `/result/${sessionId}/recommendations`,
        report: null,
        result: `/result/${sessionId}`
      };

  return {
    sessionId,
    isTeacher,
    isStudent: !isTeacher,
    apiBase,
    paths,
    canViewReport: isTeacher
  };
}
