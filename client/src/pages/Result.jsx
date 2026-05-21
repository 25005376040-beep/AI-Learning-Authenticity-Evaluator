import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import ScoreCard from '../components/ScoreCard';
import AIDetectionBadge from '../components/AIDetectionBadge';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileCheck,
  RefreshCw,
  HelpCircle,
  CornerDownRight,
  BarChart3,
  GraduationCap
} from 'lucide-react';

function Result() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Accordion active index state
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await api.get(`/api/session/${sessionId}/result`);
        setResult(response.data);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Failed to fetch results:', err);
        setError(err.response?.data?.error || 'Could not retrieve viva session results.');
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  const toggleAccordion = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <span className="w-10 h-10 border-4 border-blue-500/20 border-t-accent-blue rounded-full animate-spin" />
        <p className="text-sm font-mono text-slate-400">Compiling examiner assessment scorecard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-panel rounded-2xl p-6 text-center border border-red-500/20">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Evaluation Error</h2>
          <p className="text-sm text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/upload')}
            className="px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            Return to Upload
          </button>
        </div>
      </div>
    );
  }

  const { score, qnas } = result;

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-8 md:py-12 space-y-5 sm:space-y-8 animate-slide-up pb-4">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <FileCheck className="w-8 h-8 text-accent-blue" />
            Evaluation Report
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Session ID: {sessionId} • Completed {new Date(result.completedAt).toLocaleString()}
          </p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="tap-target w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-600 border border-blue-500/20 text-white text-sm font-semibold hover:bg-blue-500 active:scale-[0.98] transition-all shadow-lg shadow-blue-900/10 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Evaluate Another
        </button>
      </div>

      {/* Warning Banner if Authenticity concern is flagged */}
      {score.authenticityFlag && (
        <div className="w-full p-4 rounded-2xl border border-red-500/30 bg-red-950/20 text-red-400 flex gap-3 items-start animate-pulse shadow-lg shadow-red-950/15">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white">Authenticity Concern Flagged</h4>
            <p className="text-xs text-red-300 mt-0.5 leading-relaxed">
              Academic integrity concern detected. The student's responses demonstrate superficial or misaligned comprehension relative to the details of the submitted work. This submission may not reflect the student's own understanding.
            </p>
          </div>
        </div>
      )}

      {result.analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to={`/result/${sessionId}/analytics`}
            className="glass-panel-glow rounded-xl p-4 flex items-center gap-3 border border-blue-500/25 hover:border-blue-500/50 transition-all group"
          >
            <BarChart3 className="w-8 h-8 text-blue-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-white text-sm">Confidence Dashboard</p>
              <p className="text-xs text-slate-500">Scores, radar & weak areas</p>
            </div>
          </Link>
          <Link
            to={`/result/${sessionId}/recommendations`}
            className="glass-panel rounded-xl p-4 flex items-center gap-3 hover:border-violet-500/40 border border-slate-800 transition-all group"
          >
            <GraduationCap className="w-8 h-8 text-violet-400 group-hover:scale-110 transition-transform" />
            <div>
              <p className="font-semibold text-white text-sm">Learning Path</p>
              <p className="text-xs text-slate-500">AI study recommendations</p>
            </div>
          </Link>
        </div>
      )}

      {!result.analytics && (
        <p className="text-xs text-slate-500 italic">
          Complete a new viva to unlock confidence analytics and learning recommendations.
        </p>
      )}

      {/* Main Scorecard Component */}
      <ScoreCard
        score={score.overallScore}
        depthRating={score.depthRating}
        authenticityFlag={score.authenticityFlag}
        summary={score.summary}
      />

      {result.aiDetection && (
        <div className="glass-panel rounded-2xl p-6 space-y-4 border border-slate-700/80">
          <h3 className="text-lg font-bold text-white">AI Content Analysis</h3>
          <AIDetectionBadge {...result.aiDetection} />
          <p className="text-sm text-slate-400 leading-relaxed">{result.aiDetection.detailedReason}</p>
          {result.aiDetection.riskLevel === 'High Risk' && (
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 text-sm flex gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>
                This submission was flagged as likely AI generated. Combined with viva performance, teacher review is recommended.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Q&A Accordion Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white pl-1 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-slate-400" />
          Per-Question Assessment Details
        </h3>
        
        <div className="rounded-2xl border border-border-dark overflow-hidden">
          {qnas.map((qna, idx) => {
            const isOpen = openIndex === idx;
            
            return (
              <div 
                key={idx} 
                className={`border-b border-border-dark last:border-b-0 transition-colors ${
                  isOpen ? 'bg-slate-900/20' : 'hover:bg-slate-900/10'
                }`}
              >
                {/* Accordion Trigger */}
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  className="tap-target w-full px-4 sm:px-6 py-4 flex justify-between items-center text-left gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-slate-400 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-white line-clamp-2 sm:truncate sm:max-w-lg md:max-w-2xl flex-1">
                      {qna.question}
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {/* Accordion Content */}
                {isOpen && (
                  <div className="px-6 pb-6 pt-1 space-y-4 animate-fade-in">
                    
                    {/* Student Answer */}
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold">
                        Student Response
                      </h5>
                      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 leading-relaxed italic">
                        "{qna.answer || 'No response provided.'}"
                      </div>
                    </div>

                    {/* AI Feedback */}
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                        <CornerDownRight className="w-3 h-3 text-accent-blue" />
                        Examiner Feedback
                      </h5>
                      <div className="p-3.5 rounded-xl bg-blue-950/10 border border-blue-900/25 text-sm text-slate-300 leading-relaxed">
                        {qna.feedback || 'Satisfactory answer.'}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

export default Result;
