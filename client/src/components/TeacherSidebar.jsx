import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, LogOut, GraduationCap, Sparkles, ClipboardList } from 'lucide-react';

export default function TeacherSidebar({ className = '' }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/teacher/login');
  };

  return (
    <aside className={`w-full lg:w-64 shrink-0 bg-[#0a0f1e] lg:border-r lg:border-slate-800 p-5 flex flex-col min-h-0 lg:min-h-[100dvh] ${className}`}>
      <div className="hidden lg:flex items-center gap-2 mb-8">
        <GraduationCap className="w-6 h-6 text-amber-400" />
        <div>
          <p className="font-bold text-white text-sm">Faculty Portal</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Teacher</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {[
          { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/teacher/exams', label: 'AI Exams', icon: Sparkles },
          { to: '/teacher/exams/submissions', label: 'Submissions', icon: ClipboardList }
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`tap-target flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm transition-colors ${
              location.pathname === to || location.pathname.startsWith(`${to}/`)
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="pt-4 mt-4 border-t border-slate-800">
        <p className="text-xs text-slate-500">Logged in as</p>
        <p className="text-sm text-amber-200 font-mono truncate">{user?.username || 'admin'}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="tap-target mt-3 w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs text-slate-400 border border-slate-700 hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export const teacherBottomNav = [
  { to: '/teacher/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/teacher/exams', label: 'Exams', icon: Sparkles },
  { to: '/teacher/exams/submissions', label: 'Review', icon: ClipboardList },
];
