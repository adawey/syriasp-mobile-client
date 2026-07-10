import { createContext, useContext, useState, useEffect } from 'react';
import { getUser, logout as apiLogout, pingDeviceToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [pinVerified, setPinVerified] = useState(false);
    const [whatsappVerificationRequired, setWhatsappVerificationRequired] = useState(true);

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
            if (res.data.data.whatsapp_verification_required !== undefined) {
                setWhatsappVerificationRequired(res.data.data.whatsapp_verification_required);
            }
            // Ping FCM token عند فتح التطبيق (تحديث last_used_at)
            const fcmToken = localStorage.getItem('fcm_token');
            if (fcmToken) {
                pingDeviceToken(fcmToken).catch(() => {});
            }
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
            // حذف FCM token المحلي عند تسجيل الخروج
            localStorage.removeItem('fcm_token');
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
            value={{
                user,
                setUser,
                token,
                saveToken,
                logout,
                loading,
                pinVerified,
                setPinVerified,
                fetchUser,
                whatsappVerificationRequired,
                setWhatsappVerificationRequired,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
