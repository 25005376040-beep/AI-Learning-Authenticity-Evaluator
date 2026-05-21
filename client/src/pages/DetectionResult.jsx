import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import AIDetectionBadge from '../components/AIDetectionBadge';
import LanguageSelector from '../components/LanguageSelector';
import { AlertTriangle, CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';

function AnimatedPercent({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let n = 0;
    const step = Math.max(1, Math.ceil(value / 30));
    const t = setInterval(() => {
      n += step;
      if (n >= value) {
        setDisplay(value);
        clearInterval(t);
      } else setDisplay(n);
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <span>{display}%</span>;
}

function bannerStyle(ai) {
  if (ai >= 70) return 'from-red-950/80 to-red-900/40 border-red-500/40 text-red-100';
  if (ai >= 40) return 'from-amber-950/80 to-amber-900/40 border-amber-500/40 text-amber-100';
  return 'from-emerald-950/80 to-emerald-900/40 border-emerald-500/40 text-emerald-100';
}

export default function DetectionResult() {
  const { submissionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [aiDetection, setAiDetection] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [vivaLanguage, setVivaLanguage] = useState('en');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      if (location.state?.aiDetection) {
        setAiDetection(location.state.aiDetection);
        setFileName(location.state.fileName || '');
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get(`/api/upload/${submissionId}`, { timeout: 120000 });
        if (cancelled) return;

        if (data.aiDetection) {
          setAiDetection(data.aiDetection);
          setFileName(data.fileName || '');
        } else {
          setError('Detection data is missing for this submission. Please upload again.');
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err.response?.data?.error;
        if (err.response?.status === 404) {
          setError(msg || 'Submission not found. It may have expired — please upload your file again.');
        } else if (err.code === 'ECONNABORTED') {
          setError('Detection timed out. Please try again.');
        } else {
          setError(msg || err.message || 'Could not load detection results.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [submissionId, location.state]);

  const proceedToViva = async () => {
    setStarting(true);
    setError('');
    try {
      const { data } = await api.post(
        '/api/session/start',
        { submissionId, language: vivaLanguage },
        { timeout: 120000 }
      );
      navigate(`/viva/${data.sessionId}`, { state: { language: vivaLanguage } });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to start viva.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
        <p className="text-slate-400 text-sm">Analyzing content for AI patterns...</p>
      </div>
    );
  }

  if (error || !aiDetection) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-panel rounded-2xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <p className="text-red-400 text-sm mb-6">{error || 'No detection data available.'}</p>
          <button
            type="button"
            onClick={() => navigate('/upload')}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500"
          >
            Back to Upload
          </button>
        </div>
      </div>
    );
  }

  const ai = aiDetection.aiProbability;
  const BannerIcon = ai >= 70 ? AlertTriangle : ai >= 40 ? AlertTriangle : CheckCircle;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-8 lg:p-10 space-y-4 sm:space-y-6 animate-slide-up">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">AI Content Analysis</h1>
        {fileName && <p className="text-sm text-slate-400 mt-1 font-mono">{fileName}</p>}
      </div>

      <div className={`rounded-2xl border p-4 sm:p-8 bg-gradient-to-br ${bannerStyle(ai)}`}>
        <div className="flex items-start gap-3 sm:gap-4">
          <BannerIcon className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 opacity-90" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm uppercase tracking-wider opacity-80">AI Probability</p>
            <p className="text-3xl sm:text-5xl font-extrabold mt-1">
              <AnimatedPercent value={ai} /> <span className="text-2xl font-normal opacity-70">AI</span>
            </p>
            <p className="text-xl font-bold mt-2">{aiDetection.verdict}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-black/20 border border-white/10">
              {aiDetection.riskLevel}
            </span>
          </div>
        </div>
      </div>

      <AIDetectionBadge {...aiDetection} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass-panel rounded-xl p-5 border-red-500/20 animate-fade-in">
          <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4" /> AI Signals Detected
          </h3>
          {aiDetection.signals?.aiSignals?.length ? (
            <ul className="space-y-2 text-sm text-slate-300">
              {aiDetection.signals.aiSignals.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-red-400">•</span> {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-400">No AI signals detected ✅</p>
          )}
        </div>
        <div className="glass-panel rounded-xl p-5 border-emerald-500/20 animate-fade-in">
          <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" /> Human Signals Detected
          </h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {(aiDetection.signals?.humanSignals || []).map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-400">•</span> {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Detailed Analysis</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{aiDetection.detailedReason}</p>
        <p className="text-xs text-slate-500 mt-3 font-mono">
          Confidence: {aiDetection.confidenceLevel} · Human: {aiDetection.humanProbability}%
        </p>
      </div>

      <LanguageSelector value={vivaLanguage} onChange={setVivaLanguage} disabled={starting} />

      <div className="flex flex-col sm:flex-row gap-3 pt-2 sticky bottom-0 sm:static bg-bg-dark/80 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none py-3 sm:py-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={proceedToViva}
          disabled={starting}
          className="tap-target flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          {starting ? 'Starting Viva...' : 'Proceed to Viva'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/upload')}
          className="tap-target px-6 py-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors w-full sm:w-auto"
        >
          Cancel Submission
        </button>
      </div>
    </div>
  );
}
