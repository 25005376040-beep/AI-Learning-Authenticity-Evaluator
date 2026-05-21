import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import FileDropzone from '../components/FileDropzone';
import { ShieldCheck, ArrowRight, Clipboard, FileUp, Sparkles } from 'lucide-react';

function Upload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    setError('');

    // Check if input is present
    if (!pasteMode && !selectedFile) {
      setError('Please select a file to upload.');
      return;
    }
    if (pasteMode && !pastedText.trim()) {
      setError('Please paste the content you want to evaluate.');
      return;
    }

    setIsLoading(true);

    try {
      let submissionData;
      
      if (pasteMode) {
        // Post text content
        const response = await api.post('/api/upload', {
          text: pastedText,
          title: 'Pasted Submission'
        }, { timeout: 120000 });
        submissionData = response.data;
      } else {
        // Post file content
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        // Do NOT set Content-Type manually — axios must add the multipart boundary
        const response = await api.post('/api/upload', formData, { timeout: 120000 });
        submissionData = response.data;
      }

      if (!submissionData?._id) {
        throw new Error('Upload succeeded but the server returned an invalid response.');
      }

      navigate(`/detection/${submissionData._id}`, {
        state: {
          aiDetection: submissionData.aiDetection,
          fileName: submissionData.fileName
        }
      });

    } catch (err) {
      console.error('❌ Upload or session start failed:', err);
      const data = err.response?.data;
      let errMsg = typeof data === 'object' ? data?.error : typeof data === 'string' ? data : null;

      if (!errMsg) {
        if (err.code === 'ECONNABORTED') {
          errMsg = 'Request timed out during upload or AI detection. Please try again.';
        } else if (err.response?.status === 503) {
          errMsg = data?.error || 'Groq API key required. Add GROQ_API_KEY to server/.env (get one free at console.groq.com).';
        } else if (err.code === 'ERR_NETWORK' || !err.response) {
          errMsg = 'Cannot reach the API server. Start the backend (cd server && npm run dev) on port 5001.';
        } else if (err.response?.status === 403) {
          errMsg = 'Request blocked (403). On Mac, avoid port 5000 — use PORT=5001 in server/.env and restart both servers.';
        } else if (err.message) {
          errMsg = err.message;
        } else {
          errMsg = `Submission failed (HTTP ${err.response?.status || 'unknown'}). Please try again.`;
        }
      }

      setError(errMsg);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-start sm:items-center justify-center p-3 sm:p-6 md:p-10 max-w-4xl mx-auto w-full">
      <div className="w-full glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden animate-slide-up">
        
        {/* Glow behind logo */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Title / Description */}
        <div className="mb-8 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono text-accent-blue bg-blue-500/10 border border-blue-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Integrity Verification System
          </div>
          <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white">
            Evaluate Authenticity
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Upload student work or paste source code/text to generate a custom, adaptive oral viva session.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleUpload} className="space-y-6">
          
          {user && (
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 px-4 py-3 text-sm">
              <p className="text-slate-500 text-xs uppercase tracking-wider">Submitting as</p>
              <p className="text-white font-medium mt-0.5">{user.fullName}</p>
              <p className="text-slate-400 text-xs font-mono">{user.studentId}</p>
            </div>
          )}

          {/* Toggle File vs Paste Text */}
          <div className="flex flex-wrap justify-stretch sm:justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setPasteMode(false);
                setError('');
              }}
              className={`tap-target flex-1 sm:flex-none px-3 py-2.5 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-all ${
                !pasteMode
                  ? 'border-accent-blue/30 bg-blue-600/10 text-accent-blue'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => {
                setPasteMode(true);
                setError('');
              }}
              className={`tap-target flex-1 sm:flex-none px-3 py-2.5 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-all ${
                pasteMode
                  ? 'border-accent-blue/30 bg-blue-600/10 text-accent-blue'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clipboard className="w-3.5 h-3.5" />
              Paste Text
            </button>
          </div>

          {/* Input Area */}
          <div className="relative min-h-[160px] flex items-stretch">
            {pasteMode ? (
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste code or report text here..."
                disabled={isLoading}
                rows={8}
                className="w-full p-4 rounded-2xl border border-slate-700 bg-slate-900/50 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue font-mono text-sm leading-relaxed transition-all resize-y"
              />
            ) : (
              <FileDropzone
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
                onClearFile={() => setSelectedFile(null)}
              />
            )}
          </div>

          {error && (
            <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-950/15 text-red-400 text-xs flex items-center gap-2.5 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action button */}
          <div className="pt-2">
            <button
              id="submit-eval-btn"
              type="submit"
              disabled={isLoading}
              className={`tap-target w-full py-4 px-4 rounded-xl font-semibold text-white text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 border border-blue-500/30 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-900/20 cursor-pointer ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Uploading & Running AI Detection...</span>
                </>
              ) : (
                <>
                  <span>Begin Integrity Assessment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default Upload;
