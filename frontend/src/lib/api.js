import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
});

// Add auth token to requests
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
  applyPreset: (preset) => api.post('/agents/preset', { preset }),
};

// Setup readiness
export const setupAPI = {
  readiness: () => api.get('/setup/readiness'),
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

// Community
export const communityAPI = {
  dashboard: () => api.get('/community/dashboard'),
  profile: () => api.get('/community/profile'),
  saveOnboarding: (data) => api.post('/community/onboarding', data),
  listFeed: (skip = 0, limit = 20) => api.get('/community/feed', { params: { skip, limit } }),
  createPost: (data) => api.post('/community/feed', data),
  deletePost: (postId) => api.delete(`/community/feed/${postId}`),
  toggleLike: (postId) => api.post(`/community/feed/${postId}/like`),
  getComments: (postId) => api.get(`/community/feed/${postId}/comments`),
  addComment: (postId, content) => api.post(`/community/feed/${postId}/comments`, { content }),
  deleteComment: (commentId) => api.delete(`/community/feed/comments/${commentId}`),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/community/feed/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  listBanners: () => api.get('/community/banners'),
  listAllBanners: () => api.get('/community/banners/all'),
  createBanner: (data) => api.post('/community/banners', data),
  updateBanner: (id, data) => api.put(`/community/banners/${id}`, data),
  deleteBanner: (id) => api.delete(`/community/banners/${id}`),
  listEvents: () => api.get('/community/events'),
};

// Admin
export const adminAPI = {
  listUsers: () => api.get('/admin/users'),
  changeRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
  toggleSuspend: (userId) => api.put(`/admin/users/${userId}/suspend`),
  removeContent: (userId) => api.delete(`/admin/users/${userId}/content`),
};

// Inbox (School Operations)
export const inboxAPI = {
  listThreads: (view = 'all', category = '', status = '') => api.get('/inbox/threads', { params: { view, category, status } }),
  getThread: (threadId) => api.get(`/inbox/threads/${threadId}`),
  importThread: (data) => api.post('/inbox/threads/import', data),
  updateStatus: (threadId, status) => api.put(`/inbox/threads/${threadId}/status`, { status }),
  assignThread: (threadId, assignedTo) => api.put(`/inbox/threads/${threadId}/assign`, { assigned_to: assignedTo }),
  archiveThread: (threadId) => api.post(`/inbox/threads/${threadId}/archive`),
  generateDraft: (threadId, templateId = '') => api.post(`/inbox/threads/${threadId}/draft/generate`, { template_id: templateId }),
  updateDraft: (threadId, data) => api.put(`/inbox/threads/${threadId}/draft`, data),
  submitDraft: (threadId) => api.post(`/inbox/threads/${threadId}/draft/submit`),
  approveDraft: (threadId) => api.post(`/inbox/threads/${threadId}/draft/approve`),
  listRules: () => api.get('/inbox/rules'),
  createRule: (data) => api.post('/inbox/rules', data),
  updateRule: (ruleId, data) => api.put(`/inbox/rules/${ruleId}`, data),
  deleteRule: (ruleId) => api.delete(`/inbox/rules/${ruleId}`),
  listTemplates: () => api.get('/inbox/templates'),
  createTemplate: (data) => api.post('/inbox/templates', data),
  updateTemplate: (templateId, data) => api.put(`/inbox/templates/${templateId}`, data),
  deleteTemplate: (templateId) => api.delete(`/inbox/templates/${templateId}`),
  gmailStatus: () => api.get('/inbox/gmail-status'),
};

// School (Programs, Cohorts, Materials, Journey, Assistant)
export const schoolAPI = {
  listPrograms: () => api.get('/school/programs'),
  createProgram: (data) => api.post('/school/programs', data),
  updateProgram: (id, data) => api.put(`/school/programs/${id}`, data),
  deleteProgram: (id) => api.delete(`/school/programs/${id}`),
  listCohorts: () => api.get('/school/cohorts'),
  createCohort: (data) => api.post('/school/cohorts', data),
  updateCohort: (id, data) => api.put(`/school/cohorts/${id}`, data),
  deleteCohort: (id) => api.delete(`/school/cohorts/${id}`),
  listMembers: (cohortId) => api.get(`/school/cohorts/${cohortId}/members`),
  addMember: (cohortId, userId, role = 'student') => api.post(`/school/cohorts/${cohortId}/members`, { user_id: userId, role_in_cohort: role }),
  removeMember: (cohortId, userId) => api.delete(`/school/cohorts/${cohortId}/members/${userId}`),
  listMaterials: () => api.get('/school/materials'),
  uploadMaterial: (file, cohortId, title, description) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('cohort_id', cohortId);
    fd.append('title', title);
    fd.append('description', description);
    return api.post('/school/materials/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteMaterial: (id) => api.delete(`/school/materials/${id}`),
  getJourneyTemplates: () => api.get('/school/journey/templates'),
  getJourneyProgress: () => api.get('/school/journey/progress'),
  updateStepProgress: (stepId, data) => api.put(`/school/journey/progress/${stepId}`, data),
  assistantQuery: (question) => api.post('/school/assistant/query', { question }),
};

export default api;
