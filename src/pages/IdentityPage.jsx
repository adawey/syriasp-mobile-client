import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getVerificationStatus,
    submitVerification,
    getVerificationHistory,
    getKycStatus,
    getCardProviders,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
    ShieldCheck,
    Upload,
    Clock,
    CheckCircle,
    XCircle,
    CreditCard,
    ArrowLeft,
    BadgeCheck,
    Mail,
    Phone,
    AlertTriangle,
} from 'lucide-react';
import BackButton from '../components/BackButton';

export default function IdentityPage() {
    const navigate = useNavigate();
    const { user, whatsappVerificationRequired } = useAuth();
    const [status, setStatus] = useState(null);
    const [history, setHistory] = useState([]);
    const [kycStatuses, setKycStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [frontImage, setFrontImage] = useState(null);
    const [backImage, setBackImage] = useState(null);
    const [selfieImage, setSelfieImage] = useState(null);

    const emailVerified = !!user?.email_verified_at;
    const whatsappVerified = !whatsappVerificationRequired || !!user?.whatsapp_verified_at;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statusRes, historyRes, providersRes] = await Promise.allSettled([
                getVerificationStatus(),
                getVerificationHistory(),
                getCardProviders(),
            ]);

            if (statusRes.status === 'fulfilled') {
                setStatus(statusRes.value.data.data);
            }
            if (historyRes.status === 'fulfilled') {
                setHistory(historyRes.value.data.data?.verifications || []);
            }

            if (providersRes.status === 'fulfilled') {
                const providers = providersRes.value.data.data?.providers || [];
                const kycResults = await Promise.allSettled(
                    providers.map(async p => {
                        try {
                            const res = await getKycStatus({ public_code: p.public_code });
                            return { provider: p, status: res.data.data };
                        } catch {
                            return { provider: p, status: null };
                        }
                    })
                );
                setKycStatuses(kycResults.filter(r => r.status === 'fulfilled').map(r => r.value));
            }
        } catch {
            toast.error('فشل في تحميل بيانات التوثيق');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!frontImage || !backImage) {
            toast.error('يرجى رفع صورة الهوية الأمامية والخلفية');
            return;
        }

        const formData = new FormData();
        formData.append('front_image', frontImage);
        formData.append('back_image', backImage);
        if (selfieImage) formData.append('selfie_image', selfieImage);

        setSubmitting(true);
        try {
            const res = await submitVerification(formData);
            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }
            toast.success(res.data.message || 'تم إرسال الطلب بنجاح');
            setFrontImage(null);
            setBackImage(null);
            setSelfieImage(null);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إرسال الطلب');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const isIdentityVerified = status?.is_verified;

    // Check if any KYC is not approved
    const hasIncompleteKyc = kycStatuses.some(({ status: kycStatus }) => !kycStatus?.kyc_approved);

    return (
        <div className="space-y-5">
            <BackButton to="/" />

            {/* ══════════════════════════════════════════════
                توثيق هوية الموقع
            ══════════════════════════════════════════════ */}
            <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ShieldCheck className="text-green-600" size={22} />
                        توثيق هوية الموقع
                    </h2>
                    {isIdentityVerified && <BadgeCheck className="text-blue-500" size={22} />}
                </div>

                {isIdentityVerified ? (
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle size={16} />
                        <span className="text-sm font-medium">الهوية موثّقة ✓</span>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 text-orange-500 mb-3">
                            <AlertTriangle size={16} />
                            <span className="text-sm">الهوية غير موثّقة</span>
                            {status?.current_status === 'pending' && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mr-1">
                                    قيد المراجعة
                                </span>
                            )}
                        </div>

                        {status?.current_status !== 'pending' && (
                            <form onSubmit={handleSubmit} className="space-y-3 mt-3 pt-3 border-t">
                                <FileInput
                                    label="صورة الهوية - الأمامية *"
                                    file={frontImage}
                                    onChange={setFrontImage}
                                    required
                                />
                                <FileInput
                                    label="صورة الهوية - الخلفية *"
                                    file={backImage}
                                    onChange={setBackImage}
                                    required
                                />
                                <FileInput label="صورة سيلفي (اختياري)" file={selfieImage} onChange={setSelfieImage} />
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                                >
                                    {submitting ? 'جاري الإرسال...' : 'إرسال طلب التوثيق'}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {/* History */}
                {history.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                        <p className="text-xs font-semibold text-gray-500">السجل</p>
                        {history.slice(0, 3).map((v, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">{new Date(v.created_at).toLocaleDateString('ar')}</span>
                                <StatusBadge status={v.status} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════
                توثيق KYC للبطاقات
            ══════════════════════════════════════════════ */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <CreditCard className="text-blue-600" size={22} />
                    <h2 className="text-lg font-bold text-gray-800">توثيق KYC للبطاقات</h2>
                </div>

                {/* Warning banner if KYC incomplete */}
                {hasIncompleteKyc && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                        <p className="text-sm text-orange-800 font-medium">التوثيق لدى مزود الخدمة ليس مكتملاً بعد</p>
                        <p className="text-xs text-orange-600 mt-1">يرجى إكمال التوثيق لإصدار البطاقات الافتراضية</p>
                    </div>
                )}

                {/* Email & WhatsApp verification checks */}
                {(!emailVerified || !whatsappVerified) && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                        <p className="text-sm text-red-800 font-medium">متطلبات أساسية قبل التوثيق:</p>

                        {!emailVerified && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-red-600">
                                    <Mail size={16} />
                                    <span className="text-sm">تأكيد البريد الإلكتروني</span>
                                </div>
                                <button
                                    onClick={() => navigate('/verify-email')}
                                    className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg font-medium"
                                >
                                    تأكيد
                                </button>
                            </div>
                        )}

                        {!whatsappVerified && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-red-600">
                                    <Phone size={16} />
                                    <span className="text-sm">تأكيد رقم الواتساب</span>
                                </div>
                                <button
                                    onClick={() => navigate('/verify-whatsapp')}
                                    className="text-xs bg-red-600 text-white px-3 py-1 rounded-lg font-medium"
                                >
                                    تأكيد
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Provider KYC cards */}
                {kycStatuses.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl border p-4 text-center">
                        <p className="text-sm text-gray-500">لا يوجد مزوّدي بطاقات متاحين حالياً</p>
                    </div>
                ) : (
                    kycStatuses.map(({ provider, status: kycStatus }) => (
                        <div key={provider.public_code} className="bg-white rounded-xl border p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-gray-800">{provider.display_name}</span>
                                <KycBadge status={kycStatus?.kyc_status} approved={kycStatus?.kyc_approved} />
                            </div>

                            {kycStatus?.failure_reason && (
                                <p className="text-xs text-red-500 mb-2">{kycStatus.failure_reason}</p>
                            )}

                            {kycStatus?.kyc_approved ? (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <CheckCircle size={12} />
                                    جاهز لإصدار البطاقة
                                </p>
                            ) : kycStatus?.kyc_status === 'pending' || kycStatus?.kyc_status === 'submitted' ? (
                                <p className="text-xs text-blue-600">طلبك قيد المراجعة</p>
                            ) : (
                                <button
                                    onClick={() => navigate(`/cards/kyc?provider=${provider.public_code}`)}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mt-2"
                                >
                                    إكمال توثيق KYC
                                    <ArrowLeft size={14} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// --- Helper Components ---

function StatusBadge({ status }) {
    const map = {
        pending: { color: 'bg-yellow-100 text-yellow-700', text: 'قيد المراجعة' },
        approved: { color: 'bg-green-100 text-green-700', text: 'مقبول' },
        rejected: { color: 'bg-red-100 text-red-700', text: 'مرفوض' },
    };
    const info = map[status] || map.pending;
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>{info.text}</span>;
}

function KycBadge({ status, approved }) {
    if (approved) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600">
                <CheckCircle size={12} />
                مقبول
            </span>
        );
    }
    const map = {
        not_started: { color: 'bg-gray-100 text-gray-600', text: 'لم يبدأ' },
        pending: { color: 'bg-yellow-100 text-yellow-700', text: 'قيد المراجعة' },
        submitted: { color: 'bg-blue-100 text-blue-700', text: 'تم الإرسال' },
        rejected: { color: 'bg-red-100 text-red-700', text: 'مرفوض' },
    };
    const info = map[status] || map.not_started;
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{info.text}</span>;
}

function FileInput({ label, file, onChange, required }) {
    return (
        <div>
            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                <Upload size={18} className="text-gray-400" />
                <span className="text-sm text-gray-500">{file ? file.name : label}</span>
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    required={required}
                    onChange={e => onChange(e.target.files[0] || null)}
                />
            </label>
        </div>
    );
}
