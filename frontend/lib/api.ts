import axios from 'axios';
import { useAuthStore } from './stores/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({ baseURL: BASE_URL });

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then((r) => r.data),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  me: () => api.get('/users/me').then((r) => r.data),
  update: (data: { name?: string; avatarUrl?: string }) =>
    api.patch('/users/me', data).then((r) => r.data),
  search: (q: string) =>
    api.get('/users/search', { params: { q } }).then((r) => r.data),
};

// ─── Goals ────────────────────────────────────────────────────────────────────
export const goalsApi = {
  list: () => api.get('/goals').then((r) => r.data),
  get: (id: string) => api.get(`/goals/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/goals', data).then((r) => r.data),
  update: (id: string, data: any) => api.patch(`/goals/${id}`, data).then((r) => r.data),
  cancel: (id: string) => api.delete(`/goals/${id}`),
  complete: (id: string) => api.post(`/goals/${id}/complete`).then((r) => r.data),
};

// ─── Invites ──────────────────────────────────────────────────────────────────
export const invitesApi = {
  get: (token: string) => api.get(`/invites/${token}`).then((r) => r.data),
  accept: (token: string) => api.post(`/invites/${token}/accept`).then((r) => r.data),
  decline: (token: string) => api.post(`/invites/${token}/decline`).then((r) => r.data),
};

// ─── Submissions ──────────────────────────────────────────────────────────────
export const submissionsApi = {
  list: (goalId: string) => api.get(`/goals/${goalId}/submissions`).then((r) => r.data),
  create: (goalId: string, data: { content: string; mediaUrl?: string }) =>
    api.post(`/goals/${goalId}/submissions`, data).then((r) => r.data),
  review: (id: string, data: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string }) =>
    api.patch(`/submissions/${id}/review`, data).then((r) => r.data),
};

// ─── Forfeits ─────────────────────────────────────────────────────────────────
export const forfeitsApi = {
  get: (goalId: string) => api.get(`/goals/${goalId}/forfeit`).then((r) => r.data),
  confirm: (goalId: string) => api.post(`/goals/${goalId}/forfeit/confirm`).then((r) => r.data),
  waive: (goalId: string) => api.post(`/goals/${goalId}/forfeit/waive`).then((r) => r.data),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (page = 1) => api.get('/notifications', { params: { page } }).then((r) => r.data),
  unreadCount: () => api.get('/notifications/unread-count').then((r) => r.data),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

// ─── Uploads ──────────────────────────────────────────────────────────────────
export const uploadsApi = {
  getPresignedUrl: (filename: string, contentType: string) =>
    api.post('/uploads/presigned-url', { filename, contentType }).then((r) => r.data),

  // Upload file directly to R2 using presigned URL
  uploadFile: async (file: File): Promise<string> => {
    const { uploadUrl, fileUrl } = await uploadsApi.getPresignedUrl(file.name, file.type);
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    return fileUrl;
  },
};
