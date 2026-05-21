import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import {
  Sparkles,
  Send,
  ClipboardList,
  Users,
  FileUp,
  Type,
  ChevronRight,
  Check
} from 'lucide-react';

const STEPS = ['Source', 'Generate', 'Preview & send'];

const STATUS_COLORS = {
  draft: 'bg-slate-600',
  assigned: 'bg-emerald-600'
};

export default function TeacherExamHub() {
  const fileRef = useRef(null);
  const [step, setStep] = useState(0);
  const [sourceMode, setSourceMode] = useState('topic');
  const [pdfFile, setPdfFile] = useState(null);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    topic: '',
    subject: '',
    difficulty: 'Intermediate',
    count: 8
  });

  const [draft, setDraft] = useState(null);
  const [savedExamId, setSavedExamId] = useState(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assign, setAssign] = useState({
    assignAll: true,
    studentIds: [],
    dueDate: '',
    startTime: '',
    endTime: '',
    attemptLimit: 1,
    instructions: ''
  });

  const load = () => {
    Promise.all([
      api.get('/api/teacher/exams'),
      api.get('/api/teacher/exams/analytics'),
      api.get('/api/teacher/students')
    ])
      .then(([ex, an, st]) => {
        setExams(ex.data.exams || []);
        setAnalytics(an.data);
        setStudents(Array.isArray(st.data) ? st.data : st.data.students || []);
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      let res;
      if (sourceMode === 'pdf') {
        if (!pdfFile) {
          setError('Choose a PDF file first.');
          setGenerating(false);
          return;
        }
        const fd = new FormData();
        fd.append('file', pdfFile);
        fd.append('topic', form.topic || 'PDF material');
        fd.append('subject', form.subject);
        fd.append('difficulty', form.difficulty);
        fd.append('count', String(form.count));
        res = await api.post('/api/teacher/exams/generate-from-pdf', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000
        });
      } else {
        if (!form.topic.trim()) {
          setError('Enter a topic or switch to PDF mode.');
          setGenerating(false);
          return;
        }
        res = await api.post('/api/teacher/exams/generate', form, { timeout: 120000 });
      }

      setDraft({
        title: res.data.title,
        instructions: res.data.instructions,
        questions: res.data.questions,
        subject: form.subject,
        topic: form.topic || res.data.sourceFileName || 'PDF',
        totalMarks: res.data.totalMarks,
        sourceFileName: res.data.sourceFileName
      });
      setAssign((a) => ({ ...a, instructions: res.data.instructions }));
      setStep(2);
    } catch (err) {
      const data = err.response?.data;
      let msg = data?.error || 'Generation failed';
      if (err.response?.status === 429) {
        msg = data?.hint ? `${msg} ${data.hint}` : msg;
      }
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const saveAndAssign = async () => {
    if (!draft) return;
    setError('');
    try {
      const res = await api.post('/api/teacher/exams', {
        title: draft.title,
        subject: draft.subject,
        topic: draft.topic,
        instructions: draft.instructions,
        questions: draft.questions
      });
      setSavedExamId(res.data.exam._id);
      setAssignOpen(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save exam');
    }
  };

  const sendExam = async () => {
    if (!savedExamId) return;
    setError('');
    try {
      await api.post(`/api/teacher/exams/${savedExamId}/assign`, assign);
      setAssignOpen(false);
      setDraft(null);
      setSavedExamId(null);
      setStep(0);
      setPdfFile(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Assign failed');
    }
  };

  const toggleStudent = (id) => {
    setAssign((a) => {
      const ids = new Set(a.studentIds);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ...a, studentIds: [...ids], assignAll: false };
    });
  };

  const totalMarks =
    draft?.totalMarks ||
    (draft?.questions || []).reduce((s, q) => s + (Number(q.marks) || 0), 0);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-10 overflow-auto max-w-4xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-400" />
            AI Exam Generator
          </h1>
          <p className="text-slate-400 text-sm mt-1">Simple 3-step flow — topic or PDF</p>
        </div>
        <Link
          to="/teacher/exams/submissions"
          className="tap-target px-4 py-2 rounded-lg bg-amber-600/20 border border-amber-500/40 text-amber-200 text-sm"
        >
          Grade submissions →
        </Link>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                i <= step ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i <= step ? 'text-white' : 'text-slate-500'}`}>{label}</span>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-600 mx-1" />}
          </div>
        ))}
      </div>

      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 text-center">
          {[
            ['Assigned', analytics.totalExamsAssigned],
            ['Submitted %', `${analytics.submissionRate}%`],
            ['Pending', analytics.pendingReviews]
          ].map(([l, v]) => (
            <div key={l} className="rounded-lg bg-slate-900/80 border border-slate-800 p-3">
              <p className="text-[10px] text-slate-500 uppercase">{l}</p>
              <p className="text-lg font-bold text-white">{v}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm mb-4 bg-red-950/30 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Step 0: Source */}
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-white font-medium">How do you want to create the exam?</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setSourceMode('topic');
                setPdfFile(null);
              }}
              className={`p-6 rounded-2xl border text-left transition-all ${
                sourceMode === 'topic'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <Type className="w-8 h-8 text-amber-400 mb-3" />
              <p className="font-semibold text-white">From topic</p>
              <p className="text-xs text-slate-400 mt-1">Type a subject & topic — AI writes questions</p>
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('pdf')}
              className={`p-6 rounded-2xl border text-left transition-all ${
                sourceMode === 'pdf'
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <FileUp className="w-8 h-8 text-amber-400 mb-3" />
              <p className="font-semibold text-white">From PDF</p>
              <p className="text-xs text-slate-400 mt-1">Upload notes or a chapter — AI builds the exam</p>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full py-3 rounded-xl bg-amber-600 text-white font-medium"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 1: Options + generate */}
      {step === 1 && (
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <button type="button" onClick={() => setStep(0)} className="text-xs text-slate-500 hover:text-white">
            ← Back
          </button>

          {sourceMode === 'pdf' ? (
            <div>
              <label className="text-sm text-slate-300 block mb-2">Upload PDF (max 10MB)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-8 rounded-xl border-2 border-dashed border-slate-600 hover:border-amber-500/50 text-slate-400 hover:text-amber-200 transition-colors"
              >
                {pdfFile ? (
                  <span className="text-emerald-400 font-medium">{pdfFile.name}</span>
                ) : (
                  <span className="flex flex-col items-center gap-2">
                    <FileUp className="w-8 h-8" />
                    Tap to choose PDF
                  </span>
                )}
              </button>
              <input
                className="input-dark mt-3"
                placeholder="Optional label (e.g. Chapter 3 — Photosynthesis)"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </div>
          ) : (
            <input
              className="input-dark"
              placeholder="Topic * e.g. Binary Search Trees"
              value={form.topic}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
            />
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="input-dark"
              placeholder="Subject (optional)"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            <select
              className="input-dark"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500">Number of questions: {form.count}</label>
            <input
              type="range"
              min={3}
              max={15}
              value={form.count}
              onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
              className="w-full mt-2 accent-amber-500"
            />
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold disabled:opacity-50"
          >
            {generating
              ? 'AI is building your exam… (may take 30–60s)'
              : sourceMode === 'pdf'
                ? 'Generate exam from PDF'
                : 'Generate exam'}
          </button>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && draft && (
        <div className="glass-panel rounded-2xl p-6 border border-amber-500/30">
          <button type="button" onClick={() => setStep(1)} className="text-xs text-slate-500 hover:text-white mb-3">
            ← Regenerate
          </button>
          <h2 className="text-xl font-bold text-white">{draft.title}</h2>
          {draft.sourceFileName && (
            <p className="text-xs text-emerald-400 mt-1">From PDF: {draft.sourceFileName}</p>
          )}
          <p className="text-sm text-slate-400 mt-2">{draft.instructions}</p>
          <p className="text-xs text-amber-300 mt-2">Total marks: {totalMarks}</p>

          <ol className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {draft.questions.map((q, i) => (
              <li key={q.id} className="text-sm py-2 border-b border-slate-800">
                <span className="text-amber-400 text-xs">
                  {i + 1}. {q.type} · {q.marks}m
                </span>
                <p className="text-slate-200 mt-0.5">{q.question}</p>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={saveAndAssign}
            className="tap-target mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 text-white font-medium"
          >
            <Send className="w-4 h-4" />
            Next: Send to students
          </button>
        </div>
      )}

      <h2 className="text-lg font-semibold text-white mt-10 mb-3 flex items-center gap-2">
        <ClipboardList className="w-5 h-5" />
        Past exams
      </h2>
      {loading && <p className="text-slate-400">Loading…</p>}
      <div className="grid gap-2">
        {exams.map((ex) => (
          <div key={ex._id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 flex justify-between gap-2">
            <div>
              <p className="font-medium text-white text-sm">{ex.title}</p>
              <p className="text-xs text-slate-500">
                {ex.submittedCount}/{ex.assignedCount} submitted
              </p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded h-fit ${STATUS_COLORS[ex.status] || 'bg-slate-600'}`}>
              {ex.status}
            </span>
          </div>
        ))}
      </div>

      {assignOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
          <div className="glass-panel rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Send to students
            </h3>
            <label className="flex items-center gap-2 mt-4 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={assign.assignAll}
                onChange={(e) => setAssign({ ...assign, assignAll: e.target.checked })}
              />
              All students
            </label>
            {!assign.assignAll && (
              <div className="mt-3 max-h-32 overflow-y-auto space-y-1 border border-slate-700 rounded-lg p-2">
                {students.map((s) => (
                  <label key={s.studentId} className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={assign.studentIds.includes(s.studentId)}
                      onChange={() => toggleStudent(s.studentId)}
                    />
                    {s.fullName}
                  </label>
                ))}
              </div>
            )}
            <div className="grid gap-3 mt-4">
              <label className="text-xs text-slate-500">Due date</label>
              <input
                type="datetime-local"
                className="input-dark"
                value={assign.dueDate}
                onChange={(e) => setAssign({ ...assign, dueDate: e.target.value })}
              />
              <label className="text-xs text-slate-500">Exam window (optional)</label>
              <input
                type="datetime-local"
                className="input-dark"
                value={assign.startTime}
                onChange={(e) => setAssign({ ...assign, startTime: e.target.value })}
              />
              <input
                type="datetime-local"
                className="input-dark"
                value={assign.endTime}
                onChange={(e) => setAssign({ ...assign, endTime: e.target.value })}
              />
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setAssignOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendExam}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold"
              >
                Send exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
