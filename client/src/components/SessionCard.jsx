import { Link } from 'react-router-dom';
import { ChevronRight, Trash2 } from 'lucide-react';

export default function SessionCard({
  assignmentTitle,
  overallScore,
  depthRating,
  completedAt,
  resultLink,
  scoreColor,
  onRemove
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-3">
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-white font-medium text-sm leading-snug line-clamp-2">{assignmentTitle}</p>
          <p className="text-xs text-slate-500 mt-1">
            {completedAt ? new Date(completedAt).toLocaleDateString() : '—'}
          </p>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="tap-target shrink-0 p-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-950/40 transition-colors"
            title="Remove from your history"
            aria-label="Remove from history"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-4 text-sm">
          <div>
            <p className="text-[10px] uppercase text-slate-500">Score</p>
            <p className={`font-mono font-bold ${scoreColor(overallScore)}`}>{overallScore ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Depth</p>
            <p className="text-slate-300">{depthRating || '—'}</p>
          </div>
        </div>
        <Link
          to={resultLink}
          className="tap-target shrink-0 flex items-center gap-1 text-blue-400 text-xs font-semibold px-3 py-2 rounded-lg border border-blue-500/30"
        >
          View <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
