import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sprout, MessageSquareText, Leaf } from 'lucide-react';
import { apiUrl } from '../src/services/api';

const CHATBOT_API = apiUrl('/satellite-health/chatbot/chat');

// ─────────────────────────────────────────────────────────────────────────────
// TIMESTAMP HELPER
// ─────────────────────────────────────────────────────────────────────────────
function formatTime(date: Date) {
  return date.toLocaleTimeString('en-IN', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="km-message km-message--assistant">
      <div className="km-avatar" aria-hidden="true">
        <MessageSquareText size={12} strokeWidth={2.25} />
      </div>
      <div className="km-bubble km-bubble--assistant">
        <div className="km-typing-dots">
          <span className="km-dot km-dot--1" />
          <span className="km-dot km-dot--2" />
          <span className="km-dot km-dot--3" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonLoader() {
  return (
    <div className="km-skeleton-wrap">
      <div className="km-skeleton-row km-skeleton-row--wide" />
      <div className="km-skeleton-row km-skeleton-row--med" />
      <div className="km-skeleton-row km-skeleton-row--narrow" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: { role: string; content: string; timestamp: Date } }) {
  const isAssistant = msg.role === 'assistant';

  const formatContent = (text: string) => {
    if (!text) return { __html: '' };
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="km-strong">$1</strong>')
      // Map asterisk bullet points cleanly
      .replace(/\n\*\s(.*?)/g, '<br/>• $1')
      // Single newlines to line breaks
      .replace(/\n/g, '<br/>');
    
    return { __html: html };
  };

  return (
    <div className={`km-message km-message--${msg.role}`}>
      {isAssistant && (
        <div className="km-avatar" aria-hidden="true">
          <MessageSquareText size={12} strokeWidth={2.25} />
        </div>
      )}
      <div className={`km-bubble km-bubble--${msg.role}`}>
        <div 
            className="km-bubble__text" 
            dangerouslySetInnerHTML={formatContent(msg.content)} 
            style={{ whiteSpace: 'normal', lineHeight: '1.6' }} 
        />
        <span className="km-bubble__time">{formatTime(msg.timestamp)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PANEL
// ─────────────────────────────────────────────────────────────────────────────
interface KrishiMitraPanelProps {
  analysisData: any;
  activeField: { name?: string };
}

export default function KrishiMitraPanel({ analysisData, activeField }: KrishiMitraPanelProps) {
  const [messages,       setMessages]       = useState<Array<{ id: number; role: string; content: string; timestamp: Date }>>([]);
  const [inputValue,     setInputValue]     = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [ollamaStatus,   setOllamaStatus]   = useState('connecting');

  // Stable session ID for the lifetime of this panel mount
  const sessionIdRef    = useRef(crypto.randomUUID());
  const messagesEndRef  = useRef<HTMLDivElement>(null);

  // Auto-scroll after every state change that adds messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // ── Core fetch helper ───────────────────────────────────────────────────────
  const callChatAPI = useCallback(async (message: string, context: any = null) => {
    const reqBody: any = {
      session_id: sessionIdRef.current,
      message,
    };
    if (context) {
      reqBody.farmData = context.farmContext;
      reqBody.heatmapData = context.heatmapContext;
    }

    // Attempt to retrieve authorization token if configured in app
    let token = '';
    try {
        const { auth } = await import('../../firebase');
        if (auth.currentUser) {
            token = await auth.currentUser.getIdToken();
        }
    } catch(e) {}

    const headers: any = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(CHATBOT_API, {
      method:  'POST',
      headers,
      body:    JSON.stringify(reqBody),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.reply) throw new Error('Empty reply from server.');
    return data.reply;
  }, []);

  // ── Stable Context Calculation ──────────────────────────────────────────────
  const activeContext = React.useMemo(() => {
    if (!analysisData || !activeField) return null;

    const cells = analysisData.features || [];
    let stressed = 0, moderate = 0, healthy = 0;
    let sumCvi = 0, sumNdvi = 0, sumEvi = 0, sumSavi = 0, sumNdmi = 0, sumGndvi = 0;

    cells.forEach((f: any) => {
       const p = f.properties || {};
       const v = p.cvi || p.CVI || 0;
       if (v < 0.3) stressed++;
       else if (v < 0.6) moderate++;
       else healthy++;

       sumCvi += v;
       sumNdvi += p.ndvi || p.NDVI || 0;
       sumEvi += p.evi || p.EVI || 0;
       sumSavi += p.savi || p.SAVI || 0;
       sumNdmi += p.ndmi || p.NDMI || 0;
       sumGndvi += p.gndvi || p.GNDVI || 0;
    });

    const total = cells.length || 1;
    const summary = analysisData.farm_summary || {};
    
    return {
      farmContext: {
         fieldName: activeField.name || "Selected Field",
         area: summary.area_ha ? summary.area_ha.toFixed(2) : 0,
         date: analysisData.date || "Today",
         confidence: summary.confidence ? (summary.confidence * 100).toFixed(1) : 0,
         cleanScenes: summary.scene_count || 0,
         cvi: summary.cvi?.mean ?? (sumCvi / total),
         ndvi: summary.indices?.ndvi?.mean ?? (sumNdvi / total),
         evi: summary.indices?.evi?.mean ?? (sumEvi / total),
         savi: summary.indices?.savi?.mean ?? (sumSavi / total),
         ndmi: summary.indices?.ndmi?.mean ?? (sumNdmi / total),
         gndvi: summary.indices?.gndvi?.mean ?? (sumGndvi / total),
      },
      heatmapContext: {
         stressedPct: Math.round((stressed / total) * 100),
         stressedLocation: "the field",
         moderatePct: Math.round((moderate / total) * 100),
         moderateLocation: "the field",
         healthyPct: Math.round((healthy / total) * 100),
         healthyLocation: "the field"
      }
    };
  }, [analysisData, activeField]);


  // ── Auto-summary when farm becomes available ────────────────────────────────
  useEffect(() => {
    if (!activeContext) {
      setMessages([]);
      setIsInitializing(false);
      setOllamaStatus('connecting'); // Or Idle
      return;
    }

    // Reset session for new farm
    sessionIdRef.current = crypto.randomUUID();
    setMessages([]);
    setIsInitializing(true);
    setOllamaStatus('connecting');

    (async () => {
      try {
        const reply = await callChatAPI('Generate the farm summary report now.', activeContext);
        setMessages([{
          id:        Date.now(),
          role:      'assistant',
          content:   reply,
          timestamp: new Date(),
        }]);
        setOllamaStatus('live');
      } catch (err) {
        console.error('AI advisor init error:', err);
        setOllamaStatus('error');
        setMessages([{
          id:        Date.now(),
          role:      'assistant',
          content:   'Could not connect to Ollama (chat assistant). Start Ollama on this PC (default port 11434) and pull the model from chatbot settings. Drawing fields and NDVI analysis only need the Flask backend.',
          timestamp: new Date(),
        }]);
      } finally {
        setIsInitializing(false);
      }
    })();
  }, [activeContext, callChatAPI]);

  // ── Send a user message ─────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg = {
      id:        Date.now(),
      role:      'user',
      content:   trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const reply = await callChatAPI(trimmed, activeContext);
      setMessages(prev => [...prev, {
        id:        Date.now() + 1,
        role:      'assistant',
        content:   reply,
        timestamp: new Date(),
      }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        id:        Date.now() + 1,
        role:      'assistant',
        content:   'I could not process that. Please try asking again.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, callChatAPI, activeContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const statusColor = ollamaStatus === 'connecting' ? 'bg-amber-400' : ollamaStatus === 'live' ? 'bg-emerald-400' : 'bg-red-400';

  return (
    <div className="flex w-full flex-col h-full rounded-2xl border border-emerald-500/35 bg-[#0a180c] overflow-hidden" aria-label="AI advisor — farm assistant">

      {/* ── Header ── */}
      <header className="flex items-center justify-between border-b border-emerald-500/25 bg-[#132a16] p-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center rounded-lg bg-emerald-500/20 p-1.5" aria-hidden="true">
            <Sprout size={18} strokeWidth={2} className="text-emerald-300" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-200">Krishi Mitra</span>
            <span className="text-[10px] text-emerald-200/60 font-semibold mt-0.5">Farm Advisor</span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 border border-white/10 bg-black/40`}>
          <span className={`block h-1.5 w-1.5 rounded-full ${statusColor} shadow-[0_0_8px_rgba(255,255,255,0.4)]`} />
          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/80 mt-[1px]">
            {ollamaStatus === 'connecting' ? 'Connecting'
              : ollamaStatus === 'live'    ? 'Live'
              : 'Offline'}
          </span>
        </div>
      </header>

      {/* ── Messages ── */}
      <section className="flex-1 overflow-y-auto p-3 space-y-3" aria-live="polite">
        {!analysisData || !activeField ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4">
            <div className="mb-3 rounded-full bg-emerald-500/10 p-3 text-emerald-400/50">
              <Leaf size={24} strokeWidth={1.75} />
            </div>
            <p className="text-xs font-semibold leading-relaxed text-emerald-100/60">
              Run satellite analysis to start receiving AI-driven insights for your farm.
            </p>
          </div>
        ) : isInitializing ? (
          <SkeletonLoader />
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
        )}
        {isLoading && !isInitializing && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </section>

      {/* ── Input Row ── */}
      <footer className="border-t border-emerald-500/25 bg-[#0a180c] p-2 flex items-center gap-2">
        <input
          id="krishi-mitra-input"
          className="flex-1 rounded-xl border border-[#2E7D32]/40 bg-black/40 px-3 py-2 text-xs font-bold text-white placeholder-emerald-100/30 focus:border-emerald-500/60 focus:outline-none"
          type="text"
          placeholder="Ask about your farm..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isInitializing || !analysisData}
          aria-label="Ask the AI advisor a question"
          autoComplete="off"
        />
        <button
          id="krishi-mitra-send-btn"
          className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-xl bg-[#2E7D32] text-white transition-opacity hover:opacity-80 disabled:opacity-50"
          onClick={() => sendMessage(inputValue)}
          disabled={isLoading || isInitializing || !analysisData || !inputValue.trim()}
          aria-label="Send message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5"
               strokeLinecap="round" strokeLinejoin="round" className="ml-[2px] mt-[1px]">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </footer>
      <style>{`
        .km-message {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          animation: 0.2s km-slide-up cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes km-slide-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .km-message--user {
          flex-direction: row-reverse;
        }
        .km-avatar {
          flex: 0 0 24px;
          height: 24px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
        }
        .km-bubble {
          position: relative;
          max-width: 85%;
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 11px;
          line-height: 1.5;
          word-wrap: break-word;
          font-weight: 500;
        }
        .km-bubble--user {
          background: #2E7D32;
          color: #fff;
          border-bottom-right-radius: 2px;
        }
        .km-bubble--assistant {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-bottom-left-radius: 2px;
        }
        .km-bubble__time {
          display: block;
          font-size: 8px;
          opacity: 0.5;
          margin-top: 4px;
          font-weight: 700;
          text-align: right;
        }
        .km-strong {
          font-weight: 800;
          color: #a7f3d0;
        }
        /* Typing Dots */
        .km-typing-dots { display: flex; gap: 3px; padding: 2px 0; }
        .km-dot {
          width: 4px; height: 4px;
          background: rgba(255,255,255,0.5);
          border-radius: 50%;
          animation: 1.4s km-blink infinite ease-in-out both;
        }
        .km-dot--1 { animation-delay: -0.32s; }
        .km-dot--2 { animation-delay: -0.16s; }
        @keyframes km-blink {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40%           { transform: scale(1); opacity: 1; }
        }
        /* Skeletons */
        .km-skeleton-wrap { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
        .km-skeleton-row {
          height: 10px;
          border-radius: 4px;
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%;
          animation: km-shimmer 1.5s infinite linear;
        }
        .km-skeleton-row--wide { width: 90%; }
        .km-skeleton-row--med { width: 70%; }
        .km-skeleton-row--narrow { width: 40%; }
        @keyframes km-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
