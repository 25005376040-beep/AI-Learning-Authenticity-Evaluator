import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/AppShell';
import StudentSidebar, { studentBottomNav } from './components/StudentSidebar';
import TeacherSidebar, { teacherBottomNav } from './components/TeacherSidebar';
import LandingPage from './pages/LandingPage';
import StudentLogin from './pages/StudentLogin';
import StudentRegister from './pages/StudentRegister';
import StudentDashboard from './pages/StudentDashboard';
import TeacherLogin from './pages/TeacherLogin';
import TeacherDashboard from './pages/TeacherDashboard';
import Upload from './pages/Upload';
import Viva from './pages/Viva';
import Result from './pages/Result';
import DetectionResult from './pages/DetectionResult';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import Recommendations from './pages/Recommendations';
import ReportPage from './pages/ReportPage';
import TeacherExamHub from './pages/TeacherExamHub';
import TeacherExamSubmissions from './pages/TeacherExamSubmissions';
import StudentMyExams from './pages/StudentMyExams';
import TakeExam from './pages/TakeExam';
import ExamResult from './pages/ExamResult';
import NotificationToast from './components/NotificationToast';
import { useNotifications } from './hooks/useNotifications';

function PortalNotifications() {
  const { popup, dismissPopup, markRead } = useNotifications();
  return (
    <NotificationToast
      notification={popup}
      onDismiss={dismissPopup}
      onRead={markRead}
    />
  );
}

function StudentLayout({ children }) {
  return (
    <AppShell
      variant="student"
      sidebar={<StudentSidebar />}
      bottomNav={studentBottomNav}
    >
      <PortalNotifications />
      {children}
    </AppShell>
  );
}

function TeacherLayout({ children }) {
  return (
    <AppShell
      variant="teacher"
      sidebar={<TeacherSidebar />}
      bottomNav={teacherBottomNav}
    >
      <PortalNotifications />
      {children}
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student/register" element={<StudentRegister />} />
          <Route path="/teacher/login" element={<TeacherLogin />} />

          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/upload"
            element={
              <ProtectedRoute role="student">
                <StudentLayout>
                  <Upload />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/detection/:submissionId"
            element={
              <ProtectedRoute role="student">
                <StudentLayout>
                  <DetectionResult />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/viva/:sessionId"
            element={
              <ProtectedRoute role="student">
                <StudentLayout>
                  <Viva />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/result/:sessionId"
            element={
              <ProtectedRoute role="student">
                <StudentLayout>
                  <Result />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/result/:sessionId/analytics"
            element={
              <ProtectedRoute role="student">
                <StudentLayout>
                  <AnalyticsDashboard />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/result/:sessionId/recommendations"
            element={
              <ProtectedRoute role="student">
                <StudentLayout>
                  <Recommendations />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute role="teacher">
                <TeacherLayout>
                  <TeacherDashboard />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/session/:sessionId/analytics"
            element={
              <ProtectedRoute role="teacher">
                <TeacherLayout>
                  <AnalyticsDashboard />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/session/:sessionId/recommendations"
            element={
              <ProtectedRoute role="teacher">
                <TeacherLayout>
                  <Recommendations />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exams"
            element={
              <ProtectedRoute role="student">
                <StudentLayout>
                  <StudentMyExams />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exams/:attemptId/take"
            element={
              <ProtectedRoute role="student">
                <StudentLayout>
                  <TakeExam />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exams/:attemptId/result"
            element={
              <ProtectedRoute role="student">
                <StudentLayout>
                  <ExamResult />
                </StudentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/exams"
            element={
              <ProtectedRoute role="teacher">
                <TeacherLayout>
                  <TeacherExamHub />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/exams/submissions"
            element={
              <ProtectedRoute role="teacher">
                <TeacherLayout>
                  <TeacherExamSubmissions />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/exams/submissions/:attemptId"
            element={
              <ProtectedRoute role="teacher">
                <TeacherLayout>
                  <TeacherExamSubmissions />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/exams/:examId/submissions"
            element={
              <ProtectedRoute role="teacher">
                <TeacherLayout>
                  <TeacherExamSubmissions />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/session/:sessionId/report"
            element={
              <ProtectedRoute role="teacher">
                <TeacherLayout>
                  <ReportPage />
                </TeacherLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
