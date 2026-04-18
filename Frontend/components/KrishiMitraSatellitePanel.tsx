import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Leaf, MessageSquareText, Sprout } from 'lucide-react';
import type { SatelliteGeometryAnalysisResponse } from '../src/services/api';

function chatbotChatUrl(): string {
    const raw =
        (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
        (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
        `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5000/api`;
    const base = raw.replace(/\/$/, '');
    const root = base.replace(/\/api\/?$/i, '');
    return `${root}/chatbot/chat`;
}

function formatTime(d: Date): string {
    return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function newSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function TypingIndicator() {
    return (
        <div className="flex gap-2 px-1 py-2">
            <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-950/60 text-emerald-200"
                aria-hidden
            >
                <MessageSquareText className="h-3.5 w-3.5" strokeWidth={2.25} />
            </div>
            <div className="rounded-2xl rounded-bl-md border border-white/10 bg-black/35 px-3 py-2">
                <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300 [animation-delay:300ms]" />
                </div>
            </div>
        </div>
    );
}

function SkeletonLoader() {
    return (
        <div className="space-y-2 px-1 py-2">
            <div className="h-3 w-full animate-pulse rounded bg-emerald-900/40" />
            <div className="h-3 w-[80%] animate-pulse rounded bg-emerald-900/30" />
            <div className="h-3 w-[60%] animate-pulse rounded bg-emerald-900/25" />
        </div>
    );
}

function MessageBubble({
    msg,
}: {
    msg: { id: number; role: string; content: string; timestamp: Date };
}) {
    const isAssistant = msg.role === 'assistant';
    const formatContent = (text: string) => {
        if (!text) return { __html: '' };
        const html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-emerald-100">$1</strong>')
            .replace(/\n\*\s(.*?)/g, '<br/>• $1')
            .replace(/\n/g, '<br/>');
        return { __html: html };
    };
    return (
        <div
            className={`flex gap-2 px-1 py-1.5 ${isAssistant ? '' : 'flex-row-reverse'}`}
        >
            {isAssistant && (
                <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-950/60 text-emerald-200"
                    aria-hidden
                >
                    <MessageSquareText className="h-3.5 w-3.5" strokeWidth={2.25} />
                </div>
            )}
            <div
                className={`max-w-[280px] rounded-2xl border px-3 py-2 text-xs leading-relaxed ${
                    isAssistant
                        ? 'rounded-bl-md border-white/10 bg-black/35 text-emerald-50'
                        : 'rounded-br-md border-emerald-500/30 bg-emerald-900/40 text-white'
                }`}
            >
                <div
                    className="km-bubble__text"
                    dangerouslySetInnerHTML={formatContent(msg.content)}
                />
                <span className="mt-1 block text-[10px] font-medium text-white/45">
                    {formatTime(msg.timestamp)}
                </span>
            </div>
        </div>
    );
}

type Props = {
    analysisData: SatelliteGeometryAnalysisResponse | null;
    fieldName: string;
};

type MitraContextPayload = {
    farmContext: Record<string, unknown>;
    heatmapContext: Record<string, unknown>;
};

/**
 * Port of NDVI_satellite `KrishiMitraPanel.jsx` — same API contract
 * POST /chatbot/chat with session_id, message, farmData, heatmapData.
 */
export default function KrishiMitraSatellitePanel({
    analysisData,
    fieldName,
}: Props) {
    const [messages, setMessages] = useState<
        { id: number; role: string; content: string; timestamp: Date }[]
    >([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState<
        'idle' | 'connecting' | 'live' | 'error'
    >('idle');
    const sessionIdRef = useRef(newSessionId());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    /** Farm + heatmap payload for /chatbot/chat; null = use server fallbacks (still allowed). */
    const activeContext = useMemo(() => {
        if (!analysisData) return null;
        const summary = analysisData.farm_summary;
        const cells = analysisData.features ?? [];
        if (!summary && cells.length === 0) return null;

        let stressed = 0;
        let moderate = 0;
        let healthy = 0;
        let sumCvi = 0;
        let sumNdvi = 0;
        let sumEvi = 0;
        let sumSavi = 0;
        let sumNdmi = 0;
        let sumGndvi = 0;
        for (const f of cells) {
            const p = f.properties || {};
            const v = Number(p.cvi ?? p.CVI ?? 0) || 0;
            if (v < 0.3) stressed += 1;
            else if (v < 0.6) moderate += 1;
            else healthy += 1;
            sumCvi += Number(p.cvi ?? p.CVI ?? 0) || 0;
            sumNdvi += Number(p.ndvi ?? p.NDVI ?? 0) || 0;
            sumEvi += Number(p.evi ?? p.EVI ?? 0) || 0;
            sumSavi += Number(p.savi ?? p.SAVI ?? 0) || 0;
            sumNdmi += Number(p.ndmi ?? p.NDMI ?? 0) || 0;
            sumGndvi += Number(p.gndvi ?? p.GNDVI ?? 0) || 0;
        }
        const total = Math.max(1, cells.length);
        const idx = summary?.indices || {};
        const mean = (key: string) => {
            const row = idx[key];
            const m = row?.mean;
            return typeof m === 'number' && !Number.isNaN(m) ? m : null;
        };
        return {
            farmContext: {
                fieldName: fieldName || 'Selected field',
                area: (summary as { area_ha?: number })?.area_ha
                    ? Number((summary as { area_ha: number }).area_ha).toFixed(2)
                    : 0,
                date:
                    analysisData.date ||
                    analysisData.endDate ||
                    analysisData.startDate ||
                    'Today',
                confidence: summary?.confidence != null
                    ? Number(summary.confidence).toFixed(1)
                    : '0',
                cleanScenes: summary?.scene_count ?? 0,
                cvi: mean('CVI') ?? summary?.cvi?.mean ?? (cells.length ? sumCvi / total : 0),
                ndvi: mean('NDVI') ?? (cells.length ? sumNdvi / total : 0),
                evi: mean('EVI') ?? (cells.length ? sumEvi / total : 0),
                savi: mean('SAVI') ?? (cells.length ? sumSavi / total : 0),
                ndmi: mean('NDMI') ?? (cells.length ? sumNdmi / total : 0),
                gndvi: mean('GNDVI') ?? (cells.length ? sumGndvi / total : 0),
            },
            heatmapContext: {
                stressedPct: cells.length
                    ? Math.round((stressed / total) * 100)
                    : 0,
                stressedLocation: 'the field',
                moderatePct: cells.length
                    ? Math.round((moderate / total) * 100)
                    : 0,
                moderateLocation: 'the field',
                healthyPct: cells.length
                    ? Math.round((healthy / total) * 100)
                    : 0,
                healthyLocation: 'the field',
            },
        };
    }, [analysisData, fieldName]);

    const callChatAPI = useCallback(
        async (message: string, context: MitraContextPayload | null) => {
            const reqBody: Record<string, unknown> = {
                session_id: sessionIdRef.current,
                message,
            };
            if (context) {
                reqBody.farmData = context.farmContext;
                reqBody.heatmapData = context.heatmapContext;
            }
            const ctl = new AbortController();
            const tid = window.setTimeout(() => ctl.abort(), 120_000);
            let res: Response;
            try {
                res = await fetch(chatbotChatUrl(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reqBody),
                    signal: ctl.signal,
                });
            } finally {
                window.clearTimeout(tid);
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(
                    (err as { error?: string }).error || `HTTP ${res.status}`
                );
            }
            const data = (await res.json()) as { reply?: string };
            if (!data.reply) throw new Error('Empty reply from server.');
            return data.reply;
        },
        []
    );

    useEffect(() => {
        if (!activeContext) {
            setMessages([]);
            setIsInitializing(false);
            setOllamaStatus('idle');
            return;
        }
        sessionIdRef.current = newSessionId();
        setMessages([]);
        setIsInitializing(true);
        setOllamaStatus('connecting');
        const ctx = activeContext;
        let cancelled = false;
        (async () => {
            try {
                const reply = await callChatAPI(
                    'Generate the farm summary report now.',
                    ctx
                );
                if (cancelled) return;
                setMessages([
                    {
                        id: Date.now(),
                        role: 'assistant',
                        content: reply,
                        timestamp: new Date(),
                    },
                ]);
                setOllamaStatus('live');
            } catch (err) {
                console.error('AI advisor init error:', err);
                if (!cancelled) {
                    setOllamaStatus('error');
                    setMessages([
                        {
                            id: Date.now(),
                            role: 'assistant',
                            content:
                                'Could not connect to Ollama (chat assistant). Start Ollama on this PC (default port 11434) and pull the model from chatbot settings. Drawing fields and NDVI analysis only need the Flask backend.',
                            timestamp: new Date(),
                        },
                    ]);
                }
            } finally {
                if (!cancelled) setIsInitializing(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [activeContext, callChatAPI]);

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || isLoading) return;
            const userMsg = {
                id: Date.now(),
                role: 'user',
                content: trimmed,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMsg]);
            setInputValue('');
            setIsLoading(true);
            try {
                const reply = await callChatAPI(trimmed, activeContext ?? null);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now() + 1,
                        role: 'assistant',
                        content: reply,
                        timestamp: new Date(),
                    },
                ]);
            } catch (err) {
                console.error('Chat error:', err);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now() + 1,
                        role: 'assistant',
                        content:
                            'I could not process that. Please try asking again.',
                        timestamp: new Date(),
                    },
                ]);
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, callChatAPI, activeContext]
    );

    const inputLocked = isLoading;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void sendMessage(inputValue);
        }
    };

    return (
        <div
            className="flex min-h-0 flex-1 flex-col border-t border-[#2E7D32]/35 bg-[#0a180c]"
            aria-label="AI advisor — farm assistant"
        >
            <header className="flex items-center justify-between gap-2 border-b border-[#2E7D32]/25 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/35 bg-emerald-950/50 text-emerald-300">
                        <Sprout className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-black text-emerald-50">
                            AI advisor
                        </p>
                        <p className="truncate text-[10px] font-bold text-emerald-200/70">
                            Satellite farm insights
                        </p>
                    </div>
                </div>
                <div
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                        ollamaStatus === 'live'
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                            : ollamaStatus === 'error'
                              ? 'border-red-500/40 bg-red-950/40 text-red-200'
                              : ollamaStatus === 'connecting'
                                ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
                                : 'border-white/20 bg-black/25 text-emerald-200/80'
                    }`}
                >
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${
                            ollamaStatus === 'live'
                                ? 'bg-emerald-400'
                                : ollamaStatus === 'error'
                                  ? 'bg-red-400'
                                  : ollamaStatus === 'connecting'
                                    ? 'animate-pulse bg-amber-400'
                                    : 'bg-emerald-500/60'
                        }`}
                    />
                    {ollamaStatus === 'idle'
                        ? 'Ready'
                        : ollamaStatus === 'connecting'
                          ? 'Connecting'
                          : ollamaStatus === 'live'
                            ? 'Live'
                            : 'Offline'}
                </div>
            </header>

            {analysisData && activeContext && (
                <p className="border-b border-[#2E7D32]/20 px-3 py-1.5 text-[10px] font-semibold text-emerald-100/80">
                    {fieldName || 'Field'} · Sentinel-2 indices · from your latest
                    analysis
                </p>
            )}

            <section
                className="min-h-0 flex-1 overflow-y-auto px-2 py-1"
                aria-live="polite"
            >
                {!analysisData || !activeContext ? (
                    <div className="flex flex-col items-center gap-2 px-2 py-6 text-center text-[11px] font-semibold text-emerald-200/75">
                        <Leaf className="h-5 w-5 text-emerald-500/80" strokeWidth={1.75} />
                        <span>
                            Run analysis for field-specific advice. You can still
                            ask general questions below (Ollama must be running).
                        </span>
                    </div>
                ) : isInitializing ? (
                    <SkeletonLoader />
                ) : (
                    messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
                )}
                {isLoading && !isInitializing && <TypingIndicator />}
                <div ref={messagesEndRef} />
            </section>

            <footer className="flex gap-2 border-t border-[#2E7D32]/30 p-2">
                <input
                    className="min-w-0 flex-1 rounded-xl border border-[#2E7D32]/40 bg-[#061208] px-3 py-2 text-xs font-semibold text-white placeholder:text-white/35 outline-none focus:border-emerald-500/60"
                    type="text"
                    placeholder="Ask about your farm..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={inputLocked}
                    autoComplete="off"
                    aria-label="Ask the AI advisor a question"
                />
                <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2E7D32] text-white transition hover:bg-[#388E3C] disabled:opacity-40"
                    onClick={() => void sendMessage(inputValue)}
                    disabled={inputLocked || !inputValue.trim()}
                    aria-label="Send message"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                    </svg>
                </button>
            </footer>
        </div>
    );
}
