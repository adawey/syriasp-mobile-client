import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCardProviders, registerWithProvider, getRegistrationStatus, issueCard } from '../lib/api';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import BackButton from '../components/BackButton';

export default function IssueCardPage() {
    const navigate = useNavigate();
    const [providers, setProviders] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [regStatus, setRegStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [issuing, setIssuing] = useState(false);
    const [amount, setAmount] = useState('');
    const [cardName, setCardName] = useState('');

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            const res = await getCardProviders();
            setProviders(res.data.data?.providers || []);
        } catch (err) {
            toast.error('فشل في تحميل مزوّدي البطاقات');
        } finally {
            setLoading(false);
        }
    };

    const selectProvider = async provider => {
        setSelectedProvider(provider);
        // Check registration status
        try {
            const res = await getRegistrationStatus(provider.public_code);
            setRegStatus(res.data.data);
        } catch {
            setRegStatus(null);
        }
    };

    const handleRegister = async () => {
        if (!selectedProvider) return;
        try {
            const res = await registerWithProvider(selectedProvider.public_code);
            toast.success(res.data.message || 'تم التسجيل');
            // Refresh status
            const statusRes = await getRegistrationStatus(selectedProvider.public_code);
            setRegStatus(statusRes.data.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل التسجيل');
        }
    };

    const handleIssue = async e => {
        e.preventDefault();
        if (!selectedProvider) return;

        const balanceValue = selectedProvider.fixed_initial_balance_usd
            ? Number(selectedProvider.fixed_initial_balance_usd)
            : Number(amount);

        if (!balanceValue || balanceValue <= 0) {
            toast.error('يرجى إدخال مبلغ الرصيد المبدئي');
            return;
        }

        setIssuing(true);
        try {
            const data = {
                public_code: selectedProvider.public_code,
                initial_balance: balanceValue,
                name: cardName,
            };

            const res = await issueCard(data);
            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }
            toast.success(res.data.message || 'تم إصدار البطاقة بنجاح!');
            navigate('/cards');
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إصدار البطاقة');
        } finally {
            setIssuing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <BackButton to="/cards" label="رجوع للبطاقات" />
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <CreditCard className="text-purple-600" size={24} />
                إصدار بطاقة جديدة
            </h2>

            {/* Provider Selection */}
            {!selectedProvider ? (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600">اختر مزوّد البطاقات:</p>
                    {providers.length === 0 ? (
                        <p className="text-center text-gray-400 py-6">لا يوجد مزوّدين متاحين حالياً</p>
                    ) : (
                        providers.map(p => (
                            <button
                                key={p.public_code}
                                onClick={() => selectProvider(p)}
                                className="w-full bg-white border rounded-xl p-4 text-right hover:border-blue-400 hover:shadow-md transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-800">{p.display_name}</span>
                                    <CreditCard size={20} className="text-gray-400" />
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                                    {p.fees?.apply_fee_usd > 0 && <span>رسوم الإصدار: ${p.fees.apply_fee_usd}</span>}
                                    {p.min_initial_balance_usd > 0 && (
                                        <span>الحد الأدنى: ${p.min_initial_balance_usd}</span>
                                    )}
                                    {p.capabilities?.supports_freeze && <span className="text-blue-500">✓ تجميد</span>}
                                    {p.capabilities?.supports_topup && <span className="text-green-500">✓ شحن</span>}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Selected provider info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-blue-800">{selectedProvider.display_name}</p>
                                {selectedProvider.fees?.apply_fee_usd > 0 && (
                                    <p className="text-xs text-blue-600">
                                        رسوم الإصدار: ${selectedProvider.fees.apply_fee_usd}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedProvider(null);
                                    setRegStatus(null);
                                }}
                                className="text-xs text-blue-600 underline"
                            >
                                تغيير
                            </button>
                        </div>
                    </div>

                    {/* Registration check */}
                    {regStatus && !regStatus.registered && selectedProvider.capabilities?.requires_registration && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle size={18} className="text-yellow-600" />
                                <span className="font-medium text-yellow-800">يجب التسجيل أولاً</span>
                            </div>
                            <button
                                onClick={handleRegister}
                                className="w-full bg-yellow-500 text-white py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
                            >
                                تسجيل مع المزوّد
                            </button>
                        </div>
                    )}

                    {/* KYC check */}
                    {regStatus &&
                        regStatus.registered &&
                        !regStatus.kyc_approved &&
                        selectedProvider.capabilities?.requires_kyc && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle size={18} className="text-orange-600" />
                                    <span className="font-medium text-orange-800">
                                        يتطلب KYC - الحالة: {regStatus.kyc_status || 'غير مقدّم'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate(`/cards/kyc?provider=${selectedProvider.public_code}`)}
                                    className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                                >
                                    إكمال توثيق KYC
                                </button>
                            </div>
                        )}

                    {/* Issue form */}
                    {(!selectedProvider.capabilities?.requires_registration ||
                        (regStatus?.registered &&
                            (!selectedProvider.capabilities?.requires_kyc || regStatus?.kyc_approved))) && (
                        <form onSubmit={handleIssue} className="bg-white border rounded-xl p-4 space-y-4">
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle size={18} />
                                <span className="font-medium">جاهز لإصدار البطاقة</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    الاسم على البطاقة
                                </label>
                                <input
                                    type="text"
                                    value={cardName}
                                    onChange={e => setCardName(e.target.value)}
                                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="مثال: Ahmed Adawe"
                                    dir="ltr"
                                    required
                                />
                            </div>

                            {selectedProvider.fixed_initial_balance_usd ? (
                                <p className="text-sm text-gray-600">
                                    الرصيد المبدئي ثابت: ${selectedProvider.fixed_initial_balance_usd}
                                </p>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        الرصيد المبدئي (بالدولار)
                                        {selectedProvider.min_initial_balance_usd > 0 && (
                                            <span className="text-gray-400 mr-1">
                                                - الحد الأدنى ${selectedProvider.min_initial_balance_usd}
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="number"
                                        min={selectedProvider.min_initial_balance_usd || 1}
                                        step="0.01"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder={`${selectedProvider.min_initial_balance_usd || 5}`}
                                        dir="ltr"
                                        required
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={issuing}
                                className="w-full bg-purple-600 text-white py-2.5 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                                {issuing ? 'جاري الإصدار...' : 'إصدار البطاقة'}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}
