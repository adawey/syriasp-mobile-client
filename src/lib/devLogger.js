/**
 * ═══════════════════════════════════════════════════════════════
 * 🛠️ Dev Logger — يسجّل كل API Request/Response
 * ═══════════════════════════════════════════════════════════════
 *
 * يعمل كـ Axios Interceptor — يسجّل:
 * - Method (GET/POST/PUT/DELETE)
 * - Full URL
 * - Request Headers
 * - Request Body
 * - Response Status
 * - Response Data
 * - Duration (ms)
 * - cURL equivalent
 *
 * يحفظ آخر 100 request في الذاكرة
 * ═══════════════════════════════════════════════════════════════
 */

const MAX_LOGS = 100;
let logs = [];
let logId = 0;

/**
 * إضافة log جديد
 */
export function addDevLog(entry) {
    logId++;
    logs.unshift({ id: logId, ...entry });
    if (logs.length > MAX_LOGS) {
        logs = logs.slice(0, MAX_LOGS);
    }
}

/**
 * جلب كل الـ logs
 */
export function getDevLogs() {
    return [...logs];
}

/**
 * مسح الـ logs
 */
export function clearDevLogs() {
    logs = [];
}

/**
 * إنشاء cURL command من request config
 */
function buildCurl(config) {
    const parts = ['curl'];

    // Method
    if (config.method !== 'get') {
        parts.push(`-X ${config.method.toUpperCase()}`);
    }

    // URL
    const url = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
    parts.push(`'${url}'`);

    // Headers
    if (config.headers) {
        Object.entries(config.headers).forEach(([key, value]) => {
            if (
                value &&
                key !== 'common' &&
                key !== 'delete' &&
                key !== 'get' &&
                key !== 'head' &&
                key !== 'post' &&
                key !== 'put' &&
                key !== 'patch'
            ) {
                parts.push(`-H '${key}: ${value}'`);
            }
        });
    }

    // Body
    if (config.data) {
        if (typeof config.data === 'string') {
            parts.push(`-d '${config.data}'`);
        } else if (config.data instanceof FormData) {
            parts.push("-d '[FormData]'");
        } else {
            parts.push(`-d '${JSON.stringify(config.data)}'`);
        }
    }

    return parts.join(' \\\n  ');
}

/**
 * تثبيت الـ interceptors على axios instance
 * يُستدعى مرة واحدة عند بداية التطبيق
 */
export function installDevInterceptors(axiosInstance) {
    // Request interceptor — يسجّل بداية الـ request
    axiosInstance.interceptors.request.use(
        config => {
            config._devStartTime = Date.now();
            config._devLogId = logId + 1;
            return config;
        },
        error => Promise.reject(error)
    );

    // Response interceptor — يسجّل الـ response
    axiosInstance.interceptors.response.use(
        response => {
            const config = response.config;
            const duration = config._devStartTime ? Date.now() - config._devStartTime : null;

            addDevLog({
                timestamp: new Date().toISOString(),
                method: (config.method || 'GET').toUpperCase(),
                url: config.url,
                fullUrl: config.baseURL ? `${config.baseURL}${config.url}` : config.url,
                requestHeaders: cleanHeaders(config.headers),
                requestBody: parseBody(config.data),
                status: response.status,
                responseData: response.data,
                duration,
                error: null,
                curl: buildCurl(config),
            });

            return response;
        },
        error => {
            const config = error.config || {};
            const duration = config._devStartTime ? Date.now() - config._devStartTime : null;

            addDevLog({
                timestamp: new Date().toISOString(),
                method: (config.method || 'GET').toUpperCase(),
                url: config.url || 'unknown',
                fullUrl: config.baseURL ? `${config.baseURL}${config.url}` : config.url || 'unknown',
                requestHeaders: cleanHeaders(config.headers),
                requestBody: parseBody(config.data),
                status: error.response?.status || null,
                responseData: error.response?.data || null,
                duration,
                error: error.message,
                curl: buildCurl(config),
            });

            return Promise.reject(error);
        }
    );
}

/**
 * تنظيف headers من الـ axios internal fields
 */
function cleanHeaders(headers) {
    if (!headers) return {};
    const clean = {};
    Object.entries(headers).forEach(([key, value]) => {
        if (typeof value === 'string' && !['common', 'delete', 'get', 'head', 'post', 'put', 'patch'].includes(key)) {
            clean[key] = value;
        }
    });
    return clean;
}

/**
 * Parse request body
 */
function parseBody(data) {
    if (!data) return null;
    if (data instanceof FormData) {
        const obj = {};
        data.forEach((value, key) => {
            obj[key] = value instanceof File ? `[File: ${value.name} (${value.size} bytes)]` : value;
        });
        return obj;
    }
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }
    return data;
}
