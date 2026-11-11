const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('pq_token');
const setToken = (token) => localStorage.setItem('pq_token', token);
const clearToken = () => localStorage.removeItem('pq_token');

const api = {
    async request(endpoint, options = {}) {
        const token = getToken();
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
        };

        const res = await fetch(`${API_URL}${endpoint}`, config);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            const err = new Error(data.error || 'Request failed');
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    },

    get: (endpoint) => api.request(endpoint),
    post: (endpoint, body) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),

    // Auth
    login: async (usn) => {
        const data = await api.post('/auth/login', { usn });
        setToken(data.token);
        localStorage.setItem('pixelQuestUser', JSON.stringify(data.user));
        return data;
    },
    adminLogin: async (password) => {
        const data = await api.post('/auth/admin-login', { password });
        setToken(data.token);
        localStorage.setItem('pixelQuestUser', JSON.stringify(data.user));
        return data;
    },
    getMe: () => api.get('/auth/me'),
    logout: () => {
        clearToken();
        localStorage.removeItem('pixelQuestUser');
    },

    // Games
    getGamesStatus: () => api.get('/games/today'),
    getWordle: () => api.get('/games/wordle'),
    submitWordleGuess: (guess) => api.post('/games/wordle/guess', { guess }),
    getQuiz: (type) => api.get(`/games/quiz/${type}`),
    submitQuiz: (type, answers) => api.post(`/games/quiz/${type}/submit`, { answers }),
    getUnscramble: () => api.get('/games/unscramble'),
    submitUnscramble: (guess) => api.post('/games/unscramble/submit', { guess }),

    // Leaderboard
    getStudentLeaderboard: () => api.get('/leaderboard/students'),
    getDepartmentLeaderboard: () => api.get('/leaderboard/departments'),

    // Admin
    setDailyGame: (gameType, body) => api.post(`/admin/games/${gameType}`, body),
    getDailyGame: (gameType, date) => api.get(`/admin/games/${gameType}${date ? `?date=${date}` : ''}`),
};

export default api;
