import api from './api';

const queryQuestApi = {
    // Student arena endpoints
    getToday: () => api.get('/query-quest/today'),
    getChallenge: (id) => api.get(`/query-quest/challenges/${id}`),
    executeQuery: (challengeId, query) => api.post('/query-quest/execute', { challengeId, query }),
    requestHint: (challengeId) => api.post('/query-quest/hint', { challengeId }),
    getProgress: () => api.get('/query-quest/progress'),
    getLeaderboard: () => api.get('/query-quest/leaderboard'),

    // Admin Query Quest Manager endpoints
    listAdminChallenges: (date) =>
        api.get(`/admin/query-quest/challenges${date ? `?date=${encodeURIComponent(date)}` : ''}`),
    createAdminChallenge: (payload) => api.post('/admin/query-quest/challenges', payload),
    updateAdminChallenge: (id, payload) =>
        api.request(`/admin/query-quest/challenges/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),
    deleteAdminChallenge: (id, deactivateOnly = false) =>
        api.request(`/admin/query-quest/challenges/${id}${deactivateOnly ? '?mode=deactivate' : ''}`, {
            method: 'DELETE',
        }),
};

export default queryQuestApi;
