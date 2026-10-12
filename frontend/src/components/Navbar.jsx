import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { assetUrl } from '../services/api';

export default function Navbar({ darkMode, onToggleTheme }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-gradient-to-r from-emerald-700 via-slate-900 to-slate-800 text-white shadow-lg backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="h-9 w-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
              <img src={assetUrl('/api/uploads/object/site/icon.jpeg')} alt="Agri Rise Global" className="h-7 w-auto object-contain" />
            </div>
            <span className="font-semibold text-lg hidden sm:inline tracking-wide">Agri Rise Global</span>
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex gap-4 items-center">
            <Link to="/" className="px-3 py-2 rounded-md hover:bg-white/10 transition-colors">Home</Link>
            <Link to="/blog" className="px-3 py-2 rounded-md hover:bg-white/10 transition-colors">Blog</Link>
            <Link to="/about" className="px-3 py-2 rounded-md hover:bg-white/10 transition-colors">About</Link>
            <button
              type="button"
              onClick={onToggleTheme}
              className="px-3 py-2 rounded-md hover:bg-white/10 transition-colors"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? 'Light' : 'Dark'}
            </button>

            {user ? (
              <>
                <Link to="/admin/dashboard" className="px-3 py-2 rounded-md bg-white/6 hover:bg-white/10 transition-colors">Dashboard</Link>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3 py-2 rounded-md hover:bg-white/10 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              !isAdmin && (
                <Link to="/admin/login" className="px-3 py-2 rounded-md hover:bg-white/10 transition-colors">Login</Link>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-white/10 rounded"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-slate-700">
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/" className="px-2 py-2 hover:bg-slate-800 rounded" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/blog" className="px-2 py-2 hover:bg-slate-800 rounded" onClick={() => setMobileMenuOpen(false)}>Blog</Link>
              <Link to="/about" className="px-2 py-2 hover:bg-slate-800 rounded" onClick={() => setMobileMenuOpen(false)}>About</Link>
              <button
                type="button"
                onClick={() => { onToggleTheme(); setMobileMenuOpen(false); }}
                className="text-left px-2 py-2 hover:bg-slate-800 rounded"
              >
                {darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              </button>
              {user ? (
                <>
                  <Link to="/admin/dashboard" className="px-2 py-2 hover:bg-slate-800 rounded" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-left px-2 py-2 hover:bg-slate-800 rounded"
                  >
                    Logout
                  </button>
                </>
              ) : (
                !isAdmin && (
                  <Link to="/admin/login" className="px-2 py-2 hover:bg-slate-800 rounded" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
