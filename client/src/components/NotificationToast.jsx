import { Link } from 'react-router-dom';
import { Bell, X } from 'lucide-react';

export default function NotificationToast({ notification, onDismiss, onRead }) {
  if (!notification) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[100] animate-in slide-in-from-top-2">
      <div className="glass-panel border border-blue-500/40 rounded-xl p-4 shadow-2xl flex gap-3">
        <Bell className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{notification.title}</p>
          <p className="text-xs text-slate-400 mt-1">{notification.message}</p>
          {notification.link && (
            <Link
              to={notification.link}
              onClick={() => {
                onRead?.(notification._id);
                onDismiss?.();
              }}
              className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300"
            >
              View →
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="tap-target text-slate-500 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
