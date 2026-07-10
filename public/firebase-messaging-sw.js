/**
 * Firebase Messaging Service Worker
 * ==================================
 *
 * هذا الملف يعمل في الخلفية لاستقبال Push Notifications
 * حتى لو التطبيق مغلق أو في الـ background.
 *
 * ⚠️ يجب تعديل firebaseConfig أدناه بنفس البيانات الموجودة في src/lib/firebase.js
 */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// ⚠️ عدّل هذه البيانات (نفس القيم في src/lib/firebase.js)
firebase.initializeApp({
    apiKey: 'AIzaSyCAmY3OBGmNeza_q_9a8urL3WevsyubkmE',
    authDomain: 'swgame-536e7.firebaseapp.com',
    projectId: 'swgame-536e7',
    storageBucket: 'swgame-536e7.firebasestorage.app',
    messagingSenderId: '909453287089',
    appId: '1:909453287089:web:8a3a65d8ac04da5d4d4c90',
});

const messaging = firebase.messaging();

/**
 * معالجة الإشعارات في الخلفية (background)
 *
 * عند وصول إشعار والتطبيق في الخلفية:
 * - يظهر كـ system notification
 * - عند الضغط عليه يفتح التطبيق على الصفحة المناسبة
 */
messaging.onBackgroundMessage(payload => {
    console.log('[SW] Background message:', payload);

    const notificationTitle = payload.notification?.title || 'SyriaSP';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: payload.data?.type || 'general',
        data: payload.data || {},
        // إجراءات حسب نوع الإشعار
        actions: getNotificationActions(payload.data?.type),
        // اهتزاز للتنبيهات العاجلة (3DS)
        vibrate: payload.data?.type === '3ds_challenge' ? [200, 100, 200, 100, 200] : [200, 100, 200],
        requireInteraction: payload.data?.type === '3ds_challenge', // يبقى ظاهر حتى التفاعل
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * معالجة الضغط على الإشعار - يفتح الصفحة المناسبة
 */
self.addEventListener('notificationclick', event => {
    event.notification.close();

    const data = event.notification.data || {};
    let targetUrl = '/';

    // توجيه حسب نوع الإشعار
    switch (data.type) {
        case '3ds_challenge':
            targetUrl = '/notifications'; // صفحة الإشعارات تحتوي تحديات 3DS
            break;
        case 'card_operation':
        case 'card_status':
            targetUrl = data.card_id ? `/cards/${data.card_id}` : '/cards';
            break;
        default:
            targetUrl = '/notifications';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            // لو التطبيق مفتوح → ركّز عليه وانتقل للصفحة
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.postMessage({ type: 'NAVIGATE', url: targetUrl });
                    return;
                }
            }
            // لو التطبيق مغلق → افتحه
            return clients.openWindow(targetUrl);
        })
    );
});

function getNotificationActions(type) {
    if (type === '3ds_challenge') {
        return [
            { action: 'view', title: 'عرض التحدي' },
            { action: 'dismiss', title: 'تجاهل' },
        ];
    }
    return [{ action: 'view', title: 'عرض' }];
}
