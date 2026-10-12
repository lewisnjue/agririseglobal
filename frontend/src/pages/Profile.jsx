import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi, uploadApi } from '../services/api';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    profile_image: user?.profile_image || '',
    bio: user?.bio || '',
    location: user?.location || '',
    job_title: user?.job_title || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadApi.image(file);
      update('profile_image', result.url);
    } catch (err) {
      setError(err.error || 'Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await authApi.updateProfile(form);
      await refreshUser();
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err.error || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <p className="text-emerald-600 text-sm font-semibold uppercase tracking-widest">Your profile</p>
        <h1 className="text-3xl font-bold text-slate-800 mt-2">Tell readers who you are</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {message && <p className="text-emerald-700 text-sm">{message}</p>}
        <div className="flex items-center gap-5">
          {form.profile_image ? <img src={form.profile_image} alt="Profile" className="w-20 h-20 rounded-full object-cover border-4 border-emerald-50" /> : <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><svg className="w-9 h-9" viewBox="0 0 24 24" fill="currentColor" aria-label="Profile placeholder"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5Z" /></svg></div>}
          <div>
            <label className="inline-block px-4 py-2 bg-slate-100 text-slate-700 rounded-lg cursor-pointer hover:bg-slate-200 text-sm font-medium">
              {uploading ? 'Uploading...' : 'Choose profile image'}
              <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} className="hidden" />
            </label>
            <p className="text-xs text-slate-500 mt-2">A clear portrait helps readers recognize your work.</p>
          </div>
        </div>
        <label className="block"><span className="block text-sm font-medium text-slate-700 mb-1">Name</span><input value={form.name} onChange={(event) => update('name', event.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></label>
        <label className="block"><span className="block text-sm font-medium text-slate-700 mb-1">Job title</span><input value={form.job_title} onChange={(event) => update('job_title', event.target.value)} placeholder="e.g. Agricultural researcher" className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></label>
        <label className="block"><span className="block text-sm font-medium text-slate-700 mb-1">Location</span><input value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="e.g. Nairobi, Kenya" className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></label>
        <label className="block"><span className="block text-sm font-medium text-slate-700 mb-1">About you</span><textarea value={form.bio} onChange={(event) => update('bio', event.target.value)} rows="5" placeholder="Share a little about your work and interests." className="w-full px-3 py-2 border border-slate-300 rounded-lg" /></label>
        <button type="submit" disabled={saving || uploading} className="px-5 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save profile'}</button>
      </form>
    </main>
  );
}
