import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Add JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ariadne_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  exchangeSession: (sessionId) => api.post('/auth/session', { session_id: sessionId }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Social Profiles
export const profilesAPI = {
  list: () => api.get('/social-profiles'),
  create: (data) => api.post('/social-profiles', data),
  update: (id, data) => api.put(`/social-profiles/${id}`, data),
  delete: (id) => api.delete(`/social-profiles/${id}`),
};

// Courses & Events
export const coursesAPI = {
  list: () => api.get('/courses-events'),
  create: (data) => api.post('/courses-events', data),
  update: (id, data) => api.put(`/courses-events/${id}`, data),
  delete: (id) => api.delete(`/courses-events/${id}`),
  clone: (id) => api.post(`/courses-events/${id}/clone`),
};

// Campaigns
export const campaignsAPI = {
  list: () => api.get('/campaigns'),
  get: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`),
};

// Posts
export const postsAPI = {
  list: (params = {}) => api.get('/posts', { params }),
  get: (id) => api.get(`/posts/${id}`),
  create: (data) => api.post('/posts', data),
  update: (id, data) => api.put(`/posts/${id}`, data),
  delete: (id) => api.delete(`/posts/${id}`),
  approve: (id) => api.post(`/posts/${id}/approve`),
  batchApprove: (ids) => api.post('/posts/batch-approve', { post_ids: ids }),
  versions: (id) => api.get(`/posts/${id}/versions`),
  regenerate: (id, agents) => api.post(`/posts/${id}/regenerate`, { active_agents: agents }),
  addComment: (id, text) => api.post(`/posts/${id}/comment`, { text }),
  getComments: (id) => api.get(`/posts/${id}/comments`),
};

// Planning Rules
export const rulesAPI = {
  list: () => api.get('/planning-rules'),
  create: (data) => api.post('/planning-rules', data),
  update: (id, data) => api.put(`/planning-rules/${id}`, data),
  delete: (id) => api.delete(`/planning-rules/${id}`),
};

// Templates
export const templatesAPI = {
  list: () => api.get('/templates'),
  create: (data) => api.post('/templates', data),
  delete: (id) => api.delete(`/templates/${id}`),
};

// Repository
export const repoAPI = {
  files: (category = '') => api.get('/repository/files', { params: { category } }),
  upload: (file, category) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    return api.post('/repository/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteFile: (id) => api.delete(`/repository/files/${id}`),
  categories: () => api.get('/repository/categories'),
  context: () => api.get('/repository/context'),
};

// Agents
export const agentsAPI = {
  list: () => api.get('/agents'),
  toggle: (id, active) => api.put(`/agents/${id}`, { active }),
};

// Generation
export const generateAPI = {
  plan: (campaignId, agents) => api.post('/generate/plan', { campaign_id: campaignId, active_agents: agents }),
  texts: (campaignId, postIds, agents) => api.post('/generate/texts', { campaign_id: campaignId, post_ids: postIds, active_agents: agents }),
};

// Export
export const exportAPI = {
  csvUrl: (campaignId) => `${API_BASE}/export/csv/${campaignId}`,
  jsonUrl: (campaignId) => `${API_BASE}/export/json/${campaignId}`,
  copyPackUrl: (campaignId) => `${API_BASE}/export/copy-pack/${campaignId}`,
};

// Dashboard
export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  calendar: (month, profileId) => api.get('/dashboard/calendar', { params: { month, profile_id: profileId } }),
};

// Audit
export const auditAPI = {
  logs: (limit = 50) => api.get('/audit-logs', { params: { limit } }),
};

export default api;
