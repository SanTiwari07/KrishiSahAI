import React, { useState, useEffect } from 'react';
import { useLanguage } from '../src/context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Recycle, Briefcase, Loader2, Target, Activity, ShieldCheck, TrendingUp, CheckCircle, AlertTriangle, MapPin, Sprout } from 'lucide-react';
import { useFarm } from '../src/context/FarmContext';
import { api } from '../src/services/api';
import { getLocalizedValue, normalizeValue } from '../src/utils/localizationUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ChatLayout } from '../components/ChatLayout';
import { PlanSidebar } from '../components/PlanSidebar';
import { Menu } from 'lucide-react';

interface YearPlan {
    year: string;
    goal: string;
    focus: string;
    actions: string[];
    profit: string;
}

interface RoadmapData {
    title: string;
    overview: string;
    years?: YearPlan[];
    verdict: string;
    disclaimer?: string;
}

const Home: React.FC = () => {
    const { t, language: lang } = useLanguage();
    const { activeFarm } = useFarm();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
    const [error, setError] = useState('');
    const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Initial crop selection
    useEffect(() => {
        if (activeFarm?.crops && activeFarm.crops.length > 0) {
            const uniqueNormalizedCrops = [...new Set(activeFarm.crops.map(c => normalizeValue(c, 'crops')))];
            // If the selected crop is not in the active farm's crops (or hasn't been set), select the first one
            if (!selectedCrop || !uniqueNormalizedCrops.includes(selectedCrop)) {
                setSelectedCrop(uniqueNormalizedCrops[0]);
            }
        } else {
            setSelectedCrop(null);
            setLoading(false);
            setError("No crop found in your active farm. Please add a crop in your profile.");
        }
    }, [activeFarm, selectedCrop]);

    // Fetch roadmap when crop or language changes
    useEffect(() => {
        const fetchCropRoadmap = async () => {
            if (!selectedCrop) return;

            try {
                // Wait briefly if auth is not initialized yet
                if (!auth.currentUser) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                const uid = auth.currentUser?.uid;
                if (!uid) {
                    setError("User not authenticated.");
                    setLoading(false);
                    return;
                }

                const cacheKey = `crop_plan_${uid}_${selectedCrop}_${lang}`;

                // 1. Check LocalStorage
                const cachedPlan = localStorage.getItem(cacheKey);
                if (cachedPlan) {
                    const parsedPlan = JSON.parse(cachedPlan);
                    if (parsedPlan.verdict !== 'Error' && !parsedPlan.overview?.startsWith('Error')) {
                        setRoadmap(parsedPlan);
                        setLoading(false);
                        setError('');
                        return;
                    } else {
                        localStorage.removeItem(cacheKey);
                    }
                }

                setLoading(true);
                setError('');

                // 2. Check Firebase directly
                const planId = `${selectedCrop}_${lang}`;
                const docRef = doc(db, 'users', uid, 'crop_plans', planId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists() && docSnap.data().roadmap && docSnap.data().roadmap.verdict !== 'Error' && !docSnap.data().roadmap.overview?.startsWith('Error')) {
                    const firestoreRoadmap = docSnap.data().roadmap;
                    setRoadmap(firestoreRoadmap);
                    localStorage.setItem(cacheKey, JSON.stringify(firestoreRoadmap));
                    setLoading(false);
                    return;
                }

                // 3. Fallback to API Generation
                const response = await api.generateCropRoadmap(selectedCrop, lang);
                if (response.success && response.roadmap) {
                    setRoadmap(response.roadmap);
                    localStorage.setItem(cacheKey, JSON.stringify(response.roadmap));
                } else {
                    setError("Failed to generate CropCycle.");
                }
            } catch (err: any) {
                console.error("Planner Error:", err);
                setError(err.message || "An error occurred while generating CropCycle.");
            } finally {
                setLoading(false);
            }
        };

        fetchCropRoadmap();
    }, [selectedCrop, lang]);

    const phaseButtons = [
        {
            label: t.homeActions?.chatbot?.title || 'Ask Chatbot',
            path: '/chat',
            icon: <Briefcase className="w-8 h-8 md:w-10 md:h-10" />,
            description: t.homeActions?.chatbot?.desc || 'Get AI-driven insights and tips for this phase.'
        },
        {
            label: t.homeActions?.fertilizers?.title || 'Fertilizers',
            path: '/health',
            icon: <Activity className="w-8 h-8 md:w-10 md:h-10" />,
            description: t.homeActions?.fertilizers?.desc || 'Get smart fertilizer & market advice for your farm.'
        },
        {
            label: t.homeActions?.cropCare?.title || 'Disease/Pest Solution',
            path: '/crop-care',
            icon: <ShieldCheck className="w-8 h-8 md:w-10 md:h-10" />,
            description: t.homeActions?.cropCare?.desc || 'Identify and treat potential plant diseases and pests.'
        },
        {
            label: t.homeActions?.wasteToValue?.title || 'Waste to Value',
            path: '/waste-to-value',
            icon: <Recycle className="w-8 h-8 md:w-10 md:h-10" />,
            description: t.homeActions?.wasteToValue?.desc || 'Learn strategies to turn crop waste into profitable resources.'
        }
    ];

    useEffect(() => {
        const handleToggle = () => setIsSidebarOpen(prev => !prev);
        window.addEventListener('toggle-sidebar', (handleToggle as EventListener));
        return () => window.removeEventListener('toggle-sidebar', (handleToggle as EventListener));
    }, []);

    return (
        <div className="h-[calc(100dvh-68px)] p-0 md:p-4 lg:p-6 bg-white">
            <PlanSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                selectedCrop={selectedCrop}
                setSelectedCrop={setSelectedCrop}
            />
            <ChatLayout>
                <div className="flex flex-col h-full w-full">
                    <div className="flex-1 overflow-y-auto w-full p-4 md:p-8">
                        <div className="max-w-[1200px] mx-auto w-full">

                            {/* 1) LOADING STATE */}
                            {loading && (
                                <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                                        <Loader2 className="w-16 h-16 text-[#1B5E20] animate-spin relative z-10" />
                                    </div>
                                    <h2 className="text-2xl font-black text-[#1E1E1E] mt-6 tracking-tight">{t.generatingRoadmap || 'Fetching CropCycle Roadmap...'}</h2>
                                    <p className="text-[#555555] mt-2 font-medium">{t.analyzingLifecycle || 'Analyzing lifecycle for'} {selectedCrop}...</p>
                                </div>
                            )}

                            {/* 2) ERROR STATE */}
                            {!loading && error && (
                                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in-95 duration-300">
                                    <div className="bg-white p-8 md:p-12 rounded-[32px] shadow-xl border border-red-100 max-w-md w-full">
                                        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                            <AlertTriangle className="w-10 h-10" />
                                        </div>
                                        <h2 className="text-2xl font-black text-[#1E1E1E] mb-3">{t.unableToLoadPlan || 'Unable to Load Plan'}</h2>
                                        <p className="text-gray-500 mb-8 font-medium">{error}</p>
                                        {activeFarm?.crops?.length === 0 && (
                                            <button
                                                onClick={() => navigate('/profile/edit')}
                                                className="w-full px-6 py-4 bg-[#1B5E20] text-white rounded-xl font-bold hover:bg-[#2E7D32] transition-colors shadow-lg active:scale-95 uppercase tracking-wider text-sm"
                                            >
                                                {t.addCropToFarm || 'Add Crop to Farm'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 3) MAIN CONTENT STATE */}
                            {!loading && !error && roadmap && (
                                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    
                                    {/* Overview Section */}
                                    {roadmap.title && (
                                        <>
                                        <button
                                            onClick={() => navigate(-1)}
                                            className="mb-6 flex items-center gap-2 px-4 py-2 text-[#555555] hover:text-[#1B5E20] transition-colors bg-white rounded-xl hover:bg-gray-50 border border-gray-200 shadow-sm w-fit font-bold text-sm"
                                            title={t.back || "Back"}
                                        >
                                            <ArrowLeft className="w-4 h-4" /> {t.back || "Back"}
                                        </button>
                                        <div className="mb-8 p-6 md:p-8 bg-gradient-to-br from-green-50 to-white rounded-[32px] border border-green-100 shadow-sm">
                                            <div className="flex items-center gap-4 mb-6">
                                                <h2 className="text-2xl md:text-4xl font-black text-[#1B5E20] tracking-tight flex items-center gap-3">
                                                    <Target className="w-8 h-8 md:w-10 md:h-10 text-[#2E7D32]" />
                                                    {roadmap.title}
                                                </h2>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 pl-12 -mt-2">
                                                <span className="px-4 py-1.5 bg-[#E8F5E9] text-[#1B5E20] text-sm font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-green-200 shadow-sm">
                                                    <MapPin size={16} /> {activeFarm?.nickname || 'Your Farm'}
                                                </span>
                                                <span className="px-4 py-1.5 bg-[#E8F5E9] text-[#1B5E20] text-sm font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 border border-green-200 shadow-sm">
                                                    <Sprout size={16} /> {selectedCrop}
                                                </span>
                                            </div>
                                            {/* overview paragraph removed as per user request */}
                                        </div>
                                        </>
                                    )}

                                    {/* Phases Timeline */}
                                    {Array.isArray(roadmap.years) && roadmap.years.length > 0 ? (
                                    <div className="space-y-6">
                                        {roadmap.years.map((year, idx) => {
                                            if (!year) return null;
                                            const btnConfig = phaseButtons[Math.min(idx, phaseButtons.length - 1)];

                                            return (
                                                <div key={idx} className="bg-white rounded-3xl border border-[#E6E6E6] shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-3 h-full bg-[#1B5E20] group-hover:bg-[#2E7D32] transition-colors"></div>
                                                    <div className="p-4 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8">
                                                        {/* Phase Info */}
                                                        <div className="flex-grow">
                                                            <h3 className="text-xl md:text-3xl font-black text-[#2E7D32] mb-4 tracking-tight flex items-center gap-3">
                                                                <span className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center text-base md:text-lg shadow-inner border border-green-100 flex-shrink-0">
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="leading-tight">{year.year}: {year.goal}</span>
                                                            </h3>

                                                            <div className="space-y-5">
                                                                <div>
                                                                    <h4 className="text-xs font-black text-[#1B5E20] uppercase tracking-widest mb-2 opacity-80">{t.home?.criticalFocus || 'Critical Focus'}</h4>
                                                                    <p className="text-[#333] font-bold text-lg md:text-xl leading-snug">{year.focus}</p>
                                                                </div>

                                                                <div>
                                                                    <h4 className="text-xs font-black text-[#1B5E20] uppercase tracking-widest mb-3 opacity-80">{t.home?.requiredActions || 'Required Actions'}</h4>
                                                                    <ul className="grid grid-cols-1 gap-3">
                                                                        {Array.isArray(year.actions) && year.actions.filter(action => typeof action === 'string' && action.replace(/[^a-zA-Z0-9]/g, '').trim() !== '').map((action, aIdx) => (
                                                                            <li key={aIdx} className="flex items-start gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                                                                <CheckCircle className="w-5 h-5 text-[#2E7D32] flex-shrink-0 mt-0.5" />
                                                                                <div className="text-sm md:text-base font-semibold text-[#555] leading-relaxed flex-1">
                                                                                    <ReactMarkdown
                                                                                        remarkPlugins={[remarkGfm]}
                                                                                        components={{
                                                                                            p: ({ node, ...props }) => <span {...props} />,
                                                                                            strong: ({ node, ...props }) => <strong className="font-black text-[#1B5E20]" {...props} />
                                                                                        }}
                                                                                    >
                                                                                        {action}
                                                                                    </ReactMarkdown>
                                                                                </div>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Action Box on the Right */}
                                                        <div className="w-full md:w-72 flex-shrink-0 flex flex-col justify-center gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-8">

                                                            {btnConfig && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (btnConfig.label === 'Ask Chatbot') {
                                                                            const validActions = Array.isArray(year.actions) ? year.actions.filter(a => typeof a === 'string' && a.trim() !== '') : [];
                                                                            const prompt = `I need help with Phase ${idx + 1}: ${year.year} - ${year.goal}. \nCritical Focus: ${year.focus} \nRequired Actions:\n${validActions.map(a => '- ' + a).join('\n')}\nCould you provide more specific advice, tips, and guidance for this phase?`;
                                                                            navigate(btnConfig.path, {
                                                                                state: {
                                                                                    initialMessage: prompt,
                                                                                    fromPlanner: true,
                                                                                    previousState: '/'
                                                                                }
                                                                            });
                                                                        } else {
                                                                            navigate(btnConfig.path);
                                                                        }
                                                                    }}
                                                                    className="w-full flex flex-col items-center justify-center gap-2 md:gap-3 p-6 md:p-10 bg-[#1B5E20] hover:bg-[#2E7D32] text-white rounded-[24px] md:rounded-[32px] transition-all shadow-lg hover:shadow-xl active:scale-[0.98] group/btn min-h-[140px] md:min-h-[220px]"
                                                                >
                                                                    <div className="p-3 bg-white/10 rounded-2xl mb-1 flex items-center justify-center">
                                                                        {btnConfig.icon}
                                                                    </div>
                                                                    <span className="font-black text-base md:text-2xl uppercase tracking-widest text-center leading-tight">{btnConfig.label}</span>
                                                                    {btnConfig.description && (
                                                                        <span className="text-xs md:text-base font-medium text-white/90 text-center leading-snug">{btnConfig.description}</span>
                                                                    )}
                                                                    <ArrowRight className="w-6 h-6 mt-2 transform group-hover/btn:translate-y-1 transition-transform opacity-70" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    ) : (
                                        <div className="bg-white rounded-3xl p-10 text-center shadow-lg border border-gray-100 mt-6">
                                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Target className="w-8 h-8 text-amber-500" />
                                            </div>
                                            <h3 className="text-xl font-bold text-[#1E1E1E]">Specific Phases Not Available</h3>
                                            <p className="text-[#555] mt-2 max-w-lg mx-auto">
                                                We've generated the core overview for your crop, but detailed phase-by-phase actions couldn't be loaded at this moment. Please use the AI Chatbot for more targeted questions!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </ChatLayout>
        </div>
    );
};

export default Home;
