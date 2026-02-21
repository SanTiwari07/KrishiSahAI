import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Language } from '../types';
import { useLanguage } from '../src/context/LanguageContext';
import { useFarm } from '../src/context/FarmContext';
import { api } from '../src/services/api';
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
    Loader2,
    X,
    Phone,
    MapPin,
    Star,
    Award,
    Users,
    ChevronRight,
    Sprout
} from 'lucide-react';

interface FormData {
    budget: string;
    totalLand: string;
    businessLand: string;
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

// ─── EXPERT DATA ────────────────────────────────────────────────────────────
const EXPERTS = [
    {
        id: 1,
        name: "Dr. Ramesh Patil",
        title: "Agri-Business Consultant",
        specialization: "Dairy Farming & Organic Inputs",
        experience: "18 years",
        location: "Pune, Maharashtra",
        rating: 4.9,
        consultations: 1240,
        bio: "Former NABARD officer turned independent consultant. Helped 500+ farmers set up sustainable agri-businesses across Maharashtra, Madhya Pradesh and Rajasthan. Expert in low-investment, high-return models.",
        expertise: ["Dairy Farming", "Organic Manure", "Agri-Input Trading", "Government Schemes"],
        photo: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=300&h=300&fit=crop&crop=face&auto=format",
        available: true
    },
    {
        id: 2,
        name: "Dr. Sunita Yadav",
        title: "Horticulture & Nursery Expert",
        specialization: "Plant Nursery & Greenhouse Farming",
        experience: "14 years",
        location: "Nashik, Maharashtra",
        rating: 4.8,
        consultations: 890,
        bio: "PhD in Horticulture from IARI, New Delhi. Founded three successful plant nurseries and serves as advisor to FPOs in Nashik region. Specialises in export-quality produce and value-added horticulture products.",
        expertise: ["Plant Nursery", "Greenhouse Farming", "Floriculture", "Export Market"],
        photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face&auto=format",
        available: true
    },
    {
        id: 3,
        name: "Mr. Arvind Sharma",
        title: "Poultry & Livestock Specialist",
        specialization: "Poultry, Goat Farming & Fishery",
        experience: "22 years",
        location: "Nagpur, Maharashtra",
        rating: 4.7,
        consultations: 2100,
        bio: "India's leading poultry business mentor. Has scaled 300+ rural poultry units from backyard to commercial. Certified trainer under National Livestock Mission. Author of 'Poultry Profit Playbook'.",
        expertise: ["Poultry Farming", "Goat Farming", "Fishery", "Animal Health"],
        photo: "https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=300&h=300&fit=crop&crop=face&auto=format",
        available: false
    },
    {
        id: 4,
        name: "Ms. Priya Kulkarni",
        title: "Agri-Finance & Market Linkage Expert",
        specialization: "Agri Finance, FPOs & Market Access",
        experience: "11 years",
        location: "Aurangabad, Maharashtra",
        rating: 4.9,
        consultations: 670,
        bio: "MBA in Agribusiness from IIM Ahmedabad. Works with NABARD and State Bank to connect farmers to credit and market systems. Expert in FPO formation, cold chain logistics and agri-export compliance.",
        expertise: ["Agri Finance", "Market Linkage", "FPO Formation", "Cold Chain"],
        photo: "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=300&h=300&fit=crop&crop=face&auto=format",
        available: true
    }
];

// ─── MOCK KNOW-MORE DATA PER BUSINESS ────────────────────────────────────────
const getKnowMoreData = (rec: Recommendation) => ({
    title: rec.title,
    matchScore: rec.match_score,
    investment: rec.estimated_cost,
    profit: rec.profit_potential,
    timeline: rec.timeline || '3–6 months',
    basicIdea: [
        rec.detailed_description || rec.reason,
        `Your estimated starting investment is ${rec.estimated_cost}, with a projected monthly profit of ${rec.profit_potential} once fully operational.`,
        `Expected timeline to reach first returns: ${rec.timeline || '3–6 months depending on local season and setup pace.'}.`,
        `This business has a ${rec.match_score}% match with your profile — based on your land size, capital, experience and risk preference.`,
        `Government schemes such as NABARD rural credit and state agri subsidies may reduce your net investment significantly.`
    ],
    sections: [
        {
            title: "Market Demand",
            content: [
                rec.market_demand || `${rec.title} products enjoy consistent year-round demand in local mandis, urban retail chains and online grocery platforms.`,
                "Rising consumer preference for farm-fresh, locally sourced and traceable produce drives prices 15–30% above commodity rates.",
                "District-level FPOs (Farmer Producer Organisations) provide direct market linkage — bypassing middlemen and improving margin by up to 20%.",
                "Export opportunities exist for certified organic variants; APEDA provides subsidised assistance for export registration.",
                "Festival and seasonal demand spikes (Oct–Jan) can boost revenue by 40–60% if production is timed correctly."
            ]
        },
        {
            title: "Key Requirements",
            content: [
                ...(rec.requirements.length > 0 ? rec.requirements : ["Land", "Water access", "Basic equipment", "Skilled labour"]),
                `Minimum working capital buffer of 20% of ${rec.estimated_cost} recommended for first 2 months.`,
                "Basic record-keeping or a mobile app like eNAM or AgriBazaar is helpful for price discovery and sales tracking.",
                "FSSAI registration may be required if processing or packaging farm produce for direct consumer sale."
            ]
        },
        {
            title: "Risk Factors & Mitigation",
            content: [
                ...(rec.risk_factors && rec.risk_factors.length > 0 ? rec.risk_factors : [
                    "Market price volatility during harvest season — mitigate via forward contracts or FPO tie-ups.",
                    "Pest or disease outbreaks — adopt IPM (Integrated Pest Management) and maintain crop insurance.",
                    "Weather dependency (drought/flood) — consider drip irrigation and PM Fasal Bima Yojana coverage."
                ]),
                "Labour availability risk during peak seasons — train 2–3 local youth in advance for reliable workforce.",
                "Input cost inflation (seeds, fertilizers) — reduce exposure by bulk purchasing via Kisan cooperative or e-Kisan Mandi."
            ]
        },
        {
            title: "Investment Breakdown",
            content: [
                `Total estimated capital required: ${rec.estimated_cost}.`,
                `Expected monthly revenue once operational: ${rec.profit_potential}.`,
                "Infrastructure setup (land preparation, fencing, shed): approx. 30–40% of total investment.",
                "Inputs (seeds / livestock / raw materials) and recurring monthly costs: approx. 40–50% of total.",
                "Working capital buffer and contingency reserve: 10–20% recommended for the first operating quarter."
            ]
        },
        {
            title: "Steps to Start",
            content: [
                ...(rec.implementation_steps && rec.implementation_steps.length > 0 ? rec.implementation_steps : [
                    "Step 1 — Conduct a local market survey: identify 3–5 potential buyers (mandis, retailers, hotels).",
                    "Step 2 — Prepare land or infrastructure: clear, level, and set up basic facilities.",
                    "Step 3 — Register with APMC or nearest FPO to access subsidies and fair pricing.",
                    "Step 4 — Procure quality inputs (seeds / stock / equipment) from certified dealers.",
                    "Step 5 — Launch a small-scale trial batch (20–30% capacity) to validate quality and buyer interest.",
                    "Step 6 — Scale to full capacity after the first successful sales cycle and reinvest profits."
                ]),
            ]
        },
        {
            title: "Government Schemes",
            content: [
                "PM Kisan Sampada Yojana — provides grants up to ₹10L for agri-processing units.",
                "NABARD RIDF Loans — low-interest rural infrastructure finance at 5.5–7% per annum.",
                "PM Fasal Bima Yojana — crop insurance covering weather, pest and price risk.",
                "National Livestock Mission — livestock-based businesses eligible for 50% capital subsidy.",
                "State Horticulture Mission — greenhouse and nursery setups get 40–50% subsidy on infrastructure."
            ]
        }
    ]
});

const BusinessAdvisory: React.FC<{ lang: Language; user: UserProfile | null }> = ({ lang, user }) => {
    const t = translations[lang] || translations['EN'];
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

    // Modal states
    const [selectedBusiness, setSelectedBusiness] = useState<Recommendation | null>(null);
    const [showExpertModal, setShowExpertModal] = useState(false);
    const [connectingExpert, setConnectingExpert] = useState<number | null>(null);

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

    // Set total land from active farm or cumulative farms
    useEffect(() => {
        if (user) {
            const size = user.landSize || (user as any).land_size;
            if (size) {
                setFormData(prev => ({ ...prev, totalLand: size.toString() }));
            }
        }
    }, [activeFarm, farms]);


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
            const payload = {
                capital: parseFloat(formData.budget),
                land_size: parseFloat(formData.businessLand),
                water_availability: formData.waterSource,
                experience_years: parseInt(formData.experience),
                skills: formData.interests,
                market_access: formData.marketAccess === 'Village only' ? 'good' : 'moderate',
                risk_level: formData.riskPreference === 'Higher profit, higher risk' ? 'high' : 'medium',
                selling_preference: formData.sellingPreference,
                recovery_timeline: formData.investmentRecovery,
                loss_tolerance: formData.lossAttitude,
                risk_preference: formData.riskPreference,
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
        navigate('/chat', {
            state: {
                initialMessage: `I want detailed analysis for ${businessName}`,
                fromAdvisory: true,
                previousState: { formData, recommendations, step }
            }
        });
    };

    const handleConnect = (expertId: number) => {
        setConnectingExpert(expertId);
        // Simulate connecting
        setTimeout(() => {
            setConnectingExpert(null);
            // Show success feedback
            alert("✅ Connection request sent! The expert will reach out to you within 24 hours.");
        }, 1500);
    };

    // ─── STEP 0: LANDING ──────────────────────────────────────────────────────
    if (step === 0) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[80vh]">
                <div className="text-center py-20 px-10 bg-white rounded-[48px] border border-[#E6E6E6] shadow-xl max-w-3xl w-full">
                    <div className="w-24 h-24 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <Briefcase className="w-12 h-12 text-[#1B5E20]" />
                    </div>
                    <h1 className="text-4xl font-extrabold text-[#1E1E1E] mb-4">{t.businessAdvisorTitle}</h1>
                    <p className="text-[#555555] font-medium text-lg max-w-xl mx-auto mb-10">
                        {t.businessAdvisorSub}
                    </p>
                    <button
                        onClick={() => setStep(1)}
                        className="px-8 py-4 bg-[#1B5E20] text-white rounded-2xl font-bold text-xl hover:bg-[#000D0F] transition-all shadow-lg hover:scale-105 flex items-center justify-center gap-3 mx-auto"
                    >
                        {t.startAssessment} <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
            </div>
        );
    }

