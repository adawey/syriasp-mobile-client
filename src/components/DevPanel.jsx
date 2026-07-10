/**
 * ═══════════════════════════════════════════════════════════════
 * 🛠️ Dev Panel — API Request/Response Inspector
 * ═══════════════════════════════════════════════════════════════
 *
 * يظهر فقط لليوزرات المحددة في DEV_USER_IDS
 * يعرض كل request/response بالتفصيل:
 * - Method + URL
 * - Headers
 * - Request Body
 * - Response Status + Data
 * - Duration (ms)
 *
 * ═══════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDevLogs, clearDevLogs } from '../lib/devLogger';
import { Code, X, Trash2, ChevronDown, ChevronUp, Copy, CheckCircle, XCircle, Clock } from 'lucide-react';

// ⚠️ ضع هنا IDs اليوزرات اللي يقدروا يشوفوا الـ Dev Panel
const DEV_USER_IDS = [1, 2];

export default function DevPanel() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [expandedLog, setExpandedLog] = useState(null);
    const [activeTab, setActiveTab] = useState('request'); // 'request' | 'response'
    const [copied, setCopied] = useState(false);
    const intervalRef = useRef(null);

    // لا يظهر لغير المطورين
    if (!user || !DEV_USER_IDS.includes(user.id)) {
        return null;
    }

    useEffect(() => {
        if (open) {
            setLogs(getDevLogs());
            // تحديث كل ثانية
            intervalRef.current = setInterval(() => {
                setLogs(getDevLogs());
            }, 1000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [open]);

    const handleClear = () => {
        clearDevLogs();
        setLogs([]);
        setExpandedLog(null);
    };

    const handleCopy = text => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const formatJson = data => {
        try {
            if (typeof data === 'string') return data;
            return JSON.stringify(data, null, 2);
        } catch {
            return String(data);
        }
    };

    const methodColor = method => {
        const colors = {
            GET: 'bg-green-100 text-green-700',
            POST: 'bg-blue-100 text-blue-700',
            PUT: 'bg-yellow-100 text-yellow-700',
            DELETE: 'bg-red-100 text-red-700',
            PATCH: 'bg-purple-100 text-purple-700',
        };
        return colors[method] || 'bg-gray-100 text-gray-700';
    };

    const statusColor = status => {
        if (!status) return 'text-gray-500';
        if (status >= 200 && status < 300) return 'text-green-600';
        if (status >= 300 && status < 400) return 'text-yellow-600';
        if (status >= 400 && status < 500) return 'text-orange-600';
        return 'text-red-600';
    };

    return (
        <>
            {/* FAB Button */}
            <button
                onClick={() => setOpen(!open)}
                className="fixed bottom-20 left-3 z-[9999] w-11 h-11 bg-gray-900 text-green-400 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
                title="Dev Panel"
            >
                <Code size={18} />
                {logs.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {logs.length > 99 ? '99' : logs.length}
                    </span>
                )}
            </button>

            {/* Panel */}
            {open && (
                <div className="fixed inset-0 z-[9998] bg-gray-900/95 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            <Code size={18} className="text-green-400" />
                            <h3 className="text-white font-bold text-sm">API Inspector</h3>
                            <span className="text-gray-400 text-xs">({logs.length} requests)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClear}
                                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                                title="Clear"
                            >
                                <Trash2 size={16} />
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Logs List */}
                    <div className="flex-1 overflow-y-auto">
                        {logs.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <Code size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">لا توجد requests بعد</p>
                                <p className="text-xs mt-1">استخدم التطبيق وسترى الـ requests هنا</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-800">
                                {logs.map((log, index) => (
                                    <div key={log.id || index}>
                                        {/* Summary Row */}
                                        <button
                                            onClick={() => setExpandedLog(expandedLog === index ? null : index)}
                                            className="w-full px-4 py-2.5 text-left hover:bg-gray-800/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${methodColor(log.method)}`}
                                                >
                                                    {log.method}
                                                </span>
                                                <span
                                                    className="text-gray-300 text-xs flex-1 truncate font-mono"
                                                    dir="ltr"
                                                >
                                                    {log.url}
                                                </span>
                                                <span className={`text-xs font-bold ${statusColor(log.status)}`}>
                                                    {log.status || '...'}
                                                </span>
                                                <span className="text-gray-500 text-[10px] flex items-center gap-0.5">
                                                    <Clock size={9} />
                                                    {log.duration ? `${log.duration}ms` : '-'}
                                                </span>
                                                {expandedLog === index ? (
                                                    <ChevronUp size={14} className="text-gray-500" />
                                                ) : (
                                                    <ChevronDown size={14} className="text-gray-500" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-gray-500">
                                                    {log.timestamp
                                                        ? new Date(log.timestamp).toLocaleTimeString('en', {
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                              second: '2-digit',
                                                          })
                                                        : ''}
                                                </span>
                                                {log.error && (
                                                    <span className="text-[10px] text-red-400 flex items-center gap-0.5">
                                                        <XCircle size={9} />
                                                        Error
                                                    </span>
                                                )}
                                            </div>
                                        </button>

                                        {/* Expanded Detail */}
                                        {expandedLog === index && (
                                            <div className="px-4 pb-4 bg-gray-800/30">
                                                {/* Tabs */}
                                                <div className="flex gap-1 mb-3 border-b border-gray-700 pb-2">
                                                    <button
                                                        onClick={() => setActiveTab('request')}
                                                        className={`px-3 py-1 text-xs rounded-t font-medium ${
                                                            activeTab === 'request'
                                                                ? 'bg-blue-600 text-white'
                                                                : 'text-gray-400 hover:text-white'
                                                        }`}
                                                    >
                                                        Request
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('response')}
                                                        className={`px-3 py-1 text-xs rounded-t font-medium ${
                                                            activeTab === 'response'
                                                                ? 'bg-green-600 text-white'
                                                                : 'text-gray-400 hover:text-white'
                                                        }`}
                                                    >
                                                        Response
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('headers')}
                                                        className={`px-3 py-1 text-xs rounded-t font-medium ${
                                                            activeTab === 'headers'
                                                                ? 'bg-purple-600 text-white'
                                                                : 'text-gray-400 hover:text-white'
                                                        }`}
                                                    >
                                                        Headers
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTab('curl')}
                                                        className={`px-3 py-1 text-xs rounded-t font-medium ${
                                                            activeTab === 'curl'
                                                                ? 'bg-yellow-600 text-white'
                                                                : 'text-gray-400 hover:text-white'
                                                        }`}
                                                    >
                                                        cURL
                                                    </button>
                                                </div>

                                                {/* Tab Content */}
                                                <div className="relative">
                                                    <button
                                                        onClick={() =>
                                                            handleCopy(
                                                                activeTab === 'request'
                                                                    ? formatJson(log.requestBody)
                                                                    : activeTab === 'response'
                                                                      ? formatJson(log.responseData)
                                                                      : activeTab === 'headers'
                                                                        ? formatJson(log.requestHeaders)
                                                                        : log.curl || ''
                                                            )
                                                        }
                                                        className="absolute top-1 right-1 p-1 text-gray-400 hover:text-white z-10"
                                                        title="Copy"
                                                    >
                                                        {copied ? (
                                                            <CheckCircle size={14} className="text-green-400" />
                                                        ) : (
                                                            <Copy size={14} />
                                                        )}
                                                    </button>

                                                    <pre
                                                        className="bg-black/50 rounded-lg p-3 text-[11px] text-green-300 font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all"
                                                        dir="ltr"
                                                    >
                                                        {activeTab === 'request' && (
                                                            <>
                                                                <span className="text-gray-500">
                                                                    // {log.method} {log.fullUrl}
                                                                </span>
                                                                {'\n\n'}
                                                                {log.requestBody
                                                                    ? formatJson(log.requestBody)
                                                                    : '// No request body'}
                                                            </>
                                                        )}
                                                        {activeTab === 'response' && (
                                                            <>
                                                                <span className="text-gray-500">
                                                                    // Status: {log.status}
                                                                </span>
                                                                {'\n\n'}
                                                                {log.responseData
                                                                    ? formatJson(log.responseData)
                                                                    : log.error
                                                                      ? formatJson(log.error)
                                                                      : '// No response data'}
                                                            </>
                                                        )}
                                                        {activeTab === 'headers' && (
                                                            <>
                                                                <span className="text-gray-500">
                                                                    // Request Headers
                                                                </span>
                                                                {'\n\n'}
                                                                {formatJson(log.requestHeaders || {})}
                                                            </>
                                                        )}
                                                        {activeTab === 'curl' && (
                                                            <>
                                                                <span className="text-gray-500">// cURL command</span>
                                                                {'\n\n'}
                                                                {log.curl || 'N/A'}
                                                            </>
                                                        )}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
