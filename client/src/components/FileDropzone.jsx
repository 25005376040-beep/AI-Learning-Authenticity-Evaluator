import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, AlertCircle } from 'lucide-react';

function FileDropzone({ onFileSelect, selectedFile, onClearFile }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const allowedExtensions = ['.pdf', '.txt', '.js', '.jsx', '.py', '.cpp', '.h', '.java', '.ts', '.tsx', '.html', '.css', '.json'];

  const validateFile = (file) => {
    if (!file) return false;
    const name = file.name.toLowerCase();
    const matchesExt = allowedExtensions.some(ext => name.endsWith(ext));
    
    if (!matchesExt) {
      setError(`Unsupported file type. Allowed files: PDF, TXT, code files (JS, PY, CPP, JAVA, etc.)`);
      return false;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size exceeds the 10MB limit.');
      return false;
    }

    setError('');
    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        onFileSelect(droppedFile);
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (validateFile(selected)) {
        onFileSelect(selected);
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={`tap-target w-full py-8 sm:py-10 px-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            isDragActive
              ? 'border-accent-blue bg-blue-950/20 shadow-lg scale-[1.01]'
              : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/10'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.txt,.js,.jsx,.py,.cpp,.h,.java,.ts,.tsx,.html,.css,.json"
            onChange={handleChange}
          />
          <div className="p-4 rounded-full bg-slate-900 border border-slate-800 mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-accent-blue" />
          </div>
          <p className="text-sm font-semibold text-white text-center">
            Drag & drop your file here, or <span className="text-accent-blue hover:underline">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Supports PDF, TXT, and most code file types (.py, .js, .cpp, .java, etc.) up to 10MB
          </p>
        </div>
      ) : (
        <div className="w-full p-4 rounded-2xl border border-slate-700 bg-slate-900/60 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-accent-blue">
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate max-w-[250px] sm:max-w-md">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClearFile();
            }}
            className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-600 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default FileDropzone;
