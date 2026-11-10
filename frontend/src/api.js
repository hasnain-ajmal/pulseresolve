import { mockStore } from './mockData';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// In-memory token store + sessionStorage synchronization
let memoryToken = sessionStorage.getItem('pulseresolve_token') || null;
let currentUser = null;
try {
  const cachedUser = sessionStorage.getItem('pulseresolve_user');
  if (cachedUser) currentUser = JSON.parse(cachedUser);
} catch (e) {
  currentUser = null;
}

// The in-browser mock engine exists only for offline development (VITE_ALLOW_MOCK=true).
// Production builds always talk to the real API: never silently fall back to fake data or accept any login.
export const MOCK_ALLOWED = import.meta.env.VITE_ALLOW_MOCK === 'true';
let useLiveApi = !MOCK_ALLOWED;
let apiHealthChecked = false;

export function getToken() {
  return memoryToken;
}

export function getCurrentUser() {
  return currentUser;
}

export function setAuth(token, user) {
  memoryToken = token;
  currentUser = user;
  if (token) {
    sessionStorage.setItem('pulseresolve_token', token);
    sessionStorage.setItem('pulseresolve_user', JSON.stringify(user));
  } else {
    sessionStorage.removeItem('pulseresolve_token');
    sessionStorage.removeItem('pulseresolve_user');
  }
}

export function clearAuth() {
  setAuth(null, null);
}

export function isMockMode() {
  return !useLiveApi;
}

export function setApiMode(live) {
  if (!MOCK_ALLOWED) return;
  useLiveApi = live;
}

