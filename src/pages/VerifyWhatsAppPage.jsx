import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Phone, Send, CheckCircle, ChevronDown } from 'lucide-react';
import BackButton from '../components/BackButton';
import api from '../lib/api';

const countries = [
    { name: 'سوريا', code: '+963', flag: '🇸🇾' },
    { name: 'تركيا', code: '+90', flag: '🇹🇷' },
    { name: 'مصر', code: '+20', flag: '🇪🇬' },
    { name: 'العراق', code: '+964', flag: '🇮🇶' },
    { name: 'السعودية', code: '+966', flag: '🇸🇦' },
    { name: 'الإمارات', code: '+971', flag: '🇦🇪' },
    { name: 'الأردن', code: '+962', flag: '🇯🇴' },
    { name: 'لبنان', code: '+961', flag: '🇱🇧' },
    { name: 'الكويت', code: '+965', flag: '🇰🇼' },
    { name: 'قطر', code: '+974', flag: '🇶🇦' },
    { name: 'البحرين', code: '+973', flag: '🇧🇭' },
    { name: 'عُمان', code: '+968', flag: '🇴🇲' },
    { name: 'ليبيا', code: '+218', flag: '🇱🇾' },
    { name: 'تونس', code: '+216', flag: '🇹🇳' },
    { name: 'الجزائر', code: '+213', flag: '🇩🇿' },
    { name: 'المغرب', code: '+212', flag: '🇲🇦' },
    { name: 'السودان', code: '+249', flag: '🇸🇩' },
    { name: 'اليمن', code: '+967', flag: '🇾🇪' },
    { name: 'فلسطين', code: '+970', flag: '🇵🇸' },
    { name: 'ألمانيا', code: '+49', flag: '🇩🇪' },
    { name: 'هولندا', code: '+31', flag: '🇳🇱' },
    { name: 'السويد', code: '+46', flag: '🇸🇪' },
    { name: 'فرنسا', code: '+33', flag: '🇫🇷' },
    { name: 'بريطانيا', code: '+44', flag: '🇬🇧' },
    { name: 'أمريكا', code: '+1', flag: '🇺🇸' },
];

export default function VerifyWhatsAppPage() {
    const { user, fetchUser } = useAuth();
    const [countryCode, setCountryCode] = useState('+963');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [code, setCode] = useState('');
    const [step, setStep] = useState('phone'); // phone -> otp -> done
    const [loading, setLoading] = useState(false);

    const phone = countryCode + phoneNumber;

    const whatsappVerified = !!user?.whatsapp_verified_at;

    const handleUpdatePhone = async e => {
        e.preventDefault();
        if (!phoneNumber.trim()) {
            toast.error('أدخل رقم الواتساب');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/user/whatsapp/otp/update-phone', { mobile: phone });
            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }
            toast.success(res.data.message || 'تم تحديث الرقم');
            // Now request OTP
            await handleRequestOtp();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل تحديث الرقم');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = async () => {
        setLoading(true);
        try {
            const res = await api.post('/user/whatsapp/otp/request');
            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }
            toast.success(res.data.message || 'تم إرسال كود التحقق عبر الواتساب');
            setStep('otp');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إرسال الكود');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async e => {
        e.preventDefault();
        if (!code.trim()) {
            toast.error('أدخل كود التحقق');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/user/whatsapp/otp/verify', { code });
            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }
            toast.success(res.data.message || 'تم تأكيد رقم الواتساب بنجاح');
            setStep('done');
            await fetchUser();
        } catch (err) {
            toast.error(err.response?.data?.message || 'كود غير صحيح');
        } finally {
            setLoading(false);
        }
    };

    if (whatsappVerified || step === 'done') {
        return (
            <div className="space-y-5">
                <BackButton to="/identity" />
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                    <p className="font-semibold text-green-800">رقم الواتساب مؤكّد</p>
                    <p className="text-sm text-green-600 mt-1" dir="ltr">
                        {user?.mobile || phone}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <BackButton to="/identity" />

            <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Phone className="text-green-600" size={28} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">تأكيد رقم الواتساب</h2>
                <p className="text-sm text-gray-500 mt-1">سنرسل كود تحقق عبر رسالة واتساب</p>
            </div>

            {step === 'phone' && (
                <form onSubmit={handleUpdatePhone} className="bg-white rounded-xl border p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">رقم الواتساب</label>
                        <div className="flex gap-2" dir="ltr">
                            <div className="relative">
                                <select
                                    value={countryCode}
                                    onChange={e => setCountryCode(e.target.value)}
                                    className="appearance-none w-[120px] px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-sm pr-8"
                                >
                                    {countries.map(c => (
                                        <option key={c.code} value={c.code}>
                                            {c.flag} {c.code}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={14}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                />
                            </div>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="9xxxxxxxx"
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">اختر الدولة ثم أدخل الرقم بدون الصفر</p>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        <Send size={16} />
                        {loading ? 'جاري الإرسال...' : 'إرسال كود التحقق'}
                    </button>
                </form>
            )}

            {step === 'otp' && (
                <form onSubmit={handleVerify} className="bg-white rounded-xl border p-4 space-y-4">
                    <p className="text-sm text-green-600 text-center">✓ تم إرسال الكود عبر الواتساب إلى {phone}</p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">كود التحقق</label>
                        <input
                            type="text"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-center text-lg tracking-widest"
                            placeholder="000000"
                            dir="ltr"
                            maxLength={6}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'جاري التحقق...' : 'تأكيد'}
                    </button>
                    <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={loading}
                        className="w-full text-green-600 text-sm py-1 hover:underline disabled:opacity-50"
                    >
                        إعادة إرسال الكود
                    </button>
                </form>
            )}
        </div>
    );
}
