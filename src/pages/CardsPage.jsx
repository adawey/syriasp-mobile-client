import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCards } from '../lib/api';
import toast from 'react-hot-toast';
import { CreditCard, Plus, Snowflake, CheckCircle, XCircle } from 'lucide-react';
import BackButton from '../components/BackButton';

export default function CardsPage() {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadCards();
    }, []);

    const loadCards = async () => {
        try {
            const res = await getCards();
            setCards(res.data.data?.cards || res.data.data || []);
        } catch (err) {
            toast.error('فشل في تحميل البطاقات');
        } finally {
            setLoading(false);
        }
    };

    const cardStatusInfo = status => {
        const map = {
            active: { color: 'bg-green-100 text-green-700', text: 'نشطة', icon: CheckCircle },
            frozen: { color: 'bg-blue-100 text-blue-700', text: 'مجمّدة', icon: Snowflake },
            closed: { color: 'bg-red-100 text-red-700', text: 'ملغاة', icon: XCircle },
        };
        return map[status] || map.active;
    };

    if (loading) {
        return (
            <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <BackButton to="/" />
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <CreditCard className="text-blue-600" size={24} />
                    بطاقاتي
                </h2>
                <button
                    onClick={() => navigate('/cards/issue')}
                    className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} />
                    بطاقة جديدة
                </button>
            </div>

            {cards.length === 0 ? (
                <div className="text-center py-12">
                    <CreditCard className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500">لا توجد بطاقات حالياً</p>
                    <button
                        onClick={() => navigate('/cards/issue')}
                        className="mt-3 text-blue-600 text-sm font-medium hover:underline"
                    >
                        أصدر بطاقتك الأولى
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {cards.map(card => {
                        const info = cardStatusInfo(card.status);
                        const Icon = info.icon;
                        return (
                            <button
                                key={card.id}
                                onClick={() => navigate(`/cards/${card.id}`)}
                                className="w-full bg-gradient-to-l from-gray-800 to-gray-900 rounded-xl p-4 text-white text-right shadow-lg hover:shadow-xl transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>
                                        {info.text}
                                    </span>
                                    <CreditCard size={24} className="opacity-60" />
                                </div>
                                <p className="font-mono text-sm opacity-80 mb-2" dir="ltr">
                                    •••• •••• •••• {card.last_four || '****'}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs opacity-60">
                                        {card.provider_display_name || card.provider || ''}
                                    </span>
                                    {card.balance !== undefined && (
                                        <span className="font-bold">${Number(card.balance).toFixed(2)}</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
