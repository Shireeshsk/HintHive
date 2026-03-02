import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    /* ── rehydrate session on mount ── */
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) { setLoading(false); return; }
        authApi.me()
            .then(({ data }) => setUser(data))
            .catch(() => localStorage.clear())
            .finally(() => setLoading(false));
    }, []);

    const login = useCallback(async (email, password) => {
        const { data } = await authApi.login({ email, password });
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        const { data: me } = await authApi.me();
        setUser(me);
        return me;
    }, []);

    const signup = useCallback(async (username, email, password) => {
        await authApi.signup({ username, email, password });
        return login(email, password);
    }, [login]);

    const logout = useCallback(async () => {
        try { await authApi.logout(); } catch { /* ignore */ }
        localStorage.clear();
        setUser(null);
    }, []);

    const updateProfile = useCallback(async (payload) => {
        const { data } = await authApi.updateProfile(payload);
        setUser(data);   // sync in-memory user immediately
        return data;
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
