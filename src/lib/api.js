import axios from 'axios';
import { installDevInterceptors } from './devLogger';

/**
 * =================================================================
 * 📱 SyriaSP Mobile Client — API Layer
 * =================================================================
 *
 * Base URL (production): https://mega-game.net/api
 * Base URL (development): /api (Vite proxy)
 *
 * Authentication: Bearer Token (Sanctum)
 * Headers: appToken, appVersion (مطلوبة في كل request)
 *
 * Error Format الموحد:
 * { "error": true, "message": "...", "data": null }
 *
 * الاستجابة 423 → يتطلب تأكيد PIN → redirect to /pin
 *
 * ⚠️ pin.recent: بعض الـ endpoints تتطلب تأكيد PIN مسبق عبر:
 *    POST /api/user/security/ConfirmPinCode { pin_code: "1234" }
 *
 * ⚠️ العمليات الغير متزامنة (issue/topup):
 *    ترجع 202 مع operation_id — يجب عمل polling أو انتظار push notification
 * =================================================================
 */

// Always use relative /api path — in dev Vite proxies it, in production nginx proxies it
const BASE_URL = '/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        appToken: 'fcc5ca60b6b46296052a8c3bc99d834c',
        appVersion: '1.0',
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

// Intercept 401 (Unauthenticated / session expired) — clear token & redirect to login
// Intercept 423 (PIN required) — redirect to /pin
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // Session expired — clean up and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('fcm_token');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        if (error.response?.status === 423) {
            // Avoid redirect loop if already on /pin
            if (!window.location.pathname.includes('/pin')) {
                window.location.href = '/pin';
            }
        }
        return Promise.reject(error);
    }
);

// 🛠️ Dev Logger — يسجّل كل request/response للمطورين
installDevInterceptors(api);

// ─────────────────────────────────────────────────────────────
// 🔐 Auth & Security
// ─────────────────────────────────────────────────────────────

/**
 * POST /auth/login
 * Request:  { email: string, password: string }
 * Response: { data: { token: "...", user: {...} } }
 */
export const login = (email, password) => api.post('/auth/login', { email, password });

/**
 * POST /user/security/ConfirmPinCode
 * Request:  { pin_code: "1234" }
 * Response: { error: false, message: "..." }
 * ⚠️ مطلوب قبل أي endpoint عليها pin.recent middleware
 */
export const confirmPin = pin_code => api.post('/user/security/ConfirmPinCode', { pin_code });

/**
 * POST /user/security/SetPinCode
 * Request:  { pin_code: "1234", password: "user_password" }
 * Response: { error: false, message: "..." }
 */
export const setPinCode = (pin_code, password) => api.post('/user/security/SetPinCode', { pin_code, password });

/**
 * POST /user/security/updatePinCode
 * Request:  { current_pin_code: "1234", new_pin_code: "5678" }
 * Response: { error: false, message: "..." }
 */
export const updatePinCode = (current_pin_code, new_pin_code) =>
    api.post('/user/security/updatePinCode', { current_pin_code, new_pin_code });

/**
 * GET /user
 * Response: { data: { user: { id, name, email, phone, balance, is_verified, has_pin_code, ... } } }
 */
export const getUser = () => api.get('/user');

/**
 * POST /auth/logout
 * Response: { message: "..." }
 */
export const logout = () => api.post('/auth/logout');

// ─────────────────────────────────────────────────────────────
// 🌍 Countries
// ─────────────────────────────────────────────────────────────
export const getCountries = () => api.get('/auth/register/countries');

// ─────────────────────────────────────────────────────────────
// 🆔 Identity Verification
// ─────────────────────────────────────────────────────────────
export const getVerificationStatus = () => api.get('/user/identity-verification/status');

