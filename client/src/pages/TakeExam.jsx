import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Maximize,
  Minimize,
  Save,
  Send
} from 'lucide-react';

function useTimer(endTime) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    if (!endTime) {
      setLeft(null);
      return;
    }
    const tick = () => {
      const ms = new Date(endTime).getTime() - Date.now();
      setLeft(Math.max(0, ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return left;
}

function formatMs(ms) {
  if (ms == null) return '—';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function TakeExam() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const rootRef = useRef(null);

  const timeLeft = useTimer(exam?.endTime);

  const load = useCallback(() => {
    api
      .get(`/api/student/exams/${attemptId}`)
      .then(async (res) => {
        const { exam: ex, attempt: at, canStart } = res.data;
        if (canStart && !at.startedAt) {
          const started = await api.post(`/api/student/exams/${attemptId}/start`);
          setExam(started.data.exam);
          setAttempt(started.data.attempt);
        } else {
          setExam(ex);
          setAttempt(at);
        }
        const map = {};
        (at.answers || []).forEach((a) => {
          map[a.questionId] = a.value;
        });
        setAnswers(map);
      })
      .catch((err) => setError(err.response?.data?.error || 'Cannot load exam'))
      .finally(() => setLoading(false));
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  const questions = exam?.questions || [];
  const current = questions[index];
  const progress = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;

  const answerList = useMemo(
    () =>
      questions.map((q) => ({
        questionId: q.id,
        value: answers[q.id] ?? ''
      })),
    [questions, answers]
  );

  const autosave = useCallback(async () => {
    if (!attempt || ['submitted', 'graded'].includes(attempt.status)) return;
    setSaving(true);
    try {
      await api.put(`/api/student/exams/${attemptId}/save`, { answers: answerList });
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  }, [attempt, attemptId, answerList]);

  useEffect(() => {
    const id = setInterval(autosave, 15000);
    return () => clearInterval(id);
  }, [autosave]);

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await rootRef.current?.requestFullscreen?.();
        setFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setFullscreen(false);
      }
    } catch {
      setFullscreen((f) => !f);
    }
  };

  const submit = async () => {
    setError('');
    try {
      await api.post(`/api/student/exams/${attemptId}/submit`, { answers: answerList });
      navigate('/student/exams', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Submit failed');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">Loading exam…</div>
    );
  }

  if (error && !exam) {
    return (
      <div className="flex-1 p-8 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div
      ref={rootRef}
      className={`flex-1 flex flex-col min-h-0 ${fullscreen ? 'bg-slate-950 fixed inset-0 z-50' : ''}`}
    >
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-2 safe-top">
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{exam.title}</p>
          <p className="text-xs text-slate-500">Q {index + 1} / {questions.length}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1 text-amber-300 font-mono">
            <Clock className="w-4 h-4" />
            {formatMs(timeLeft)}
          </span>
          <button type="button" onClick={autosave} className="tap-target p-2 rounded-lg border border-slate-700 text-slate-400" title="Save">
            <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
          </button>
          <button type="button" onClick={toggleFullscreen} className="tap-target p-2 rounded-lg border border-slate-700 text-slate-400">
            {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full">
        {exam.instructions && index === 0 && (
          <p className="text-sm text-slate-400 mb-4 border-l-2 border-blue-500 pl-3">{exam.instructions}</p>
        )}

        <div className="glass-panel rounded-2xl p-5 sm:p-6">
          <p className="text-xs text-blue-400 uppercase">{current.type} · {current.marks} marks</p>
          <h2 className="text-lg text-white mt-2">{current.question}</h2>

          {current.type === 'mcq' && (
            <div className="mt-6 space-y-2">
              {(current.options || []).map((opt, i) => (
                <label
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    answers[current.id] === opt
                      ? 'border-blue-500 bg-blue-600/15'
                      : 'border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name={current.id}
                    checked={answers[current.id] === opt}
                    onChange={() => setAnswer(current.id, opt)}
                  />
                  <span className="text-slate-200 text-sm">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {current.type === 'text' && (
            <input
              className="input-dark w-full mt-6"
              value={answers[current.id] || ''}
              onChange={(e) => setAnswer(current.id, e.target.value)}
              placeholder="Your answer"
            />
          )}

          {current.type === 'long' && (
            <textarea
              className="input-dark w-full mt-6 min-h-[160px]"
              value={answers[current.id] || ''}
              onChange={(e) => setAnswer(current.id, e.target.value)}
              placeholder="Write your detailed answer"
            />
          )}
        </div>

        <nav className="flex flex-wrap gap-2 mt-6 justify-center">
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`w-9 h-9 rounded-lg text-sm font-medium ${
                i === index
                  ? 'bg-blue-600 text-white'
                  : answers[q.id]
                    ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      </main>

      <footer className="border-t border-slate-800 p-4 flex justify-between gap-2 safe-bottom">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
          className="tap-target flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-700 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        {index < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            className="tap-target flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmSubmit(true)}
            className="tap-target flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-600 text-white"
          >
            <Send className="w-4 h-4" /> Submit
          </button>
        )}
      </footer>

      {confirmSubmit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80">
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full text-center">
            <p className="text-white font-semibold">Submit exam?</p>
            <p className="text-sm text-slate-400 mt-2">You cannot change answers after submission.</p>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setConfirmSubmit(false)}
                className="flex-1 py-2 rounded-lg border border-slate-600"
              >
                Cancel
              </button>
              <button type="button" onClick={submit} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="text-center text-red-400 text-sm pb-4">{error}</p>}
    </div>
  );
}
