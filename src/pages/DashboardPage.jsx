/**
 * ═══════════════════════════════════════════════════════════════
 * 📱 صفحة الرئيسية (Dashboard)
 * ═══════════════════════════════════════════════════════════════
 *
 * ─── API المستخدم ───
 *
 * GET /user (يُحمّل من AuthContext عند بداية التطبيق)
 * Response: {
 *   data: {
 *     user: {
 *       id, name, email, phone,
 *       balance: 100.00,
 *       is_verified: true,
 *       has_pin_code: true
 *     }
 *   }
 * }
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, Wallet, BadgeCheck, ShoppingBag } from 'lucide-react';

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const quickActions = [
        {
            label: 'البطاقات الافتراضية',
            icon: CreditCard,
            color: 'bg-blue-100 text-blue-600',
            path: '/cards',
        },
        {
            label: 'سجل الطلبات',
            icon: ShoppingBag,
            color: 'bg-orange-100 text-orange-600',
            path: '/orders',
        },
        {
            label: 'توثيق الهوية',
            icon: ShieldCheck,
            color: 'bg-green-100 text-green-600',
            path: '/identity',
        },
        {
            label: 'إصدار بطاقة',
            icon: Wallet,
            color: 'bg-purple-100 text-purple-600',
            path: '/cards/issue',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div className="bg-gradient-to-l from-blue-600 to-blue-500 rounded-xl p-5 text-white">
                <p className="text-sm opacity-80">مرحباً</p>
                <h2 className="text-xl font-bold flex items-center gap-2">
                    {user?.name || 'المستخدم'}
                    {user?.is_verified && <BadgeCheck size={20} className="text-white" />}
                </h2>
                <p className="text-sm opacity-70 mt-1">{user?.email}</p>
                {user?.balance !== undefined && (
                    <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-sm opacity-80">الرصيد</p>
                        <p className="text-2xl font-bold">${Number(user.balance).toFixed(2)}</p>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">الإجراءات السريعة</h3>
                <div className="grid grid-cols-4 gap-3">
                    {quickActions.map(action => (
                        <button
                            key={action.path}
                            onClick={() => navigate(action.path)}
                            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className={`p-2 rounded-lg ${action.color}`}>
                                <action.icon size={22} />
                            </div>
                            <span className="text-xs text-gray-700 text-center font-medium">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* User Info */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">معلومات الحساب</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">الاسم</span>
                        <span className="font-medium">{user?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">البريد</span>
                        <span className="font-medium" dir="ltr">
                            {user?.email || '-'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">الهاتف</span>
                        <span className="font-medium" dir="ltr">
                            {user?.phone || '-'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">التوثيق</span>
                        <span className={`font-medium ${user?.is_verified ? 'text-green-600' : 'text-orange-500'}`}>
                            {user?.is_verified ? 'موثّق ✓' : 'غير موثّق'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
