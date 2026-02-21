import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserProfile } from '../types';
import { useLanguage } from '../src/context/LanguageContext';
import { useFarm } from '../src/context/FarmContext';
import { api } from '../src/services/api';
import { auth, db } from '../firebase';
import { onSnapshot, doc } from 'firebase/firestore';
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
    Sprout,
    Target
} from 'lucide-react';
import { getUserProfile } from '../src/services/firebase_db';

interface FormData {
    // A. Financial
    budget: string;
    currentProfit: string;
    runningPlan: string;

    // B. Land & Infra
    spaceType: string;
    // Branch A
    totalLand: string;
    businessLand: string;
    soilCondition: string;
    waterSource: string;
    // Branch B
    coveredSpace: string;
    infraType: string;
    electricity: string;

    // C. Workforce & Experience
    experience: string;
    animalHandling: string;
    dailyLabor: string;
    handsOnWork: string;

    // D. Market
    marketAccess: string;
    sellingPreference: string;

    // E. Risk
    incomeComfort: string;
    investmentRecovery: string;
    lossAttitude: string;
    riskPreference: string;

    // F. Goals
    mainGoal: string;
    interests: string[];
    selectedFarmNickname: string;
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
        photo: "/experts/expert_1.png",
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
        photo: "/experts/expert_2.png",
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
        photo: "/experts/expert_3.png",
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
        photo: "/experts/expert_4.png",
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

const BusinessAdvisory: React.FC = () => {
    const { language: lang, t } = useLanguage();
    const { activeFarm, farms } = useFarm();
    const [user, setUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u: any) => {
            if (u) {
                onSnapshot(doc(db, 'users', u.uid), (snap: any) => {
                    if (snap.exists()) setUser(snap.data() as UserProfile);
                });
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState<number>(0);
    const [subStep, setSubStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

    // Modal states
    const [selectedBusiness, setSelectedBusiness] = useState<Recommendation | null>(null);
    const [showExpertModal, setShowExpertModal] = useState(false);
    const [connectingExpert, setConnectingExpert] = useState<number | null>(null);
    const [backendSessionId, setBackendSessionId] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>({
        budget: '',
        currentProfit: '',
        runningPlan: '',
        spaceType: '',
        totalLand: '',
        businessLand: '',
        soilCondition: '',
        waterSource: '',
        coveredSpace: '',
        infraType: '',
        electricity: '',
        experience: '',
        animalHandling: '',
        dailyLabor: '',
        handsOnWork: '',
        interests: [],
        marketAccess: '',
        sellingPreference: '',
        incomeComfort: '',
        investmentRecovery: '',
        lossAttitude: '',
        riskPreference: '',
        mainGoal: '',
        selectedFarmNickname: '',
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

    // Set total land from all farms and experience from user profile
    useEffect(() => {
        if (user) {
            // Default to aggregate total initially, but will be overridden by farm selection
            const totalLandSize = user.farms?.reduce((acc, farm) => {
                const size = parseFloat(farm.landSize);
                return isNaN(size) ? acc : acc + size;
            }, 0) || 0;

            setFormData(prev => ({
                ...prev,
                totalLand: prev.totalLand || totalLandSize.toString(),
                experience: prev.experience || user.experience_years || ''
            }));
        }
    }, [user]);

    // Update form fields when a farm is selected
    useEffect(() => {
        if (user && formData.selectedFarmNickname) {
            const farm = user.farms?.find(f => f.nickname === formData.selectedFarmNickname);
            if (farm) {
                setFormData(prev => ({
                    ...prev,
                    totalLand: farm.landSize,
                    soilCondition: farm.soilType,
                    waterSource: farm.waterResource,
                    // Respect the user's manual plot size if they already entered it, but cap it?
                    // For now, let's keep businessLand as is unless it's empty
                    businessLand: prev.businessLand || ''
                }));
            }
        }
    }, [formData.selectedFarmNickname, user]);


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

        if (formData.spaceType === 'Agri' && (isNaN(business) || business <= 0)) {
            alert("Please enter a valid land size for your business.");
            return;
        }

        if (formData.spaceType === 'Agri' && !isNaN(total) && total > 0 && business > total) {
            alert(t.landExceedsTotal);
            return;
        }

        // Budget string to numeric mapping
        const budgetMap: Record<string, number> = {
            '< 1 lakh': 50000,
            '1-3 lakh': 200000,
            '3-6 lakh': 450000,
            '6-10 lakh': 800000,
            '10+ lakh': 1500000
        };

        const capitalValue = budgetMap[formData.budget] || 100000;

        const selectedFarm = user?.farms?.find(f => f.nickname === formData.selectedFarmNickname);

        setLoading(true);
        try {
            // Fetch fresh profile to ensure we have the absolute latest language preference
            const profile = await getUserProfile(auth.currentUser?.uid || '') as any;
            const preferredLang = (profile?.language || lang).toLowerCase();

            const payload = {
                // A. Financial
                capital: capitalValue,
                current_profit: formData.currentProfit,
                running_plan: formData.runningPlan,

                // B. Land & Infra
                space_type: formData.spaceType,
                // Agricultural branch
                land_size: formData.businessLand,
                soil_condition: formData.soilCondition,
                water_availability: formData.waterSource,
                soil_type: formData.soilCondition, // Redundancy for backend matching
                crops_grown: selectedFarm?.crops || [], // Isolated farm crops
                // Non-Agri branch
                covered_space: formData.coveredSpace,
                infra_type: formData.infraType,
                electricity: formData.electricity,

                // C. Workforce
                experience_years: parseInt(formData.experience) || 0,
                animal_handling: formData.animalHandling,
                daily_labor: formData.dailyLabor,
                hands_on_work: formData.handsOnWork,

                // D, E, F
                market_access: formData.marketAccess,
                selling_preference: formData.sellingPreference,
                income_comfort: formData.incomeComfort,
                recovery_timeline: formData.investmentRecovery,
                loss_tolerance: formData.lossAttitude,
                risk_preference: formData.riskPreference,
                main_goal: formData.mainGoal,
                interests: formData.interests,

                total_land: parseFloat(formData.totalLand) || 0,
                farm_name: formData.selectedFarmNickname,
                language: preferredLang
            };

            const response = await api.post('/business-advisor/init', payload);
            if (response.success && response.recommendations) {
                setRecommendations(response.recommendations);
                if (response.session_id) setBackendSessionId(response.session_id);
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
                backendSessionId: backendSessionId,
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
        const totalSubSteps = 4;
        const progress = (subStep / totalSubSteps) * 100;

        const handleNext = () => {
            // Step 1 Validation
            if (subStep === 1) {
                const total = parseFloat(formData.totalLand);
                const business = parseFloat(formData.businessLand);

                if (formData.spaceType === 'Agri' && (isNaN(business) || business <= 0)) {
                    alert("Please enter a valid land size for your business.");
                    return;
                }

                if (formData.spaceType === 'Agri' && !isNaN(total) && total > 0 && business > total) {
                    alert(t.landExceedsTotal);
                    return;
                }
            }
            if (subStep < totalSubSteps) setSubStep(subStep + 1);
        };

        const handleBack = () => {
            if (subStep > 1) setSubStep(subStep - 1);
            else setStep(0);
        };

        return (
            <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
                {/* Navigation Header */}
                <div className="mb-8 flex items-center justify-between">
                    <button onClick={handleBack} className="flex items-center gap-2 text-[#555555] font-bold hover:text-[#1B5E20] transition-colors">
                        <ArrowLeft className="w-5 h-5" /> {subStep === 1 ? t.back : 'Previous Step'}
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:block w-48 h-2 bg-[#E6E6E6] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#1B5E20] transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-sm font-bold text-[#1B5E20]">Step {subStep} of {totalSubSteps}</span>
                    </div>
                </div>

                <div className="bg-white rounded-[40px] border border-[#E6E6E6] shadow-2xl p-6 md:p-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <h1 className="text-4xl font-extrabold text-[#1E1E1E] mb-10 tracking-tight">
                        {subStep === 1 && "Farm & Finance"}
                        {subStep === 2 && "Land & Infrastructure"}
                        {subStep === 3 && "Workforce & Market"}
                        {subStep === 4 && "Risk & Goals"}
                    </h1>

                    <div className="space-y-12">
                        {/* SUB-STEP 1: FINANCIAL BASELINE & INTENT */}
                        {subStep === 1 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                                {/* Farm Selection (Dynamic) */}
                                {user && user.farms && user.farms.length > 0 && (
                                    <div className="space-y-6">
                                        <label className="block text-lg font-bold text-[#1E1E1E]">Which farm is this business for?</label>
                                        <div className="flex flex-wrap gap-4">
                                            {user.farms.map(farm => (
                                                <button
                                                    key={farm.nickname}
                                                    onClick={() => setFormData({ ...formData, selectedFarmNickname: farm.nickname })}
                                                    className={`px-6 py-3 rounded-2xl border-2 font-bold transition-all flex items-center gap-3 ${formData.selectedFarmNickname === farm.nickname
                                                        ? 'bg-[#E8F5E9] border-[#1B5E20] text-[#1B5E20] shadow-md'
                                                        : 'bg-[#F8FAFC] border-[#F1F5F9] text-[#64748B] hover:border-gray-300'
                                                        }`}
                                                >
                                                    <MapPin className="w-4 h-4" />
                                                    {farm.nickname}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setFormData({ ...formData, selectedFarmNickname: '' })}
                                                className={`px-6 py-3 rounded-2xl border-2 font-bold transition-all flex items-center gap-3 ${!formData.selectedFarmNickname
                                                    ? 'bg-[#E8F5E9] border-[#1B5E20] text-[#1B5E20] shadow-md'
                                                    : 'bg-[#F8FAFC] border-[#F1F5F9] text-[#64748B] hover:border-gray-300'
                                                    }`}
                                            >
                                                <Target className="w-4 h-4" />
                                                Other/Custom
                                            </button>
                                        </div>
                                        {formData.selectedFarmNickname && (
                                            <p className="text-xs text-[#1B5E20] font-bold animate-pulse flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Auto-filling data from "{formData.selectedFarmNickname}"...
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-6">
                                    <label className="block text-lg font-bold text-[#1E1E1E]">What is your available investment budget?</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                        {['< 1 lakh', '1-3 lakh', '3-6 lakh', '6-10 lakh', '10+ lakh'].map(opt => (
                                            <label key={opt} className={`flex flex-col items-center justify-center p-6 text-center rounded-[24px] border-2 cursor-pointer transition-all duration-300 ${formData.budget === opt ? 'border-[#1B5E20] bg-[#E8F5E9] shadow-lg ring-2 ring-[#1B5E20]/20 scale-105' : 'border-[#F1F5F9] bg-[#F8FAFC] hover:border-gray-300 hover:bg-white'}`}>
                                                <input type="radio" name="budget" value={opt} checked={formData.budget === opt} onChange={e => setFormData({ ...formData, budget: e.target.value })} className="sr-only" />
                                                <DollarSign className={`w-8 h-8 mb-3 transition-colors ${formData.budget === opt ? 'text-[#1B5E20]' : 'text-gray-400'}`} />
                                                <span className={`text-sm font-bold ${formData.budget === opt ? 'text-[#1B5E20]' : 'text-[#64748B]'}`}>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <label className="block text-lg font-bold text-[#1E1E1E]">Current average monthly profit?</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {['< ₹10,000', '₹10,000 - ₹20,000', '₹20,000 - ₹50,000', 'Above ₹50,000'].map(opt => (
                                            <label key={opt} className={`flex items-center p-6 rounded-[24px] border-2 cursor-pointer transition-all duration-300 ${formData.currentProfit === opt ? 'border-[#1B5E20] bg-[#E8F5E9] shadow-md' : 'border-[#F1F5F9] bg-[#F8FAFC] hover:border-gray-300'}`}>
                                                <input type="radio" name="currentProfit" value={opt} checked={formData.currentProfit === opt} onChange={e => setFormData({ ...formData, currentProfit: e.target.value })} className="w-5 h-5 accent-[#1B5E20] mr-4" />
                                                <span className={`text-base font-bold ${formData.currentProfit === opt ? 'text-[#1B5E20]' : 'text-[#64748B]'}`}>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <label className="block text-lg font-bold text-[#1E1E1E]">Operational Intent?</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {[
                                            { label: 'Full-Time Business', sub: 'I want this to be my primary income source', value: 'Full Replacement' },
                                            { label: 'Side Income', sub: 'I will run this along with current work', value: 'Side Income' }
                                        ].map(opt => (
                                            <label key={opt.value} className={`flex flex-col p-6 rounded-[24px] border-2 cursor-pointer transition-all duration-300 ${formData.runningPlan === opt.value ? 'border-[#1B5E20] bg-[#E8F5E9] shadow-md scale-[1.02]' : 'border-[#F1F5F9] bg-[#F8FAFC] hover:border-gray-300'}`}>
                                                <div className="flex items-center mb-2">
                                                    <input type="radio" name="runningPlan" value={opt.value} checked={formData.runningPlan === opt.value} onChange={e => setFormData({ ...formData, runningPlan: e.target.value })} className="w-5 h-5 accent-[#1B5E20] mr-4" />
                                                    <span className={`font-extrabold ${formData.runningPlan === opt.value ? 'text-[#1B5E20]' : 'text-[#1E1E1E]'}`}>{opt.label}</span>
                                                </div>
                                                <span className="text-xs text-[#64748B] ml-9 font-medium">{opt.sub}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6 pt-6 border-t border-[#F1F5F9]">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-lg font-bold text-[#1E1E1E]">Target Business Plot Size <span className="text-sm font-medium text-[#64748B] ml-2">(in acres)</span></label>
                                        {formData.totalLand && parseFloat(formData.totalLand) > 0 && (
                                            <span className="text-[10px] font-bold text-[#1B5E20] bg-[#E8F5E9] px-4 py-2 rounded-full border border-[#1B5E20]/10 shadow-sm">Available Land: {formData.totalLand} acres</span>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                            <Ruler className={`h-6 w-6 ${(formData.totalLand && parseFloat(formData.businessLand) > parseFloat(formData.totalLand)) ? 'text-red-500' : 'text-[#1B5E20]'}`} />
                                        </div>
                                        <input
                                            type="number"
                                            step="0.1"
                                            max={formData.totalLand || undefined}
                                            value={formData.businessLand}
                                            onChange={e => {
                                                const val = e.target.value;
                                                const numVal = parseFloat(val);
                                                const maxVal = parseFloat(formData.totalLand);
                                                // We allow the input but handle validation styling
                                                setFormData({ ...formData, businessLand: val });
                                            }}
                                            placeholder="Enter plot size for business..."
                                            className={`block w-full pl-16 pr-24 py-6 bg-[#F8FAFC] border-2 rounded-[24px] text-xl font-bold transition-all outline-none ${(formData.totalLand && parseFloat(formData.businessLand) > parseFloat(formData.totalLand))
                                                ? 'border-red-500 text-red-600 focus:border-red-600'
                                                : 'border-[#F1F5F9] text-[#1E1E1E] focus:border-[#1B5E20] focus:shadow-md focus:bg-white'
                                                }`}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-8 flex items-center pointer-events-none">
                                            <span className={`text-lg font-bold ${(formData.totalLand && parseFloat(formData.businessLand) > parseFloat(formData.totalLand)) ? 'text-red-500' : 'text-[#1B5E20]'}`}>Acres</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-xs font-medium italic ${(formData.totalLand && parseFloat(formData.businessLand) > parseFloat(formData.totalLand))
                                            ? 'text-red-500 font-bold'
                                            : 'text-[#64748B]'
                                            }`}>
                                            {(formData.totalLand && parseFloat(formData.businessLand) > parseFloat(formData.totalLand))
                                                ? `⚠️ Cannot exceed available land (${formData.totalLand} acres)`
                                                : `Enter how much land you plan to use for your new agri-business. (Must be less than ${formData.totalLand || 'total'} acres)`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {subStep === 2 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                                <div className="space-y-6">
                                    <label className="block text-lg font-bold text-[#1E1E1E]">Where will the business be located?</label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                        {[
                                            { label: 'Open Agricultural Land', sub: 'Fields, plots', value: 'Agri', icon: Sprout },
                                            { label: 'Covered / Rented Space', sub: 'Shed, rooftop, backyard', value: 'Non-Agri', icon: Briefcase },
                                            { label: 'Pond / Water Body', sub: 'Water based setup', value: 'Water', icon: Droplets }
                                        ].map(opt => (
                                            <label key={opt.value} className={`flex flex-col p-6 rounded-[28px] border-2 cursor-pointer transition-all duration-300 ${formData.spaceType === opt.value ? 'border-[#1B5E20] bg-[#E8F5E9] shadow-lg ring-2 ring-[#1B5E20]/10' : 'border-[#F1F5F9] bg-[#F8FAFC] hover:border-gray-300'}`}>
                                                <input type="radio" name="spaceType" value={opt.value} checked={formData.spaceType === opt.value} onChange={e => setFormData({ ...formData, spaceType: e.target.value })} className="sr-only" />
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${formData.spaceType === opt.value ? 'bg-white text-[#1B5E20]' : 'bg-gray-100 text-gray-400'}`}>
                                                    <opt.icon className="w-6 h-6" />
                                                </div>
                                                <span className={`font-bold mb-1 ${formData.spaceType === opt.value ? 'text-[#1B5E20]' : 'text-[#1E1E1E]'}`}>{opt.label}</span>
                                                <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">{opt.sub}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {formData.spaceType === 'Agri' && (
                                    <div className="p-8 bg-[#F8FAFC] rounded-[32px] border-2 border-dashed border-[#1B5E20]/20 space-y-8 animate-in slide-in-from-left duration-500">
                                        <div className="flex items-center gap-3 pb-4 border-b border-[#E6E6E6]">
                                            <div className="w-10 h-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center">
                                                <Ruler className="text-[#1B5E20] w-5 h-5" />
                                            </div>
                                            <h4 className="font-bold text-[#1B5E20]">Agricultural Plot Details</h4>
                                        </div>
                                        <div className="space-y-12">
                                            <div className="space-y-6">
                                                <label className="block text-lg font-bold text-[#1E1E1E]">Soil Condition</label>
                                                <div className="flex flex-col gap-4">
                                                    {['Highly fertile', 'Average/Normal', 'Barren/Degraded'].map(opt => (
                                                        <label key={opt} className={`flex items-center p-5 rounded-[24px] border-2 cursor-pointer transition-all ${formData.soilCondition === opt ? 'border-[#1B5E20] bg-[#E8F5E9] shadow-sm' : 'border-[#F1F5F9] bg-[#F8FAFC] hover:border-gray-300'}`}>
                                                            <input type="radio" name="soilCondition" value={opt} checked={formData.soilCondition === opt} onChange={e => setFormData({ ...formData, soilCondition: e.target.value })} className="w-5 h-5 accent-[#1B5E20] mr-4" />
                                                            <span className="text-sm font-bold text-[#64748B]">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <label className="block text-lg font-bold text-[#1E1E1E]">Water Availability</label>
                                                <div className="flex flex-col gap-4">
                                                    {['Borewell', 'Canal', 'Seasonal/Rainfed only'].map(opt => (
                                                        <label key={opt} className={`flex items-center p-5 rounded-[24px] border-2 cursor-pointer transition-all ${formData.waterSource === opt ? 'border-[#1B5E20] bg-[#E8F5E9] shadow-sm' : 'border-[#F1F5F9] bg-[#F8FAFC] hover:border-gray-300'}`}>
                                                            <input type="radio" name="waterSource" value={opt} checked={formData.waterSource === opt} onChange={e => setFormData({ ...formData, waterSource: e.target.value })} className="w-5 h-5 accent-[#1B5E20] mr-4" />
                                                            <span className="text-sm font-bold text-[#64748B]">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {formData.spaceType === 'Non-Agri' && (
                                    <div className="p-8 bg-[#F8FAFC] rounded-[32px] border-2 border-dashed border-[#1B5E20]/20 space-y-8 animate-in slide-in-from-right duration-500">
                                        <div className="flex items-center gap-3 pb-4 border-b border-[#E6E6E6]">
                                            <div className="w-10 h-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center">
                                                <Briefcase className="text-[#1B5E20] w-5 h-5" />
                                            </div>
                                            <h4 className="font-bold text-[#1B5E20]">Facility & Infrastructure</h4>
                                        </div>
                                        <div className="space-y-8">
                                            <label className="block text-lg font-bold text-[#1E1E1E]">Available Space</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {['< 500 sq.ft', '500-1,000 sq.ft', '1,000-5,000 sq.ft'].map(opt => (
                                                    <label key={opt} className={`flex items-center p-6 rounded-2xl border-2 cursor-pointer transition-all ${formData.coveredSpace === opt ? 'border-[#1B5E20] bg-[#E8F5E9] shadow-md ring-2 ring-[#1B5E20]/5' : 'border-transparent bg-white/50 hover:bg-white'}`}>
                                                        <input type="radio" name="coveredSpace" value={opt} checked={formData.coveredSpace === opt} onChange={e => setFormData({ ...formData, coveredSpace: e.target.value })} className="w-5 h-5 accent-[#1B5E20] mr-4" />
                                                        <span className="text-sm font-bold text-[#64748B]">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-12">
                                            <div className="space-y-6">
                                                <label className="block text-lg font-bold text-[#1E1E1E]">Electricity Access</label>
                                                <div className="flex flex-col gap-4">
                                                    {['Yes, 24/7', 'Yes, but frequent power cuts', 'No electricity'].map(opt => (
                                                        <label key={opt} className={`flex items-center p-5 rounded-[24px] border-2 cursor-pointer transition-all ${formData.electricity === opt ? 'border-[#1B5E20] bg-[#E8F5E9] shadow-sm' : 'border-[#F1F5F9] bg-[#F8FAFC] hover:border-gray-300'}`}>
                                                            <input type="radio" name="electricity" value={opt} checked={formData.electricity === opt} onChange={e => setFormData({ ...formData, electricity: e.target.value })} className="w-5 h-5 accent-[#1B5E20] mr-4" />
                                                            <span className="text-sm font-bold text-[#64748B]">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <label className="block text-lg font-bold text-[#1E1E1E]">Infrastructure Type</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {['Fully enclosed room', 'Open shed', 'Rooftop', 'Empty plot'].map(opt => (
                                                        <label key={opt} className={`flex flex-col items-center justify-center p-8 rounded-[32px] border-2 cursor-pointer transition-all ${formData.infraType === opt ? 'border-[#1B5E20] bg-[#E8F5E9] shadow-lg scale-[1.02]' : 'border-[#F1F5F9] bg-[#F8FAFC] hover:border-gray-300'}`}>
                                                            <input type="radio" name="infraType" value={opt} checked={formData.infraType === opt} onChange={e => setFormData({ ...formData, infraType: e.target.value })} className="sr-only" />
                                                            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#64748B] text-center w-full leading-relaxed">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SUB-STEP 3: WORKFORCE & MARKET */}
                        {subStep === 3 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-12">
                                <section className="space-y-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-[#E8F5E9] rounded-xl flex items-center justify-center">
                                            <User className="text-[#1B5E20] w-5 h-5" />
                                        </div>
                                        <h3 className="text-xl font-bold text-[#1E1E1E]">Workforce Profile</h3>
                                    </div>

                                    <div className="flex flex-col gap-12">
                                        <div className="space-y-4">
                                            <label className="text-lg font-bold text-[#1E1E1E]">Daily labor source?</label>
                                            <div className="flex flex-col gap-3">
                                                {['Mostly myself', 'My family', 'External labor'].map(opt => (
                                                    <label key={opt} className={`flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.dailyLabor === opt ? 'border-[#1B5E20] bg-[#E8F5E9] font-bold' : 'border-[#F1F5F9] bg-[#F8FAFC]'}`}>
                                                        <input type="radio" name="dailyLabor" value={opt} checked={formData.dailyLabor === opt} onChange={e => setFormData({ ...formData, dailyLabor: e.target.value })} className="w-5 h-5 accent-[#1B5E20] mr-4" />
                                                        <span className="text-sm font-bold">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-lg font-bold text-[#1E1E1E]">Are you comfortable working with animals?</label>
                                            <div className="flex flex-col gap-3">
                                                {['Yes, regularly', 'Yes, limited', 'No experience'].map(opt => (
                                                    <label key={opt} className={`flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.animalHandling === opt ? 'border-[#1B5E20] bg-[#E8F5E9] font-bold' : 'border-[#F1F5F9] bg-[#F8FAFC]'}`}>
                                                        <input type="radio" name="animalHandling" value={opt} checked={formData.animalHandling === opt} onChange={e => setFormData({ ...formData, animalHandling: e.target.value })} className="w-5 h-5 accent-[#1B5E20] mr-4" />
                                                        <span className="text-sm font-bold">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-8 pt-8 border-t border-[#F1F5F9]">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-[#FEF3F2] rounded-xl flex items-center justify-center">
                                            <MapPin className="text-[#B91C1C] w-5 h-5" />
                                        </div>
                                        <h3 className="text-xl font-bold text-[#1E1E1E]">Market Connectivity</h3>
                                    </div>

                                    <div className="space-y-6">
                                        <label className="block text-lg font-bold text-[#1E1E1E]">Market Access Distance?</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            {['Village only', 'Small town within 10 km', 'City within 30 km', 'Direct buyers already available'].map(opt => (
                                                <label key={opt} className={`flex items-center justify-center p-6 rounded-[24px] border-2 cursor-pointer text-center transition-all ${formData.marketAccess === opt ? 'border-[#1B5E20] bg-[#E8F5E9] font-bold' : 'border-[#F1F5F9] bg-[#F8FAFC]'}`}>
                                                    <input type="radio" name="marketAccess" value={opt} checked={formData.marketAccess === opt} onChange={e => setFormData({ ...formData, marketAccess: e.target.value })} className="sr-only" />
                                                    <span className="text-base leading-tight">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* SUB-STEP 4: RISK & GOALS */}
                        {subStep === 4 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-16">
                                <section className="space-y-12">
                                    <div className="space-y-8">
                                        <h3 className="text-xl font-bold text-[#1E1E1E]">Financial Mindset</h3>
                                        <div className="space-y-10">
                                            <div className="space-y-4">
                                                <label className="text-xs font-bold text-[#64748B] uppercase tracking-widest leading-none">Loss Tolerance</label>
                                                <div className="flex flex-col gap-3">
                                                    {['I understand initial losses are possible', 'Small losses acceptable', 'I cannot afford losses'].map(opt => (
                                                        <label key={opt} className={`flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.lossAttitude === opt ? 'border-[#1B5E20] bg-[#E8F5E9] font-bold' : 'border-[#F1F5F9] bg-[#F8FAFC]'}`}>
                                                            <input type="radio" name="lossAttitude" value={opt} checked={formData.lossAttitude === opt} onChange={e => setFormData({ ...formData, lossAttitude: e.target.value })} className="w-5 h-5 accent-[#1B5E20] mr-4" />
                                                            <span className="text-sm font-medium">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <label className="text-xs font-bold text-[#64748B] uppercase tracking-widest">Business Goal</label>
                                                <div className="flex flex-col gap-3">
                                                    {['Stable monthly income', 'High growth & scaling', 'Asset building'].map(opt => (
                                                        <label key={opt} className={`flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.mainGoal === opt ? 'border-[#1B5E20] bg-[#E8F5E9] font-bold' : 'border-[#F1F5F9] bg-[#F8FAFC]'}`}>
                                                            <input type="radio" name="mainGoal" value={opt} checked={formData.mainGoal === opt} onChange={e => setFormData({ ...formData, mainGoal: e.target.value })} className="w-5 h-5 accent-[#1B5E20] mr-4" />
                                                            <span className="text-sm font-medium">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8 pt-8 border-t border-[#F1F5F9]">
                                        <h3 className="text-xl font-bold text-[#1E1E1E]">Areas of Interest</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {['Dairy', 'Poultry', 'Goat farming', 'Fishery', 'Mushroom', 'Nursery', 'Organic inputs', 'Manufacturing'].map(interest => (
                                                <button
                                                    key={interest}
                                                    onClick={() => handleInterestToggle(interest)}
                                                    className={`p-5 rounded-2xl border-2 text-sm font-bold transition-all text-left flex items-center gap-4 ${formData.interests.includes(interest)
                                                        ? 'bg-[#E8F5E9] border-[#1B5E20] text-[#1B5E20] shadow-sm'
                                                        : 'bg-[#F8FAFC] border-[#F1F5F9] text-[#64748B] hover:bg-white'
                                                        }`}
                                                >
                                                    <div className={`w-4 h-4 rounded-full border-2 transition-colors ${formData.interests.includes(interest) ? 'bg-[#1B5E20] border-[#1B5E20]' : 'border-gray-300'}`} />
                                                    {interest}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                {/* Final Agreement & Send */}
                                <div className="mt-12 bg-[#F8FAFC] border-2 border-[#1B5E20]/5 rounded-[32px] p-8 space-y-8 animate-in zoom-in-95 duration-500">
                                    <label className="flex items-start gap-4 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                className="w-6 h-6 text-[#1B5E20] rounded-lg border-2 border-gray-300 focus:ring-[#1B5E20] accent-[#1B5E20] transition-all cursor-pointer"
                                                checked={formData.agreement}
                                                onChange={e => setFormData({ ...formData, agreement: e.target.checked })}
                                            />
                                        </div>
                                        <span className="text-sm text-[#64748B] font-medium leading-relaxed group-hover:text-[#1E1E1E] transition-colors pt-0.5">
                                            {t.agreementText}
                                        </span>
                                    </label>

                                    <button
                                        onClick={handleAnalyze}
                                        disabled={loading || !formData.agreement}
                                        className={`w-full py-5 bg-[#1B5E20] text-white rounded-2xl font-black text-xl transition-all shadow-xl shadow-[#1B5E20]/20 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 ${loading || !formData.agreement ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-[#000D0F]'}`}
                                    >
                                        {loading ? <><Loader2 className="animate-spin w-6 h-6" /> {t.analyzingBtn}</> : <>{t.analyze} <ArrowRight className="w-6 h-6" /></>}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sub-step Controls (Only for steps before final) */}
                    {subStep < totalSubSteps && (
                        <div className="mt-16 flex justify-end">
                            <button
                                onClick={handleNext}
                                className="px-12 py-4 bg-[#1B5E20] text-white rounded-2xl font-bold text-lg hover:bg-[#000D0F] transition-all shadow-lg hover:shadow-[#1B5E20]/20 flex items-center gap-2 group"
                            >
                                Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}
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
