// ─── API WRAPPER ─────────────────────────────────────
const API_BASE = 'https://hospital-management-system-0vdd.onrender.com/api';

const api = {
  _token: null,

  setToken(token) { this._token = token; localStorage.setItem('hms_token', token); },
  getToken() { return this._token || localStorage.getItem('hms_token'); },
  clearToken() { this._token = null; localStorage.removeItem('hms_token'); localStorage.removeItem('hms_user'); },

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);

    const res = await fetch(API_BASE + path, opts);
    if (res.status === 401 || res.status === 403) {
      if (path !== '/auth/login') {
        api.clearToken();
        window.location.hash = '#login';
        App.showLogin();
        return;
      }
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`);
    return data;
  },

  get: (path) => api.request('GET', path),
  post: (path, body) => api.request('POST', path, body),
  put: (path, body) => api.request('PUT', path, body),
  patch: (path, body) => api.request('PATCH', path, body),
  delete: (path) => api.request('DELETE', path),
};
