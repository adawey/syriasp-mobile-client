import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Send, CheckCircle } from 'lucide-react';
import BackButton from '../components/BackButton';
import api from '../lib/api';

export default function VerifyEmailPage() {
    const { user, fetchUser } = useAuth();
    const [code, setCode] = useState('');
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [codeSent, setCodeSent] = useState(false);

    const emailVerified = !!user?.email_verified_at;

    const handleSendCode = async () => {
        setSending(true);
        try {
            const res = await api.post('/user/email/send-code');
            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }
            toast.success(res.data.message || 'تم إرسال كود التحقق لبريدك الإلكتروني');
            setCodeSent(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إرسال الكود');
        } finally {
            setSending(false);
        }
    };

    const handleVerify = async e => {
        e.preventDefault();
        if (!code.trim()) {
            toast.error('أدخل كود التحقق');
            return;
        }
        setVerifying(true);
        try {
            const res = await api.post('/user/email/verify', { code });
            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }
            toast.success(res.data.message || 'تم تأكيد البريد الإلكتروني بنجاح');
            await fetchUser();
        } catch (err) {
            toast.error(err.response?.data?.message || 'كود غير صحيح');
        } finally {
            setVerifying(false);
        }
    };

    if (emailVerified) {
        return (
            <div className="space-y-5">
                <BackButton to="/identity" />
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                    <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                    <p className="font-semibold text-green-800">البريد الإلكتروني مؤكّد</p>
                    <p className="text-sm text-green-600 mt-1" dir="ltr">
                        {user?.email}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <BackButton to="/identity" />

            <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail className="text-blue-600" size={28} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">تأكيد البريد الإلكتروني</h2>
                <p className="text-sm text-gray-500 mt-1" dir="ltr">
                    {user?.email}
                </p>
            </div>

            {!codeSent ? (
                <div className="bg-white rounded-xl border p-4 space-y-4">
                    <p className="text-sm text-gray-600 text-center">سنرسل كود تحقق لبريدك الإلكتروني</p>
                    <button
                        onClick={handleSendCode}
                        disabled={sending}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <Send size={16} />
                        {sending ? 'جاري الإرسال...' : 'إرسال كود التحقق'}
                    </button>
                </div>
            ) : (
                <form onSubmit={handleVerify} className="bg-white rounded-xl border p-4 space-y-4">
                    <p className="text-sm text-green-600 text-center">✓ تم إرسال الكود — تحقق من بريدك الإلكتروني</p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">كود التحقق</label>
                        <input
                            type="text"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-lg tracking-widest"
                            placeholder="000000"
                            dir="ltr"
                            maxLength={6}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={verifying}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {verifying ? 'جاري التحقق...' : 'تأكيد'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={sending}
                        className="w-full text-blue-600 text-sm py-1 hover:underline disabled:opacity-50"
                    >
                        {sending ? 'جاري الإرسال...' : 'إعادة إرسال الكود'}
                    </button>
                </form>
            )}
        </div>
    );
}
