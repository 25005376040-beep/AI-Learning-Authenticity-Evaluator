import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import ChatBubble from '../components/ChatBubble';
import VoiceControls from '../components/VoiceControls';
import { Send, Terminal, ShieldAlert, BookOpen, Globe } from 'lucide-react';

function Viva() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [language, setLanguage] = useState(location.state?.language || 'en');
  
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [totalQuestions] = useState(5);
  const [answerInput, setAnswerInput] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const chatEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSubmitting]);

  // Load session state on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await api.get(`/api/session/${sessionId}`);
        const data = response.data;

        if (data.language) setLanguage(data.language);

        if (data.status === 'completed') {
          navigate(`/result/${sessionId}`, { replace: true });
          return;
        }

        // Reconstruct message list from history
        const messageHistory = [];
        data.history.forEach((h, idx) => {
          messageHistory.push({
            id: `q-${idx}`,
            sender: 'examiner',
            text: h.question,
            timestamp: new Date()
          });
          messageHistory.push({
            id: `a-${idx}`,
            sender: 'student',
            text: h.answer,
            timestamp: new Date()
          });
        });

        // Add active question
        if (data.question) {
          setCurrentQuestion(data.question);
          setCurrentIdx(data.currentQuestionIndex);
          messageHistory.push({
            id: `q-active`,
            sender: 'examiner',
            text: data.question,
            timestamp: new Date()
          });
        }

        setMessages(messageHistory);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Failed to fetch session state:', err);
        setError('Could not load session. Please make sure the server is running.');
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, navigate]);

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!answerInput.trim() || isSubmitting) return;

    const studentAnswer = answerInput.trim();
    setAnswerInput('');
    setIsSubmitting(true);
    setError('');

    // Append student answer to message list locally
    const updatedMessages = [
      ...messages,
      {
        id: `a-${currentIdx}`,
        sender: 'student',
        text: studentAnswer,
        timestamp: new Date()
      }
    ];
    setMessages(updatedMessages);

    try {
      const response = await api.post('/api/session/answer', {
        sessionId,
        answer: studentAnswer
      });

      const data = response.data;

      if (data.redirect && data.resultUrl) {
        // Session complete! Wait 1.5s for realistic evaluation feel
        setTimeout(() => {
          navigate(data.resultUrl);
        }, 1500);
      } else {
        // Next question
        setCurrentQuestion(data.question);
        setCurrentIdx(data.currentQuestionIndex);
        
        // Append new examiner question
        setMessages(prev => [
          ...prev,
          {
            id: `q-${data.currentQuestionIndex}`,
            sender: 'examiner',
            text: data.question,
            timestamp: new Date()
          }
        ]);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('❌ Failed to submit answer:', err);
      setError(err.response?.data?.error || 'Failed to submit answer. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Progress Bar Percentage
  const progressPercent = Math.min(((currentIdx) / totalQuestions) * 100, 100);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <span className="w-10 h-10 border-4 border-blue-500/20 border-t-accent-blue rounded-full animate-spin" />
        <p className="text-sm font-mono text-slate-400">Initializing academic examiner environment...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-6 min-h-0 h-[calc(100dvh-8.5rem)] sm:h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-4rem)]">
      
      {/* Session Progress Header */}
      <div className="w-full glass-panel rounded-2xl p-4 mb-4 flex flex-col gap-3 shrink-0">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-accent-blue" />
            Viva Progress
            <span className="flex items-center gap-1 text-slate-500 ml-2">
              <Globe className="w-3 h-3" />
              {language === 'ur' ? 'Urdu' : language === 'hi' ? 'Hindi' : 'English'}
            </span>
          </span>
          <span className="text-white font-bold">
            Question {Math.min(currentIdx + 1, totalQuestions)} of {totalQuestions}
          </span>
        </div>
        {/* Progress bar tracks */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-blue rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto pr-2 mb-4 glass-panel rounded-2xl p-4 sm:p-6 flex flex-col">
        <div className="flex-1 flex flex-col justify-start">
          
          {/* Welcome note */}
          <div className="text-center py-4 mb-4 border-b border-slate-800/40">
            <p className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">
              Secured Session • Adaptive AI Viva
            </p>
          </div>

          {messages.map((msg, index) => (
            <ChatBubble
              key={msg.id}
              sender={msg.sender}
              text={msg.text}
              timestamp={msg.timestamp}
              index={index}
            />
          ))}

          {/* Typing / Thinking Indicator */}
          {isSubmitting && (
            <div className="flex gap-3 w-full max-w-[75%] mb-6 self-start mr-auto animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 text-accent-blue flex items-center justify-center shrink-0">
                <Terminal className="w-4.5 h-4.5" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="px-4 py-3 rounded-2xl text-xs bg-[#151c2c] border border-slate-800 text-slate-400 rounded-tl-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce" />
                  <span className="font-mono ml-1">Examiner is evaluating responses...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-3 p-3 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400 text-xs flex items-center gap-2 shrink-0 animate-fade-in">
          <ShieldAlert className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      <VoiceControls
        language={language}
        questionText={currentQuestion}
        onTranscript={(text) => setAnswerInput((prev) => (prev ? `${prev} ${text}` : text))}
      />

      <form onSubmit={handleSubmitAnswer} className="w-full shrink-0 flex gap-2 items-end safe-bottom">
        <textarea
          id="student-answer-input"
          value={answerInput}
          onChange={(e) => setAnswerInput(e.target.value)}
          placeholder={isSubmitting ? "Evaluating previous response..." : "Type your answer..."}
          disabled={isSubmitting}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmitAnswer(e);
            }
          }}
          className="flex-1 p-3.5 rounded-xl border border-slate-700 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all resize-none leading-relaxed font-sans min-h-[48px]"
        />
        <button
          id="submit-answer-btn"
          type="submit"
          disabled={!answerInput.trim() || isSubmitting}
          className={`tap-target shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-600 border border-blue-500/30 text-white hover:bg-blue-500 flex items-center justify-center active:scale-[0.97] transition-all cursor-pointer ${
            (!answerInput.trim() || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-blue-900/25'
          }`}
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
      
      <p className="hidden sm:block text-[10px] text-slate-500 text-center mt-2 font-mono">
        Enter to send · Shift+Enter for new line
      </p>

    </div>
  );
}

export default Viva;
