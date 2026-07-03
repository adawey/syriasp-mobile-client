import { createContext, useContext, useState, useEffect } from 'react';
import { getUser, logout as apiLogout } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [pinVerified, setPinVerified] = useState(false);

    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const res = await getUser();
            setUser(res.data.data.user || res.data.data);
        } catch {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const saveToken = newToken => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const logout = async () => {
        try {
            await apiLogout();
        } catch {
            // ignore
        }
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setPinVerified(false);
    };

    return (
        <AuthContext.Provider
            value={{ user, setUser, token, saveToken, logout, loading, pinVerified, setPinVerified, fetchUser }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
