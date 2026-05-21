import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Upload, LogOut, ShieldCheck, FileText } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export default function StudentSidebar({ className = '' }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const handleLogout = () => {
    logout();
    navigate('/student/login');
  };

  const nav = [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/exams', label: 'My Exams', icon: FileText, badge: unreadCount },
    { to: '/upload', label: 'New Viva', icon: Upload },
  ];

  return (
    <aside className={`w-full lg:w-64 shrink-0 bg-slate-950/80 lg:border-r lg:border-slate-800 p-5 flex flex-col min-h-0 lg:min-h-[100dvh] ${className}`}>
      <div className="hidden lg:flex items-center gap-2 mb-8">
        <ShieldCheck className="w-6 h-6 text-blue-400" />
        <div>
          <p className="font-bold text-white text-sm">AuthentiViva</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Student</p>
        </div>
      </div>

      <nav className="space-y-1 flex-1">
        {nav.map(({ to, label, icon: Icon, badge }) => (
          <Link
            key={to}
            to={to}
            className={`tap-target flex items-center gap-2.5 px-3 py-3 rounded-lg text-sm transition-colors ${
              location.pathname === to ||
              (to === '/student/exams' && location.pathname.startsWith('/student/exams')) ||
              (to === '/upload' && location.pathname.startsWith('/detection'))
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="pt-4 mt-4 border-t border-slate-800">
        <p className="text-xs text-slate-500 mb-1">Signed in as</p>
        <p className="text-sm text-white font-medium truncate">{user?.fullName}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="tap-target mt-3 w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-xs text-slate-400 border border-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export const studentBottomNav = [
  { to: '/student/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/student/exams', label: 'Exams', icon: FileText },
  { to: '/upload', label: 'Viva', icon: Upload },
];
