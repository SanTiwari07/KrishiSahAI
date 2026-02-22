import React, { useState, useEffect } from 'react';
import { useLanguage } from '../src/context/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Recycle, Briefcase, Loader2, Target, Activity, ShieldCheck, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { useFarm } from '../src/context/FarmContext';
import { api } from '../src/services/api';
import { getLocalizedValue } from '../src/utils/localizationUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

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

    // Initial crop selection
    useEffect(() => {
        if (activeFarm?.crops && activeFarm.crops.length > 0) {
            // If the selected crop is not in the active farm's crops (or hasn't been set), select the first one
            if (!selectedCrop || !activeFarm.crops.includes(selectedCrop)) {
                setSelectedCrop(activeFarm.crops[0]);
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
                    setRoadmap(JSON.parse(cachedPlan));
                    setLoading(false);
                    setError('');
                    return;
                }

                setLoading(true);
                setError('');

                // 2. Check Firebase directly
                const planId = `${selectedCrop}_${lang}`;
                const docRef = doc(db, 'users', uid, 'crop_plans', planId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists() && docSnap.data().roadmap && !docSnap.data().roadmap.overview?.startsWith('Error')) {
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
                    setError("Failed to generate crop planner.");
                }
            } catch (err: any) {
                console.error("Planner Error:", err);
                setError(err.message || "An error occurred while generating the crop planner.");
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* FARM CONTEXT RIBBON */}
            <div className="w-full bg-[#1B5E20] border-t border-white/10 text-white px-4 md:px-8 py-3 md:py-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs md:text-sm font-bold shadow-md sticky top-[68px] z-30">
                <div className="flex items-center gap-2">
                    <span className="opacity-70 uppercase tracking-widest text-[10px] md:text-xs">{t.activeFarm || 'Active Farm:'}</span>
                    <span className="text-white bg-white/20 px-3 py-1 rounded-full border border-white/10 shadow-inner">{activeFarm?.nickname || 'Default'}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="opacity-70 uppercase tracking-widest text-[10px] md:text-xs">{t.currentCrop || 'Current Crop:'}</span>
                    {activeFarm?.crops?.length ? (
                        <div className="flex gap-1 bg-black/20 rounded-full p-1 border border-black/10">
                            {activeFarm.crops.map((crop) => (
                                <button
                                    key={crop}
                                    onClick={() => setSelectedCrop(crop)}
                                    className={`px-4 py-1 rounded-full text-xs md:text-sm transition-all duration-300 ${selectedCrop === crop
                                        ? 'bg-white text-deep-green font-black shadow-sm transform scale-105'
                                        : 'text-white/80 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    {getLocalizedValue(crop, 'crops', lang)}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <span className="text-white bg-white/10 px-3 py-1 rounded-full">{t.noCrop || 'No Crop'}</span>
                    )}
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto p-4 md:p-8">
                {/* 1) LOADING STATE */}
                {loading && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                            <Loader2 className="w-16 h-16 text-[#1B5E20] animate-spin relative z-10" />
                        </div>
                        <h2 className="text-2xl font-black text-[#1E1E1E] mt-6 tracking-tight">{t.generatingRoadmap || 'Fetching Smart Crop Plan...'}</h2>
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

                        {/* Phases Timeline */}
                        <div className="space-y-6">
                            {roadmap.years?.map((year, idx) => {
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
                                                        <h4 className="text-xs font-black text-[#1B5E20] uppercase tracking-widest mb-2 opacity-80">Critical Focus</h4>
                                                        <p className="text-[#333] font-bold text-lg md:text-xl leading-snug">{year.focus}</p>
                                                    </div>

                                                    <div>
                                                        <h4 className="text-xs font-black text-[#1B5E20] uppercase tracking-widest mb-3 opacity-80">Required Actions</h4>
                                                        <ul className="grid grid-cols-1 gap-3">
                                                            {year.actions?.filter(action => action.replace(/[^a-zA-Z0-9]/g, '').trim() !== '').map((action, aIdx) => (
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
                                                                const validActions = year.actions?.filter(a => a.trim() !== '') || [];
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


                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
