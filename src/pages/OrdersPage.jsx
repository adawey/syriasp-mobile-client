import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    ShoppingBag,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronDown,
    Copy,
    Search,
    Calendar,
} from 'lucide-react';
import BackButton from '../components/BackButton';
import api from '../lib/api';

export default function OrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showDateFilter, setShowDateFilter] = useState(false);

    const perPage = 15;

    useEffect(() => {
        loadOrders(1, true);
    }, [filter]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadOrders(1, true);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, dateFrom, dateTo]);

    const loadOrders = async (pageNum, reset = false) => {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        try {
            const params = { limit: perPage, page: pageNum };
            if (filter !== 'all') params.status = filter;
            if (searchQuery.trim()) {
                params.order_number = searchQuery.trim();
                params.gamer_data = searchQuery.trim();
            }
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;

            const res = await api.get('/orders', { params });
            const data = res.data.data;

            const newOrders = data?.data || data || [];
            const more = data?.has_more || false;

            if (reset) {
                setOrders(newOrders);
            } else {
                setOrders(prev => [...prev, ...newOrders]);
            }
            setHasMore(more);
            setPage(pageNum);
        } catch {
            toast.error('فشل في تحميل الطلبات');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        loadOrders(page + 1);
    };

    // Local filter by search query (game, product, order_number, player_data)
    const filteredOrders = searchQuery.trim()
        ? orders.filter(order => {
              const q = searchQuery.trim().toLowerCase();
              return (
                  (order.order_number && order.order_number.toLowerCase().includes(q)) ||
                  (order.game && order.game.toLowerCase().includes(q)) ||
                  (order.product && order.product.toLowerCase().includes(q)) ||
                  (order.player_data && JSON.stringify(order.player_data).toLowerCase().includes(q))
              );
          })
        : orders;

    const copyCode = code => {
        navigator.clipboard.writeText(code);
        toast.success('تم نسخ الكود');
    };

    const statusInfo = status => {
        const map = {
            completed: { icon: CheckCircle, color: 'text-green-600 bg-green-50', text: 'مكتمل' },
            processing: { icon: Clock, color: 'text-blue-600 bg-blue-50', text: 'قيد المعالجة' },
            pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50', text: 'بالانتظار' },
            cancelled: { icon: XCircle, color: 'text-red-600 bg-red-50', text: 'ملغي' },
            failed: { icon: XCircle, color: 'text-red-600 bg-red-50', text: 'فاشل' },
            awaiting_response: { icon: AlertCircle, color: 'text-orange-600 bg-orange-50', text: 'بانتظار ردك' },
        };
        return map[status] || { icon: Clock, color: 'text-gray-600 bg-gray-50', text: status || 'غير معروف' };
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
                    <ShoppingBag className="text-blue-600" size={24} />
                    سجل الطلبات
                </h2>
                <button
                    onClick={() => setShowDateFilter(!showDateFilter)}
                    className={`p-2 rounded-lg transition-colors ${showDateFilter ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}
                >
                    <Calendar size={18} />
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="بحث برقم الطلب، اسم اللعبة، المنتج، الآيدي..."
                    className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
            </div>

            {/* Date Filter */}
            {showDateFilter && (
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">من تاريخ</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            dir="ltr"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">إلى تاريخ</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            dir="ltr"
                        />
                    </div>
                    {(dateFrom || dateTo) && (
                        <button
                            onClick={() => {
                                setDateFrom('');
                                setDateTo('');
                            }}
                            className="self-end px-3 py-2 text-xs text-red-600 bg-red-50 rounded-lg font-medium"
                        >
                            مسح
                        </button>
                    )}
                </div>
            )}

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                    { key: 'all', label: 'الكل' },
                    { key: 'processing', label: 'قيد المعالجة' },
                    { key: 'completed', label: 'مكتمل' },
                    { key: 'cancelled', label: 'ملغي' },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                            filter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                    <ShoppingBag className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500">لا توجد طلبات</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredOrders.map(order => {
                        const info = statusInfo(order.status);
                        const Icon = info.icon;
                        const isExpanded = expandedOrder === order.id;

                        return (
                            <div key={order.id} className="bg-white rounded-xl border overflow-hidden">
                                {/* Order Header */}
                                <button
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                    className="w-full p-3 text-right"
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-800">
                                                #{order.order_number}
                                            </span>
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}
                                            >
                                                <Icon size={10} />
                                                {info.text}
                                            </span>
                                        </div>
                                        <ChevronDown
                                            size={16}
                                            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">
                                            {order.game} — {order.product}
                                        </span>
                                        <span className="text-sm font-bold text-gray-800">${order.price}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{order.created_at}</p>
                                </button>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="border-t p-3 bg-gray-50 space-y-3">
                                        {/* Player Data */}
                                        {order.player_data && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 mb-1">
                                                    بيانات اللاعب
                                                </p>
                                                <p
                                                    className="text-sm text-gray-700 bg-white rounded-lg p-2 border"
                                                    dir="ltr"
                                                >
                                                    {typeof order.player_data === 'string'
                                                        ? order.player_data
                                                        : JSON.stringify(order.player_data)}
                                                </p>
                                            </div>
                                        )}

                                        {/* Quantity */}
                                        {order.count > 1 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">الكمية</span>
                                                <span className="font-medium">{order.count}</span>
                                            </div>
                                        )}

                                        {/* Balance */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="bg-white rounded-lg p-2 border text-center">
                                                <p className="text-gray-400">الرصيد قبل</p>
                                                <p className="font-bold text-gray-700">${order.balance_before}</p>
                                            </div>
                                            <div className="bg-white rounded-lg p-2 border text-center">
                                                <p className="text-gray-400">الرصيد بعد</p>
                                                <p className="font-bold text-gray-700">${order.balance_after}</p>
                                            </div>
                                        </div>

                                        {/* Codes */}
                                        {order.codes && order.codes.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 mb-1">الأكواد</p>
                                                <div className="space-y-1">
                                                    {order.codes.map((code, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex items-center justify-between bg-white rounded-lg p-2 border"
                                                        >
                                                            <code className="text-sm font-mono text-gray-800" dir="ltr">
                                                                {code}
                                                            </code>
                                                            <button
                                                                onClick={() => copyCode(code)}
                                                                className="text-blue-600 p-1 hover:bg-blue-50 rounded"
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        {order.notes && order.notes.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold text-gray-500 mb-1">ملاحظات</p>
                                                {order.notes.map((note, i) => (
                                                    <p
                                                        key={i}
                                                        className="text-xs text-gray-600 bg-white rounded-lg p-2 border mb-1"
                                                    >
                                                        {note}
                                                    </p>
                                                ))}
                                            </div>
                                        )}

                                        {/* Response Request */}
                                        {order.response_request && (
                                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                                <p className="text-xs font-semibold text-orange-700 mb-1">مطلوب ردك:</p>
                                                <p className="text-sm text-orange-800">
                                                    {order.response_request.admin_note}
                                                </p>
                                                <p className="text-xs text-orange-500 mt-1">
                                                    {order.response_request.created_at}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Load More */}
            {hasMore && (
                <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full py-2.5 text-sm text-blue-600 font-medium bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                    {loadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
                </button>
            )}
        </div>
    );
}
