import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateProfile, updatePassword, getCountries } from '../lib/api';
import { updatePhone } from '../lib/api';
import toast from 'react-hot-toast';
import { User, Lock, Save, Eye, EyeOff, Phone, ChevronDown } from 'lucide-react';

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
    const [store, setStore] = useState(user?.store || '');
    const [telegram, setTelegram] = useState(user?.telegram || '');
    const [backupEmail, setBackupEmail] = useState(user?.backup_email || '');
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);

    // Phone section
    const [countries, setCountries] = useState([]);
    const [countriesLoading, setCountriesLoading] = useState(true);
    const [selectedCountryId, setSelectedCountryId] = useState(user?.country_id || '');
    const [mobile, setMobile] = useState(user?.mobile || '');
    const [phoneLoading, setPhoneLoading] = useState(false);

    useEffect(() => {
        loadCountries();
    }, []);

    const loadCountries = async () => {
        try {
            const res = await getCountries();
            const list = res.data?.data?.countries || res.data?.countries || [];
            setCountries(list);
            if (!selectedCountryId && list.length > 0) {
                // Default to user's country or first one
                const userCountry = list.find(c => c.id === user?.country_id);
                setSelectedCountryId(userCountry ? userCountry.id : list[0].id);
            }
        } catch {
            toast.error('فشل تحميل الدول');
        } finally {
            setCountriesLoading(false);
        }
    };

    const handleProfileSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
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

    const handlePhoneSubmit = async e => {
        e.preventDefault();
        if (!mobile.trim()) {
            toast.error('أدخل رقم الهاتف');
            return;
        }
        if (!selectedCountryId) {
            toast.error('اختر الدولة');
            return;
        }
        setPhoneLoading(true);
        try {
            const res = await updatePhone({
                country_id: selectedCountryId,
                mobile: mobile,
            });
            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }
            toast.success(res.data.message || 'تم تحديث رقم الهاتف');
            onUpdated();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل تحديث الرقم');
        } finally {
            setPhoneLoading(false);
        }
    };

    const selectedCountry = countries.find(c => c.id === Number(selectedCountryId));

    return (
        <div className="space-y-4">
            {/* Personal Info Form */}
            <form onSubmit={handleProfileSubmit} className="bg-white border rounded-xl p-4 space-y-4">
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

            {/* Phone Section */}
            <form onSubmit={handlePhoneSubmit} className="bg-white border rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Phone className="text-green-600" size={20} />
                    <h3 className="text-base font-semibold text-gray-800">رقم الهاتف</h3>
                </div>

                {user?.whatsapp_verified_at && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                        ✓ الرقم مؤكّد عبر واتساب — لا يمكن تغييره إلا من الدعم
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الدولة</label>
                    {countriesLoading ? (
                        <div className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-400">
                            جاري تحميل الدول...
                        </div>
                    ) : (
                        <div className="relative">
                            <select
                                value={selectedCountryId}
                                onChange={e => setSelectedCountryId(Number(e.target.value))}
                                disabled={!!user?.whatsapp_verified_at}
                                className="w-full appearance-none px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                {countries.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.emoji} {c.name_ar} ({c.phone_code})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                    <div className="flex gap-2" dir="ltr">
                        <span className="inline-flex items-center px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600 min-w-[80px] justify-center">
                            {selectedCountry?.phone_code || '---'}
                        </span>
                        <input
                            type="tel"
                            value={mobile}
                            onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                            disabled={!!user?.whatsapp_verified_at}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="9xxxxxxxx"
                        />
                    </div>
                    {selectedCountry?.phone_digits && (
                        <p className="text-xs text-gray-400 mt-1">
                            عدد الأرقام المطلوب: {selectedCountry.phone_digits}
                        </p>
                    )}
                </div>

                {!user?.whatsapp_verified_at && (
                    <button
                        type="submit"
                        disabled={phoneLoading}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        <Save size={18} />
                        {phoneLoading ? 'جاري الحفظ...' : 'حفظ رقم الهاتف'}
                    </button>
                )}
            </form>
        </div>
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
