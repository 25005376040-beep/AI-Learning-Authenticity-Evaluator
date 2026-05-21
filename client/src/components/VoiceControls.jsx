import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceControls({ onTranscript, questionText, language = 'en' }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  const langMap = { en: 'en-US', ur: 'ur-PK', hi: 'hi-IN' };

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = langMap[language] || 'en-US';
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      onTranscript(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
  }, [language, onTranscript]);

  const toggleListen = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const speakQuestion = () => {
    if (!questionText || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(questionText);
    u.lang = langMap[language] || 'en-US';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

  if (!supported) {
    return (
      <p className="text-[10px] text-slate-500">Voice input not supported in this browser. Type your answer.</p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleListen}
        className={`tap-target flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border ${
          listening
            ? 'border-red-500/40 bg-red-950/30 text-red-300 animate-pulse'
            : 'border-slate-700 text-slate-400 hover:bg-slate-800'
        }`}
      >
        {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        {listening ? 'Stop' : 'Voice'}
      </button>
      <button
        type="button"
        onClick={speakQuestion}
        disabled={!questionText}
        className="tap-target flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-40"
      >
        <Volume2 className="w-3.5 h-3.5" /> Listen
      </button>
    </div>
  );
}
