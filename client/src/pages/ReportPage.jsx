import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import { usePortalConfig } from '../hooks/usePortalConfig';
import { generateReportPdf } from '../utils/generateReportPdf';
import AIDetectionBadge from '../components/AIDetectionBadge';
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';

/** Teacher-only evaluation report + PDF download */
export default function ReportPage() {
  const { apiBase, paths, isTeacher, sessionId } = usePortalConfig();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isTeacher) return;
    api
      .get(`${apiBase}/report`)
      .then((res) => setReport(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load report.'))
      .finally(() => setLoading(false));
  }, [apiBase, isTeacher]);

  if (!isTeacher) {
    return <Navigate to="/student/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <span className="text-slate-400 text-sm">Preparing evaluation report...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-red-400 text-sm">{error}</p>
        <Link to={paths.dashboard} className="text-amber-400 text-sm flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <Link to={paths.dashboard} className="text-xs text-slate-500 hover:text-amber-400 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Teacher Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-amber-400" />
            Institutional Evaluation Report
          </h1>
          {report?.studentName && <p className="text-sm text-slate-400 mt-0.5">{report.studentName}</p>}
          <p className="text-xs text-slate-500 font-mono mt-1">{report.evaluationId}</p>
        </div>
        <button
          type="button"
          onClick={() => generateReportPdf(report)}
          className="tap-target flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500"
        >
          <Download className="w-4 h-4" /> Download PDF
        </button>
      </div>

      <motion.article
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 border border-slate-700/50"
      >
        <header className="border-b border-slate-800 pb-4">
          <p className="text-[10px] uppercase tracking-widest text-blue-400 font-semibold">
            AI Learning Authenticity Evaluator
          </p>
          <h2 className="text-lg font-bold text-white mt-1">Institutional Evaluation Report</h2>
          <p className="text-xs text-slate-500 mt-2">
            {new Date(report.completedAt).toLocaleString()} · {report.evaluationId}
          </p>
        </header>

        <section>
          <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2">Student</h3>
          <p className="text-white">{report.studentName}</p>
          <p className="text-sm text-slate-400">{report.studentId} · {report.studentEmail}</p>
          <p className="text-sm text-slate-300 mt-1">Assignment: {report.assignmentTitle}</p>
        </section>

        <section>
          <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2">Final Authenticity Score</h3>
          <p className="text-4xl font-extrabold text-blue-400">{report.score?.overallScore}%</p>
          <p className="text-sm text-slate-400">Depth: {report.score?.depthRating}</p>
          {report.analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
              {[
                ['Confidence', report.analytics.confidenceScore],
                ['Originality', report.analytics.originalityScore],
                ['Communication', report.analytics.communicationScore],
                ['AI Suspicion', report.analytics.aiSuspicionLevel]
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-900/50 p-2 border border-slate-800">
                  <p className="text-slate-500">{k}</p>
                  <p className="text-white font-bold">{v}%</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {report.aiDetection && (
          <section>
            <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2">AI Content Analysis</h3>
            <AIDetectionBadge {...report.aiDetection} />
          </section>
        )}

        <section>
          <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2">Summary</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{report.score?.summary}</p>
        </section>

        {report.recommendations?.studyRoadmap && (
          <section>
            <h3 className="text-xs uppercase text-slate-500 font-semibold mb-2">Learning Recommendations</h3>
            <p className="text-sm text-slate-300">{report.recommendations.studyRoadmap}</p>
          </section>
        )}

        <section>
          <h3 className="text-xs uppercase text-slate-500 font-semibold mb-3">Viva Transcript</h3>
          <div className="space-y-4">
            {(report.qnas || []).map((q, i) => (
              <div key={i} className="rounded-xl border border-slate-800 p-4 text-sm">
                <p className="text-blue-300 font-medium">Q{i + 1}: {q.question}</p>
                <p className="text-slate-400 mt-2 italic">A: {q.answer}</p>
                <p className="text-slate-500 mt-2 text-xs border-t border-slate-800 pt-2">{q.feedback}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-[10px] text-slate-600 border-t border-slate-800 pt-4">
          {report.footer}
        </footer>
      </motion.article>
    </div>
  );
}