// Test backend health
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    // A free-tier host can take about a minute to wake up, so wait much longer than in dev.
    const timeoutId = setTimeout(() => controller.abort(), MOCK_ALLOWED ? 2000 : 75000);
    const res = await fetch(`${BASE_URL}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      useLiveApi = true;
      apiHealthChecked = true;
      return { live: true, status: 'Connected to live backend' };
    }
  } catch (err) {
    // Backend not reachable
  }
  apiHealthChecked = true;
  if (!MOCK_ALLOWED) {
    useLiveApi = true;
    return { live: true, status: 'Backend not responding yet. It may be waking up, please retry in a minute.' };
  }
  useLiveApi = false;
  return { live: false, status: 'Using local mock data engine' };
}

// Core HTTP wrapper
async function request(endpoint, options = {}) {
  const isMultipart = options.body instanceof FormData;
  const headers = {
    ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  if (memoryToken) {
    headers['Authorization'] = `Bearer ${memoryToken}`;
  }

  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401 && endpoint === '/auth/login') {
      // Wrong credentials, not an expired session: show the server's real message.
      const body = await response.json().catch(() => ({}));
      const err = new Error(body.message || 'Invalid username or password.');
      err.code = 'unauthorized';
      throw err;
    }

    if (response.status === 401) {
      clearAuth();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
      const err = new Error("Session expired. Please log in again.");
      err.code = "unauthorized";
      throw err;
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '30';
      const err = new Error(`Too many submissions, try again in ${retryAfter} seconds`);
      err.code = "rate_limited";
      err.retryAfter = retryAfter;
      throw err;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data.message || `Request failed with status ${response.status}`);
      err.code = data.code || 'error';
      err.status = response.status;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error("Request timed out. Please check your connection.");
      e.code = "timeout";
      throw e;
    }
    // Network offline / connection refused
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      const e = new Error("Unable to reach backend server. Please verify backend is running.");
      e.code = "network_error";
      throw e;
    }
    throw err;
  }
}

// Unified API surface matching Section 6 exactly
export const api = {
  // Check health
  async checkHealth() {
    return checkBackendHealth();
  },

  // Auth
  async login(username, password) {
    if (useLiveApi) {
      try {
        const data = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        setAuth(data.access_token, data.user);
        return data;
      } catch (err) {
        throw err;
      }
    } else {
      // Mock auth simulation (allows demo login with any staff credential or admin/admin)
      await new Promise(r => setTimeout(r, 400));
      if (!username || !password) {
        const err = new Error("Username and password are required");
        err.code = "validation_error";
        throw err;
      }
      const user = { username, role: 'staff' };
      const token = `mock_jwt_token_${Date.now()}`;
      setAuth(token, user);
      return { access_token: token, user };
    }
  },

  async getMe() {
    if (useLiveApi) {
      return request('/auth/me');
    }
    if (!memoryToken) {
      const err = new Error("Unauthorized");
      err.code = "unauthorized";
      throw err;
    }
    return currentUser || { username: 'staff_user', role: 'staff' };
  },

  // Complaints
  async submitComplaint(data) {
    if (useLiveApi) {
      return request('/complaints', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } else {
      // Simulated AI processing time (0.6s)
      await new Promise(r => setTimeout(r, 650));
      return mockStore.submitComplaint(data);
    }
  },

  async getComplaints(params = {}) {
    if (useLiveApi) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      return request(`/complaints?${query.toString()}`);
    } else {
      await new Promise(r => setTimeout(r, 200));
      return mockStore.getComplaints(params);
    }
  },

  async getComplaint(id) {
    if (useLiveApi) {
      return request(`/complaints/${id}`);
    } else {
      await new Promise(r => setTimeout(r, 150));
      return mockStore.getComplaint(id);
    }
  },

  // Standalone complaints (not in any incident) are handled directly. Live API only.
  async assignComplaint(id, assigned_team, due_in_minutes) {
    return request(`/complaints/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assigned_team, due_in_minutes: due_in_minutes || undefined }),
    });
  },

  // Overdue and due-soon work (incidents and standalone complaints). Live API only.
  async getAlerts() {
    return request('/alerts');
  },

  async resolveComplaint(id, resolution_note) {
    return request(`/complaints/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolution_note }) });
  },

  async reopenComplaint(id, note = 'Reopened') {
    return request(`/complaints/${id}/reopen`, { method: 'POST', body: JSON.stringify({ note }) });
  },

  async importCsv(file) {
    if (useLiveApi) {
      const formData = new FormData();
      formData.append('file', file);
      return request('/complaints/import', {
        method: 'POST',
        body: formData
      });
    } else {
      await new Promise(r => setTimeout(r, 800));
      // Parse CSV in browser for mock demo
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        return { imported: 0, failed: 0, errors: [{ row: 1, message: "File contains no data rows" }] };
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.indexOf('customer_name');
      const contactIdx = headers.indexOf('customer_contact');
      const textIdx = headers.indexOf('text');

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        rows.push({
          customer_name: nameIdx !== -1 ? cols[nameIdx] : cols[0],
          customer_contact: contactIdx !== -1 ? cols[contactIdx] : cols[1],
          text: textIdx !== -1 ? cols[textIdx] : cols[2]
        });
      }
      return mockStore.importCsv(rows);
    }
  },

  // Incidents
  async getIncidents(params = {}) {
    if (useLiveApi) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, v);
      });
      return request(`/incidents?${query.toString()}`);
    } else {
      await new Promise(r => setTimeout(r, 200));
      return mockStore.getIncidents(params);
    }
  },

  async getIncidentDetail(id) {
    if (useLiveApi) {
      return request(`/incidents/${id}`);
    } else {
      await new Promise(r => setTimeout(r, 250));
      return mockStore.getIncidentDetail(id);
    }
  },

  async approveIncident(id, { assigned_team, priority, due_in_minutes } = {}) {
    if (useLiveApi) {
      return request(`/incidents/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ assigned_team, priority, due_in_minutes })
      });
    } else {
      await new Promise(r => setTimeout(r, 350));
      return mockStore.approveIncident(id, { assigned_team, priority });
    }
  },

  async rejectIncident(id, { reason }) {
    if (useLiveApi) {
      return request(`/incidents/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
    } else {
      await new Promise(r => setTimeout(r, 350));
      return mockStore.rejectIncident(id, { reason });
    }
  },

  async updateIncident(id, data) {
    if (useLiveApi) {
      return request(`/incidents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    } else {
      await new Promise(r => setTimeout(r, 300));
      return mockStore.updateIncident(id, data);
    }
  },

  async resolveIncident(id, { resolution_note }) {
    if (useLiveApi) {
      return request(`/incidents/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution_note })
      });
    } else {
      await new Promise(r => setTimeout(r, 400));
      return mockStore.resolveIncident(id, { resolution_note });
    }
  },

  async reopenIncident(id, { note }) {
    if (useLiveApi) {
      return request(`/incidents/${id}/reopen`, {
        method: 'POST',
        body: JSON.stringify({ note })
      });
    } else {
      await new Promise(r => setTimeout(r, 400));
      return mockStore.reopenIncident(id, { note });
    }
  },

  // Dashboard stats
  async getDashboardStats() {
    if (useLiveApi) {
      return request('/dashboard/stats');
    } else {
      await new Promise(r => setTimeout(r, 250));
      return mockStore.getDashboardStats();
    }
  },

  // Correlation graph
  async getIncidentsGraph() {
    if (useLiveApi) {
      return request('/incidents/graph');
    } else {
      await new Promise(r => setTimeout(r, 200));
      return mockStore.getGraphData();
    }
  }
};

export default api;
