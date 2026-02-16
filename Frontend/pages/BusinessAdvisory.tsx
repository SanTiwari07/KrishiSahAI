import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Language } from '../types';
import { translations } from '../src/i18n/translations';
import { api } from '../services/api';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import {
    Briefcase,
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    MessageCircle,
    Info,
    DollarSign,
    Droplets,
    User,
    TrendingUp,
    Ruler,
    Loader2
} from 'lucide-react';

interface FormData {
    budget: string;
    totalLand: string;     // Renamed from land
    businessLand: string;  // New field
    waterSource: string;
    experience: string;
    interests: string[];
    marketAccess: string;
    sellingPreference: string;
    incomeComfort: string;
    investmentRecovery: string;
    lossAttitude: string;
    riskPreference: string;
    agreement: boolean;
}

interface Recommendation {
    id: string;
    title: string;
    reason: string;
    match_score: number;
    estimated_cost: string;
    profit_potential: string;
    requirements: string[];
    risk_factors?: string[];
    market_demand?: string;
    detailed_description?: string;
    timeline?: string;
    implementation_steps?: string[];
}

const BusinessAdvisory: React.FC<{ lang: Language; user: UserProfile | null }> = ({ lang, user }) => {
    const t = translations[lang] || translations['EN'];
    const navigate = useNavigate();
    const location = useLocation(); // To check for restored state
    const [step, setStep] = useState<number>(0); // 0: Landing, 1: Form, 2: Results
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

    const [formData, setFormData] = useState<FormData>({
        budget: '',
        totalLand: '',
        businessLand: '',
        waterSource: '',
        experience: '',
        interests: [],
        marketAccess: '',
        sellingPreference: '',
        incomeComfort: '',
        investmentRecovery: '',
        lossAttitude: '',
        riskPreference: '',
        agreement: false
    });

    // Restore state if returning from Chatbot or Detail
    useEffect(() => {
        const state = location.state as { formData?: FormData; recommendations?: Recommendation[]; step?: number } | null;
        if (state?.recommendations) {
            setRecommendations(state.recommendations);
            setStep(state.step || 2);
        }
        if (state?.formData) {
            setFormData(state.formData);
        }
    }, [location.state]);

    // Set total land from user profile prop
    useEffect(() => {
        if (user) {
            // Handle both camelCase (frontend type) and snake_case (potential DB legacy)
            const size = user.landSize || (user as any).land_size;
            if (size) {
                setFormData(prev => ({ ...prev, totalLand: size.toString() }));
            }
        }
    }, [user]);

    const interestOptions = [
        "Dairy Farming", "Poultry", "Greenhouse Farming", "Goat Farming",
        "Shop Handling", "Factory Business", "Fishery", "Mushroom Cultivation"
    ];

    const handleInterestToggle = (interest: string) => {
        setFormData(prev => ({
            ...prev,
            interests: prev.interests.includes(interest)
                ? prev.interests.filter(i => i !== interest)
                : [...prev.interests, interest]
        }));
    };

    const handleAnalyze = async () => {
        if (!formData.agreement) {
            alert("Please agree to the terms.");
            return;
        }

        // Image 4 Validation: Business Land vs Total Land
        const total = parseFloat(formData.totalLand);
        const business = parseFloat(formData.businessLand);

        if (isNaN(business)) {
            alert("Please enter valid business land size.");
            return;
        }

        if (!isNaN(total) && business > total) {
            alert(t.landExceedsTotal);
            return;
        }

        setLoading(true);
        try {
            // Map frontend form data to backend expected format
            // IMPORTANT: Use businessLand for calculations
            const payload = {
                capital: parseFloat(formData.budget),
                land_size: parseFloat(formData.businessLand), // Using business land for logic
                water_availability: formData.waterSource,
                experience_years: parseInt(formData.experience),
                skills: formData.interests,
                market_access: formData.marketAccess === 'Village only' ? 'good' : 'moderate',
                risk_level: formData.riskPreference === 'Higher profit, higher risk' ? 'high' : 'medium',
                selling_preference: formData.sellingPreference,
                recovery_timeline: formData.investmentRecovery,
                loss_tolerance: formData.lossAttitude,
                risk_preference: formData.riskPreference,
                // Optional: Pass total land if backend needs it validating (not currently used by backend logic but good for record)
                total_land: total,
                language: lang.toLowerCase()
            };

            const response = await api.post('/business-advisor/init', payload);
            if (response.success && response.recommendations) {
                setRecommendations(response.recommendations);
                setStep(2);
            } else {
                alert("Failed to generate recommendations. Please try again.");
            }
        } catch (error) {
            console.error("Analysis Error:", error);
            alert("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleAskChatbot = (businessName: string) => {
        // Navigate to chat, passing current state to allow back navigation
        navigate('/chat', {
            state: {
                initialMessage: `I want detailed analysis for ${businessName}`,
                fromAdvisory: true,
                previousState: {
                    formData,
                    recommendations,
                    step
                }
            }
        });
    };

    const handleKnowMore = (rec: Recommendation) => {
        // Map Recommendation to BusinessDetail format
        const businessDetail = {
            id: rec.id,
            title: rec.title,
            description: rec.detailed_description || rec.reason, // Use detailed description if available
            investment: rec.estimated_cost,
            profit: rec.profit_potential,
            requirements: rec.requirements || [],
            // Use backend data if available, else fallback to generic defaults
            risk_factors: rec.risk_factors || ["Market volatility", "Disease outbreaks", "Weather dependency"],
            market_demand: rec.market_demand || "High demand in local and urban markets",
            timeline: rec.timeline || "Varies by season",
            implementation_steps: rec.implementation_steps || ["Plan requirements", "Secure funding", "Start operations"]
        };

        // Navigate to detail page
        navigate(`/business/${rec.id}`, {
            state: {
                business: businessDetail,
                fromAdvisory: true,
                previousState: {
                    formData,
                    recommendations,
                    step
                }
            }
        });
    };

    // --- STEP 0: LANDING ---
    if (step === 0) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[80vh]">
                <div className="text-center py-20 px-10 bg-white rounded-[48px] border border-[#E6E6E6] shadow-xl max-w-3xl w-full">
                    <div className="w-24 h-24 bg-[#E0E7FF] rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <Briefcase className="w-12 h-12 text-[#4F46E5]" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-[#1E1E1E] mb-4">{t.businessAdvisorTitle}</h1>
                    <p className="text-[#555555] font-medium text-lg max-w-xl mx-auto mb-10">
                        {t.businessAdvisorSub}
                    </p>
                    <button
                        onClick={() => setStep(1)}
                        className="px-8 py-4 bg-[#043744] text-white rounded-2xl font-bold text-xl hover:bg-[#000D0F] transition-all shadow-lg hover:scale-105 flex items-center justify-center gap-3 mx-auto"
                    >
                        {t.startAssessment} <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
            </div>
        );
    }

    // --- STEP 1: ASSESSMENT FORM ---
    if (step === 1) {
        return (
            <div className="p-4 md:p-8 max-w-4xl mx-auto">
                <button onClick={() => setStep(0)} className="flex items-center gap-2 text-[#555555] font-bold mb-6 hover:text-[#043744] transition-colors">
                    <ArrowLeft className="w-5 h-5" /> {t.back}
                </button>

                <div className="bg-white rounded-[32px] border border-[#E6E6E6] shadow-xl p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h1 className="text-3xl font-extrabold text-[#1E1E1E] mb-8">{t.assessmentFormTitle}</h1>

                    {/* Resources Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">
                                <DollarSign className="w-4 h-4 text-[#22C55E]" /> {t.budgetLabel}
                            </label>
                            <input
                                type="number"
                                placeholder="Enter your total budget (₹)"
                                className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#043744] placeholder-gray-400 font-medium transition-all"
                                value={formData.budget}
                                onChange={e => setFormData({ ...formData, budget: e.target.value })}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2 ml-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#555555]">
                                    <Ruler className="w-4 h-4 text-[#3B82F6]" /> {t.businessLandLabel}
                                </label>
                                {formData.totalLand && parseFloat(formData.totalLand) > 0 && (
                                    <span className="text-xs font-bold text-[#043744] bg-[#E6F4EA] px-2 py-1 rounded-lg">
                                        {t.totalAcre}: {formData.totalLand}
                                    </span>
                                )}
                            </div>
                            <input
                                type="number"
                                placeholder="Land to be used for business"
                                className={`w-full p-4 bg-[#FAFAF7] border rounded-2xl focus:outline-none placeholder-gray-400 font-medium transition-all ${(parseFloat(formData.businessLand) > parseFloat(formData.totalLand))
                                    ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500'
                                    : 'border-[#E6E6E6] focus:border-[#043744]'
                                    }`}
                                value={formData.businessLand}
                                onChange={e => setFormData({ ...formData, businessLand: e.target.value })}
                            />
                            {parseFloat(formData.businessLand) > parseFloat(formData.totalLand) && (
                                <p className="text-red-500 text-xs font-bold mt-2 ml-2">{t.landExceedsTotal} ({formData.totalLand} acres).</p>
                            )}
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">
                                <Droplets className="w-4 h-4 text-[#06B6D4]" /> {t.waterAvailability}
                            </label>
                            <select
                                className={`w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#043744] font-medium transition-all ${!formData.waterSource ? 'text-gray-400' : 'text-[#1E1E1E]'}`}
                                value={formData.waterSource}
                                onChange={e => setFormData({ ...formData, waterSource: e.target.value })}
                            >
                                <option value="" disabled>Select water source (Borewell / Canal / Rainfed)</option>
                                <option value="Rainfed" className="text-black">Rainfed</option>
                                <option value="Borewell" className="text-black">Borewell</option>
                                <option value="Canal" className="text-black">Canal</option>
                                <option value="River" className="text-black">River</option>
                            </select>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">
                                <User className="w-4 h-4 text-[#A855F7]" /> {t.experienceYears}
                            </label>
                            <input
                                type="number"
                                placeholder="Years of farming/business experience"
                                className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#043744] placeholder-gray-400 font-medium transition-all"
                                value={formData.experience}
                                onChange={e => setFormData({ ...formData, experience: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Interests Section */}
                    <div className="mb-10">
                        <h3 className="text-lg font-bold text-[#1E1E1E] mb-4">{t.interestsTitle}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {interestOptions.map(interest => (
                                <button
                                    key={interest}
                                    onClick={() => handleInterestToggle(interest)}
                                    className={`p-4 rounded-2xl border text-sm font-bold transition-all ${formData.interests.includes(interest)
                                        ? 'bg-white border-[#043744] shadow-md ring-1 ring-[#043744] text-[#043744]'
                                        : 'bg-white border-[#E6E6E6] text-[#555555] hover:bg-stone-50'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border mb-2 mx-auto transition-colors ${formData.interests.includes(interest) ? 'bg-[#043744] border-[#043744]' : 'border-gray-300'
                                        }`}
                                    />
                                    {interest}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Market & Strategy Section (Gray Box) */}
                    <div className="bg-[#F5F5F4] rounded-[24px] p-6 md:p-8 mb-8 border border-[#E6E6E6]">
                        <h3 className="text-xl font-bold text-[#1E1E1E] mb-6 border-b border-gray-200 pb-2">{t.marketStrategyTitle}</h3>

                        <div className="space-y-6">
                            {/* Q1 */}
                            <div>
                                <label className="block text-sm font-bold text-[#555555] mb-3">How close are you to a market or buyers?</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {['Village only', 'Small town within 10 km', 'City within 30 km', 'Direct buyers already available'].map(opt => (
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.marketAccess === opt ? 'border-[#043744] ring-1 ring-[#043744]' : 'border-[#E6E6E6] hover:border-gray-400'}`}>
                                            <input
                                                type="radio"
                                                name="marketAccess"
                                                value={opt}
                                                checked={formData.marketAccess === opt}
                                                onChange={e => setFormData({ ...formData, marketAccess: e.target.value })}
                                                className="w-4 h-4 text-[#043744] focus:ring-[#043744] accent-[#043744]"
                                            />
                                            <span className="ml-3 text-sm font-medium text-gray-700">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Q2 */}
                            <div>
                                <label className="block text-sm font-bold text-[#555555] mb-3">Are you willing to sell directly to customers (B2C)?</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {['Yes, I can handle customers', 'Maybe, with guidance', 'No, I prefer bulk buyers only'].map(opt => (
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.sellingPreference === opt ? 'border-[#043744] ring-1 ring-[#043744]' : 'border-[#E6E6E6]'}`}>
                                            <input
                                                type="radio"
                                                name="sellingPreference"
                                                value={opt}
                                                checked={formData.sellingPreference === opt}
                                                onChange={e => setFormData({ ...formData, sellingPreference: e.target.value })}
                                                className="w-4 h-4 text-[#043744] accent-[#043744]"
                                            />
                                            <span className="ml-3 text-sm font-medium text-gray-700">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Q3 */}
                            <div>
                                <label className="block text-sm font-bold text-[#555555] mb-3">If income fluctuates month to month, how comfortable are you?</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {['Very comfortable', 'Somewhat okay', 'Not comfortable at all'].map(opt => (
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.incomeComfort === opt ? 'border-[#043744] ring-1 ring-[#043744]' : 'border-[#E6E6E6]'}`}>
                                            <input
                                                type="radio"
                                                name="incomeComfort"
                                                value={opt}
                                                checked={formData.incomeComfort === opt}
                                                onChange={e => setFormData({ ...formData, incomeComfort: e.target.value })}
                                                className="w-4 h-4 text-[#043744] accent-[#043744]"
                                            />
                                            <span className="ml-3 text-sm font-medium text-gray-700">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Q4 */}
                            <div>
                                <label className="block text-sm font-bold text-[#555555] mb-3">How long can you wait to recover your investment?</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {['Less than 1 year', '1-2 years', '2-3 years', 'I can wait longer'].map(opt => (
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.investmentRecovery === opt ? 'border-[#043744] ring-1 ring-[#043744]' : 'border-[#E6E6E6]'}`}>
                                            <input
                                                type="radio"
                                                name="investmentRecovery"
                                                value={opt}
                                                checked={formData.investmentRecovery === opt}
                                                onChange={e => setFormData({ ...formData, investmentRecovery: e.target.value })}
                                                className="w-4 h-4 text-[#043744] accent-[#043744]"
                                            />
                                            <span className="ml-3 text-sm font-medium text-gray-700">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Q5 */}
                            <div>
                                <label className="block text-sm font-bold text-[#555555] mb-3">What is your attitude toward losses in the first year?</label>
                                <div className="space-y-2">
                                    {['I understand initial losses are possible', 'Small losses acceptable', 'I cannot afford losses'].map(opt => (
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.lossAttitude === opt ? 'border-[#043744] ring-1 ring-[#043744]' : 'border-[#E6E6E6]'}`}>
                                            <input
                                                type="radio"
                                                name="lossAttitude"
                                                value={opt}
                                                checked={formData.lossAttitude === opt}
                                                onChange={e => setFormData({ ...formData, lossAttitude: e.target.value })}
                                                className="w-4 h-4 text-[#043744] accent-[#043744]"
                                            />
                                            <span className="ml-3 text-sm font-medium text-gray-700">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Q6 */}
                            <div>
                                <label className="block text-sm font-bold text-[#555555] mb-3">If given two options, what would you choose?</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {['Safe income, lower profit', 'Higher profit, higher risk'].map(opt => (
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.riskPreference === opt ? 'border-[#043744] ring-1 ring-[#043744]' : 'border-[#E6E6E6]'}`}>
                                            <input
                                                type="radio"
                                                name="riskPreference"
                                                value={opt}
                                                checked={formData.riskPreference === opt}
                                                onChange={e => setFormData({ ...formData, riskPreference: e.target.value })}
                                                className="w-4 h-4 text-[#043744] accent-[#043744]"
                                            />
                                            <span className="ml-3 text-sm font-medium text-gray-700">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Important Note */}
                    <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-2xl p-4 mb-8 flex items-start gap-3">
                        <div className="bg-[#FCD34D] text-[#78350F] p-1 rounded-lg mt-0.5">
                            <Info className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-[#92400E] font-bold text-sm uppercase tracking-wider mb-1">{t.importantNoteTitle}</h4>
                            <p className="text-[#92400E] text-xs leading-relaxed">
                                {t.importantNoteDesc}
                            </p>
                        </div>
                    </div>

                    {/* Agreement & Analyze */}
                    <div className="bg-[#FAFAF7] rounded-2xl p-6 border border-[#E6E6E6]">
                        <label className="flex items-start gap-3 cursor-pointer mb-6 group">
                            <input
                                type="checkbox"
                                className="mt-1 w-5 h-5 text-[#22C55E] rounded border-gray-300 focus:ring-[#22C55E] accent-[#22C55E] transition-all cursor-pointer"
                                checked={formData.agreement}
                                onChange={e => setFormData({ ...formData, agreement: e.target.checked })}
                            />
                            <span className="text-xs text-[#555555] leading-relaxed group-hover:text-black transition-colors">
                                {t.agreementText}
                            </span>
                        </label>

                        <button
                            onClick={handleAnalyze}
                            disabled={loading || parseFloat(formData.businessLand) > parseFloat(formData.totalLand)}
                            className={`w-full py-4 bg-[#043744] text-white rounded-xl font-bold text-xl transition-all shadow-md hover:scale-[1.01] flex items-center justify-center gap-2 ${loading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-[#000D0F]'}`}
                        >
                            {loading ? <><Loader2 className="animate-spin" /> {t.analyzingBtn}</> : t.analyze}
                        </button>
                    </div>
                </div>
            </div >
        );
    }

    // --- STEP 2: RECOMMENDATIONS ---
    if (step === 2) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => setStep(1)} className="flex items-center gap-2 text-[#555555] font-bold hover:text-[#043744] transition-colors">
                        <ArrowLeft className="w-5 h-5" /> {t.back}
                    </button>
                    <button onClick={() => setStep(1)} className="text-[#043744] font-bold hover:underline">
                        {t.retakeAssessment}
                    </button>
                </div>

                <h1 className="text-3xl font-extrabold text-[#1E1E1E] mb-10">{t.recommendedBusinesses}</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recommendations.map((rec) => (
                        <div key={rec.id} className="bg-white rounded-[32px] border border-[#E6E6E6] overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-300 group">
                            {/* Card Header */}
                            <div className="bg-[#043744] p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-20">
                                    <Briefcase className="w-16 h-16 text-white" />
                                </div>
                                <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-bold mb-4">
                                    {rec.match_score}% {t.matchScore}
                                </div>
                                <h2 className="text-xl font-extrabold text-white leading-tight uppercase tracking-wide">
                                    {rec.title}
                                </h2>
                            </div>

                            {/* Card Body */}
                            <div className="p-6 flex-grow flex flex-col">
                                <p className="text-[#555555] text-sm mb-6 min-h-[40px] leading-relaxed">
                                    {rec.reason}
                                </p>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t.investmentLabel}</p>
                                        <p className="text-[#1E1E1E] font-bold text-sm">{rec.estimated_cost}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-[#043744] uppercase tracking-widest mb-1">{t.profitLabel}</p>
                                        <p className="text-[#0A5F73] font-bold text-sm">{rec.profit_potential}</p>
                                    </div>
                                </div>

                                <div className="mb-8 flex-grow">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t.requirementsLabel}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {rec.requirements.map((req, i) => (
                                            <span key={i} className="px-2 py-1 bg-[#FAFAF7] border border-[#E6E6E6] rounded-lg text-xs text-[#555555] font-medium">
                                                {req}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="mt-auto flex flex-col gap-3">
                                    <button
                                        onClick={() => navigate(`/roadmap/${encodeURIComponent(rec.title)}`, {
                                            state: {
                                                businessName: rec.title,
                                                previousState: {
                                                    formData,
                                                    recommendations,
                                                    step
                                                }
                                            }
                                        })}
                                        className="w-full py-4 bg-[#043744] text-white rounded-xl font-bold text-lg hover:bg-[#000D0F] transition-all shadow-lg flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                                    >
                                        <TrendingUp className="w-5 h-5" /> {t.simulateBtn}
                                    </button>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleAskChatbot(rec.title)}
                                            className="flex-1 py-3 bg-white border border-[#043744] text-[#043744] rounded-xl font-bold text-sm hover:bg-[#E8F5F5] transition-colors flex items-center justify-center gap-2"
                                        >
                                            <MessageCircle className="w-4 h-4" /> {t.askChatbotBtn}
                                        </button>
                                        <button
                                            onClick={() => handleKnowMore(rec)}
                                            className="flex-1 py-3 bg-white border border-gray-200 text-[#555555] rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Info className="w-4 h-4" /> {t.knowMore}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
};

export default BusinessAdvisory;
