import axios from 'axios';

// In dev mode use the Vite proxy (/api → sw-games.net), in production use absolute URL
const BASE_URL = import.meta.env.DEV ? '/api' : 'https://sw-games.net/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        appToken: 'new-adawe-12121',
        appVersion: '4.0.3',
    },
});

// Auto-attach token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Intercept 423 (PIN required) — redirect to /pin
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 423) {
            // Avoid redirect loop if already on /pin
            if (!window.location.pathname.includes('/pin')) {
                window.location.href = '/pin';
            }
        }
        return Promise.reject(error);
    }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });

export const confirmPin = pin_code => api.post('/user/security/ConfirmPinCode', { pin_code });

export const getUser = () => api.get('/user');

export const logout = () => api.post('/auth/logout');

// Countries
export const getCountries = () => api.get('/auth/register/countries');

// Identity Verification
export const getVerificationStatus = () => api.get('/user/identity-verification/status');

export const submitVerification = formData =>
    api.post('/user/identity-verification/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const getVerificationHistory = () => api.get('/user/identity-verification/history');

// Card Providers
export const getCardProviders = () => api.get('/card-providers');

export const registerWithProvider = public_code => api.post('/card-providers/register', { public_code });

export const getRegistrationStatus = public_code =>
    api.get('/card-providers/registration-status', { params: { public_code } });

// KYC
export const getKycRequirements = params => api.get('/card-providers/kyc/requirements', { params });

export const submitKyc = data => api.post('/card-providers/kyc/submit', data);

export const getKycStatus = params => api.get('/card-providers/kyc/status', { params });

export const uploadKycDocument = formData =>
    api.post('/card-providers/kyc/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

// Notifications
export const getNotifications = (params = {}) => api.get('/notifications', { params });

export const markNotificationRead = id => api.post('/notifications/mark-as-read', null, { params: { id } });

export const markAllNotificationsRead = () => api.post('/notifications/mark-all-as-read');

// Profile
export const updateProfile = formData =>
    api.post('/user/update-profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const updatePassword = data => api.post('/user/update-password', data);

// WhatsApp OTP
export const updatePhone = data => api.post('/user/whatsapp/otp/update-phone', data);

export const requestWhatsAppOtp = () => api.post('/user/whatsapp/otp/request');

export const verifyWhatsAppOtp = code => api.post('/user/whatsapp/otp/verify', { code });

// 2FA (Google Authenticator)
export const createGoogleAuthenticator = data => api.post('/user/security/creategoogleAuthenticator', data);

export const verifyGoogleAuthenticator = data => api.post('/user/security/verifygoogleAuthenticator', data);

// 3DS Challenges
export const get3dsChallenges = () => api.get('/card-3ds');

export const reveal3dsOtp = challengeId => api.post(`/card-3ds/${challengeId}/reveal-otp`);

export const approve3dsChallenge = challengeId => api.post(`/card-3ds/${challengeId}/approve`);

export const deny3dsChallenge = challengeId => api.post(`/card-3ds/${challengeId}/deny`);

// Virtual Cards
export const getCards = () => api.get('/cards');

export const issueCard = data => api.post('/cards/issue', data);

export const getCard = id => api.get(`/cards/${id}`);

export const getCardBalance = id => api.get(`/cards/${id}/balance`);

export const getCardTransactions = (id, page = 1) => api.get(`/cards/${id}/transactions`, { params: { page } });

export const getCardInfo = id => api.get(`/cards/${id}/info`);

export const topupCard = (id, data) => api.post(`/cards/${id}/topup`, data);

export const freezeCard = id => api.post(`/cards/${id}/freeze`);

export const unfreezeCard = id => api.post(`/cards/${id}/unfreeze`);

export const closeCard = id => api.post(`/cards/${id}/close`);

export default api;
