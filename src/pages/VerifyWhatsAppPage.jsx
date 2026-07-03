import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Phone, Send, CheckCircle } from 'lucide-react';
import BackButton from '../components/BackButton';
import api from '../lib/api';

export default function VerifyWhatsAppPage() {
    const { user, fetchUser } = useAuth();
    const [phone, setPhone] = useState(user?.mobile || '');
    const [code, setCode] = useState('');
    const [step, setStep] = useState('phone'); // phone -> otp -> done
    const [loading, setLoading] = useState(false);

    const whatsappVerified = !!user?.whatsapp_verified_at;

    const handleUpdatePhone = async e => {
        e.preventDefault();
        if (!phone.trim()) {
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
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="+963xxxxxxxxx"
                            dir="ltr"
                            required
                        />
                        <p className="text-xs text-gray-400 mt-1">أدخل الرقم مع مفتاح الدولة</p>
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
