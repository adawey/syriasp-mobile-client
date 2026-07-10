import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { confirmPin } from '../lib/api';
import toast from 'react-hot-toast';
import { Lock } from 'lucide-react';

export default function PinPage() {
    const [pin, setPin] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const { setPinVerified } = useAuth();
    const navigate = useNavigate();
    const inputsRef = useRef([]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value.slice(-1);
        setPin(newPin);

        // Auto-focus next
        if (value && index < 3) {
            inputsRef.current[index + 1]?.focus();
        }

        // Auto-submit when all filled
        if (newPin.every(d => d !== '')) {
            handleSubmit(newPin.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async pinCode => {
        if (!pinCode || pinCode.length < 4) return;
        setLoading(true);
        try {
            const res = await confirmPin(pinCode);
            if (res.data.error) {
                toast.error(res.data.message || 'كود خاطئ');
                setPin(['', '', '', '']);
                inputsRef.current[0]?.focus();
                return;
            }
            setPinVerified(true);
            toast.success('تم التحقق بنجاح');
            navigate('/', { replace: true });
        } catch (err) {
            const msg = err.response?.data?.message || 'فشل التحقق';
            toast.error(msg);
            setPin(['', '', '', '']);
            inputsRef.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Lock className="text-yellow-600" size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">تأكيد كود الحماية</h2>
                    <p className="text-gray-500 text-sm mt-1">أدخل كود PIN المكوّن من 4 أرقام</p>
                </div>

                <div className="flex justify-center gap-2 mb-6" dir="ltr">
                    {pin.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => (inputsRef.current[i] = el)}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleChange(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                            className="w-10 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                            disabled={loading}
                        />
                    ))}
                </div>

                {loading && <div className="text-center text-sm text-gray-500 mb-4">جاري التحقق...</div>}
            </div>
        </div>
    );
}
