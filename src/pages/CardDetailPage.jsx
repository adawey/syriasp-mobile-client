import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getCard,
    getCardBalance,
    getCardInfo,
    getCardTransactions,
    topupCard,
    freezeCard,
    unfreezeCard,
    closeCard,
} from '../lib/api';
import toast from 'react-hot-toast';
import { CreditCard, Snowflake, Sun, XCircle, DollarSign, Eye, EyeOff, RefreshCw } from 'lucide-react';
import BackButton from '../components/BackButton';

export default function CardDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [card, setCard] = useState(null);
    const [balance, setBalance] = useState(null);
    const [cardInfo, setCardInfo] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [txPagination, setTxPagination] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState('');
    const [showInfo, setShowInfo] = useState(false);
    const [topupAmount, setTopupAmount] = useState('');
    const [showTopup, setShowTopup] = useState(false);

    useEffect(() => {
        loadCard();
    }, [id]);

    const loadCard = async () => {
        try {
            const [cardRes, balanceRes, txRes] = await Promise.all([
                getCard(id),
                getCardBalance(id),
                getCardTransactions(id),
            ]);
            setCard(cardRes.data.data?.card || cardRes.data.data);
            setBalance(balanceRes.data.data);
            setTransactions(txRes.data.data?.transactions || txRes.data.data || []);
            setTxPagination(txRes.data.data?.pagination || null);
        } catch (err) {
            toast.error('فشل في تحميل بيانات البطاقة');
        } finally {
            setLoading(false);
        }
    };

    const loadMoreTransactions = async () => {
        if (!txPagination || txPagination.current_page >= txPagination.last_page) return;
        setLoadingMore(true);
        try {
            const res = await getCardTransactions(id, txPagination.current_page + 1);
            const newTx = res.data.data?.transactions || res.data.data || [];
            setTransactions(prev => [...prev, ...newTx]);
            setTxPagination(res.data.data?.pagination || null);
        } catch {
            toast.error('فشل في تحميل المزيد');
        } finally {
            setLoadingMore(false);
        }
    };

    const handleShowInfo = async () => {
        if (showInfo) {
            setShowInfo(false);
            setCardInfo(null);
            return;
        }
        setActionLoading('info');
        try {
            const res = await getCardInfo(id);
            setCardInfo(res.data.data?.card || res.data.data?.info || res.data.data);
            setShowInfo(true);
        } catch (err) {
            toast.error('فشل في عرض بيانات البطاقة');
        } finally {
            setActionLoading('');
        }
    };

    const handleFreeze = async () => {
        setActionLoading('freeze');
        try {
            const res = await freezeCard(id);
            toast.success(res.data.message || 'تم تجميد البطاقة');
            loadCard();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل تجميد البطاقة');
        } finally {
            setActionLoading('');
        }
    };

    const handleUnfreeze = async () => {
        setActionLoading('unfreeze');
        try {
            const res = await unfreezeCard(id);
            toast.success(res.data.message || 'تم إلغاء تجميد البطاقة');
            loadCard();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إلغاء التجميد');
        } finally {
            setActionLoading('');
        }
    };

    const handleClose = async () => {
        if (!confirm('هل أنت متأكد من إلغاء البطاقة؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
        setActionLoading('close');
        try {
            const res = await closeCard(id);
            toast.success(res.data.message || 'تم إلغاء البطاقة');
            loadCard();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل إلغاء البطاقة');
        } finally {
            setActionLoading('');
        }
    };

    const handleTopup = async e => {
        e.preventDefault();
        if (!topupAmount || Number(topupAmount) <= 0) {
            toast.error('أدخل مبلغ صحيح');
            return;
        }
        setActionLoading('topup');
        try {
            const res = await topupCard(id, { amount: Number(topupAmount) });
            toast.success(res.data.message || 'تم شحن البطاقة بنجاح');
            setTopupAmount('');
            setShowTopup(false);
            loadCard();
        } catch (err) {
            toast.error(err.response?.data?.message || 'فشل شحن البطاقة');
        } finally {
            setActionLoading('');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!card) {
        return <div className="text-center py-10 text-gray-500">البطاقة غير موجودة</div>;
    }

    const isFrozen = card.status === 'frozen';
    const isClosed = card.status === 'closed';

    return (
        <div className="space-y-4">
            <BackButton to="/cards" label="رجوع للبطاقات" />

            {/* Card Visual */}
            <div className="bg-gradient-to-l from-gray-800 to-gray-900 rounded-xl p-5 text-white shadow-lg">
                <div className="flex items-start justify-between mb-6">
                    <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                            isFrozen
                                ? 'bg-blue-100 text-blue-700'
                                : isClosed
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                        }`}
                    >
                        {isFrozen ? 'مجمّدة' : isClosed ? 'ملغاة' : 'نشطة'}
                    </span>
                    <CreditCard size={28} className="opacity-60" />
                </div>

                {showInfo && cardInfo ? (
                    cardInfo.uses_iframe && cardInfo.pan_url ? (
                        <div className="space-y-2" dir="ltr">
                            <iframe
                                src={cardInfo.pan_url}
                                className="w-full h-32 border rounded-lg"
                                title="Card details"
                            />
                        </div>
                    ) : (
                        <div className="space-y-1 font-mono text-sm" dir="ltr">
                            <p>{cardInfo.pan || cardInfo.masked_number || '•••• •••• •••• ••••'}</p>
                            <div className="flex gap-4">
                                <span>EXP: {cardInfo.expiry || 'N/A'}</span>
                                <span>CVV: {cardInfo.cvv || '***'}</span>
                            </div>
                        </div>
                    )
                ) : (
                    <p className="font-mono text-lg opacity-80 mb-2" dir="ltr">
                        •••• •••• •••• {card.last_four || card.masked_number?.slice(-4) || '****'}
                    </p>
                )}

                <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs opacity-60">{card.provider_display_name || ''}</span>
                    <span className="text-xl font-bold">${balance?.balance ?? card.balance ?? '—'}</span>
                </div>
            </div>

            {/* Actions */}
            {!isClosed && (
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleShowInfo}
                        disabled={actionLoading === 'info'}
                        className="flex items-center justify-center gap-2 py-2.5 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                        {showInfo ? <EyeOff size={16} /> : <Eye size={16} />}
                        {showInfo ? 'إخفاء البيانات' : 'عرض البيانات'}
                    </button>

                    <button
                        onClick={() => setShowTopup(!showTopup)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                    >
                        <DollarSign size={16} />
                        شحن
                    </button>

                    {isFrozen ? (
                        <button
                            onClick={handleUnfreeze}
                            disabled={actionLoading === 'unfreeze'}
                            className="flex items-center justify-center gap-2 py-2.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
                        >
                            <Sun size={16} />
                            {actionLoading === 'unfreeze' ? '...' : 'إلغاء التجميد'}
                        </button>
                    ) : (
                        <button
                            onClick={handleFreeze}
                            disabled={actionLoading === 'freeze'}
                            className="flex items-center justify-center gap-2 py-2.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                        >
                            <Snowflake size={16} />
                            {actionLoading === 'freeze' ? '...' : 'تجميد'}
                        </button>
                    )}

                    <button
                        onClick={handleClose}
                        disabled={actionLoading === 'close'}
                        className="flex items-center justify-center gap-2 py-2.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                        <XCircle size={16} />
                        {actionLoading === 'close' ? '...' : 'إلغاء البطاقة'}
                    </button>
                </div>
            )}

            {/* Topup Form */}
            {showTopup && !isClosed && (
                <form onSubmit={handleTopup} className="bg-white border rounded-xl p-4 space-y-3">
                    <h3 className="font-semibold text-gray-800">شحن البطاقة</h3>
                    <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={topupAmount}
                        onChange={e => setTopupAmount(e.target.value)}
                        placeholder="المبلغ بالدولار"
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        dir="ltr"
                    />
                    <button
                        type="submit"
                        disabled={actionLoading === 'topup'}
                        className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                        {actionLoading === 'topup' ? 'جاري الشحن...' : 'تأكيد الشحن'}
                    </button>
                </form>
            )}

            {/* Transactions */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">المعاملات</h3>
                    <button onClick={loadCard} className="text-blue-600">
                        <RefreshCw size={16} />
                    </button>
                </div>
                {transactions.length === 0 ? (
                    <p className="text-center text-gray-400 py-4 text-sm">لا توجد معاملات</p>
                ) : (
                    <div className="space-y-2">
                        {transactions.map((tx, i) => {
                            const amount = Number(tx.amount);
                            const isDebit =
                                tx.type_description === 'purchase' ||
                                tx.type_description === 'authorization' ||
                                amount < 0;
                            const displayAmount = Math.abs(amount);

                            return (
                                <div key={tx.id || i} className="bg-white border rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-medium text-gray-800 flex-1 ml-2" dir="ltr">
                                            {tx.narrative || tx.type_description || 'معاملة'}
                                        </p>
                                        <span
                                            className={`font-bold text-sm whitespace-nowrap ${isDebit ? 'text-red-600' : 'text-green-600'}`}
                                        >
                                            {isDebit ? '-' : '+'}
                                            {displayAmount.toFixed(2)} $
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">
                                            {tx.created_at
                                                ? new Date(tx.created_at).toLocaleDateString('ar-EG', {
                                                      year: 'numeric',
                                                      month: 'short',
                                                      day: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                  })
                                                : ''}
                                        </span>
                                        <span
                                            className={`text-xs px-1.5 py-0.5 rounded ${
                                                isDebit ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                                            }`}
                                        >
                                            {isDebit ? 'خصم' : 'شحن'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {txPagination && txPagination.current_page < txPagination.last_page && (
                    <button
                        onClick={loadMoreTransactions}
                        disabled={loadingMore}
                        className="w-full mt-3 py-2 text-sm text-blue-600 font-medium bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                    >
                        {loadingMore
                            ? 'جاري التحميل...'
                            : `تحميل المزيد (${txPagination.current_page}/${txPagination.last_page})`}
                    </button>
                )}
            </div>
        </div>
    );
}
