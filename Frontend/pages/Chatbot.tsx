import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useLanguage } from '../src/context/LanguageContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Language, ChatMessage } from '../types';
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
import { translations } from '../src/i18n/translations';
import { api } from '../src/services/api';
import { auth, onAuthStateChanged } from '../firebase';






import { getUserProfile } from '../src/services/firebase_db';
import { chatService, ChatSession, Message } from '../src/services/chatService';
import { ChatLayout } from '../components/ChatLayout';
import { ChatSidebar } from '../components/ChatSidebar';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';


const Chatbot: React.FC = () => {
    const { t, language: lang } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();

    // Auth & User State
    const [user, setUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Chat Data State
    const [chats, setChats] = useState<ChatSession[]>([]);
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
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Voice State
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [isLoadingTTS, setIsLoadingTTS] = useState<number | null>(null); // message index loading TTS
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

        setIsLoadingTTS(messageId);
        try {
            const token = await user?.getIdToken();
            const response = await fetch('http://localhost:5000/api/voice/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ text, language: lang === 'HI' ? 'hi' : 'en' })
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
        } finally {
            setIsLoadingTTS(null);
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
                    const token = await user?.getIdToken();
                    const response = await fetch('http://localhost:5000/api/voice/stt', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
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

    // 1. Initialize Auth and Load Chats
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Subscribe to chats
                const unsubChats = chatService.subscribeToUserChats(currentUser.uid, (data) => {
                    setChats(data);
                });
                setAuthLoading(false);
                return () => unsubChats();
            } else {
                setUser(null);
                setAuthLoading(false);
                setChats([]);
            }
        });
        return () => unsubscribe();
    }, []);

    // 2. Handle Active Chat Selection
    useEffect(() => {
        const loadActiveChat = async () => {
            if (!user || !activeChatId) {
                setMessages([]);
                setBackendSessionId(null);
                return;
            }

            setIsLoading(true);
            try {
                // Find chat object to get backend ID
                const chat = chats.find(c => c.id === activeChatId);
                if (chat?.backendSessionId) {
                    setBackendSessionId(chat.backendSessionId);
                } else {
                    // If no backend ID stored, we might need to init a new one or handle it
                    // For now, let's assume we'll init if missing when sending message
                    setBackendSessionId(null);
                }

                const msgs = await chatService.getChatMessages(user.uid, activeChatId);
                setMessages(msgs);
            } catch (err) {
                console.error("Failed to load chat:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadActiveChat();
    }, [activeChatId, user]); // Removing chats dependency to prevent loop, relying on find

    // 3. Handle Navigation State (e.g. "Ask AI" from other pages)
    useEffect(() => {
        if (location.state?.initialMessage && !activeChatId && !isLoading && user) {
            const initMsg = location.state.initialMessage;
            // Clear state to prevent loop
            window.history.replaceState({}, document.title);
            handleSend(initMsg);
        }
    }, [location.state, user]);


    const initBackendSession = async () => {
        try {
            console.log("[Chatbot] Initializing backend session for user:", user.uid);
            const profile = await getUserProfile(user.uid);
            console.log("[Chatbot] User profile loaded:", profile);

            const data = await api.post('/business-advisor/init', {
                name: profile?.name || "Farmer",
                land_size: profile?.land_size || 5,
                language: lang.toLowerCase(),
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
        setIsSidebarOpen(false); // Close sidebar on mobile
    };

    const handleDeleteChat = (chatId: string, chatTitle: string) => {
        setChatToDelete({ id: chatId, title: chatTitle });
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!chatToDelete || !user) return;

        setIsDeleting(true);
        try {
            // Optimistic UI update - remove from list immediately
            setChats(prev => prev.filter(c => c.id !== chatToDelete.id));

            // If deleting active chat, switch to new chat view
            if (activeChatId === chatToDelete.id) {
                handleNewChat();
            }

            // Delete from Firestore
            const success = await chatService.deleteChat(user.uid, chatToDelete.id);

            if (!success) {
                // Revert optimistic update on failure
                console.error('Failed to delete chat');
                // Optionally show error toast here
                // For now, the chat list will refresh from Firestore subscription
            }
        } catch (error) {
            console.error('Error in delete handler:', error);
        } finally {
            setIsDeleting(false);
            setDeleteModalOpen(false);
            setChatToDelete(null);
        }
    };

    const handleDownloadPDF = async () => {
        if (!activeChatId || !user) return;

        setIsGeneratingPDF(true);
        try {
            const response = await fetch('http://localhost:5000/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await user.getIdToken()}`
                },
                body: JSON.stringify({
                    userId: user.uid,
                    chatId: activeChatId
                })
            });

            if (!response.ok) {
                throw new Error('PDF generation failed');
            }

            // Download the PDF
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `KrishiSahAI_Advisory_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF generation failed:', error);
            // Optionally show error toast here
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleSend = async (manualMessage?: string) => {
        const text = manualMessage || input;
        if (!text.trim() || !user) return;

        setInput('');

        // Optimistic UI update
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

                // 2. Create Firestore Chat
                // Generate simple title from first few words
                const title = text.split(' ').slice(0, 5).join(' ') + "...";
                currentChatId = await chatService.createChat(user.uid, title, currentBackendId || undefined);
                setActiveChatId(currentChatId);
            } else if (!currentBackendId) {
                // Resuming a chat that lost its backend session?
                currentBackendId = await initBackendSession();
                setBackendSessionId(currentBackendId);
                // Note: we might want to update the chat doc with this new ID
            }

            // Save User Message to Firestore
            if (currentChatId) {
                await chatService.saveMessage(user.uid, currentChatId, tempUserMsg);
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
                            language: lang.toLowerCase()
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
                            // Check if this is an invalid session error
                            if (err?.message?.includes('Invalid session_id') && retryCount < MAX_RETRIES) {
                                retryCount++;
                                console.warn("[Chatbot] Invalid session detected, reinitializing...");

                                // Clear stale session
                                currentBackendId = null;
                                setBackendSessionId(null);

                                // Re-initialize session
                                currentBackendId = await initBackendSession();
                                setBackendSessionId(currentBackendId);

                                // Update Firestore chat with new backend ID
                                if (currentChatId && currentBackendId) {
                                    await chatService.updateChatBackendSession(user.uid, currentChatId, currentBackendId);
                                }

                                
                                if (currentBackendId) {
                                    console.log("[Chatbot] Session reinitialized, retrying stream...");
                                    // Retry the stream
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

            // Save Assistant Message to Firestore when done
            if (currentChatId && responseText) {
                await chatService.saveMessage(user.uid, currentChatId, {
                    role: 'assistant',
                    content: responseText,
                    createdAt: new Date()
                });

                // Generate smart title if this was the first exchange of a NEW chat
                if (!activeChatId) {
                    try {
                        setIsGeneratingTitle(true);
                        const token = await user?.getIdToken();
                        const titleRes = await fetch('http://localhost:5000/api/chat/generate-title', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ session_id: currentBackendId })
                        });
                        const titleData = await titleRes.json();
                        if (titleData.success) {
                            await chatService.updateChatTitle(user.uid, currentChatId, titleData.title);
                            setChats(prev => prev.map(c => 
                                c.id === currentChatId ? { ...c, title: titleData.title } : c
                            ));
                        }
                    } catch (tError) {
                        console.error("Title error:", tError);
                    } finally {
                        setIsGeneratingTitle(false);
                    }
                }
            }

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
                {/* Header for Back Navigation (if from Advisory OR CropCare) - Visible on both Mobile & Desktop */}
                {(location.state?.fromAdvisory || location.state?.fromCropCare || location.state?.isRoadmapPlanner) && (
                    <div className="flex items-center justify-between p-4 border-b border-[#E0E6E6] bg-white/80 backdrop-blur-md sticky top-0 z-30">
                        <button
                            onClick={() => {
                                // Navigate back to source with restored state
                                if (location.state?.isRoadmapPlanner) {
                                    navigate(`/roadmap/${location.state.businessName}`, { state: location.state.previousState });
                                } else {
                                    const targetPath = location.state?.fromAdvisory ? '/advisory' : '/crop-care';
                                    navigate(targetPath, { state: location.state.previousState });
                                }
                            }}
                            className="flex items-center gap-2 text-[#6B7878] font-bold hover:text-[#1B5E20] transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            {t.back} to {location.state?.isRoadmapPlanner ? 'Strategy Planner' : (location.state?.fromAdvisory ? 'Recommendations' : 'Assessment')}
                        </button>

                        {/* PDF Download Button */}
                        {messages.length > 0 && activeChatId && (
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isGeneratingPDF || isLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-[#1B5E20] text-white rounded-xl font-bold hover:bg-[#002105] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Download PDF"
                            >
                                {isGeneratingPDF ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FileDown className="w-4 h-4" />
                                        Download PDF
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Mobile Header (Only show if NOT from advisory, OR keep it but maybe different style? 
                    Actually, if from advisory, we probably want the back button to take precedence.
                    Let's hide the default mobile header if we show the back button locally, OR just stack them.
                    Stacking might be crowded. Let's show Mobile Header only if NOT from advisory, 
                    OR modify it. 
                    Simple approach: If fromAdvisory, showing the back button bar above is fine. 
                */}
                {!location.state?.fromAdvisory && !location.state?.fromCropCare && (
                    <div className="md:hidden flex items-center p-4 border-b border-[#E0E6E6] bg-white/80 backdrop-blur-md sticky top-0 z-10">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 mr-2">
                            <Menu className="w-6 h-6 text-[#002105]" />
                        </button>
                        <h1 className="text-lg font-bold text-[#002105]">
                            {location.state?.isRoadmapPlanner ? `Making 10 year plan for ${location.state?.businessName}...` : t.navAskAI}
                        </h1>
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <div className="w-24 h-24 bg-[#FAFCFC] rounded-[32px] flex items-center justify-center mb-6">
                                <Bot className="w-12 h-12 text-[#1B5E20]" />
                            </div>
                            <h2 className="text-2xl font-bold text-[#002105] mb-2">{t.navAskAI}</h2>
                            <p className="max-w-xs mx-auto text-[#6B7878]">Ask about crop diseases, market prices, or farming techniques.</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role !== 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-[#1B5E20] flex items-center justify-center mt-2 flex-shrink-0">
                                        <Bot className="w-5 h-5 text-white" />
                                    </div>
                                )}

                                <div className={`relative max-w-[85%] md:max-w-[70%] p-5 rounded-[24px] shadow-sm ${msg.role === 'user'
                                    ? 'bg-[#1B5E20] text-white rounded-tr-sm'
                                    : 'bg-[#FAFCFC] text-[#002105] border border-[#E0E6E6] rounded-tl-sm pr-20'
                                    }`}>

                                    {/* Message Actions (TTS & PDF) - Only for Assistant */}
                                    {msg.role !== 'user' && (
                                        <div className="absolute top-3 right-3 flex items-center gap-1">
                                            {/* TTS Button */}
                                            <button
                                                onClick={() => handleTextToSpeech(msg.content, idx)}
                                                className={`p-1.5 rounded-full transition-all ${
                                                    playingMessageId === idx 
                                                    ? 'text-red-500 hover:bg-red-50' 
                                                    : 'text-stone-400 hover:text-[#1B5E20] hover:bg-stone-100'
                                                }`}
                                                title={playingMessageId === idx ? "Stop playback" : "Listen to response"}
                                                disabled={isLoadingTTS === idx}
                                            >
                                                {isLoadingTTS === idx ? (
                                                    <div className="w-4 h-4 border-2 border-stone-300 border-t-[#1B5E20] rounded-full animate-spin"></div>
                                                ) : playingMessageId === idx ? (
                                                    <Square className="w-4 h-4 fill-current" />
                                                ) : (
                                                    <Volume2 className="w-4 h-4" />
                                                )}
                                            </button>

                                            {/* PDF Button */}
                                            <button
                                                onClick={handleDownloadPDF}
                                                disabled={isGeneratingPDF}
                                                className="p-1.5 text-stone-400 hover:text-[#1B5E20] hover:bg-stone-100 rounded-full transition-all disabled:opacity-50"
                                                title="Download PDF"
                                            >
                                                {isGeneratingPDF ? (
                                                    <div className="w-4 h-4 border-2 border-stone-300 border-t-[#1B5E20] rounded-full animate-spin"></div>
                                                ) : (
                                                    <FileDown className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    <div className={`text-[15px] leading-relaxed markdown-body whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : ''}`}>
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm, remarkBreaks]}
                                            components={{
                                                strong: ({ node, ...props }) => <span className={`font-bold ${msg.role === 'user' ? 'text-white' : 'text-[#1B5E20]'}`} {...props} />,
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
                                    <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center mt-2 flex-shrink-0">
                                        <User className="w-5 h-5 text-[#1B5E20]" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    
                    {/* Roadmap Planner Status Message */}
                    {location.state?.isRoadmapPlanner && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && !messages[messages.length - 1].content && (
                        <div className="flex flex-col items-center justify-center p-12 text-center animate-pulse">
                            <div className="w-16 h-16 bg-deep-green/10 rounded-full flex items-center justify-center mb-4">
                                <Bot className="w-8 h-8 text-deep-green" />
                            </div>
                            <h3 className="text-xl font-bold text-deep-green">
                                Making 10 year plan for {location.state?.businessName}...
                            </h3>
                            <p className="text-stone-500 mt-2">Analyzing market trends and regional data.</p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-white border-t-2 border-deep-green/10">
                    <div className="max-w-4xl mx-auto relative flex items-center gap-3">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={t.chatPlaceholder}
                            className="w-full p-4 pr-14 bg-[#FAFCFC] border-2 border-[#E0E6E6] focus:outline-none focus:border-deep-green focus:ring-0 transition-all font-medium placeholder:text-stone-400 text-[#002105]"
                        />

                        {/* Mic Button */}
                        <div className="absolute right-20 top-1/2 -translate-y-1/2 z-10 border-r border-gray-300 pr-2">
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isLoading}
                                className={`p-2 transition-all ${isRecording
                                    ? 'text-red-600 animate-pulse'
                                    : 'text-stone-400 hover:text-deep-green'
                                    }`}
                                title={isRecording ? "Stop Recording" : "Voice Input"}
                            >
                                {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
                            </button>
                        </div>

                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            className="p-4 bg-deep-green text-white hover:bg-deep-green/90 disabled:opacity-50 disabled:bg-stone-300 transition-all shadow-md min-w-[3.5rem] flex items-center justify-center"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-center text-[10px] uppercase font-bold tracking-widest text-stone-400 mt-3">
                        AI can make mistakes. Verify important info.
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

