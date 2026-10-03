const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const STORAGE_BASE = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');
const SHARE_BASE = (import.meta.env.VITE_SHARE_BASE_URL || API_BASE).replace(/\/$/, '');
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 3000, 7000, 12000, 20000];

export const assetUrl = (path) => {
  if (!path) return path;
  const value = String(path).trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^data:image\//i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;
  const objectPath = '/api/uploads/object/';
  if (STORAGE_BASE && value.startsWith(objectPath)) {
    return `${STORAGE_BASE}/${value.slice(objectPath.length)}`;
  }
  return `${API_BASE}${value}`;
};

export const shareUrl = (slug) => `${SHARE_BASE}/share/${encodeURIComponent(slug)}`;
function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { ...options.headers };
  const token = getToken();
  const method = options.method || 'GET';
  const shouldRetry = options.retry ?? method === 'GET';
  if (token) headers.Authorization = `Bearer ${token}`;
  
  // Set Content-Type for POST/PUT requests with body
  if ((options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH') && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  try {
    const fetchOptions = {
      method,
      headers,
      ...(options.body && { body: options.body }),
    };

    for (let attempt = 0; attempt <= (shouldRetry ? MAX_RETRIES : 0); attempt += 1) {
      try {
        const res = await fetch(url, fetchOptions);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const error = {
            status: res.status,
            error: data.error || data.message || `Server error (${res.status})`,
            message: data.error || data.message || `Server error (${res.status})`,
            ...data,
          };
          if (shouldRetry && [502, 503, 504].includes(res.status) && attempt < MAX_RETRIES) {
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
            continue;
          }
          console.error('API Error:', error);
          if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin/login')) {
            localStorage.removeItem('token');
            window.location.replace('/admin/login');
          }
          throw error;
        }
        return data;
      } catch (err) {
        const isNetworkError = err instanceof TypeError;
        if (shouldRetry && isNetworkError && attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
          continue;
        }
        throw err;
      }
    }
  } catch (err) {
    if (err instanceof TypeError) {
      console.error('Network error:', err);
      const message = 'Cannot connect to the server. It may be waking up; please try again shortly.';
      throw { error: message, message };
    }
    throw err;
  }
}

export const authApi = {
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body), retry: true }),
  me: () => request('/api/auth/me'),
  updateProfile: (body) => request('/api/auth/me', { method: 'PUT', body: JSON.stringify(body) }),
  getProfile: (id) => request(`/api/auth/profile/${id}`),
  getSetupStatus: () => request('/api/auth/setup-status'),
  createUser: (body) => request('/api/auth/users', { method: 'POST', body: JSON.stringify(body) }),
  listUsers: () => request('/api/auth/users'),
  updateUser: (id, body) => request(`/api/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/api/auth/users/${id}`, { method: 'DELETE' }),
};

export const postsApi = {
  list: (page = 1, limit = 10, params = {}) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (params.category) query.append('category', params.category);
    return request(`/api/posts?${query.toString()}`);
  },
  getBySlug: (slug) => request(`/api/posts/slug/${slug}`),
  getAll: () => request('/api/posts/admin/all'),
  getById: (id) => request(`/api/posts/admin/${id}`),
  create: (body) => request('/api/posts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/api/posts/${id}`, { method: 'DELETE' }),
};

export const uploadApi = {
  image: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw data;
    return { url: data.file.url };
  },
};

