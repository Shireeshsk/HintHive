import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/v1';

const client = axios.create({ baseURL: BASE_URL });

/* ── attach access token to every request ── */
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

/* ── on 401: try refresh, retry once ── */
client.interceptors.response.use(
    (res) => res,
    async (err) => {
        const original = err.config;
        if (err.response?.status === 401 && !original._retry) {
            original._retry = true;
            const refresh = localStorage.getItem('refresh_token');
            if (!refresh) return Promise.reject(err);
            try {
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refresh_token: refresh,
                });
                localStorage.setItem('access_token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                original.headers.Authorization = `Bearer ${data.access_token}`;
                return client(original);
            } catch {
                localStorage.clear();
                window.location.href = '/login';
            }
        }
        return Promise.reject(err);
    }
);

/* ── auth helpers ── */
export const authApi = {
    signup: (body) => client.post('/auth/signup', body),
    login: (body) => client.post('/auth/login', body),
    logout: () => client.post('/auth/logout'),
    me: () => client.get('/auth/me'),
    updateProfile: (body) => client.patch('/auth/profile', body),
};

/* ── AI helpers ── */
export const aiApi = {
    analyze: (code, language) => client.post('/ai/analyze', { code, language }),
    chat: (code, language, messages) => client.post('/ai/chat', { code, language, messages }),
    motivate: () => client.get('/ai/motivate'),
};

export default client;
