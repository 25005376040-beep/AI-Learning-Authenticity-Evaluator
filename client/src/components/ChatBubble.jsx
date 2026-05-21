import React from 'react';
import { User, Terminal } from 'lucide-react';

function ChatBubble({ sender, text, timestamp, index }) {
  const isExaminer = sender === 'examiner';

  return (
    <div
      className={`flex gap-2 sm:gap-3 w-full max-w-[92%] sm:max-w-[75%] mb-4 sm:mb-6 ${
        isExaminer ? 'self-start mr-auto' : 'self-end ml-auto flex-row-reverse'
      } animate-slide-up`}
      style={{ animationDelay: `${(index || 0) * 0.05}s` }}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
          isExaminer
            ? 'bg-blue-600/10 border-blue-500/20 text-accent-blue'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}
      >
        {isExaminer ? (
          <Terminal className="w-4.5 h-4.5" />
        ) : (
          <User className="w-4.5 h-4.5" />
        )}
      </div>

      {/* Bubble Details */}
      <div className="flex flex-col gap-1 min-w-0">
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isExaminer
              ? 'bg-[#151c2c] border border-slate-800 text-slate-100 rounded-tl-sm'
              : 'bg-[#1b253b] border border-blue-900/30 text-white rounded-tr-sm'
          }`}
        >
          {text}
        </div>
        
        {timestamp && (
          <span
            className={`text-[10px] text-slate-500 font-mono mt-0.5 ${
              isExaminer ? 'text-left' : 'text-right'
            }`}
          >
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}

export default ChatBubble;
