import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestWhatsAppOtp, verifyWhatsAppOtp } from '../lib/api';
import toast from 'react-hot-toast';
import { Phone, CheckCircle, Loader2 } from 'lucide-react';
import BackButton from '../components/BackButton';

export default function VerifyWhatsAppPage() {
    const { user, fetchUser, whatsappVerificationRequired } = useAuth();
    const [code, setCode] = useState('');
    const [step, setStep] = useState('sending'); // sending -> otp -> done
    const [loading, setLoading] = useState(false);
    const [sendError, setSendError] = useState('');

    const whatsappVerified = !!user?.whatsapp_verified_at;

    // Auto-send OTP when page opens
    useEffect(() => {
        if (whatsappVerificationRequired && !whatsappVerified) {
            sendOtp();
        }
    }, []);

    const sendOtp = async () => {
        setStep('sending');
        setSendError('');
        try {
            const res = await requestWhatsAppOtp();
            if (res.data.error) {
                setSendError(res.data.message);
                setStep('error');
                return;
            }
            toast.success(res.data.message || 'تم إرسال كود التحقق عبر الواتساب');
            setStep('otp');
        } catch (err) {
            const msg = err.response?.data?.message || 'فشل إرسال الكود';
            setSendError(msg);
            setStep('error');
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
            const res = await verifyWhatsAppOtp(code);
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

    if (!whatsappVerificationRequired || whatsappVerified || step === 'done') {
        return (
            <div className="space-y-5">
                <BackButton to="/identity" />
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                    <p className="font-semibold text-green-800">
                        {!whatsappVerificationRequired ? 'تأكيد الواتساب غير مطلوب حالياً' : 'رقم الواتساب مؤكّد'}
                    </p>
                    {whatsappVerificationRequired && (
                        <p className="text-sm text-green-600 mt-1" dir="ltr">
                            {user?.full_number || user?.mobile}
                        </p>
                    )}
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

            {/* Sending state */}
            {step === 'sending' && (
                <div className="bg-white rounded-xl border p-6 text-center space-y-3">
                    <Loader2 className="mx-auto text-green-600 animate-spin" size={32} />
                    <p className="text-sm text-gray-600">جاري إرسال كود التحقق...</p>
                </div>
            )}

            {/* Error state */}
            {step === 'error' && (
                <div className="bg-white rounded-xl border p-4 space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 text-center">
                        {sendError}
                    </div>
                    <button
                        onClick={sendOtp}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                        إعادة المحاولة
                    </button>
                </div>
            )}

            {/* OTP input */}
            {step === 'otp' && (
                <form onSubmit={handleVerify} className="bg-white rounded-xl border p-4 space-y-4">
                    <p className="text-sm text-green-600 text-center">✓ تم إرسال الكود عبر الواتساب إلى رقمك المسجل</p>
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
                            autoFocus
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
                        onClick={sendOtp}
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
