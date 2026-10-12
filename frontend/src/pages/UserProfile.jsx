import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authApi } from '../services/api';

export default function UserProfile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi.getProfile(id).then((result) => setUser(result.user)).catch((err) => setError(err.error || 'Profile not found'));
  }, [id]);

  if (error) return <main className="max-w-3xl mx-auto px-4 py-12 text-red-600">{error}</main>;
  if (!user) return <main className="max-w-3xl mx-auto px-4 py-12 text-slate-500">Loading profile...</main>;

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        {user.profile_image ? <img src={user.profile_image} alt={user.name} className="w-28 h-28 rounded-full object-cover mx-auto border-4 border-emerald-50" /> : <div className="w-28 h-28 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto"><svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor" aria-label="Profile placeholder"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5Z" /></svg></div>}
        <p className="text-emerald-600 text-sm font-semibold uppercase tracking-widest mt-6">{user.job_title || 'Article author'}</p>
        <h1 className="text-3xl font-bold text-slate-800 mt-2">{user.name}</h1>
        {user.location && <p className="text-slate-500 mt-2">{user.location}</p>}
        <p className="text-slate-600 mt-6 max-w-xl mx-auto whitespace-pre-line">{user.bio || 'This author has not added a biography yet.'}</p>
        <Link to="/blog" className="inline-block mt-8 text-emerald-700 font-medium hover:underline">Browse articles</Link>
      </section>
    </main>
  );
}
