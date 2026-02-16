import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useLocation, useNavigate } from 'react-router-dom';
import { Language } from '../types';
import {
    Send,
    ArrowLeft,
    Menu,
    Bot,
    User,
    FileDown,
    Mic,
    Volume2,
    Square
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/api';
import { ChatLayout } from '../components/ChatLayout';
import { ChatSidebar } from '../components/ChatSidebar';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

// Types locally defined since chatService is removed
export interface Message {
    id?: string;
    role: 'user' | 'assistant' | 'model';
    content: string;
    createdAt: any;
}

export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    createdAt: any;
    updatedAt: any;
    model: string;
    backendSessionId?: string;
}

const MOCK_PROFILE = {
    name: "Farmer Guest",
    land_size: 5,
    state: "Maharashtra",
    district: "Pune"
};

const Chatbot: React.FC = () => {
    const { t, language } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    // Auth & User State
    const [user, setUser] = useState<any>({ uid: 'guest', ...MOCK_PROFILE });
    const [authLoading, setAuthLoading] = useState(false);

    // Chat Data State
    const [chats, setChats] = useState<ChatSession[]>([]); // active chats in memory
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);

    // UI State
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [chatToDelete, setChatToDelete] = useState<{ id: string; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // PDF Generation State
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Backend Session State
    const [backendSessionId, setBackendSessionId] = useState<string | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Voice State
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // --- TTS Functionality ---
    const handleTextToSpeech = async (text: string, messageId: number) => {
        if (playingMessageId === messageId) {
            // Stop playing
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            setPlayingMessageId(null);
            return;
        }

        // Stop any current playback
        if (audioRef.current) {
            audioRef.current.pause();
        }

        try {
            // No token needed for guest/mock
            const response = await fetch('http://localhost:5000/api/voice/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, language: language === 'HI' ? 'hi' : 'en' })
            });

            const data = await response.json();
            if (data.success && data.audio_url) {
                const audio = new Audio(`http://localhost:5000${data.audio_url}`);
                audioRef.current = audio;
                setPlayingMessageId(messageId);

                audio.play();
                audio.onended = () => {
                    setPlayingMessageId(null);
                    audioRef.current = null;
                };
            }
        } catch (error) {
            console.error("TTS Error:", error);
        }
    };

    // --- STT Functionality ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', blob, 'recording.wav');

                setIsLoading(true);
                try {
                    // No token needed
                    const response = await fetch('http://localhost:5000/api/voice/stt', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (data.success) {
                        setInput(prev => prev + " " + data.text);
                    }
                } catch (error) {
                    console.error("STT Error:", error);
                } finally {
                    setIsLoading(false);
                    setIsRecording(false);
                }
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (error) {
            console.error("Microphone access denied:", error);
            alert("Microphone access is required for voice input.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    };

    useEffect(scrollToBottom, [messages]);

    // Initialize Auth (Mock)
    useEffect(() => {
        // Just set mock user immediately
        setUser({ uid: 'guest', ...MOCK_PROFILE });
        setAuthLoading(false);
    }, []);

    // Handle Active Chat Selection - FOR MOCK, we just clear messages if switching to "new"
    // Since we don't persist, "switching" to an old chat isn't really possible unless we keep them in memory
    // For now, let's just support one active session or basic in-memory switching
    useEffect(() => {
        if (!activeChatId) {
            setMessages([]);
            setBackendSessionId(null);
            return;
        }
        // In a real app we'd load messages for this ID.
        // For this cleanup, we assume ephemeral.
    }, [activeChatId]);

    // Handle Navigation State (e.g. "Ask AI" from other pages)
    useEffect(() => {
        if (location.state?.initialMessage && !activeChatId && !isLoading && user) {
            const initMsg = location.state.initialMessage;
            window.history.replaceState({}, document.title);
            handleSend(initMsg);
        }
    }, [location.state, user]);


    const initBackendSession = async () => {
        try {
            console.log("[Chatbot] Initializing backend session for user:", user.uid);

            // Use mock profile or user data
            const profile = MOCK_PROFILE;

            const data = await api.post('/business-advisor/init', {
                name: profile.name,
                land_size: profile.land_size,
                language: language.toLowerCase(),
                ...profile
            });

            console.log("[Chatbot] Init response:", data);

            if (data.success && data.session_id) {
                console.log("[Chatbot] Backend session initialized:", data.session_id);
                return data.session_id;
            } else {
                console.error("[Chatbot] Init returned success=false or no session_id");
            }
        } catch (e) {
            console.error("[Chatbot] Init session failed:", e);
        }
        return null;
    };

    const handleNewChat = () => {
        setActiveChatId(null);
        setMessages([]);
        setBackendSessionId(null);
        setInput('');
        setIsSidebarOpen(false);
    };

    const handleDeleteChat = (chatId: string, chatTitle: string) => {
        setChatToDelete({ id: chatId, title: chatTitle });
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!chatToDelete) return;

        setIsDeleting(true);
        try {
            setChats(prev => prev.filter(c => c.id !== chatToDelete.id));
            if (activeChatId === chatToDelete.id) {
                handleNewChat();
            }
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setChatToDelete(null);
        }
    };

    const handleDownloadPDF = async () => {
        // PDF generation might require backend changes if it checks auth token on server. 
        // We'll leave it as is but warn it might fail if backend enforces strict auth.
        alert("PDF download is disabled in offline mode.");
    };

    const handleSend = async (manualMessage?: string) => {
        const text = manualMessage || input;
        if (!text.trim() || !user) return;

        setInput('');

        const tempUserMsg: Message = { role: 'user', content: text, createdAt: new Date() };
        setMessages(prev => [...prev, tempUserMsg]);

        let currentChatId = activeChatId;
        let currentBackendId = backendSessionId;

        try {
            // Initialize Chat & Session if needed
            if (!currentChatId) {
                // 1. Init Backend Session
                if (!currentBackendId) {
                    currentBackendId = await initBackendSession();
                    setBackendSessionId(currentBackendId);
                }

                // 2. Create In-Memory Chat
                const title = text.split(' ').slice(0, 5).join(' ') + "...";
                const newChatId = Date.now().toString();
                const newChat: ChatSession = {
                    id: newChatId,
                    userId: user.uid,
                    title,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    model: 'krishi-advisor-v1',
                    backendSessionId: currentBackendId || undefined
                };
                setChats(prev => [newChat, ...prev]);
                currentChatId = newChatId;
                setActiveChatId(currentChatId);
            } else if (!currentBackendId) {
                currentBackendId = await initBackendSession();
                setBackendSessionId(currentBackendId);
            }

            // Stream Response
            if (!currentBackendId) {
                console.error("[Chatbot] Cannot stream: No backend session ID");
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "Error: Failed to initialize AI session. Please try refreshing the page.",
                    createdAt: new Date()
                }]);
                return;
            }

            console.log("[Chatbot] Streaming with session ID:", currentBackendId);
            setMessages(prev => [...prev, { role: 'assistant', content: '', createdAt: new Date() }]);

            let responseText = '';
            let retryCount = 0;
            const MAX_RETRIES = 1;

            const attemptStream = async (): Promise<void> => {
                try {
                    await api.stream(
                        '/business-advisor/chat/stream',
                        {
                            message: text,
                            session_id: currentBackendId,
                            language: language.toLowerCase()
                        },
                        (chunk) => {
                            responseText += chunk;
                            setMessages(prev => {
                                const newMsgs = [...prev];
                                const last = newMsgs[newMsgs.length - 1];
                                if (last.role === 'assistant') {
                                    last.content = responseText;
                                }
                                return newMsgs;
                            });
                        },
                        async (err) => {
                            if (err?.message?.includes('Invalid session_id') && retryCount < MAX_RETRIES) {
                                retryCount++;
                                console.warn("[Chatbot] Invalid session detected, reinitializing...");
                                currentBackendId = null;
                                setBackendSessionId(null);
                                currentBackendId = await initBackendSession();
                                setBackendSessionId(currentBackendId);

                                if (currentBackendId) {
                                    console.log("[Chatbot] Session reinitialized, retrying stream...");
                                    await attemptStream();
                                } else {
                                    throw new Error("Failed to reinitialize session");
                                }
                            } else {
                                throw err;
                            }
                        }
                    );
                } catch (error) {
                    console.error("Stream Error:", error);
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        const last = newMsgs[newMsgs.length - 1];
                        if (last.role === 'assistant') {
                            last.content = "Error: Could not connect to AI. Please try again.";
                        }
                        return newMsgs;
                    });
                }
            };

            await attemptStream();

        } catch (e) {
            console.error("Send Loop Error:", e);
        }
    };

    if (authLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    const Sidebar = (
        <ChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={setActiveChatId}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
        />
    );

    return (
        <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] max-w-7xl mx-auto md:p-6 p-0">
            <ChatLayout sidebar={Sidebar}>
                {/* Header for Back Navigation */}
                {(location.state?.fromAdvisory || location.state?.fromCropCare) && (
                    <div className="flex items-center justify-between p-4 border-b border-[#E0E6E6] bg-white sticky top-0 z-30">
                        <button
                            onClick={() => {
                                const targetPath = location.state?.fromAdvisory ? '/advisory' : '/crop-care';
                                navigate(targetPath, { state: location.state.previousState });
                            }}
                            className="flex items-center gap-2 text-[#6B7878] font-bold hover:text-[#043744] transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            {t.back} to {location.state?.fromAdvisory ? 'Recommendations' : 'Assessment'}
                        </button>
                    </div>
                )}

                {!location.state?.fromAdvisory && !location.state?.fromCropCare && (
                    <div className="md:hidden flex items-center p-4 border-b border-[#E0E6E6] bg-white sticky top-0 z-10">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 mr-2">
                            <Menu className="w-6 h-6 text-[#000D0F]" />
                        </button>
                        <h1 className="text-lg font-bold text-[#000D0F]">{t.knowledgeAssistant}</h1>
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <div className="w-24 h-24 bg-[#FAFCFC] rounded-[32px] flex items-center justify-center mb-6">
                                <Bot className="w-12 h-12 text-[#043744]" />
                            </div>
                            <h2 className="text-2xl font-bold text-[#000D0F]">{t.navAskAI}</h2>
                            <p className="max-w-xs mx-auto text-[#6B7878]">{t.chatPlaceholder}</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role !== 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-[#043744] flex items-center justify-center mt-2 flex-shrink-0">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                )}

                                <div className={`relative max-w-[85%] md:max-w-[70%] p-5 rounded-[24px] shadow-sm ${msg.role === 'user'
                                    ? 'bg-[#043744] text-white rounded-tr-sm'
                                    : 'bg-[#FAFCFC] text-[#000D0F] border border-[#E0E6E6] rounded-tl-sm pr-20'
                                    }`}>

                                    {/* Message Actions (TTS) - Only for Assistant */}
                                    {msg.role !== 'user' && (
                                        <div className="absolute top-3 right-3 flex items-center gap-1">
                                            <button
                                                onClick={() => handleTextToSpeech(msg.content, idx)}
                                                className="p-1.5 text-stone-400 hover:text-[#043744] hover:bg-stone-100 rounded-full transition-all"
                                                title={t.listenResponse}
                                            >
                                                {playingMessageId === idx ? <Square className="w-4 h-4 text-red-500 fill-current" /> : <Volume2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    )}

                                    <div className={`text-[15px] leading-relaxed markdown-body whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : ''}`}>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkBreaks]}
                                            components={{
                                                strong: ({ node, ...props }) => <span className={`font-bold ${msg.role === 'user' ? 'text-white' : 'text-[#043744]'}`} {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                                                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                h1: ({ node, ...props }) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
                                            }}
                                        >
                                            {msg.content || ""}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-[#E8F5F5] flex items-center justify-center mt-2 flex-shrink-0">
                                        <User className="w-5 h-5 text-[#043744]" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-white border-t border-[#E0E6E6]">
                    <div className="max-w-4xl mx-auto relative flex items-center gap-3">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={t.chatPlaceholder}
                            className="w-full p-4 pr-14 bg-[#FAFCFC] border border-[#E0E6E6] rounded-[24px] focus:outline-none focus:border-[#043744] focus:ring-4 focus:ring-[#043744]/5 transition-all font-medium placeholder:text-stone-400 text-[#000D0F]"
                        />

                        {/* Mic Button */}
                        <div className="absolute right-16 top-1/2 -translate-y-1/2 z-10">
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isLoading}
                                className={`p-2 rounded-full transition-all ${isRecording
                                    ? 'bg-red-500 text-white animate-pulse shadow-red-200 shadow-lg'
                                    : 'text-stone-400 hover:text-[#043744] hover:bg-stone-100'
                                    }`}
                                title={isRecording ? t.stopRecording : t.voiceInput}
                            >
                                {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                            </button>
                        </div>

                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 p-2 bg-[#043744] text-white rounded-2xl hover:bg-[#000D0F] disabled:opacity-50 disabled:bg-stone-300 transition-all shadow-md"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-center text-[10px] uppercase font-bold tracking-widest text-stone-400 mt-3">
                        {t.aiDisclaimer}
                    </p>
                </div>
            </ChatLayout >

            {/* Delete Confirmation Modal */}
            < DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => {
                    if (!isDeleting) {
                        setDeleteModalOpen(false);
                        setChatToDelete(null);
                    }
                }}
                onConfirm={confirmDelete}
                chatTitle={chatToDelete?.title || ''}
                isDeleting={isDeleting}
            />
        </div >
    );
};

export default Chatbot;
