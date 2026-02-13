import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
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
    updateProfile: (data) => api.put('/auth/update-profile', data),
    updateResume: (resumeText, resumeLink) => api.put('/auth/profile/resume', { resume_text: resumeText, resume_link: resumeLink }),

    // Email Verification
    verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
    resendVerification: () => api.post('/auth/resend-verification'),

    // Password Reset
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, new_password: newPassword }),
    changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),

    // Two-Factor Authentication
    setup2FA: () => api.post('/auth/2fa/setup'),
    enable2FA: (code) => api.post('/auth/2fa/enable', { code }),
    disable2FA: (code) => api.post('/auth/2fa/disable', { code }),

    // OAuth
    oauthGoogle: () => window.location.href = '/api/auth/oauth/google',
    oauthGitHub: () => window.location.href = '/api/auth/oauth/github',
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
    approveHost: (userId) => api.post(`/admin/approve-host/${userId}`),
    bulkAction: (data) => api.post('/admin/bulk-action', data),
    purgeAll: (type) => api.delete(`/admin/purge-all?type=${type}`)
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

// Tracker API
export const trackerAPI = {
    getAll: () => api.get('/tracker'),
    add: (data) => api.post('/tracker/add', data),
    update: (id, data) => api.patch(`/tracker/${id}`, data),
    delete: (id) => api.delete(`/tracker/${id}`),
    calculateMatch: (id) => api.post(`/tracker/${id}/match`),
};

export default api;
