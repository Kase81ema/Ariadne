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

// Courses & Events
export const coursesAPI = {
  list: () => api.get('/courses-events'),
  create: (data) => api.post('/courses-events', data),
  update: (id, data) => api.put(`/courses-events/${id}`, data),
  delete: (id) => api.delete(`/courses-events/${id}`),
  clone: (id) => api.post(`/courses-events/${id}/clone`),
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
  uploadRepositoryImage: (file, courseId, tags, title) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', courseId || '');
    formData.append('tags', tags || '');
    formData.append('title', title || '');
    return api.post('/media/repository-images/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
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
  gmailConnect: () => api.get('/inbox/gmail/connect'),
  gmailDisconnect: () => api.get('/inbox/gmail/disconnect'),
  gmailFetch: (count = 20) => api.post('/inbox/gmail/fetch', { count }),
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
  addMember: (cohortId, userId, role = 'student', participationStatus = 'enrolled') => api.post(`/school/cohorts/${cohortId}/members`, { user_id: userId, role_in_cohort: role, participation_status: participationStatus }),
  updateMember: (cohortId, userId, data) => api.put(`/school/cohorts/${cohortId}/members/${userId}`, data),
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
  getCatalog: () => api.get('/school/catalog'),
  listTrainingCourses: () => api.get('/school/training-courses'),
  getTrainingCourseDetail: (courseId) => api.get(`/school/training-courses/${courseId}`),
  getTrainingCourseAdminSummary: (courseId) => api.get(`/school/training-courses/${courseId}/admin-summary`),
  saveTrainingCourseInterest: (courseId, data = {}) => api.post(`/school/training-courses/${courseId}/interest`, data),
  updateTrainingCourseInterest: (courseId, userId, data) => api.put(`/school/training-courses/${courseId}/interest/${userId}`, data),
  updateCourseProgress: (courseId, status) => api.post('/school/catalog/progress', { course_id: courseId, status }),
  getUserDetails: () => api.get('/school/user-details'),
  saveUserDetails: (data) => api.post('/school/user-details', data),
  adminGetUserDetails: (userId) => api.get(`/school/admin/user-details/${userId}`),
  adminSaveUserDetails: (userId, data) => api.post(`/school/admin/user-details/${userId}`, data),
  adminListInstallments: () => api.get('/school/admin/installments'),
  adminPaymentOverview: () => api.get('/school/admin/payment-overview'),
  adminCreateInstallment: (data) => api.post('/school/admin/installments', data),
  adminBulkCreateInstallments: (data) => api.post('/school/admin/installments/bulk', data),
  adminUpdateInstallment: (id, data) => api.put(`/school/admin/installments/${id}`, data),
  adminDeleteInstallment: (id) => api.delete(`/school/admin/installments/${id}`),
  getMyPayments: () => api.get('/school/my-payments'),
};

export const mediaAPI = {
  listAssets: (params = {}) => api.get('/media/assets', { params }),
  uploadAsset: ({ file, title, description, tags, courseId, autoProcess, autoImprove, overlayBrand }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || '');
    formData.append('description', description || '');
    formData.append('tags', tags || '');
    formData.append('course_id', courseId || '');
    formData.append('auto_process', autoProcess ? 'true' : 'false');
    formData.append('auto_improve', autoImprove ? 'true' : 'false');
    formData.append('overlay_brand', overlayBrand ? 'true' : 'false');
    return api.post('/media/assets/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  listRepositoryImages: (courseId = '') => api.get('/media/repository-images', { params: { course_id: courseId } }),
  indexRepositoryImages: () => api.post('/media/repository-images/index'),
  importRepositoryImage: (indexId) => api.post(`/media/repository-images/${indexId}/import`),
};

export default api;
