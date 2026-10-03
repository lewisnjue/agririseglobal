import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin/dashboard';

  useEffect(() => {
    authApi
      .getSetupStatus()
      .then((data) => setSetupComplete(Boolean(data?.isSetup)))
      .catch(() => setSetupComplete(true));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error details:', err);
      const errorMessage = err.error || err.message || 'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {location.state?.message && (
          <p className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{location.state.message}</p>
        )}
        <h1 className="text-2xl font-bold text-slate-800 mb-6 text-center">Login</h1>
        <p className="text-slate-500 text-sm text-center mb-4">Administrators and authorized users can log in to create posts.</p>
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 border border-slate-200">
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-slate-800 text-white rounded font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {!setupComplete && (
          <p className="mt-4 text-center text-sm text-slate-500">
            No account yet? <Link to="/admin/register" className="text-blue-600 hover:underline">Create owner account</Link>
          </p>
        )}
        <p className="mt-2 text-center text-sm text-slate-500">
          <Link to="/">← Back to home</Link>
        </p>
      </div>
    </main>
  );
}
