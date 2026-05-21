import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock } from 'lucide-react';

export default function StudentLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/student/login', { email, password });
      login({ ...data.student, role: 'student' }, data.token);
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg-dark text-slate-100 flex items-center justify-center p-4 sm:p-6 safe-top safe-bottom">
      <div className="w-full max-w-md glass-panel rounded-2xl p-6 sm:p-8 animate-slide-up">
        <h1 className="text-2xl font-bold text-white">Student Login</h1>
        <p className="text-slate-400 text-sm mt-1">Access your viva sessions and history</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-900/50 text-white text-base"
                placeholder="you@university.edu"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-900/50 text-white text-base"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="tap-target w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          No account?{' '}
          <Link to="/student/register" className="text-blue-400 hover:underline">
            Register
          </Link>
        </p>
        <p className="text-center text-xs text-slate-500 mt-3">
          <Link to="/" className="hover:text-slate-300">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
