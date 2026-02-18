import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { api } from '../src/services/api';
import { auth } from '../firebase';
import { Language, ChatMessage } from '../types';
import { translations } from '../src/i18n/translations';
import {
    ArrowLeft,
    Recycle,
    Leaf,
    Search,
    ArrowRight,
    MessageCircle,
    User,
    Bot,
    Info,
    X,
    Sprout,
    Send,
    Loader2,
    Camera,
    Upload
} from 'lucide-react';

/* 
  Refactored to have a dedicated Chat View.
  - 'chat' ViewState added.
  - Inline chat removed from 'results'.
  - Back button added to 'chat' view.
*/

type ViewState = 'input' | 'processing' | 'results' | 'chat' | 'intro';

const WasteToValue: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = translations[lang];
    const navigate = useNavigate();
    const [view, setView] = useState<ViewState>('input');

    // State
    const [cropInput, setCropInput] = useState('');
    const [resultData, setResultData] = useState<any>(null);
    const [selectedOption, setSelectedOption] = useState<any | null>(null); // For Modal
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Greeting when entering results view
    useEffect(() => {
        if (view === 'results' && messages.length === 0 && resultData) {
            const user = auth.currentUser;
            const userName = user?.displayName || (lang === 'HI' ? 'किसान' : lang === 'MR' ? 'शेतकरी' : 'Farmer');

            const initialText = lang === 'HI'
                ? `नमस्ते **${userName}**! \n\nमैंने आपके **${resultData?.crop}** कचरे का विश्लेषण किया है।\n\nउसे उपयोग करने के शीर्ष 3 लाभदायक तरीके ऊपर दिए गए हैं। इन विकल्पों के बारे में मुझसे कुछ भी पूछें!`
                : lang === 'MR'
                    ? `नमस्कार **${userName}**! \n\nमी तुमच्या **${resultData?.crop}** कचऱ्याचे विश्लेषण केले आहे.\n\nत्याचा वापर करण्याचे शीर्ष 3 फायदेशीर मार्ग वर दिले आहेत. या पर्यायांबद्दल मला काहीही विचारा!`
                    : `Hello **${userName}**! \n\nI have analyzed your **${resultData?.crop}** waste.\n\nAbove are the top 3 profitable ways to use it. Ask me anything about these options!`;

            setMessages([
                {
                    role: 'model',
                    text: initialText
                } as ChatMessage
            ]);
        }
    }, [view, resultData, lang]);

    // Scroll to bottom of chat
    useEffect(() => {
        if (view === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, view]);

    const handleAnalyze = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cropInput.trim()) return;

        setView('processing');
        setMessages([]); // Clear previous chat

        try {
            const response = await api.post('/waste-to-value/analyze', {
                crop: cropInput,
                language: lang === 'HI' ? 'Hindi' : lang === 'MR' ? 'Marathi' : 'English'
            });

            if (response.success && response.result) {
                setResultData(response.result);
                setView('results');
            } else {
                throw new Error('Invalid data format');
            }
        } catch (error) {
            console.error("Error analyzing waste:", error);
            setView('input');
        }
    };

    const handleSendMessage = async (textOverride?: string) => {
        const question = textOverride || chatInput;
        if (!question.trim() || isChatLoading) return;

        if (!textOverride) setChatInput('');
        setIsChatLoading(true);

        // Add User Message
        const userMsg: ChatMessage = { role: 'user', text: question };
        setMessages(prev => [...prev, userMsg]);

        // Add Placeholder for AI
        const aiMsgPlaceHolder = { role: 'model', text: '' } as ChatMessage;
        setMessages(prev => [...prev, aiMsgPlaceHolder]);

        try {
            const context = JSON.stringify(resultData);
            let accumulatedResponse = '';

            await api.stream(
                '/waste-to-value/chat/stream',
                {
                    context: context,
                    question: question,
                    language: lang
                },
                (chunk) => {
                    accumulatedResponse += chunk;
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], text: accumulatedResponse };
                        return newMsgs;
                    });
                },
                (error) => {
                    console.error("Stream error:", error);
                }
            );
        } catch (error) {
            console.error("Chat Error:", error);
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleAskChatbot = (title: string) => {
        setView('chat');
        const question = `I want to know about ${title}`;
        // Small delay to ensure view switch happened and state is ready
        setTimeout(() => handleSendMessage(question), 100);
    };

    const handleKnowMore = (option: any) => {
        setSelectedOption(option);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Placeholder for image upload logic
        console.log("Image uploaded:", e.target.files?.[0]);
        // For now, just switch to input view
        setView('input');
    };

    // --- RENDER VIEW: INPUT ---
    if (view === 'input' || view === 'intro') { // Modified to handle 'intro' and 'input' within this block
        return (
            <div className="h-[calc(100vh-80px)] overflow-hidden flex flex-col md:flex-row max-w-[1600px] mx-auto bg-white">
                {/* LEFT: Hero/Intro Section (40%) */}
                <div className={`w-full md:w-[40%] bg-deep-green text-white p-8 md:p-12 flex flex-col justify-between transition-all duration-500 relative overflow-hidden ${view !== 'intro' ? 'hidden md:flex' : 'flex'}`}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 border border-white/30 bg-white/10 mb-6 backdrop-blur-sm">
                            <Recycle className="w-5 h-5" />
                            <span className="text-sm font-bold uppercase tracking-widest">Circular Economy</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 tracking-tight">
                            {t.wasteOptimizer || "Turn Waste into Wealth"}
                        </h1>
                        <p className="text-white/80 text-lg leading-relaxed max-w-md">
                            {t.wasteOptimizerSub || "Upload a photo of your farm waste and discover profitable ways to reuse, sell, or compost it."}
                        </p>
                    </div>

                    <div className="relative z-10 mt-8">
                        <div className="p-6 border border-white/20 bg-white/5 backdrop-blur-sm">
                            <h3 className="text-sm font-bold uppercase tracking-wide mb-4 border-b border-white/20 pb-2">Recent Success Stories</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 bg-green-400"></div>
                                    <p className="text-sm">Ramesh sold 50kg Banana stem for ₹1200</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 bg-green-400"></div>
                                    <p className="text-sm">Anita created Bio-enzyme from citrus peel</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Interaction Area (60%) */}
                <div className="w-full md:w-[60%] bg-gray-50 flex flex-col relative h-full">
                    {view === 'intro' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                            <div className="w-full max-w-md">
                                <div className="w-20 h-20 bg-light-green text-deep-green flex items-center justify-center mx-auto mb-6">
                                    <Camera className="w-10 h-10" />
                                </div>
                                <h2 className="text-2xl font-bold text-deep-green mb-4 uppercase">Analyze Your Waste</h2>
                                <p className="text-gray-600 mb-8">Take a photo or upload an image to get started.</p>

                                <label className="block w-full cursor-pointer group">
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    <div className="w-full py-5 bg-deep-green text-white font-bold text-lg uppercase tracking-widest hover:bg-deep-green/90 transition-all flex items-center justify-center gap-3 shadow-md group-active:scale-95">
                                        <Upload className="w-6 h-6" /> Upload Waste Photo
                                    </div>
                                </label>

                                <button onClick={() => setView('input')} className="mt-6 text-sm font-bold text-deep-green border-b border-deep-green hover:text-deep-blue hover:border-deep-blue transition-colors">
                                    Skip to Manual Input
                                </button>
                            </div>
                        </div>
                    )}
                    {view === 'input' && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
                            <div className="w-full max-w-md">
                                <button
                                    onClick={() => navigate('/')}
                                    className="absolute top-8 left-8 text-gray-600 hover:text-deep-green flex items-center gap-2 font-bold text-lg transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" /> {t.back}
                                </button>
                                <div className="w-20 h-20 bg-light-green text-deep-green flex items-center justify-center mx-auto mb-6">
                                    <Leaf className="w-10 h-10" />
                                </div>
                                <h2 className="text-2xl font-bold text-deep-green mb-4 uppercase">Manual Waste Input</h2>
                                <p className="text-gray-600 mb-8">Describe your farm waste to find valuable uses.</p>

                                <form onSubmit={handleAnalyze} className="space-y-6">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            placeholder={t.selectWaste || "e.g. Tomato, Rice Straw"}
                                            className="w-full p-4 pl-12 text-lg bg-gray-100 border border-gray-300 focus:border-deep-green focus:ring-1 focus:ring-deep-green outline-none transition-all placeholder-gray-500"
                                            value={cropInput}
                                            onChange={(e) => setCropInput(e.target.value)}
                                        />
                                        <Search className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!cropInput.trim()}
                                        className="w-full py-4 bg-deep-green hover:bg-deep-green/90 text-white text-lg font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-md group-active:scale-95"
                                    >
                                        {t.analyze} <ArrowRight className="w-6 h-6" />
                                    </button>
                                </form>
                                <button onClick={() => setView('intro')} className="mt-6 text-sm font-bold text-deep-green border-b border-deep-green hover:text-deep-blue hover:border-deep-blue transition-colors">
                                    Back to Photo Upload
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- RENDER VIEW: PROCESSING ---
    if (view === 'processing') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-[#E6E6E6] border-t-[#1B5E20] animate-spin"></div>
                    <Recycle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-[#1B5E20]" />
                </div>
                <h2 className="text-3xl font-bold text-[#1E1E1E] mt-8 mb-4">
                    {t.analyzingBtn}... {cropInput}
                </h2>
                <div className="max-w-md space-y-4 w-full">

                    <p className="text-[#555555] animate-pulse text-sm">{t.identifyingOpportunities}</p>
                </div>
            </div>
        );
    }

    // --- RENDER VIEW: CHAT ---
    if (view === 'chat') {
        return (
            <div className="max-w-4xl mx-auto py-8 px-4 h-[calc(100vh-100px)] flex flex-col">
                <button
                    onClick={() => setView('results')}
                    className="mb-4 text-[#555555] hover:text-[#1B5E20] flex items-center gap-2 font-bold text-lg transition-colors w-fit"
                >
                    <ArrowLeft className="w-5 h-5" /> {t.back}
                </button>

                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-[#E6E6E6] overflow-hidden flex flex-col flex-grow">
                    {/* Chat Header */}
                    <div className="bg-white/90 backdrop-blur-md p-6 border-b border-[#E6E6E6] flex items-center gap-4 sticky top-0 z-10">
                        <div className="w-12 h-12 bg-[#E8F5E9] rounded-full flex items-center justify-center border border-[#E6E6E6]">
                            <MessageCircle className="w-6 h-6 text-[#1B5E20]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-xl text-[#1E1E1E]">{t.knowledgeAssistant}</h3>
                            <p className="text-sm text-[#555555] font-medium">{t.chatPlaceholder}</p>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-grow p-6 overflow-y-auto space-y-6 bg-[#E8F5E9] scroll-smooth">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border ${msg.role === 'user' ? 'bg-[#1B5E20] border-[#1B5E20]' : 'bg-white border-[#E6E6E6]'
                                        }`}>
                                        {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-6 h-6 text-[#1B5E20]" />}
                                    </div>
                                    <div className={`p-5 rounded-2xl shadow-sm leading-relaxed text-[15px] ${msg.role === 'user'
                                        ? 'bg-[#1B5E20] text-white rounded-tr-none'
                                        : 'bg-white text-[#1E1E1E] rounded-tl-none border border-[#E6E6E6]'
                                        }`}>
                                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isChatLoading && (
                            <div className="flex justify-start w-full">
                                <div className="flex max-w-[85%] gap-3">
                                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#E6E6E6]">
                                        <Loader2 className="w-5 h-5 text-[#1B5E20] animate-spin" />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-[#E6E6E6] shadow-sm flex items-center gap-1">
                                        <span className="w-2 h-2 bg-[#1B5E20] rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-[#1B5E20] rounded-full animate-bounce delay-100"></span>
                                        <span className="w-2 h-2 bg-[#1B5E20] rounded-full animate-bounce delay-200"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-[#E6E6E6]">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={t.chatPlaceholder}
                                className="flex-grow p-4 bg-[#E8F5E9] rounded-xl border border-[#E6E6E6] focus:border-[#1B5E20] focus:ring-1 focus:ring-[#1B5E20] outline-none transition-all"
                                disabled={isChatLoading}
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!chatInput.trim() || isChatLoading}
                                className="p-4 bg-[#1B5E20] text-white rounded-xl hover:bg-[#000D0F] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:transform hover:-translate-y-1"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER VIEW: RESULTS ---
    if (!resultData) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-8 pt-8 pb-16 px-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => setView('input')} className="text-[#555555] hover:text-[#1B5E20] transition-colors p-2 rounded-full hover:bg-[#E8F5E9]">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-extrabold text-[#1E1E1E] flex items-center gap-2">
                        <Recycle className="w-8 h-8 text-[#1B5E20]" /> {t.wasteValue}
                    </h1>
                    <p className="text-[#555555]">{t.resultsFor}: <strong>{resultData.crop}</strong></p>
                </div>
            </div>

            {/* SECTION A: Suggestion Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {resultData.options?.map((opt: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-3xl shadow-lg border border-[#E6E6E6] overflow-hidden flex flex-col hover:shadow-xl transition-all hover:-translate-y-1 group">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 border-b border-[#E6E6E6]">
                            <h3 className="text-xl font-bold text-[#1B5E20] mb-2 leading-tight">
                                {opt.title}
                            </h3>
                            <div className="w-10 h-1 bg-[#1B5E20] rounded-full mb-2"></div>
                        </div>
                        <div className="p-6 flex-grow flex flex-col justify-between">
                            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                                {opt.subtitle || opt.fullDetails?.basicIdea?.[0] || t.defaultWasteDesc}
                            </p>

                            {/* Dual Buttons */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => handleAskChatbot(opt.title)}
                                    className="w-full py-3 bg-[#1B5E20] text-white rounded-xl font-bold text-sm hover:bg-[#000D0F] transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-[#1B5E20]/30"
                                >
                                    <MessageCircle className="w-4 h-4" /> {t.askChatbotBtn}
                                </button>
                                <button
                                    onClick={() => handleKnowMore(opt)}
                                    className="w-full py-3 bg-white border-2 border-[#1B5E20] text-[#1B5E20] rounded-xl font-bold text-sm hover:bg-[#1B5E20] hover:text-white transition-all flex items-center justify-center gap-2 group-hover:shadow-md"
                                >
                                    <Info className="w-4 h-4" /> {t.knowMore}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* SECTION B: Conclusion */}
            {resultData.conclusion && (
                <div className="bg-gradient-to-r from-[#FAFAF7] to-white rounded-3xl p-8 border border-[#1B5E20]/20 relative overflow-hidden shadow-sm">
                    <h2 className="text-2xl font-bold text-[#1B5E20] mb-4 flex items-center gap-2 relative z-10">
                        <Sprout className="w-6 h-6" /> {t.conclusion}
                    </h2>
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-[#E6E6E6] relative z-10">
                        <h3 className="text-xl font-bold text-[#1E1E1E] mb-3">
                            {resultData.conclusion.title}
                        </h3>
                        <div className="space-y-3">
                            <p className="text-lg font-bold text-[#1B5E20]">
                                {resultData.conclusion.highlight}
                            </p>
                            <p className="text-[#555555] leading-relaxed">
                                {resultData.conclusion.explanation || resultData.conclusion.rationale}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Know More Modal */}
            {selectedOption && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all animate-in fade-in duration-200"
                    onClick={() => setSelectedOption(null)}
                >
                    <div
                        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl border border-[#E6E6E6] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-[#E6E6E6] flex justify-between items-center bg-[#E8F5E9]">
                            <h3 className="text-2xl font-bold text-[#1E1E1E] leading-tight">
                                {selectedOption.title}
                            </h3>
                            <button
                                onClick={() => setSelectedOption(null)}
                                className="p-2 bg-[#E6E6E6] rounded-full hover:bg-gray-300 transition-colors"
                            >
                                <X className="w-5 h-5 text-[#555555]" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar bg-white">
                            {/* Basic Idea */}
                            {(selectedOption.fullDetails?.basicIdea?.length > 0) && (
                                <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                    <h4 className="text-lg font-bold text-[#1B5E20] mb-3 flex items-center gap-2">
                                        <Info className="w-5 h-5" /> {t.basicIdea}
                                    </h4>
                                    <ul className="list-disc list-inside space-y-2 text-[#555555] text-lg">
                                        {selectedOption.fullDetails.basicIdea.map((line: string, idx: number) => (
                                            <li key={idx}>{line}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Detailed Sections */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                {selectedOption.fullDetails?.sections?.map((section: any, idx: number) => (
                                    <div key={idx} className="bg-[#E8F5E9] p-5 rounded-2xl border border-[#E6E6E6]">
                                        <h5 className="font-bold text-[#1E1E1E] mb-3 uppercase text-xs tracking-widest border-b border-[#E6E6E6] pb-2 flex items-center justify-between">
                                            {section.title}
                                            <div className="w-1.5 h-1.5 bg-[#1B5E20] rounded-full"></div>
                                        </h5>
                                        <ul className="space-y-2">
                                            {section.content?.map((item: string, i: number) => (
                                                <li key={i} className="text-[#555555] text-base leading-relaxed flex items-start gap-2">
                                                    <span className="mt-1.5 w-1.5 h-1.5 bg-[#1B5E20]/40 rounded-full flex-shrink-0"></span>
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WasteToValue;
