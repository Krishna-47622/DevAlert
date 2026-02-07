import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 422) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getCurrentUser: () => api.get('/auth/me'),
};

// Hackathons API
export const hackathonsAPI = {
    getAll: (params) => api.get('/hackathons', { params }),
    getById: (id) => api.get(`/hackathons/${id}`),
    create: (data) => api.post('/hackathons', data),
    update: (id, data) => api.put(`/hackathons/${id}`, data),
    delete: (id) => api.delete(`/hackathons/${id}`),
};

// Internships API
export const internshipsAPI = {
    getAll: (params) => api.get('/internships', { params }),
    getById: (id) => api.get(`/internships/${id}`),
    create: (data) => api.post('/internships', data),
    update: (id, data) => api.put(`/internships/${id}`, data),
    delete: (id) => api.delete(`/internships/${id}`),
};

// Admin API
export const adminAPI = {
    getPending: () => api.get('/admin/pending'),
    getAllOpportunities: () => api.get('/admin/all-opportunities'),
    approve: (type, id) => api.post(`/admin/approve/${type}/${id}`),
    reject: (type, id) => api.post(`/admin/reject/${type}/${id}`),
    getStats: () => api.get('/admin/stats'),
    triggerScan: () => api.post('/admin/trigger-scan'),
    getUsers: () => api.get('/admin/users'),
    updateUserRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
    deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
    getHostRequests: () => api.get('/admin/host-requests'),
    approveHost: (userId) => api.post(`/admin/approve-host/${userId}`)
};

// Applications API
export const applicationsAPI = {
    submit: (data) => api.post('/applications', data),
    getMy: () => api.get('/applications/my'),
    getForEvent: (eventType, eventId) => api.get(`/applications/event/${eventType}/${eventId}`),
    getHosted: () => api.get('/applications/hosted'),
    updateStatus: (id, status) => api.patch(`/applications/${id}/status`, { status }),
};

// Notifications API
export const notificationsAPI = {
    getAll: (params) => api.get('/notifications', { params }),
    getUnreadCount: () => api.get('/notifications/unread-count'),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/mark-all-read'),
};

export default api;
