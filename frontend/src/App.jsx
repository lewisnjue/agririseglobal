import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Blog from './pages/Blog';
import Post from './pages/Post';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import CreateUser from './pages/CreateUser';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import { assetUrl } from './services/api';
import './index.css';

function Layout({ children }) {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    document.querySelector('link[rel="icon"]')?.setAttribute('href', assetUrl('/api/uploads/object/site/icon.jpeg'));
  }, [darkMode]);

  return (
    <div className="site-shell min-h-screen flex flex-col bg-slate-50">
      <Navbar darkMode={darkMode} onToggleTheme={() => setDarkMode((current) => !current)} />
      {children}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/blog" element={<Layout><Blog /></Layout>} />
          <Route path="/blog/:slug" element={<Layout><Post /></Layout>} />
          <Route path="/users/:id" element={<Layout><UserProfile /></Layout>} />
          <Route path="/about" element={<Layout><About /></Layout>} />
          <Route path="/admin/login" element={<Layout><Login /></Layout>} />
          <Route path="/admin/register" element={<Layout><Register /></Layout>} />
          <Route
            path="/admin/dashboard"
            element={
              <Layout>
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/admin/posts/new"
            element={
              <Layout>
                <ProtectedRoute><CreatePost /></ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/admin/posts/:id/edit"
            element={
              <Layout>
                <ProtectedRoute><EditPost /></ProtectedRoute>
              </Layout>
            }
          />
          <Route
            path="/admin/users/new"
            element={
              <Layout>
                <ProtectedAdminRoute><CreateUser /></ProtectedAdminRoute>
              </Layout>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <Layout><ProtectedRoute><Profile /></ProtectedRoute></Layout>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
