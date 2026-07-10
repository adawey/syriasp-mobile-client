/**
 * ═══════════════════════════════════════════════════════════════
 * 📱 صفحة الإشعارات + تحديات 3DS + Firebase Push Notifications
 * ═══════════════════════════════════════════════════════════════
 *
 * ─── APIs المستخدمة ───
 *
 * 1. GET /notifications?page=1&limit=20
 *    Response (200): {
 *      success: true,
 *      data: {
 *        notifications: [...],
 *        total: 45,
 *        total_pages: 3,
 *        current_page: 1,
 *        per_page: 20,
 *        notifications_count: 45
 *      }
 *    }
 *
 * 2. POST /notifications/mark-as-read?id={notificationId}
 *    Response (200): { success: true, message: "تم تمييز الإشعار كمقروء بنجاح" }
 *
 * 3. POST /notifications/mark-all-as-read
 *    Response (200): { success: true, message: "تم تمييز 12 إشعار كمقروء", data: { marked_count: 12 } }
 *
 * 4. GET /card-3ds
 *    Response: {
 *      data: {
 *        challenges: [{
 *          id: 5,
 *          provider_code: "provider_abc",
 *          merchant_name: "Amazon",
 *          amount: 29.99,
 *          currency: "USD",
 *          verification_type: "otp" | "http",
 *          status: "pending",
 *          status_label: "بانتظار التأكيد",
 *          expires_at: "2025-01-15T10:05:00+00:00"
 *        }]
 *      }
 *    }
 *
 * 5. POST /card-3ds/{challenge}/reveal-otp
 *    Response: { data: { otp: "482951" } }
 *    ⚠️ مرة واحدة فقط — لا يمكن إعادة الكشف
 *
 * 6. POST /card-3ds/{challenge}/approve
 *    Response: { message: "تمت الموافقة على التحدي" }
 *
 * 7. POST /card-3ds/{challenge}/deny
 *    Response: { message: "تم رفض التحدي" }
 *
 * ─── Firebase Push Notifications (FCM) ───
 *
 * 8. POST /user/device-tokens
 *    الوظيفة: تسجيل توكن FCM بعد منح الإذن
 *    Request: { token: "...", device_type: "web", device_name: "Chrome", app_version: "1.0.0" }
 *    Response (201): { success: true, data: { id: 5, device_type: "web" } }
 *
 * 9. POST /user/device-tokens/{token}/ping
 *    الوظيفة: تحديث last_used_at (يُستدعى دورياً أو عند فتح التطبيق)
 *    Response (200): { success: true, data: { last_used_at: "..." } }
 *
 * 10. POST /user/device-tokens/testFirebase
 *     الوظيفة: إشعار تجريبي لجميع أجهزة المستخدم
 *
 * ─── أنواع Push Notifications ───
 * - type: "3ds_challenge" → تحدي جديد → يُضاف مباشرة للقائمة
 * - type: "card_operation" → عملية بطاقة اكتملت (issue/topup)
 * - type: "card_status" → تغيّر حالة بطاقة
 * - type: "general" → إشعار عام
 *
 * ─── Broadcast Channels (WebSocket/Reverb) ───
 * - private-App.Models.User.{userId} → إشعارات المستخدم الشخصية
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect } from 'react';
import {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    get3dsChallenges,
    reveal3dsOtp,
    approve3dsChallenge,
    deny3dsChallenge,
    registerDeviceToken,
    testFirebaseNotification,
} from '../lib/api';
import { requestNotificationPermission, onForegroundMessage, initFirebase } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, ShieldAlert, Eye, CheckCircle, XCircle, Clock, BellRing, Send } from 'lucide-react';
import BackButton from '../components/BackButton';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [actionLoading, setActionLoading] = useState('');
    const [pushEnabled, setPushEnabled] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);

    useEffect(() => {
        loadData();
        checkPushStatus();
        setupForegroundListener();
    }, []);

    // ─── Firebase Push: الاستماع للإشعارات أثناء تواجد المستخدم (foreground) ───
    const setupForegroundListener = () => {
        try {
            initFirebase();
            onForegroundMessage(payload => {
                console.log('📩 Push received:', payload);
                const data = payload.data || {};

                // ═══ عرض System Notification حتى لو التطبيق مفتوح ═══
                showBrowserNotification(payload);

                // عند وصول تحدي 3DS جديد → أضفه مباشرة للقائمة
                if (data.type === '3ds_challenge') {
                    const newChallenge = {
                        id: parseInt(data.challenge_id),
                        provider_code: data.provider_code,
                        merchant_name: data.merchant_name,
                        amount: parseFloat(data.amount),
                        currency: data.currency || 'USD',
                        verification_type: data.verification_type,
                        status: 'pending',
                        status_label: 'بانتظار التأكيد',
                        expires_at: data.expires_at,
                    };
                    setChallenges(prev => {
                        if (prev.find(c => c.id === newChallenge.id)) return prev;
                        return [newChallenge, ...prev];
                    });
                    toast(payload.notification?.title || 'تحدي 3DS جديد!', {
                        icon: '🛡️',
                        duration: 8000,
                    });
                } else {
                    // إشعار عام → أعد تحميل الإشعارات
                    toast(payload.notification?.title || 'إشعار جديد', { icon: '🔔' });
                    loadData();
                }
            });
        } catch (e) {
            console.warn('Firebase foreground listener not available:', e);
        }
    };

    // ─── عرض إشعار المتصفح (system notification) حتى لو التطبيق مفتوح ───
    const showBrowserNotification = payload => {
        if (Notification.permission !== 'granted') return;

        const title = payload.notification?.title || 'SyriaSP';
        const options = {
            body: payload.notification?.body || '',
            icon: '/vite.svg',
            badge: '/vite.svg',
            tag: payload.data?.type || 'general',
            vibrate: payload.data?.type === '3ds_challenge' ? [200, 100, 200, 100, 200] : [200, 100, 200],
            requireInteraction: payload.data?.type === '3ds_challenge',
        };

        // عرض الإشعار عبر Service Worker (أفضل) أو مباشرة
        if (navigator.serviceWorker?.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
            });
        } else {
            new Notification(title, options);
        }
    };

    // ─── تفعيل Push Notifications ───
    const checkPushStatus = () => {
        if ('Notification' in window) {
            setPushEnabled(Notification.permission === 'granted' && !!localStorage.getItem('fcm_token'));
        }
    };

    const handleEnablePush = async () => {
        setPushLoading(true);
        try {
            // تحقق أولاً لو الإشعارات محظورة من المتصفح
            if ('Notification' in window && Notification.permission === 'denied') {
                toast.error('الإشعارات محظورة من المتصفح.\nاضغط على 🔒 بجوار العنوان → Notifications → Allow', {
                    duration: 6000,
                });
                setPushLoading(false);
                return;
            }

            const token = await requestNotificationPermission();
            if (token) {
                // تسجيل التوكن في السيرفر
                await registerDeviceToken(token);
                localStorage.setItem('fcm_token', token);
                setPushEnabled(true);
                toast.success('تم تفعيل الإشعارات الفورية');
            } else {
                // توضيح السبب
                if ('Notification' in window && Notification.permission === 'denied') {
                    toast.error('تم رفض الإذن. فعّل الإشعارات من إعدادات المتصفح', { duration: 5000 });
                } else {
                    toast.error('فشل في الحصول على توكن الإشعارات. تأكد أنك على HTTPS أو localhost');
                }
            }
        } catch (err) {
            console.error('Push registration error:', err);
            toast.error('فشل في تفعيل الإشعارات');
        } finally {
            setPushLoading(false);
        }
    };

    // ─── إرسال إشعار تجريبي ───
    const handleTestNotification = async () => {
        try {
            await testFirebaseNotification();
            toast.success('تم إرسال إشعار تجريبي');
        } catch {
            toast.error('فشل إرسال الإشعار التجريبي');
        }
    };

    // ─── تحميل البيانات ───
    const loadData = async () => {
        try {
            const [notifRes, challengeRes] = await Promise.allSettled([
                getNotifications({ page: 1, limit: 20 }),
                get3dsChallenges(),
            ]);

            if (notifRes.status === 'fulfilled') {
                const data = notifRes.value.data.data;
                setNotifications(data?.notifications || []);
                setUnreadCount(data?.notifications_count || 0);
            }

            if (challengeRes.status === 'fulfilled') {
                setChallenges(challengeRes.value.data.data?.challenges || []);
            }
        } catch {
            toast.error('فشل في تحميل الإشعارات');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkRead = async id => {
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch {
            toast.error('فشل في تمييز الإشعار');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            toast.success('تم تمييز الكل كمقروء');
        } catch {
            toast.error('فشل في العملية');
        }
    };

    // ─── 3DS Challenge Actions ───
    const handleRevealOtp = async challenge => {
        setActionLoading(`otp-${challenge.id}`);
        try {
            const res = await reveal3dsOtp(challenge.id);
            const otp = res.data.data?.otp;
            if (otp) {
                toast.success(`رمز التحقق: ${otp}`, { duration: 10000 });
                setChallenges(prev => prev.filter(c => c.id !== challenge.id));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل في كشف الرمز');
        } finally {
            setActionLoading('');
        }
    };

    const handleApprove = async challenge => {
        setActionLoading(`approve-${challenge.id}`);
        try {
            await approve3dsChallenge(challenge.id);
            toast.success('تمت الموافقة');
            setChallenges(prev => prev.filter(c => c.id !== challenge.id));
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل الموافقة');
        } finally {
            setActionLoading('');
        }
    };

    const handleDeny = async challenge => {
        setActionLoading(`deny-${challenge.id}`);
        try {
            await deny3dsChallenge(challenge.id);
            toast.success('تم الرفض');
            setChallenges(prev => prev.filter(c => c.id !== challenge.id));
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل الرفض');
        } finally {
            setActionLoading('');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <BackButton to="/" />
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Bell className="text-blue-600" size={24} />
                    الإشعارات
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                </h2>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-sm text-blue-600 font-medium"
                    >
                        <CheckCheck size={16} />
                        قراءة الكل
                    </button>
                )}
            </div>

            {/* Push Notification Banner */}
            {!pushEnabled && (
                <div className="bg-gradient-to-l from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <BellRing size={20} className="text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-800 text-sm">الإشعارات الفورية</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                فعّل الإشعارات لاستقبال تحديات 3DS وتحديثات البطاقة لحظياً
                            </p>
                        </div>
                        <button
                            onClick={handleEnablePush}
                            disabled={pushLoading}
                            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                            {pushLoading ? '...' : 'تفعيل'}
                        </button>
                    </div>
                </div>
            )}

            {pushEnabled && (
                <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-600" />
                        <span className="text-xs text-green-700 font-medium">الإشعارات الفورية مفعّلة</span>
                    </div>
                    <button
                        onClick={handleTestNotification}
                        className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:text-blue-700"
                    >
                        <Send size={12} />
                        تجريبي
                    </button>
                </div>
            )}

            {/* 3DS Challenges */}
            {challenges.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-red-600 flex items-center gap-1">
                        <ShieldAlert size={16} />
                        تحديات المصادقة (3DS) — تتطلب إجراء فوري
                    </h3>
                    {challenges.map(challenge => (
                        <div key={challenge.id} className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-gray-800">{challenge.merchant_name || 'معاملة'}</p>
                                    <p className="text-sm text-gray-500">
                                        {challenge.amount} {challenge.currency || 'USD'}
                                    </p>
                                </div>
                                <div className="text-left">
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                        {challenge.verification_type === 'otp' ? 'OTP' : 'موافقة'}
                                    </span>
                                    {challenge.expires_at && (
                                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                            <Clock size={10} />
                                            {new Date(challenge.expires_at).toLocaleTimeString('ar-EG', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {challenge.verification_type === 'otp' ? (
                                <button
                                    onClick={() => handleRevealOtp(challenge)}
                                    disabled={actionLoading === `otp-${challenge.id}`}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <Eye size={16} />
                                    {actionLoading === `otp-${challenge.id}` ? 'جاري الكشف...' : 'كشف رمز OTP'}
                                </button>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handleApprove(challenge)}
                                        disabled={actionLoading === `approve-${challenge.id}`}
                                        className="flex items-center justify-center gap-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                                    >
                                        <CheckCircle size={16} />
                                        {actionLoading === `approve-${challenge.id}` ? '...' : 'موافقة'}
                                    </button>
                                    <button
                                        onClick={() => handleDeny(challenge)}
                                        disabled={actionLoading === `deny-${challenge.id}`}
                                        className="flex items-center justify-center gap-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                                    >
                                        <XCircle size={16} />
                                        {actionLoading === `deny-${challenge.id}` ? '...' : 'رفض'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Notifications */}
            {notifications.length === 0 && challenges.length === 0 ? (
                <div className="text-center py-12">
                    <Bell className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500">لا توجد إشعارات</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map(notif => (
                        <div
                            key={notif.id}
                            onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                            className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                                notif.is_read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <p
                                        className={`text-sm ${notif.is_read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}
                                        dangerouslySetInnerHTML={{ __html: notif.title }}
                                    />
                                    {notif.content && (
                                        <p
                                            className="text-xs text-gray-500 mt-1 line-clamp-2"
                                            dangerouslySetInnerHTML={{ __html: notif.content }}
                                        />
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">
                                        {notif.created_at
                                            ? new Date(notif.created_at).toLocaleDateString('ar-EG', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit',
                                              })
                                            : ''}
                                    </p>
                                </div>
                                {!notif.is_read && (
                                    <span className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
