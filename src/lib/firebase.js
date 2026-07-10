/**
 * Firebase Cloud Messaging (FCM) Configuration
 * =============================================
 *
 * هذا الملف مسؤول عن تهيئة Firebase واستقبال Push Notifications.
 *
 * الاستخدام الأساسي:
 * - استقبال إشعارات 3DS Challenges (تحديات المصادقة) لحظياً
 * - استقبال إشعارات عمليات البطاقة (issue/topup) عند اكتمالها
 * - الإشعارات العامة من الخادم
 *
 * ⚠️ يجب تعديل firebaseConfig أدناه ببيانات مشروع Firebase الخاص بك
 *
 * الخطوات:
 * 1. أنشئ مشروع Firebase → Project Settings → Cloud Messaging
 * 2. ضع بيانات الـ config هنا
 * 3. أنشئ VAPID key من Cloud Messaging → Web Push certificates
 * 4. ضع الـ VAPID_KEY أدناه
 */

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// ⚠️ عدّل هذه البيانات حسب مشروع Firebase الخاص بك
const firebaseConfig = {
    apiKey: 'AIzaSyCAmY3OBGmNeza_q_9a8urL3WevsyubkmE',
    authDomain: 'swgame-536e7.firebaseapp.com',
    projectId: 'swgame-536e7',
    storageBucket: 'swgame-536e7.firebasestorage.app',
    messagingSenderId: '909453287089',
    appId: '1:909453287089:web:8a3a65d8ac04da5d4d4c90',
};

// ⚠️ ضع VAPID Key من Firebase Console → Cloud Messaging → Web Push certificates
const VAPID_KEY = 'BBM_F4L_gUk5zmA3hK3jnEuKFCuQYq7sFzc1XASZOAV9Qt_8O80Vz1in69zzna8_IgqZeY48pR6zgeHlYtMv5sg';

let app = null;
let messaging = null;

/**
 * تهيئة Firebase - يتم استدعاؤها مرة واحدة عند تحميل التطبيق
 */
export function initFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        messaging = getMessaging(app);
        return true;
    } catch (error) {
        console.error('Firebase init error:', error);
        return false;
    }
}

/**
 * طلب إذن الإشعارات والحصول على FCM Token
 *
 * @returns {Promise<string|null>} FCM token أو null في حال الفشل
 *
 * الـ token يُرسل للسيرفر عبر:
 * POST /api/user/device-tokens
 * Body: { token: "fcm_token_here", device_type: "web", device_name: "Chrome", app_version: "1.0.0" }
 */
export async function requestNotificationPermission() {
    try {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission denied');
            return null;
        }

        if (!messaging) {
            initFirebase();
        }

        // التسجيل في Service Worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            console.log('FCM Token:', token);
            // حفظ الـ token محلياً لاستخدامه عند تسجيل الخروج
            localStorage.setItem('fcm_token', token);
            return token;
        }

        console.warn('No FCM token received');
        return null;
    } catch (error) {
        console.error('Error getting FCM token:', error);
        return null;
    }
}

/**
 * الاستماع للإشعارات أثناء تواجد المستخدم في التطبيق (foreground)
 *
 * أنواع الإشعارات المتوقعة:
 * - type: "3ds_challenge" → تحدي 3DS جديد يتطلب إجراء فوري
 * - type: "card_operation" → عملية بطاقة اكتملت (issue/topup)
 * - type: "card_status" → تغيّر حالة بطاقة
 * - type: "general" → إشعار عام
 *
 * @param {Function} callback - يُنفّذ عند وصول إشعار
 *
 * مثال payload:
 * {
 *   notification: { title: "تحدي 3DS جديد", body: "Amazon - $29.99" },
 *   data: {
 *     type: "3ds_challenge",
 *     challenge_id: "5",
 *     merchant_name: "Amazon",
 *     amount: "29.99",
 *     currency: "USD",
 *     verification_type: "otp",
 *     expires_at: "2025-01-15T10:05:00+00:00"
 *   }
 * }
 */
export function onForegroundMessage(callback) {
    if (!messaging) {
        initFirebase();
    }

    if (!messaging) return () => {};

    return onMessage(messaging, payload => {
        console.log('Foreground message:', payload);
        callback(payload);
    });
}

export { messaging };
