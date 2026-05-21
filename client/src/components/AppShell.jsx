import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

/**
 * Mobile-first app shell: drawer sidebar on small screens, fixed sidebar on lg+.
 * Optional bottom navigation for thumb-friendly primary actions.
 */
export default function AppShell({ sidebar, bottomNav = [], children, variant = 'student' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const accent = variant === 'teacher' ? 'text-amber-400' : 'text-blue-400';

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-bg-dark text-slate-100 relative overflow-hidden bg-grid">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md safe-top">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="tap-target p-2 -ml-1 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <p className={`font-bold text-sm truncate ${accent}`}>
          {variant === 'teacher' ? 'Faculty Portal' : 'AuthentiViva'}
        </p>
        <ThemeToggle />
      </header>

      {/* Drawer overlay */}
      {menuOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar: drawer on mobile, column on desktop */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-[60] h-full w-[min(280px,85vw)] transform transition-transform duration-300 ease-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col bg-slate-950 border-r border-slate-800 shadow-2xl safe-top safe-bottom">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Menu</span>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="tap-target p-2 rounded-lg text-slate-400 hover:bg-slate-800"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto" onClick={() => setMenuOpen(false)}>
            {sidebar}
          </div>
        </div>
      </div>

      <aside className="hidden lg:flex lg:shrink-0 lg:w-64 lg:flex-col lg:min-h-[100dvh] lg:border-r lg:border-slate-800">
        {sidebar}
      </aside>

      <main className="flex-1 flex flex-col z-10 min-h-0 overflow-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      {bottomNav.length > 0 && (
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md safe-bottom"
          aria-label="Main navigation"
        >
          <div className="flex items-stretch justify-around px-2 pt-2 pb-1">
            {bottomNav.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`tap-target flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl text-[10px] font-medium transition-colors max-w-[120px] ${
                    active ? `${accent} bg-slate-800/80` : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="truncate w-full text-center">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
