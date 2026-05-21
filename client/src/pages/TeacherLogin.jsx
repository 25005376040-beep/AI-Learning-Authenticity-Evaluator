import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, User, Lock } from 'lucide-react';

export default function TeacherLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/teacher/login', { username, password });
      login({ role: 'teacher', username: data.username }, data.token);
      navigate('/teacher/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#060b18] flex items-center justify-center p-4 sm:p-6 safe-top safe-bottom">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0a1020] p-6 sm:p-8 shadow-2xl animate-slide-up">
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap className="w-10 h-10 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Faculty Login</h1>
            <p className="text-slate-500 text-sm">Teacher dashboard access</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 uppercase">Username</label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="admin"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-700 bg-[#0f1628] text-amber-50 text-base"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase">Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-700 bg-[#0f1628] text-amber-50 text-base"
              />
            </div>
          </div>

          <p className="text-xs text-slate-600">Default: admin / 1234</p>
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="tap-target w-full py-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-[#060b18] font-bold disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Enter Dashboard'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">
          <Link to="/" className="hover:text-slate-400">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
