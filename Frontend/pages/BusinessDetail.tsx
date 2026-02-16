import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Briefcase, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../src/i18n/translations';
import { api } from '../services/api';

interface BusinessDetail {
    id: string;
    title: string;
    description: string;
    investment: string;
    profit: string;
    requirements: string[];
    risk_factors: string[];
    market_demand: string;
    market_demand_analysis?: string; // New field
    timeline?: string;
    implementation_steps?: string[];
}

const BusinessDetail: React.FC<{ lang: Language }> = ({ lang }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const t = translations[lang];
    const [business, setBusiness] = useState<BusinessDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, fetch from API. For now, use state if passed, or mock/fetch.
        // We'll simulate fetching or use location state if available.
        const stateData = location.state as { business: BusinessDetail } | null;

        if (stateData?.business) {
            setBusiness(stateData.business);
            setLoading(false);
        } else {
            // Simulate API call or fallback
            // For prototype, we might just show a generic detail if not passed in state, 
            // or redirect back to advisory if we can't load it.
            // Let's mock it for resilience.
            setBusiness({
                id: id || 'unknown',
                title: `Business Opportunity: ${id}`,
                description: "Detailed analysis of this business opportunity. This includes market trends, operational requirements, and financial projections. It is designed to be comprehensive and actionable for farmers looking to diversify their income.",
                investment: "₹5-10 Lakhs",
                profit: "₹50k-1L/month",
                requirements: ["Land: 2 Acres", "Water: Moderate", "Skill: Basic", "Labor: 2 Workers", "Capital: Medium"],
                risk_factors: ["Market volatility - Diversify crops", "Disease outbreaks - Regular monitoring", "Weather risks - Insurance"],
                market_demand: "High in local markets",
                market_demand_analysis: "There is a consistent high demand for this product in local mandis and urban centers. Prices peak during festival seasons.",
                timeline: "3-6 months",
                implementation_steps: ["Market Survey", "Land Preparation", "Procurement", "Planting", "Harvesting"]
            });
            setLoading(false);
        }
    }, [id, location.state]);

    const handleBack = () => {
        const stateData = location.state as any;
        if (stateData?.fromAdvisory && stateData?.previousState) {
            navigate('/advisory', { state: stateData.previousState });
        } else {
            navigate(-1);
        }
    };

    if (loading) {
        return <div className="p-10 text-center">{t.analyzingBtn}</div>;
    }

    if (!business) return <div className="p-10 text-center">{t.businessNotFound}</div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen">
            <button
                onClick={handleBack}
                className="flex items-center gap-2 text-[#555555] font-bold mb-6 hover:text-[#043744] transition-colors"
            >
                <ArrowLeft className="w-5 h-5" /> {t.backToRecs}
            </button>

            <div className="bg-white rounded-[40px] border border-[#E6E6E6] shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#043744] p-8 md:p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <Briefcase className="w-64 h-64" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold mb-6 relative z-10">{business.title}</h1>
                    <div className="text-lg opacity-90 max-w-3xl relative z-10 leading-loose whitespace-pre-line">
                        {business.description}
                    </div>

                    {business.timeline && (
                        <div className="mt-8 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold border border-white/30">
                            <TrendingUp className="w-4 h-4" />
                            <span>{t.timelineToProfit}: {business.timeline}</span>
                        </div>
                    )}
                </div>

                <div className="p-8 md:p-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div className="bg-[#FAFAF7] p-6 rounded-3xl border border-[#E6E6E6]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <DollarSign className="w-6 h-6 text-[#043744]" />
                                </div>
                                <h3 className="text-lg font-bold text-[#1E1E1E]">{t.financials}</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                    <span className="text-[#555555] font-medium">{t.initialInvestment}</span>
                                    <span className="text-[#1E1E1E] font-bold">{business.investment}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                    <span className="text-[#555555] font-medium">{t.monthlyProfit}</span>
                                    <span className="text-[#043744] font-bold">{business.profit}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#FAFAF7] p-6 rounded-3xl border border-[#E6E6E6]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
                                </div>
                                <h3 className="text-lg font-bold text-[#1E1E1E]">{t.risksMarket}</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-bold text-[#555555]">{t.marketDemand}:</p>
                                    <p className="text-[#1E1E1E] font-medium">{business.market_demand}</p>
                                    {business.market_demand_analysis && (
                                        <p className="text-sm text-[#555555] mt-1 italic">{business.market_demand_analysis}</p>
                                    )}
                                </div>

                                <div>
                                    <p className="text-sm font-bold text-[#555555] mb-1">{t.keyRisks}:</p>
                                    <ul className="list-disc pl-5 text-sm text-[#555555] space-y-1">
                                        {business.risk_factors.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-2xl font-bold text-[#1E1E1E] mb-6">{t.requirements}</h3>
                            <div className="flex flex-wrap gap-3">
                                {business.requirements.map((req, i) => (
                                    <span key={i} className="px-4 py-3 bg-white border border-[#E6E6E6] rounded-xl text-[#555555] font-bold shadow-sm">
                                        {req}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {business.implementation_steps && (
                            <div>
                                <h3 className="text-2xl font-bold text-[#1E1E1E] mb-6">{t.stepsToStart}</h3>
                                <div className="space-y-3">
                                    {business.implementation_steps.map((step, i) => (
                                        <div key={i} className="flex gap-3">
                                            <div className="w-6 h-6 rounded-full bg-[#043744] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                                {i + 1}
                                            </div>
                                            <p className="text-[#555555] font-medium">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusinessDetail;