export const submitVerification = formData =>
    api.post('/user/identity-verification/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const getVerificationHistory = () => api.get('/user/identity-verification/history');

// ─────────────────────────────────────────────────────────────
// 🏢 Card Providers (مزوّدي البطاقات)
// ─────────────────────────────────────────────────────────────

/**
 * GET /card-providers
 * الوظيفة: جلب قائمة مزوّدي البطاقات المتاحين
 * Response: {
 *   data: {
 *     providers: [{
 *       public_code: "provider_abc",
 *       display_name: "اسم المزوّد",
 *       capabilities: {
 *         requires_registration: true,
 *         requires_kyc: true,
 *         supports_topup: true,
 *         supports_freeze: true,
 *         supports_close: true,
 *         supports_3ds: true
 *       },
 *       min_initial_balance_usd: 10.0,
 *       min_recharge_amount_usd: 5.0,
 *       fixed_initial_balance_usd: null,
 *       fees: { apply_fee_usd: 2.0, recharge_fee_percent: 3.5 }
 *     }]
 *   }
 * }
 */
export const getCardProviders = () => api.get('/card-providers');

/**
 * POST /card-providers/register
 * Middleware: auth:sanctum + throttle:10,1
 * Request:  { public_code: "provider_abc" }
 * Response: { data: { status: "active", kyc_status: "approved" } }
 */
export const registerWithProvider = public_code => api.post('/card-providers/register', { public_code });

/**
 * GET /card-providers/registration-status?public_code=provider_abc
 * Response: {
 *   data: {
 *     registered: true,
 *     status: "active",
 *     kyc_status: "approved",
 *     kyc_approved: true,
 *     failure_reason: null
 *   }
 * }
 */
export const getRegistrationStatus = public_code =>
    api.get('/card-providers/registration-status', { params: { public_code } });

// ─────────────────────────────────────────────────────────────
// 📋 KYC (التوثيق)
// ─────────────────────────────────────────────────────────────

/**
 * GET /card-providers/kyc/requirements?public_code=...&document_kind=national_id
 * Response: {
 *   data: {
 *     requirements: {
 *       required_documents: ["front", "back", "selfie"],
 *       optional_documents: ["face"],
 *       supported_kinds: ["national_id", "passport", "driving_license"]
 *     }
 *   }
 * }
 */
export const getKycRequirements = params => api.get('/card-providers/kyc/requirements', { params });

/**
 * POST /card-providers/kyc/submit
 * Middleware: auth:sanctum + throttle:5,1
 * Request (multipart/form-data أو JSON مع staged_documents):
 * {
 *   public_code: "provider_abc",
 *   first_name: "أحمد",        // max 60
 *   last_name: "عداوي",        // max 60
 *   id_number: "123456789",    // max 60
 *   birthday: "1990-01-15",    // Y-m-d
 *   document_kind: "national_id",
 *   // ملفات مباشرة:
 *   front: File,               // اختياري
 *   back: File,                // اختياري
 *   selfie: File,              // اختياري
 *   // أو مستندات مرفوعة مسبقاً:
 *   staged_documents: [{ slot: "front", path: "...", filename: "...", mime: "image/jpeg" }]
 * }
 * Response (202): { data: { kyc_status: "pending" } }
 */
export const submitKyc = data => api.post('/card-providers/kyc/submit', data);

/**
 * GET /card-providers/kyc/status?public_code=provider_abc
 * Response: {
 *   data: {
 *     kyc_status: "approved",
 *     kyc_approved: true,
 *     failure_reason: null,
 *     readiness: {
 *       country_set: true,
 *       mobile_set: true,
 *       whatsapp_verified: true,
 *       whatsapp_verification_required: true,
 *       can_submit: true
 *     },
 *     history: [{ event: "kyc_approved", label: "...", status: "approved", reason: null, created_at: "..." }]
 *   }
 * }
 */
export const getKycStatus = params => api.get('/card-providers/kyc/status', { params });

/**
 * POST /card-providers/kyc/upload-document
 * Middleware: auth:sanctum + throttle:20,1
 * Request (multipart/form-data):
 *   public_code: string (كود المزوّد)
 *   slot: "front" | "back" | "selfie" | "face"
 *   file: File (max 8MB)
 * Response: {
 *   data: { slot: "front", path: "kyc/user_123/front_abc.jpg", filename: "front_abc.jpg", mime: "image/jpeg", view_url: "https://..." }
 * }
 */
export const uploadKycDocument = formData =>
    api.post('/card-providers/kyc/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

// ─────────────────────────────────────────────────────────────
// 🔔 Notifications & FCM (الإشعارات + توكن الجهاز)
// ─────────────────────────────────────────────────────────────

/**
 * GET /notifications?page=1&limit=20
 * الوظيفة: جلب الإشعارات مع pagination
 * Response (200): {
 *   success: true,
 *   message: "تم جلب الإشعارات بنجاح",
 *   data: {
 *     notifications: [...],
 *     total: 45,
 *     total_pages: 3,
 *     current_page: 1,
 *     per_page: 20,
 *     notifications_count: 45
 *   }
 * }
 */
export const getNotifications = (params = {}) => api.get('/notifications', { params });

/**
 * POST /notifications/mark-as-read?id={notificationId}
 * الوظيفة: تمييز إشعار واحد كمقروء
 * Query Params: id (required) — معرف الإشعار
 * Response (200): { success: true, message: "تم تمييز الإشعار كمقروء بنجاح" }
 */
export const markNotificationRead = id => api.post('/notifications/mark-as-read', null, { params: { id } });

/**
 * POST /notifications/mark-all-as-read
 * الوظيفة: تمييز جميع الإشعارات كمقروءة
 * Response (200): { success: true, message: "تم تمييز 12 إشعار كمقروء", data: { marked_count: 12 } }
 */
export const markAllNotificationsRead = () => api.post('/notifications/mark-all-as-read');

// ─────────────────────────────────────────────────────────────
// 📲 Device Tokens (FCM)
// ─────────────────────────────────────────────────────────────

/**
 * POST /user/device-tokens
 * الوظيفة: تسجيل توكن جهاز FCM للمستخدم
 * Request: {
 *   token: "FCM_DEVICE_TOKEN_HERE",
 *   device_type: "android" | "ios" | "web",
 *   device_name: "Chrome Browser",
 *   app_version: "1.0.0"
 * }
 * Response (201): {
 *   success: true,
 *   message: "Device token registered successfully",
 *   data: { id: 5, device_type: "web" }
 * }
 *
 * ⚠️ يُستدعى بعد تسجيل الدخول + الحصول على إذن الإشعارات من المتصفح
 */
export const registerDeviceToken = (token, { deviceType = 'web', deviceName = '', appVersion = '1.0.0' } = {}) =>
    api.post('/user/device-tokens', {
        token,
        device_type: deviceType,
        device_name: deviceName || getBrowserName(),
        app_version: appVersion,
    });

/**
 * POST /user/device-tokens/{token}/ping
 * الوظيفة: تحديث آخر استخدام للتوكن (يُستدعى دورياً)
 * Response (200): { success: true, message: "Device token updated", data: { last_used_at: "2026-07-10T12:00:00.000000Z" } }
 *
 * ⚠️ يُفضّل استدعاؤه كل 24 ساعة أو عند فتح التطبيق
 */
export const pingDeviceToken = token => api.post(`/user/device-tokens/${encodeURIComponent(token)}/ping`);

/**
 * POST /user/device-tokens/testFirebase
 * الوظيفة: إرسال إشعار تجريبي لجميع أجهزة المستخدم المسجلة
 * Response (200): { success: true, message: "..." }
 */
export const testFirebaseNotification = () => api.post('/user/device-tokens/testFirebase');

/**
 * Helper: اسم المتصفح
 */
function getBrowserName() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Web Browser';
}

// ─────────────────────────────────────────────────────────────
// 👤 Profile
// ─────────────────────────────────────────────────────────────
export const updateProfile = formData =>
    api.post('/user/update-profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const updatePassword = data => api.post('/user/update-password', data);

// ─────────────────────────────────────────────────────────────
// 📱 WhatsApp OTP
// ─────────────────────────────────────────────────────────────
export const updatePhone = data => api.post('/user/whatsapp/otp/update-phone', data);

export const requestWhatsAppOtp = () => api.post('/user/whatsapp/otp/request');

export const verifyWhatsAppOtp = code => api.post('/user/whatsapp/otp/verify', { code });

// ─────────────────────────────────────────────────────────────
// 🔑 2FA (Google Authenticator)
// ─────────────────────────────────────────────────────────────
export const createGoogleAuthenticator = data => api.post('/user/security/creategoogleAuthenticator', data);

export const verifyGoogleAuthenticator = data => api.post('/user/security/verifygoogleAuthenticator', data);

// ─────────────────────────────────────────────────────────────
// 🛡️ 3DS Challenges (مصادقة 3D Secure)
// ─────────────────────────────────────────────────────────────

/**
 * GET /card-3ds
 * الوظيفة: جلب تحديات 3DS المعلّقة (المطلوب من المستخدم الرد عليها)
 * Response: {
 *   data: {
 *     challenges: [{
 *       id: 5,
 *       provider_code: "provider_abc",
 *       merchant_name: "Amazon",
 *       amount: 29.99,
 *       currency: "USD",
 *       verification_type: "otp" | "http",
 *       status: "pending",
 *       status_label: "بانتظار التأكيد",
 *       expires_at: "2025-01-15T10:05:00+00:00"
 *     }]
 *   }
 * }
 *
 * ⚠️ أيضاً يتم استقبال التحديات لحظياً عبر Firebase Push:
 *    data.type = "3ds_challenge"
 */
export const get3dsChallenges = () => api.get('/card-3ds');

/**
 * POST /card-3ds/{challenge}/reveal-otp
 * الوظيفة: كشف رمز OTP لتحدي من نوع OTP (مرة واحدة فقط)
 * Middleware: auth:sanctum + throttle:10,1
 * Params: {challenge} = id التحدي (رقم)
 * Response: { data: { otp: "482951" } }
 */
export const reveal3dsOtp = challengeId => api.post(`/card-3ds/${challengeId}/reveal-otp`);

/**
 * POST /card-3ds/{challenge}/approve
 * الوظيفة: الموافقة على تحدي من نوع HTTP (تأكيد العملية)
 * Params: {challenge} = id التحدي (رقم)
 * Response: { message: "تمت الموافقة على التحدي" }
 */
export const approve3dsChallenge = challengeId => api.post(`/card-3ds/${challengeId}/approve`);

/**
 * POST /card-3ds/{challenge}/deny
 * الوظيفة: رفض تحدي 3DS (إلغاء العملية)
 * Params: {challenge} = id التحدي (رقم)
 * Response: { message: "تم رفض التحدي" }
 */
export const deny3dsChallenge = challengeId => api.post(`/card-3ds/${challengeId}/deny`);

// ─────────────────────────────────────────────────────────────
// 💳 Virtual Cards (البطاقات الافتراضية)
// ─────────────────────────────────────────────────────────────

/**
 * GET /cards
 * الوظيفة: جلب كل بطاقات المستخدم
 * Response: {
 *   data: {
 *     cards: [{
 *       id: 1,
 *       uuid: "abc-123-def",
 *       provider_code: "provider_abc",
 *       name: "بطاقتي الأساسية",
 *       masked_number: "**** **** **** 1234",
 *       balance: 50.00,
 *       status: "active" | "frozen" | "closed",
 *       status_label: "نشطة",
 *       created_at: "2025-01-10T08:00:00+00:00"
 *     }]
 *   }
 * }
 */
export const getCards = () => api.get('/cards');

/**
 * POST /cards/issue
 * الوظيفة: إصدار بطاقة جديدة (يخصم من الرصيد ويعالج بشكل غير متزامن)
 * Middleware: auth:sanctum + throttle:10,1 + pin.recent
 * Request: { public_code: "provider_abc", name: "بطاقة التسوق" }
 * Response (202): { data: { operation_id: 42, status: "pending" } }
 *
 * ⚠️ عملية غير متزامنة → يتم إرسال push notification عند الاكتمال
 *    data.type = "card_operation"
 */
export const issueCard = data => api.post('/cards/issue', data);

/**
 * GET /cards/{card}
 * الوظيفة: جلب تفاصيل بطاقة واحدة
 * Middleware: auth:sanctum + pin.recent
 * Params: {card} = id البطاقة (رقم)
 * Response: { data: { card: { id, uuid, provider_code, name, masked_number, balance, status, status_label, created_at } } }
 */
export const getCard = id => api.get(`/cards/${id}`);

/**
 * GET /cards/{card}/balance
 * الوظيفة: مزامنة وجلب رصيد البطاقة الحالي من المزوّد (real-time)
 * Middleware: auth:sanctum + throttle:30,1 + pin.recent
 * Response: { data: { amount: 47.50, currency: "USD", symbol: "$" } }
 */
export const getCardBalance = id => api.get(`/cards/${id}/balance`);

/**
 * GET /cards/{card}/transactions?per_page=20
 * الوظيفة: جلب سجل معاملات البطاقة (مع pagination)
 * Middleware: auth:sanctum + throttle:30,1
 * Response: {
 *   data: {
 *     transactions: [{
 *       id: 101,
 *       amount: -15.00,
 *       fee_amount: 0.50,
 *       total_amount: -15.50,
 *       currency: "USD",
 *       type_description: "Purchase",
 *       narrative: "Netflix Subscription",
 *       status: "completed",
 *       created_at: "2025-01-12T14:30:00+00:00"
 *     }],
 *     pagination: { current_page: 1, last_page: 3, per_page: 20, total: 55 }
 *   }
 * }
 */
export const getCardTransactions = (id, page = 1) => api.get(`/cards/${id}/transactions`, { params: { page } });

/**
 * GET /cards/{card}/info
 * الوظيفة: جلب البيانات الحساسة للبطاقة (رقم كامل / CVV أو iframe URL)
 * Middleware: auth:sanctum + throttle:20,1 + pin.recent
 * Response: {
 *   data: {
 *     card: {
 *       uses_iframe: false,      // لو true → استخدم pan_url
 *       pan_url: null,           // iframe URL لعرض البيانات
 *       masked_number: "**** **** **** 1234",
 *       pan: "4111111111111234", // الرقم الكامل (لو uses_iframe = false)
 *       cvv: "123",
 *       expiry: "12/27",
 *       status: "active",
 *       status_label: "نشطة"
 *     }
 *   }
 * }
 */
export const getCardInfo = id => api.get(`/cards/${id}/info`);

/**
 * POST /cards/{card}/topup
 * الوظيفة: شحن رصيد البطاقة (يخصم من رصيد الحساب، معالجة غير متزامنة)
 * Middleware: auth:sanctum + throttle:10,1 + pin.recent
 * Request: { amount: 25.00 }
 * Response (202): { data: { operation_id: 43, status: "pending" } }
 *
 * ⚠️ عملية غير متزامنة → push notification عند الاكتمال
 */
export const topupCard = (id, data) => api.post(`/cards/${id}/topup`, data);

/**
 * POST /cards/{card}/freeze
 * الوظيفة: تجميد البطاقة مؤقتاً (إيقاف المعاملات)
 * Middleware: auth:sanctum + throttle:10,1 + pin.recent
 * Response: { data: { card: { ...status: "frozen" } } }
 */
export const freezeCard = id => api.post(`/cards/${id}/freeze`);

/**
 * POST /cards/{card}/unfreeze
 * الوظيفة: فك تجميد البطاقة (إعادة تفعيلها)
 * Middleware: auth:sanctum + throttle:10,1 + pin.recent
 * Response: { data: { card: { ...status: "active" } } }
 */
export const unfreezeCard = id => api.post(`/cards/${id}/unfreeze`);

/**
 * POST /cards/{card}/close
 * الوظيفة: إغلاق البطاقة نهائياً (لا يمكن التراجع)
 * Middleware: auth:sanctum + throttle:10,1 + pin.recent
 * Response: { data: { card: { ...status: "closed" } } }
 */
export const closeCard = id => api.post(`/cards/${id}/close`);

export default api;
