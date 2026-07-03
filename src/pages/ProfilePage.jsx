import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, updatePassword } from '../lib/api';
import toast from 'react-hot-toast';
import { User, Lock, Save, Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
    const { user, fetchUser, saveToken } = useAuth();
    const [tab, setTab] = useState('profile'); // profile | password

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <User className="text-blue-600" size={24} />
                الملف الشخصي
            </h2>

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                    onClick={() => setTab('profile')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                        tab === 'profile' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                    }`}
                >
                    البيانات الشخصية
                </button>
                <button
                    onClick={() => setTab('password')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                        tab === 'password' ? 'bg-white shadow text-blue-600' : 'text-gray-500'
                    }`}
                >
                    كلمة المرور
                </button>
            </div>

            {tab === 'profile' ? (
                <ProfileForm user={user} onUpdated={fetchUser} />
            ) : (
                <PasswordForm saveToken={saveToken} />
            )}
        </div>
    );
}

function ProfileForm({ user, onUpdated }) {
    const [name, setName] = useState(user?.name || '');
    const [mobile, setMobile] = useState(user?.mobile || user?.phone || '');
    const [store, setStore] = useState(user?.store || '');
    const [telegram, setTelegram] = useState(user?.telegram || '');
    const [backupEmail, setBackupEmail] = useState(user?.backup_email || '');
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('mobile', mobile);
            if (store) formData.append('store', store);
            if (telegram) formData.append('telegram', telegram);
            if (backupEmail) formData.append('backup_email', backupEmail);
            if (image) formData.append('image', image);

            const res = await updateProfile(formData);
            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }
            toast.success(res.data.message || 'تم تحديث البيانات بنجاح');
            onUpdated();
        } catch (err) {
            const msg = err.response?.data?.message || 'فشل تحديث البيانات';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input
                    type="tel"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    dir="ltr"
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المتجر</label>
                <input
                    type="text"
                    value={store}
                    onChange={e => setStore(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تليجرام</label>
                <input
                    type="text"
                    value={telegram}
                    onChange={e => setTelegram(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    dir="ltr"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">بريد احتياطي</label>
                <input
                    type="email"
                    value={backupEmail}
                    onChange={e => setBackupEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    dir="ltr"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">صورة الملف الشخصي</label>
                <input
                    type="file"
                    accept="image/*"
                    onChange={e => setImage(e.target.files[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
                <Save size={18} />
                {loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
        </form>
    );
}

function PasswordForm({ saveToken }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [logoutOthers, setLogoutOthers] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async e => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('كلمة المرور الجديدة غير متطابقة');
            return;
        }

        setLoading(true);
        try {
            const res = await updatePassword({
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: confirmPassword,
                logout_other_devices: logoutOthers,
            });

            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }

            // The API returns a new token after password change
            if (res.data.token) {
                const cleanToken = res.data.token.replace('Bearer ', '');
                saveToken(cleanToken);
            }

            toast.success(res.data.message || 'تم تغيير كلمة المرور بنجاح');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            const msg = err.response?.data?.message || 'فشل تغيير كلمة المرور';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الحالية</label>
                <div className="relative">
                    <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        dir="ltr"
                        required
                        minLength={8}
                    />
                    <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                        {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور الجديدة</label>
                <div className="relative">
                    <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        dir="ltr"
                        required
                        minLength={8}
                    />
                    <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">تأكيد كلمة المرور</label>
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    dir="ltr"
                    required
                    minLength={8}
                />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={logoutOthers}
                    onChange={e => setLogoutOthers(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">تسجيل خروج من الأجهزة الأخرى</span>
            </label>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
                <Lock size={18} />
                {loading ? 'جاري التحديث...' : 'تغيير كلمة المرور'}
            </button>
        </form>
    );
}
