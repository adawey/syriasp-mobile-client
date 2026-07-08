import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getKycRequirements, getKycStatus, uploadKycDocument, submitKyc } from '../lib/api';
import toast from 'react-hot-toast';
import { ShieldCheck, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import BackButton from '../components/BackButton';

export default function CardKycPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const publicCode = searchParams.get('provider');

    const [status, setStatus] = useState(null);
    const [requirements, setRequirements] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [birthday, setBirthday] = useState('');
    const [documentKind, setDocumentKind] = useState('id_card');

    // Document files
    const [files, setFiles] = useState({ front: null, back: null, selfie: null });
    const [stagedDocs, setStagedDocs] = useState([]);
    const [uploading, setUploading] = useState('');

    useEffect(() => {
        if (!publicCode) {
            toast.error('لم يتم تحديد مزوّد البطاقات');
            navigate('/cards/issue');
            return;
        }
        loadData();
    }, [publicCode]);

    const loadData = async () => {
        try {
            const [statusRes, reqRes] = await Promise.all([
                getKycStatus({ public_code: publicCode }),
                getKycRequirements({ public_code: publicCode, document_kind: documentKind }).catch(() => null),
            ]);
            setStatus(statusRes.data.data);
            if (reqRes) setRequirements(reqRes.data.data?.requirements);
        } catch (err) {
            toast.error('فشل في تحميل بيانات التوثيق');
        } finally {
            setLoading(false);
        }
    };

    const loadRequirements = async kind => {
        try {
            const res = await getKycRequirements({ public_code: publicCode, document_kind: kind });
            setRequirements(res.data.data?.requirements);
        } catch {
            // ignore
        }
    };

    const handleDocKindChange = kind => {
        setDocumentKind(kind);
        setFiles({ front: null, back: null, selfie: null });
        setStagedDocs([]);
        loadRequirements(kind);
    };

    const handleUploadSlot = async (slot, file) => {
        if (!file) return;
        setUploading(slot);
        try {
            const formData = new FormData();
            formData.append('public_code', publicCode);
            formData.append('slot', slot);
            formData.append('file', file);

            const res = await uploadKycDocument(formData);
            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }

            const doc = res.data.data;
            // Remove any existing staged doc for this slot, add new one
            setStagedDocs(prev => [
                ...prev.filter(d => d.slot !== slot),
                { slot: doc.slot, path: doc.path, filename: doc.filename, mime: doc.mime },
            ]);
            setFiles(prev => ({ ...prev, [slot]: file }));
            toast.success(`تم رفع ${slotLabel(slot)} بنجاح`);
        } catch (err) {
            toast.error(err.response?.data?.message || `فشل رفع ${slotLabel(slot)}`);
        } finally {
            setUploading('');
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();

        if (!firstName || !lastName || !idNumber || !birthday) {
            toast.error('يرجى ملء جميع البيانات الشخصية');
            return;
        }

        const requiredSlots = requirements?.required_documents || ['front', 'back'];
        const missingSlots = requiredSlots.filter(s => !stagedDocs.find(d => d.slot === s) && !files[s]);
        if (missingSlots.length > 0) {
            toast.error(`يرجى رفع: ${missingSlots.map(slotLabel).join('، ')}`);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                public_code: publicCode,
                first_name: firstName,
                last_name: lastName,
                id_number: idNumber,
                birthday: birthday,
                document_kind: documentKind,
                staged_documents: stagedDocs,
            };

            const res = await submitKyc(payload);
            if (res.data.error) {
                toast.error(res.data.message);
                return;
            }
            toast.success(res.data.message || 'تم إرسال طلب التوثيق بنجاح');
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

    const isApproved = status?.kyc_approved;
    const isPending = status?.kyc_status === 'pending' || status?.kyc_status === 'submitted';

    return (
        <div className="space-y-5">
            <BackButton to="/cards/issue" />

            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ShieldCheck className="text-green-600" size={24} />
                توثيق KYC للبطاقات
            </h2>

            {/* Status */}
            <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">الحالة</span>
                    <StatusBadge status={status?.kyc_status} />
                </div>
                {status?.failure_reason && <p className="text-xs text-red-500 mt-2">{status.failure_reason}</p>}
            </div>

            {/* Readiness checklist */}
            {status?.readiness && !status.readiness.can_submit && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">
                    <p className="font-medium text-yellow-800 text-sm">متطلبات قبل التقديم:</p>
                    <CheckItem ok={status.readiness.country_set} label="تحديد الدولة في الملف الشخصي" />
                    <CheckItem ok={status.readiness.mobile_set} label="إضافة رقم الهاتف" />
                    {status.readiness.whatsapp_verification_required && (
                        <CheckItem ok={status.readiness.whatsapp_verified} label="توثيق رقم الواتساب" />
                    )}
                </div>
            )}

            {/* Already approved */}
            {isApproved && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <span className="font-medium text-green-800">تم التوثيق بنجاح - يمكنك إصدار البطاقة</span>
                </div>
            )}

            {/* Pending */}
            {isPending && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-2">
                    <AlertCircle className="text-blue-600" size={20} />
                    <span className="font-medium text-blue-800">طلبك قيد المراجعة</span>
                </div>
            )}

            {/* Submit form */}
            {!isApproved && !isPending && status?.readiness?.can_submit !== false && (
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4 space-y-4">
                    <h3 className="font-semibold text-gray-800">بيانات التوثيق</h3>

                    <div className="grid grid-cols-2 gap-3">
                        <Input label="الاسم الأول" value={firstName} onChange={setFirstName} required />
                        <Input label="اسم العائلة" value={lastName} onChange={setLastName} required />
                    </div>

                    <Input label="رقم الهوية" value={idNumber} onChange={setIdNumber} required dir="ltr" />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الميلاد</label>
                        <input
                            type="date"
                            value={birthday}
                            onChange={e => setBirthday(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                            dir="ltr"
                        />
                    </div>

                    {/* Document kind */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نوع المستند</label>
                        <select
                            value={documentKind}
                            onChange={e => handleDocKindChange(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {(requirements?.supported_kinds || ['id_card', 'passport', 'driver_license']).map(kind => (
                                <option key={kind} value={kind}>
                                    {kindLabel(kind)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Document uploads */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">المستندات المطلوبة:</p>
                        {(requirements?.required_documents || ['front', 'back']).map(slot => (
                            <SlotUpload
                                key={slot}
                                slot={slot}
                                file={files[slot]}
                                staged={stagedDocs.find(d => d.slot === slot)}
                                uploading={uploading === slot}
                                onUpload={file => handleUploadSlot(slot, file)}
                            />
                        ))}
                        {(requirements?.optional_documents || ['selfie']).map(slot => (
                            <SlotUpload
                                key={slot}
                                slot={slot}
                                file={files[slot]}
                                staged={stagedDocs.find(d => d.slot === slot)}
                                uploading={uploading === slot}
                                onUpload={file => handleUploadSlot(slot, file)}
                                optional
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {submitting ? 'جاري الإرسال...' : 'إرسال طلب التوثيق'}
                    </button>
                </form>
            )}

            {/* History */}
            {status?.history?.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-gray-800 text-sm">السجل</h3>
                    {status.history.map((evt, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs">
                            <div className="flex justify-between">
                                <span className="font-medium">{evt.label || evt.event}</span>
                                <span className="text-gray-400">
                                    {evt.created_at ? new Date(evt.created_at).toLocaleDateString('ar') : ''}
                                </span>
                            </div>
                            {evt.reason && <p className="text-red-500 mt-1">{evt.reason}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Helper Components ---

function Input({ label, value, onChange, required, dir }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required={required}
                dir={dir}
            />
        </div>
    );
}

function SlotUpload({ slot, file, staged, uploading, onUpload, optional }) {
    return (
        <div>
            <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                {uploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                ) : staged ? (
                    <CheckCircle size={18} className="text-green-500" />
                ) : (
                    <Upload size={18} className="text-gray-400" />
                )}
                <span className="text-sm text-gray-600">
                    {slotLabel(slot)} {optional ? '(اختياري)' : '*'}
                    {staged && <span className="text-green-600 mr-2">✓ تم الرفع</span>}
                </span>
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={e => onUpload(e.target.files[0] || null)}
                />
            </label>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        not_started: { color: 'bg-gray-100 text-gray-600', text: 'لم يبدأ' },
        pending: { color: 'bg-yellow-100 text-yellow-700', text: 'قيد المراجعة' },
        submitted: { color: 'bg-blue-100 text-blue-700', text: 'تم الإرسال' },
        approved: { color: 'bg-green-100 text-green-700', text: 'مقبول' },
        rejected: { color: 'bg-red-100 text-red-700', text: 'مرفوض' },
    };
    const info = map[status] || map.not_started;
    return <span className={`text-xs px-2 py-1 rounded-full font-medium ${info.color}`}>{info.text}</span>;
}

function CheckItem({ ok, label }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            {ok ? (
                <CheckCircle size={14} className="text-green-500" />
            ) : (
                <AlertCircle size={14} className="text-yellow-500" />
            )}
            <span className={ok ? 'text-green-700' : 'text-yellow-700'}>{label}</span>
        </div>
    );
}

function slotLabel(slot) {
    const map = { front: 'الوجه الأمامي', back: 'الوجه الخلفي', selfie: 'صورة سيلفي', face: 'صورة الوجه' };
    return map[slot] || slot;
}

function kindLabel(kind) {
    const map = { id_card: 'هوية وطنية', passport: 'جواز سفر', driver_license: 'رخصة قيادة' };
    return map[kind] || kind;
}