    // ─── STEP 1: ASSESSMENT FORM ──────────────────────────────────────────────
    if (step === 1) {
        return (
            <div className="p-4 md:p-8 max-w-4xl mx-auto">
                <button onClick={() => setStep(0)} className="flex items-center gap-2 text-[#555555] font-bold mb-6 hover:text-[#1B5E20] transition-colors">
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
                                className="w-full p-4 bg-[#E8F5E9] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1B5E20] placeholder-gray-400 font-medium transition-all"
                                value={formData.budget}
                                onChange={e => setFormData({ ...formData, budget: e.target.value })}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-2 ml-2">
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#555555]">
                                    <Ruler className="w-4 h-4 text-[#1B5E20]" /> {t.businessLandLabel}
                                </label>
                                {formData.totalLand && parseFloat(formData.totalLand) > 0 && (
                                    <span className="text-xs font-bold text-[#1B5E20] bg-[#E6F4EA] px-2 py-1 rounded-lg">
                                        {t.totalAcre}: {formData.totalLand}
                                    </span>
                                )}
                            </div>
                            <input
                                type="number"
                                placeholder="Land to be used for business"
                                className={`w-full p-4 bg-[#E8F5E9] border rounded-2xl focus:outline-none placeholder-gray-400 font-medium transition-all ${(parseFloat(formData.businessLand) > parseFloat(formData.totalLand))
                                    ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500'
                                    : 'border-[#E6E6E6] focus:border-[#1B5E20]'
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
                                <Droplets className="w-4 h-4 text-[#1B5E20]" /> {t.waterAvailability}
                            </label>
                            <select
                                className={`w-full p-4 bg-[#E8F5E9] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1B5E20] font-medium transition-all ${!formData.waterSource ? 'text-gray-400' : 'text-[#1E1E1E]'}`}
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
                                <User className="w-4 h-4 text-[#1B5E20]" /> {t.experienceYears}
                            </label>
                            <input
                                type="number"
                                placeholder="Years of farming/business experience"
                                className="w-full p-4 bg-[#E8F5E9] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1B5E20] placeholder-gray-400 font-medium transition-all"
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
                                        ? 'bg-white border-[#1B5E20] shadow-md ring-1 ring-[#1B5E20] text-[#1B5E20]'
                                        : 'bg-white border-[#E6E6E6] text-[#555555] hover:bg-stone-50'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-full border mb-2 mx-auto transition-colors ${formData.interests.includes(interest) ? 'bg-[#1B5E20] border-[#1B5E20]' : 'border-gray-300'
                                        }`}
                                    />
                                    {interest}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Market & Strategy Section */}
                    <div className="bg-[#F5F5F4] rounded-[24px] p-6 md:p-8 mb-8 border border-[#E6E6E6]">
                        <h3 className="text-xl font-bold text-[#1E1E1E] mb-6 border-b border-gray-200 pb-2">{t.marketStrategyTitle}</h3>

                        <div className="space-y-6">
                            {/* Q1 */}
                            <div>
                                <label className="block text-sm font-bold text-[#555555] mb-3">How close are you to a market or buyers?</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {['Village only', 'Small town within 10 km', 'City within 30 km', 'Direct buyers already available'].map(opt => (
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.marketAccess === opt ? 'border-[#1B5E20] ring-1 ring-[#1B5E20]' : 'border-[#E6E6E6] hover:border-gray-400'}`}>
                                            <input type="radio" name="marketAccess" value={opt} checked={formData.marketAccess === opt} onChange={e => setFormData({ ...formData, marketAccess: e.target.value })} className="w-4 h-4 text-[#1B5E20] focus:ring-[#1B5E20] accent-[#1B5E20]" />
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
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.sellingPreference === opt ? 'border-[#1B5E20] ring-1 ring-[#1B5E20]' : 'border-[#E6E6E6]'}`}>
                                            <input type="radio" name="sellingPreference" value={opt} checked={formData.sellingPreference === opt} onChange={e => setFormData({ ...formData, sellingPreference: e.target.value })} className="w-4 h-4 text-[#1B5E20] accent-[#1B5E20]" />
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
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.incomeComfort === opt ? 'border-[#1B5E20] ring-1 ring-[#1B5E20]' : 'border-[#E6E6E6]'}`}>
                                            <input type="radio" name="incomeComfort" value={opt} checked={formData.incomeComfort === opt} onChange={e => setFormData({ ...formData, incomeComfort: e.target.value })} className="w-4 h-4 text-[#1B5E20] accent-[#1B5E20]" />
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
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.investmentRecovery === opt ? 'border-[#1B5E20] ring-1 ring-[#1B5E20]' : 'border-[#E6E6E6]'}`}>
                                            <input type="radio" name="investmentRecovery" value={opt} checked={formData.investmentRecovery === opt} onChange={e => setFormData({ ...formData, investmentRecovery: e.target.value })} className="w-4 h-4 text-[#1B5E20] accent-[#1B5E20]" />
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
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.lossAttitude === opt ? 'border-[#1B5E20] ring-1 ring-[#1B5E20]' : 'border-[#E6E6E6]'}`}>
                                            <input type="radio" name="lossAttitude" value={opt} checked={formData.lossAttitude === opt} onChange={e => setFormData({ ...formData, lossAttitude: e.target.value })} className="w-4 h-4 text-[#1B5E20] accent-[#1B5E20]" />
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
                                        <label key={opt} className={`flex items-center p-3 bg-white rounded-xl border cursor-pointer transition-all ${formData.riskPreference === opt ? 'border-[#1B5E20] ring-1 ring-[#1B5E20]' : 'border-[#E6E6E6]'}`}>
                                            <input type="radio" name="riskPreference" value={opt} checked={formData.riskPreference === opt} onChange={e => setFormData({ ...formData, riskPreference: e.target.value })} className="w-4 h-4 text-[#1B5E20] accent-[#1B5E20]" />
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
                            <p className="text-[#92400E] text-xs leading-relaxed">{t.importantNoteDesc}</p>
                        </div>
                    </div>

                    {/* Agreement & Analyze */}
                    <div className="bg-[#E8F5E9] rounded-2xl p-6 border border-[#E6E6E6]">
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
                            className={`w-full py-4 bg-[#1B5E20] text-white rounded-xl font-bold text-xl transition-all shadow-md hover:scale-[1.01] flex items-center justify-center gap-2 ${loading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-[#000D0F]'}`}
                        >
                            {loading ? <><Loader2 className="animate-spin" /> {t.analyzingBtn}</> : t.analyze}
                        </button>
                    </div>
                </div>
            </div >
        );
    }

    // ─── STEP 2: RECOMMENDATIONS ──────────────────────────────────────────────
    if (step === 2) {
        const knowMoreData = selectedBusiness ? getKnowMoreData(selectedBusiness) : null;

        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setStep(1)} className="flex items-center gap-2 text-[#555555] font-bold hover:text-[#1B5E20] transition-colors">
                        <ArrowLeft className="w-5 h-5" /> {t.back}
                    </button>
                    <button onClick={() => setStep(1)} className="text-[#1B5E20] font-bold hover:underline text-sm">
                        {t.retakeAssessment}
                    </button>
                </div>

                {/* Title + Contact Expert side by side */}
                <div className="flex items-center justify-between mb-10">
                    <h1 className="text-3xl font-extrabold text-[#1E1E1E]">{t.recommendedBusinesses}</h1>
                    <button
                        onClick={() => setShowExpertModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#1B5E20] text-white rounded-xl font-bold text-sm hover:bg-[#000D0F] transition-all shadow-md hover:scale-105 active:scale-95 flex-shrink-0"
                    >
                        <Users className="w-4 h-4" />
                        Contact To Expert
                    </button>
                </div>

                {/* Business Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {recommendations.map((rec) => (
                        <div key={rec.id} className="bg-white rounded-[32px] border border-[#E6E6E6] overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-300 group">
                            {/* Card Header */}
                            <div className="bg-[#1B5E20] p-6 relative overflow-hidden">
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
                                        <p className="text-[10px] font-bold text-[#1B5E20] uppercase tracking-widest mb-1">{t.profitLabel}</p>
                                        <p className="text-[#2E7D32] font-bold text-sm">{rec.profit_potential}</p>
                                    </div>
                                </div>

                                <div className="mb-8 flex-grow">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{t.requirementsLabel}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {rec.requirements.map((req, i) => (
                                            <span key={i} className="px-2 py-1 bg-[#E8F5E9] border border-[#E6E6E6] rounded-lg text-xs text-[#555555] font-medium">
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
                                                previousState: { formData, recommendations, step }
                                            }
                                        })}
                                        className="w-full py-4 bg-[#1B5E20] text-white rounded-xl font-bold text-lg hover:bg-[#000D0F] transition-all shadow-lg flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                                    >
                                        <TrendingUp className="w-5 h-5" /> {t.simulateBtn}
                                    </button>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleAskChatbot(rec.title)}
                                            className="flex-1 py-3 bg-white border border-[#1B5E20] text-[#1B5E20] rounded-xl font-bold text-sm hover:bg-[#E8F5F5] transition-colors flex items-center justify-center gap-2"
                                        >
                                            <MessageCircle className="w-4 h-4" /> {t.askChatbotBtn}
                                        </button>
                                        <button
                                            onClick={() => setSelectedBusiness(rec)}
                                            className="flex-1 py-3 bg-white border-2 border-[#1B5E20] text-[#1B5E20] rounded-xl font-bold text-sm hover:bg-[#1B5E20] hover:text-white transition-all flex items-center justify-center gap-2 group-hover:shadow-md"
                                        >
                                            <Info className="w-4 h-4" /> {t.knowMore}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── KNOW MORE MODAL (WasteToValue format) ──────────────────── */}
                {selectedBusiness && knowMoreData && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all animate-in fade-in duration-200"
                        onClick={() => setSelectedBusiness(null)}
                    >
                        <div
                            className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl border border-[#E6E6E6] overflow-hidden flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-[#E6E6E6] flex justify-between items-center bg-[#1B5E20]">
                                <div>
                                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Business Details</p>
                                    <h3 className="text-2xl font-extrabold text-white leading-tight">
                                        {knowMoreData.title}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedBusiness(null)}
                                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8 overflow-y-auto space-y-8 bg-white">
                                {/* Stats bar */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-[#E8F5E9] rounded-2xl p-4 text-center border border-[#E6E6E6]">
                                        <p className="text-[10px] font-bold text-[#555555] uppercase tracking-widest mb-1">Match Score</p>
                                        <p className="text-2xl font-extrabold text-[#1B5E20]">{knowMoreData.matchScore}%</p>
                                    </div>
                                    <div className="bg-[#FFFBEB] rounded-2xl p-4 text-center border border-[#FCD34D]/40">
                                        <p className="text-[10px] font-bold text-[#555555] uppercase tracking-widest mb-1">Investment</p>
                                        <p className="text-lg font-extrabold text-[#92400E]">{knowMoreData.investment}</p>
                                    </div>
                                    <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                                        <p className="text-[10px] font-bold text-[#555555] uppercase tracking-widest mb-1">Monthly Profit</p>
                                        <p className="text-lg font-extrabold text-[#1B5E20]">{knowMoreData.profit}</p>
                                    </div>
                                </div>

                                {/* Basic Idea */}
                                <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                    <h4 className="text-lg font-bold text-[#1B5E20] mb-3 flex items-center gap-2">
                                        <Sprout className="w-5 h-5" /> Overview
                                    </h4>
                                    <ul className="space-y-2">
                                        {knowMoreData.basicIdea.map((line, idx) => (
                                            <li key={idx} className="text-[#555555] text-sm leading-relaxed flex items-start gap-2">
                                                <span className="mt-1.5 w-1.5 h-1.5 bg-[#1B5E20]/60 rounded-full flex-shrink-0"></span>
                                                <span>{line}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Detailed sections grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                    {knowMoreData.sections.map((section, idx) => (
                                        <div key={idx} className="bg-[#E8F5E9] p-5 rounded-2xl border border-[#E6E6E6]">
                                            <h5 className="font-bold text-[#1E1E1E] mb-3 uppercase text-xs tracking-widest border-b border-[#E6E6E6] pb-2 flex items-center justify-between">
                                                {section.title}
                                                <div className="w-1.5 h-1.5 bg-[#1B5E20] rounded-full"></div>
                                            </h5>
                                            <ul className="space-y-2.5">
                                                {section.content.map((item, i) => (
                                                    <li key={i} className="text-[#555555] text-sm leading-relaxed flex items-start gap-2">
                                                        <span className="mt-1.5 w-1.5 h-1.5 bg-[#1B5E20]/40 rounded-full flex-shrink-0"></span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>

                                {/* Bottom action */}
                                <div className="flex gap-3 pt-2 border-t border-gray-100">
                                    <button
                                        onClick={() => { setSelectedBusiness(null); handleAskChatbot(selectedBusiness.title); }}
                                        className="flex-1 py-3 bg-[#1B5E20] text-white rounded-xl font-bold text-sm hover:bg-[#000D0F] transition-all flex items-center justify-center gap-2 shadow-md"
                                    >
                                        <MessageCircle className="w-4 h-4" /> Ask AI Chatbot
                                    </button>
                                    <button
                                        onClick={() => { setSelectedBusiness(null); setShowExpertModal(true); }}
                                        className="flex-1 py-3 bg-white border-2 border-[#1B5E20] text-[#1B5E20] rounded-xl font-bold text-sm hover:bg-[#E8F5E9] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Users className="w-4 h-4" /> Contact Expert
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── CONTACT TO EXPERT MODAL ────────────────────────────────── */}
                {showExpertModal && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all animate-in fade-in duration-200"
                        onClick={() => setShowExpertModal(false)}
                    >
                        <div
                            className="bg-white w-full max-w-5xl max-h-[92vh] rounded-[2rem] shadow-2xl border border-[#E6E6E6] overflow-hidden flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Expert Modal Header */}
                            <div className="p-6 border-b border-[#E6E6E6] flex justify-between items-center bg-[#1B5E20]">
                                <div>
                                    <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1">Expert Network</p>
                                    <h3 className="text-2xl font-extrabold text-white">Connect With Agri Experts</h3>
                                    <p className="text-white/80 text-sm mt-1">Verified farming & agri-business specialists</p>
                                </div>
                                <button
                                    onClick={() => setShowExpertModal(false)}
                                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            {/* Expert Cards */}
                            <div className="p-6 overflow-y-auto space-y-5 bg-[#FAFAF7]">
                                {EXPERTS.map((expert) => (
                                    <div
                                        key={expert.id}
                                        className="bg-white rounded-2xl border border-[#E6E6E6] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                                    >
                                        <div className="p-5 flex flex-col md:flex-row gap-5">
                                            {/* Photo */}
                                            <div className="flex-shrink-0">
                                                <div className="relative">
                                                    <img
                                                        src={expert.photo}
                                                        alt={expert.name}
                                                        className="w-24 h-24 rounded-2xl object-cover border-2 border-[#E6E6E6] shadow-sm"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name)}&background=1B5E20&color=fff&size=96`;
                                                        }}
                                                    />
                                                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${expert.available ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-grow">
                                                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                                                    <div>
                                                        <h4 className="text-lg font-extrabold text-[#1E1E1E]">{expert.name}</h4>
                                                        <p className="text-[#1B5E20] font-bold text-sm">{expert.title}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 bg-[#FFF8E1] px-3 py-1 rounded-full border border-[#FCD34D]">
                                                        <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]" />
                                                        <span className="text-xs font-bold text-[#92400E]">{expert.rating}</span>
                                                    </div>
                                                </div>

                                                {/* Meta row */}
                                                <div className="flex flex-wrap gap-3 mb-3 text-xs text-[#555555]">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3.5 h-3.5 text-[#1B5E20]" />
                                                        {expert.location}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Award className="w-3.5 h-3.5 text-[#1B5E20]" />
                                                        {expert.experience} experience
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3.5 h-3.5 text-[#1B5E20]" />
                                                        {expert.consultations.toLocaleString()} consultations
                                                    </span>
                                                    <span className={`font-bold ${expert.available ? 'text-green-600' : 'text-gray-400'}`}>
                                                        ● {expert.available ? 'Available Now' : 'Busy'}
                                                    </span>
                                                </div>

                                                <p className="text-[#555555] text-sm leading-relaxed mb-3">{expert.bio}</p>

                                                {/* Expertise tags */}
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {expert.expertise.map((tag, i) => (
                                                        <span key={i} className="px-2.5 py-1 bg-[#E8F5E9] border border-[#E6E6E6] rounded-lg text-xs text-[#1B5E20] font-bold">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>

                                                {/* Connect Button */}
                                                <button
                                                    onClick={() => handleConnect(expert.id)}
                                                    disabled={!expert.available || connectingExpert === expert.id}
                                                    className={`w-full md:w-auto px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md
                                                        ${!expert.available
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                            : connectingExpert === expert.id
                                                                ? 'bg-[#1B5E20]/80 text-white cursor-wait'
                                                                : 'bg-[#1B5E20] text-white hover:bg-[#000D0F] hover:scale-105 active:scale-95'
                                                        }`}
                                                >
                                                    {connectingExpert === expert.id ? (
                                                        <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                                                    ) : !expert.available ? (
                                                        <><Phone className="w-4 h-4" /> Currently Unavailable</>
                                                    ) : (
                                                        <><Phone className="w-4 h-4" /> Connect</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
};

export default BusinessAdvisory;
