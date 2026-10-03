import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

export default function CreateUser() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const randomValues = new Uint32Array(12);
    const hasSecureRandom = typeof crypto !== 'undefined' && crypto.getRandomValues;

    if (hasSecureRandom) {
      crypto.getRandomValues(randomValues);
    } else {
      for (let i = 0; i < randomValues.length; i += 1) {
        randomValues[i] = Math.floor(Math.random() * 4294967295);
      }
    }

    const pwd = Array.from(randomValues, (value) => chars[value % chars.length]).join('');
    setPassword(pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setLoading(true);
    try {
      const data = await authApi.createUser({
        email,
        password: password || undefined,
        name,
      });
      setSuccess({
        message: 'User account created successfully!',
        credentials: data.credentials,
      });
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.error || err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Create User Account</h1>
      <p className="text-slate-600 mb-6">
        Create an account for a user who can write blog posts. Send them the login credentials after creation.
      </p>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium mb-2">{success.message}</p>
          <div className="bg-white p-3 rounded border border-green-200">
            <p className="text-sm text-slate-600 mb-2">Send these credentials to the user:</p>
            <div className="space-y-1 font-mono text-sm">
              <p><strong>Email:</strong> {success.credentials.email}</p>
              <p><strong>Password:</strong> {success.credentials.password}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const text = `Email: ${success.credentials.email}\nPassword: ${success.credentials.password}`;
                navigator.clipboard.writeText(text);
                alert('Credentials copied to clipboard!');
              }}
              className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Copy Credentials
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 border border-slate-200">
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
          />
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <button
              type="button"
              onClick={generatePassword}
              className="text-sm text-blue-600 hover:underline"
            >
              Generate secure password
            </button>
          </div>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave empty to generate"
            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 font-mono"
          />
          <p className="text-xs text-slate-500 mt-1">Leave empty to auto-generate a secure password</p>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-slate-800 text-white rounded font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create User Account'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2 bg-slate-200 text-slate-800 rounded font-medium hover:bg-slate-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
