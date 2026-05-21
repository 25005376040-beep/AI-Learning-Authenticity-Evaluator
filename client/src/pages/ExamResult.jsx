import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { Download, ArrowLeft } from 'lucide-react';

export default function ExamResult() {
  const { attemptId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/student/exams/${attemptId}/result`)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, [attemptId]);

  const downloadReport = () => {
    if (!data) return;
    const { attempt, exam } = data;
    const lines = [
      `Exam Report: ${exam.title}`,
      `Score: ${attempt.marksObtained}/${attempt.maxMarks} (${attempt.percentage}%)`,
      '',
      'Feedback:',
      attempt.teacherFeedback || '—',
      '',
      'Answers:'
    ];
    const map = Object.fromEntries((attempt.answers || []).map((a) => [a.questionId, a.value]));
    (exam.questions || []).forEach((q, i) => {
      lines.push(`\nQ${i + 1}: ${q.question}`, String(map[q.id] ?? ''));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.title.replace(/\s+/g, '_')}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="p-8 text-slate-400">Loading…</p>;
  if (!data) return <p className="p-8 text-red-400">Result not found</p>;

  const { attempt, exam } = data;
  const answerMap = Object.fromEntries((attempt.answers || []).map((a) => [a.questionId, a.value]));

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto max-w-3xl">
      <Link to="/student/exams" className="text-sm text-blue-400 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> My Exams
      </Link>
      <h1 className="text-2xl font-bold text-white">{exam.title}</h1>
      <div className="glass-panel rounded-2xl p-6 mt-6 text-center">
        <p className="text-4xl font-bold text-emerald-400">
          {attempt.marksObtained}/{attempt.maxMarks}
        </p>
        <p className="text-xl text-slate-300 mt-1">{attempt.percentage}%</p>
        <p className="text-sm text-slate-500 mt-2 capitalize">{attempt.status}</p>
      </div>

      {attempt.teacherFeedback && (
        <div className="glass-panel rounded-xl p-4 mt-6">
          <p className="text-xs uppercase text-slate-500">Teacher feedback</p>
          <p className="text-slate-200 mt-2 whitespace-pre-wrap">{attempt.teacherFeedback}</p>
        </div>
      )}

      <button
        type="button"
        onClick={downloadReport}
        className="tap-target mt-6 flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm"
      >
        <Download className="w-4 h-4" />
        Download report
      </button>

      <h2 className="text-lg font-semibold text-white mt-8 mb-3">Your answers</h2>
      {(exam.questions || []).map((q, i) => (
        <div key={q.id} className="glass-panel rounded-xl p-4 mb-3">
          <p className="text-xs text-blue-400">Q{i + 1}</p>
          <p className="text-white mt-1">{q.question}</p>
          <p className="text-sm text-slate-400 mt-2 whitespace-pre-wrap">{String(answerMap[q.id] ?? '—')}</p>
        </div>
      ))}
    </div>
  );
}
