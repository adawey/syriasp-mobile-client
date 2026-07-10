/**
 * ═══════════════════════════════════════════════════════════════
 * 📱 صفحة تأكيد / إنشاء كود الحماية (PIN)
 * ═══════════════════════════════════════════════════════════════
 *
 * ─── APIs المستخدمة ───
 *
 * 1. POST /user/security/ConfirmPinCode
 *    الوظيفة: تأكيد PIN الموجود (مطلوب قبل عمليات البطاقة)
 *    Request: { pin_code: "1234" }
 *    Response: { error: false, message: "تم التحقق" }
 *    ⚠️ بعد التأكيد → الـ endpoints اللي عليها pin.recent تعمل لفترة محدودة
 *
 * 2. POST /user/security/SetPinCode
 *    الوظيفة: إنشاء PIN لأول مرة
 *    Request: { pin_code: "1234", password: "user_password" }
 *    Response: { error: false, message: "تم تعيين كود الحماية" }
 *
 * ─── ملاحظة مهمة ───
 * الـ endpoints التالية تحتاج pin.recent:
 * - GET /cards/{card}
 * - GET /cards/{card}/balance
 * - GET /cards/{card}/info
 * - POST /cards/issue
 * - POST /cards/{card}/topup
 * - POST /cards/{card}/freeze
 * - POST /cards/{card}/unfreeze
 * - POST /cards/{card}/close
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { confirmPin, setPinCode } from '../lib/api';
import toast from 'react-hot-toast';
import { Lock, ShieldPlus } from 'lucide-react';

export default function PinPage() {
    const { user, token, setPinVerified, fetchUser } = useAuth();
    const navigate = useNavigate();

    // If session expired (no token or no user), redirect to login
    useEffect(() => {
        if (!token || (!user && !fetchUser)) {
            navigate('/login', { replace: true });
        }
    }, [token, user, navigate]);

    // Determine if user has a PIN set
    const hasPin = user?.has_pin_code ?? user?.pin_code_set ?? true;

    if (!hasPin) {
        return (
            <SetPinView
                onSuccess={() => {
                    fetchUser();
                }}
            />
        );
    }

    return <ConfirmPinView />;
}

// --- Confirm PIN (existing flow) ---
function ConfirmPinView() {
    const [pin, setPin] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const { setPinVerified, logout } = useAuth();
    const navigate = useNavigate();
    const inputsRef = useRef([]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value.slice(-1);
        setPin(newPin);

        if (value && index < 3) {
            inputsRef.current[index + 1]?.focus();
        }

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
            if (res.data.error || res.data.err) {
                toast.error(res.data.message || res.data.msg || 'كود خاطئ');
                setPin(['', '', '', '']);
                inputsRef.current[0]?.focus();
                return;
            }
            setPinVerified(true);
            toast.success('تم التحقق بنجاح');
            navigate('/', { replace: true });
        } catch (err) {
            if (err.response?.status === 401) {
                // Session expired — interceptor will handle redirect
                toast.error('انتهت صلاحية الجلسة، الرجاء تسجيل الدخول من جديد');
                return;
            }
            const msg = err.response?.data?.message || err.response?.data?.msg || 'فشل التحقق';
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

// --- Set PIN (new flow) ---
function SetPinView({ onSuccess }) {
    const [step, setStep] = useState(1); // 1 = enter PIN, 2 = confirm PIN
    const [pin, setPin] = useState(['', '', '', '']);
    const [confirmPinValue, setConfirmPinValue] = useState(['', '', '', '']);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { setPinVerified } = useAuth();
    const navigate = useNavigate();
    const inputsRef = useRef([]);
    const confirmInputsRef = useRef([]);

    const handlePinChange = (index, value, currentPin, setCurrentPin, refs, onComplete) => {
        if (!/^\d*$/.test(value)) return;

        const newPin = [...currentPin];
        newPin[index] = value.slice(-1);
        setCurrentPin(newPin);

        if (value && index < 3) {
            refs.current[index + 1]?.focus();
        }

        if (newPin.every(d => d !== '') && onComplete) {
            onComplete(newPin.join(''));
        }
    };

    const handleKeyDown = (index, currentPin, refs) => e => {
        if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
            refs.current[index - 1]?.focus();
        }
    };

    const handleFirstPinComplete = pinCode => {
        // Move to confirm step
        setStep(2);
        setTimeout(() => confirmInputsRef.current[0]?.focus(), 100);
    };

    const handleConfirmPinComplete = async confirmCode => {
        const originalPin = pin.join('');
        if (confirmCode !== originalPin) {
            toast.error('كود PIN غير متطابق، أعد المحاولة');
            setConfirmPinValue(['', '', '', '']);
            confirmInputsRef.current[0]?.focus();
            return;
        }
        // PIN matches, now need password
        setStep(3);
    };

    const handleSetPin = async e => {
        e.preventDefault();
        if (!password) {
            toast.error('يرجى إدخال كلمة المرور');
            return;
        }

        const pinCode = pin.join('');
        setLoading(true);
        try {
            const res = await setPinCode(pinCode, password);
            if (res.data.error || res.data.err) {
                toast.error(res.data.message || res.data.msg || 'فشل تعيين كود الحماية');
                return;
            }
            toast.success(res.data.message || res.data.msg || 'تم تعيين كود الحماية بنجاح');
            setPinVerified(true);
            if (onSuccess) onSuccess();
            navigate('/', { replace: true });
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.msg || 'فشل تعيين كود الحماية';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const resetFlow = () => {
        setStep(1);
        setPin(['', '', '', '']);
        setConfirmPinValue(['', '', '', '']);
        setPassword('');
        setTimeout(() => inputsRef.current[0]?.focus(), 100);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-green-700 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ShieldPlus className="text-green-600" size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">إنشاء كود حماية</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {step === 1 && 'أدخل كود PIN من 4 أرقام'}
                        {step === 2 && 'أعد إدخال الكود للتأكيد'}
                        {step === 3 && 'أدخل كلمة المرور لتأكيد التعيين'}
                    </p>
                </div>

                {/* Step 1: Enter PIN */}
                {step === 1 && (
                    <div className="flex justify-center gap-2 mb-6" dir="ltr">
                        {pin.map((digit, i) => (
                            <input
                                key={i}
                                ref={el => (inputsRef.current[i] = el)}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e =>
                                    handlePinChange(i, e.target.value, pin, setPin, inputsRef, handleFirstPinComplete)
                                }
                                onKeyDown={handleKeyDown(i, pin, inputsRef)}
                                className="w-10 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                                disabled={loading}
                            />
                        ))}
                    </div>
                )}

                {/* Step 2: Confirm PIN */}
                {step === 2 && (
                    <>
                        <div className="flex justify-center gap-2 mb-4" dir="ltr">
                            {confirmPinValue.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={el => (confirmInputsRef.current[i] = el)}
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e =>
                                        handlePinChange(
                                            i,
                                            e.target.value,
                                            confirmPinValue,
                                            setConfirmPinValue,
                                            confirmInputsRef,
                                            handleConfirmPinComplete
                                        )
                                    }
                                    onKeyDown={handleKeyDown(i, confirmPinValue, confirmInputsRef)}
                                    className="w-10 h-12 text-center text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                                    disabled={loading}
                                />
                            ))}
                        </div>
                        <button onClick={resetFlow} className="w-full text-gray-500 text-sm py-2 hover:text-gray-700">
                            إعادة الإدخال
                        </button>
                    </>
                )}

                {/* Step 3: Password confirmation */}
                {step === 3 && (
                    <form onSubmit={handleSetPin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                    placeholder="أدخل كلمة المرور"
                                    required
                                    dir="ltr"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
                                >
                                    {showPassword ? 'إخفاء' : 'إظهار'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'جاري التعيين...' : 'تعيين كود الحماية'}
                        </button>

                        <button
                            type="button"
                            onClick={resetFlow}
                            className="w-full text-gray-500 text-sm py-2 hover:text-gray-700"
                        >
                            إعادة من البداية
                        </button>
                    </form>
                )}

                {loading && step !== 3 && (
                    <div className="text-center text-sm text-gray-500 mb-4">جاري المعالجة...</div>
                )}

                {/* Steps indicator */}
                <div className="flex justify-center gap-2 mt-4">
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={`w-2 h-2 rounded-full ${s === step ? 'bg-green-600' : s < step ? 'bg-green-300' : 'bg-gray-300'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
