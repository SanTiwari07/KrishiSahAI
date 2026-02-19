import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, Cloud, TrendingUp, Bug } from 'lucide-react';
import { api } from '../src/services/api';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'weather' | 'market' | 'advisory' | 'pest' | 'general' | 'disease';
    priority: 'high' | 'medium' | 'low';
    timestamp: string;
    source?: string;
    action?: string;
    read: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
    weather: Cloud,
    market: TrendingUp,
    advisory: Info,
    pest: Bug,
    disease: AlertTriangle,
    general: CheckCircle,
};

const priorityStyles = {
    high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-700' },
    medium: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700' },
    low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100 text-blue-700' },
};

const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Fetch notifications on mount
    useEffect(() => {
        fetchNotifications();

        // Poll every 5 minutes (300000ms) to keep updated without refresh
        const interval = setInterval(fetchNotifications, 300000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await api.getNotifications();
            if (data.success && data.notifications?.length) {
                setNotifications(data.notifications);
            } else {
                setNotifications(getFallbackNotifications());
            }
        } catch {
            setNotifications(getFallbackNotifications());
        } finally {
            setLoading(false);
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleTriggerUpdate = async () => {
        try {
            setLoading(true);
            await api.post('/notifications/trigger', {});
            await fetchNotifications();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const timeAgo = (ts: string) => {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div className="relative" ref={ref}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="relative flex items-center justify-center w-10 h-10 bg-[#FAFAF7] border border-[#E6E6E6] rounded-full hover:bg-[#E8F5E9] transition-all"
                title="Notifications"
            >
                <Bell size={18} className="text-[#043744]" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Mobile Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="fixed left-4 right-4 top-20 z-50 sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-96 bg-white border border-[#E6E6E6] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6E6E6] bg-[#FAFAF7]">
                            <h3 className="text-sm font-extrabold text-[#1E1E1E]">Notifications</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleTriggerUpdate}
                                    disabled={loading}
                                    className="text-[11px] bg-green-100 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-200 disabled:opacity-50 font-medium transition-colors"
                                >
                                    {loading ? 'Checking...' : 'Check Now'}
                                </button>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="text-[11px] font-bold text-[#043744] hover:underline pt-1"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[60vh] sm:max-h-[32rem] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-[#999]">No notifications</div>
                            ) : (
                                notifications.map((n, idx) => {
                                    const Icon = typeIcons[n.type] || Info;
                                    const priorityStyle = priorityStyles[n.priority || 'low'];

                                    return (
                                        <div
                                            key={n.id || idx}
                                            className={`flex gap-3 px-4 py-4 border-b border-[#F0F0F0] last:border-b-0 transition-colors hover:bg-gray-50
                                            ${n.read ? 'bg-white' : priorityStyle.bg}
                                        `}
                                        >
                                            <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-gray-100 text-gray-400' : priorityStyle.badge}`}>
                                                <Icon size={16} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className={`text-[13px] font-bold leading-tight break-words ${n.read ? 'text-gray-700' : 'text-[#1E1E1E]'}`}>
                                                        {n.title}
                                                    </p>
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2 flex-shrink-0">
                                                        {timeAgo(n.timestamp)}
                                                    </span>
                                                </div>

                                                <p className="text-[12px] text-[#555] mt-1 leading-snug break-words">
                                                    {n.message}
                                                </p>

                                                {n.action && (
                                                    <div className="mt-2 text-[11px] bg-white/60 p-2 rounded border border-black/5 text-[#333] break-words">
                                                        <span className="font-semibold text-[#043744]">Action:</span> {n.action}
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-semibold tracking-wider ${priorityStyle.badge} ${priorityStyle.border}`}>
                                                        {n.priority}
                                                    </span>
                                                    {n.source && (
                                                        <span className="text-[9px] text-gray-400">
                                                            via {n.source}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

function getFallbackNotifications(): Notification[] {
    const now = new Date().toISOString();
    return [
        {
            id: '1',
            title: 'Heavy Rain Alert',
            message: 'Heavy rainfall expected in your area (>75%).',
            type: 'weather',
            priority: 'high',
            action: 'Delay pesticide spraying. Cover harvested crops.',
            source: 'Weather API',
            timestamp: now,
            read: false
        },
        {
            id: '2',
            title: 'Brown Planthopper Risk',
            message: 'Humid conditions favor pest breeding in Rice.',
            type: 'pest',
            priority: 'medium',
            action: 'Monitor field for hopper burn patches.',
            source: 'AI Insights',
            timestamp: now,
            read: false
        },
        {
            id: '3',
            title: 'Wheat Price Up',
            message: 'Wheat prices increased by ₹50/quintal in local mandi.',
            type: 'market',
            priority: 'low',
            source: 'News API',
            timestamp: now,
            read: false
        },
    ];
}

export default NotificationBell;
