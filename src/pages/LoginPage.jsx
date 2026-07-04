import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../lib/api';
import toast from 'react-hot-toast';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { saveToken, setUser, token, setWhatsappVerificationRequired } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    if (token) {
        navigate('/', { replace: true });
        return null;
    }

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await login(email, password);
            const data = res.data;

            if (data.error) {
                toast.error(data.message || 'فشل تسجيل الدخول');
                return;
            }

            saveToken(data.token);
            if (data.data?.user) {
                setUser(data.data.user);
            }
            if (data.data?.whatsapp_verification_required !== undefined) {
                setWhatsappVerificationRequired(data.data.whatsapp_verification_required);
            }

            toast.success(data.message || 'تم تسجيل الدخول');

            // Check if email verification required
            if (data.data?.email_verification_required) {
                toast('يجب تأكيد البريد الإلكتروني أولاً', { icon: '📧' });
            }

            navigate('/pin');
        } catch (err) {
            console.error('Login error:', err);
            console.error('Response:', err.response?.status, err.response?.data);
            const msg = err.response?.data?.message || err.message || 'خطأ في الاتصال';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <LogIn className="text-blue-600" size={28} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">تسجيل الدخول</h2>
                    <p className="text-gray-500 text-sm mt-1">SyriaSP Mobile</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="email@example.com"
                            required
                            dir="ltr"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="••••••••"
                                required
                                dir="ltr"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'جاري التسجيل...' : 'دخول'}
                    </button>
                </form>
            </div>
        </div>
    );
}
