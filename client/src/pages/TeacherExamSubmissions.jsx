import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { Bot, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';

const STATUS_LABEL = {
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  graded: 'Graded',
  in_progress: 'In Progress'
};

export default function TeacherExamSubmissions() {
  const { examId, attemptId } = useParams();
  const [list, setList] = useState([]);
  const [detail, setDetail] = useState(null);
  const [grade, setGrade] = useState({ marksObtained: '', teacherFeedback: '', teacherComments: '' });
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const maxMarks = useMemo(() => {
    if (!detail) return 100;
    const { exam, attempt } = detail;
    const qTotal = (exam?.questions || []).reduce((s, q) => s + (Number(q.marks) || 0), 0);
    return Number(attempt?.maxMarks) || Number(exam?.totalMarks) || qTotal || 100;
  }, [detail]);

  const loadDetail = () => {
    if (!attemptId) return;
    setLoading(true);
    setError('');
    api
      .get(`/api/teacher/exams/submissions/${attemptId}`)
      .then((res) => {
        setDetail(res.data);
        const a = res.data.attempt;
        const qTotal = (res.data.exam?.questions || []).reduce(
          (s, q) => s + (Number(q.marks) || 0),
          0
        );
        const max =
          Number(res.data.maxMarks) ||
          Number(a.maxMarks) ||
          Number(res.data.exam?.totalMarks) ||
          qTotal ||
          100;
        setGrade({
          marksObtained:
            a.marksObtained != null && a.marksObtained !== ''
              ? String(a.marksObtained)
              : '',
          teacherFeedback: a.teacherFeedback ?? '',
          teacherComments: a.teacherComments ?? ''
        });
        setAiResult(a.aiGrading || null);
        void max;
      })
      .catch((err) => setError(err.response?.data?.error || 'Load failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (attemptId) {
      loadDetail();
      return;
    }

    const url = examId
      ? `/api/teacher/exams/${examId}/submissions`
      : '/api/teacher/exams/submissions/all';

    api
      .get(url)
      .then((res) => setList(res.data.submissions || []))
      .catch((err) => setError(err.response?.data?.error || 'Load failed'))
      .finally(() => setLoading(false));
  }, [examId, attemptId]);

  const runAiGrade = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post(`/api/teacher/exams/submissions/${attemptId}/ai-grade`);
      setAiResult(res.data.aiGrading);
      if (res.data.aiGrading?.suggestedMarks != null) {
        setGrade((g) => ({
          ...g,
          marksObtained: String(res.data.aiGrading.suggestedMarks),
          teacherFeedback: res.data.aiGrading.feedback || g.teacherFeedback
        }));
      }
      setSuccess('AI suggestions applied — review and approve below.');
    } catch (err) {
      setError(err.response?.data?.error || 'AI grading failed');
    } finally {
      setBusy(false);
    }
  };

  const submitGrade = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    const marksNum = Number(grade.marksObtained);
    if (!Number.isFinite(marksNum)) {
      setError(`Enter marks obtained (0 to ${maxMarks}).`);
      setBusy(false);
      return;
    }
    if (marksNum < 0 || marksNum > maxMarks) {
      setError(`Marks must be between 0 and ${maxMarks}.`);
      setBusy(false);
      return;
    }

    try {
      const res = await api.post(`/api/teacher/exams/submissions/${attemptId}/grade`, {
        marksObtained: marksNum,
        teacherFeedback: grade.teacherFeedback,
        teacherComments: grade.teacherComments,
        approve: true
      });
      setSuccess(res.data.message || 'Final score saved!');
      setDetail((d) => ({
        ...d,
        attempt: { ...d.attempt, ...res.data.attempt, status: 'graded' }
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Grading failed — check you are logged in as teacher.');
    } finally {
      setBusy(false);
    }
  };

  if (attemptId) {
    if (loading) {
      return <p className="p-8 text-slate-400">Loading submission…</p>;
    }
    if (!detail) {
      return <p className="p-8 text-red-400">{error || 'Submission not found'}</p>;
    }

    const { exam, attempt } = detail;
    const isGraded = attempt.status === 'graded';
    const canGrade = ['submitted', 'reviewed', 'graded'].includes(attempt.status);
    const answerMap = Object.fromEntries((attempt.answers || []).map((a) => [a.questionId, a.value]));

    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
        <Link to="/teacher/exams/submissions" className="text-sm text-amber-400 flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-xl font-bold text-white">{exam.title}</h1>
        <p className="text-slate-400 text-sm">
          {attempt.studentName} · {STATUS_LABEL[attempt.status] || attempt.status}
          {isGraded && attempt.percentage != null && ` · ${attempt.percentage}%`}
        </p>

        {!canGrade && (
          <p className="mt-4 text-amber-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Waiting for student to submit this exam.
          </p>
        )}

        <div className="mt-6 space-y-4">
          {(exam.questions || []).map((q, i) => (
            <div key={q.id} className="glass-panel rounded-xl p-4">
              <p className="text-xs text-amber-400">
                Q{i + 1} · {q.type} · {q.marks} marks
              </p>
              <p className="text-white mt-1">{q.question}</p>
              <p className="text-sm text-slate-300 mt-3 whitespace-pre-wrap border-t border-slate-800 pt-3">
                {String(answerMap[q.id] ?? '(no answer)')}
              </p>
            </div>
          ))}
        </div>

        {canGrade && (
          <form
            onSubmit={submitGrade}
            className="glass-panel rounded-2xl p-6 mt-8 border border-amber-500/20"
          >
            <h2 className="font-semibold text-white mb-1">Approve final score</h2>
            <p className="text-xs text-slate-500 mb-4">Total marks for this exam: {maxMarks}</p>

            {success && (
              <p className="mb-4 text-sm text-emerald-400 bg-emerald-950/40 border border-emerald-600/40 rounded-lg px-3 py-2">
                {success}
              </p>
            )}

            {aiResult && (
              <div className="mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-500/30 text-sm text-slate-300">
                <p className="font-medium text-blue-300">AI suggestion</p>
                <p>{aiResult.feedback}</p>
                {aiResult.suggestedMarks != null && (
                  <p className="mt-1 text-xs">Suggested: {aiResult.suggestedMarks} / {maxMarks}</p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={runAiGrade}
              disabled={busy || isGraded}
              className="tap-target mb-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-500/40 text-blue-300 text-sm disabled:opacity-50"
            >
              <Bot className="w-4 h-4" />
              Get AI grading suggestion
            </button>

            <div className="grid gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Marks obtained (out of {maxMarks})</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={maxMarks}
                    step={0.5}
                    required
                    className="input-dark flex-1"
                    placeholder={`0 – ${maxMarks}`}
                    value={grade.marksObtained}
                    onChange={(e) => setGrade({ ...grade, marksObtained: e.target.value })}
                  />
                  <button
                    type="button"
                    className="tap-target px-3 py-2 rounded-lg border border-slate-600 text-xs text-slate-300 shrink-0"
                    onClick={() => setGrade((g) => ({ ...g, marksObtained: String(maxMarks) }))}
                  >
                    Full marks
                  </button>
                </div>
              </div>
              <textarea
                className="input-dark min-h-[80px]"
                placeholder="Feedback for student (shown on result page)"
                value={grade.teacherFeedback}
                onChange={(e) => setGrade({ ...grade, teacherFeedback: e.target.value })}
              />
              <textarea
                className="input-dark min-h-[60px]"
                placeholder="Private notes (optional)"
                value={grade.teacherComments}
                onChange={(e) => setGrade({ ...grade, teacherComments: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="tap-target mt-4 w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              {busy ? 'Saving…' : isGraded ? 'Update final score' : 'Approve final score'}
            </button>
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto">
      <Link to="/teacher/exams" className="text-sm text-amber-400 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Exams
      </Link>
      <h1 className="text-2xl font-bold text-white">Exam Submissions</h1>
      <p className="text-slate-500 text-sm mt-1">Open a submission, enter marks, then click Approve final score</p>
      {loading && <p className="text-slate-400 mt-4">Loading…</p>}
      {error && <p className="text-red-400 mt-4">{error}</p>}
      <div className="mt-6 space-y-3">
        {list.map((s) => (
          <Link
            key={s._id}
            to={`/teacher/exams/submissions/${s._id}`}
            className="glass-panel rounded-xl p-4 block hover:border-amber-500/40 transition-colors"
          >
            <p className="font-medium text-white">{s.examTitle}</p>
            <p className="text-sm text-slate-400">
              {s.studentName} · {STATUS_LABEL[s.status] || s.status}
              {s.percentage != null && ` · ${s.percentage}%`}
            </p>
          </Link>
        ))}
        {!loading && !list.length && (
          <p className="text-slate-500 text-sm">No submissions yet.</p>
        )}
      </div>
    </div>
  );
}
