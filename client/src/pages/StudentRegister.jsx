import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';

export default function StudentRegister() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/student/register', {
        fullName: form.fullName,
        email: form.email,
        password: form.password
      });
      login({ ...data.student, role: 'student' }, data.token);
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-bg-dark text-slate-100 flex items-center justify-center p-4 sm:p-6 safe-top safe-bottom">
      <div className="w-full max-w-md glass-panel rounded-2xl p-6 sm:p-8 animate-slide-up max-h-[95dvh] overflow-y-auto">
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
        <p className="text-slate-400 text-sm mt-1">Register as a student</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {['fullName', 'email', 'password', 'confirm'].map((field) => (
            <div key={field}>
              <label className="text-xs text-slate-400 uppercase tracking-wider">
                {field === 'confirm' ? 'Confirm Password' : field.replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                type={field.includes('password') || field === 'confirm' ? 'password' : field === 'email' ? 'email' : 'text'}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required
                className="w-full mt-1 px-4 py-3 rounded-xl border border-slate-700 bg-slate-900/50 text-white text-base"
              />
            </div>
          ))}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Have an account?{' '}
          <Link to="/student/login" className="text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
