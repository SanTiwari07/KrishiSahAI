import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../src/services/api';
import { ArrowLeft, Download, CheckCircle, AlertTriangle, TrendingUp, Users, Calendar, Shield, Loader2, Share2 } from 'lucide-react';
import { auth } from '../firebase';
import { useLanguage } from '../src/context/LanguageContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    phases?: any[]; // Backward compatibility
    labor_analysis: string;
    sustainability_plan: string;
    resilience_strategy: string;
    verdict: string;
    disclaimer?: string;
}

const Roadmap: React.FC = () => {
    const { businessName } = useParams<{ businessName: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { t, language: lang } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
    const [error, setError] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    // Decode businessName if it was encoded in URL
    const decodedName = decodeURIComponent(businessName || '');

    useEffect(() => {
        const fetchRoadmap = async () => {
            if (!decodedName) return;

            // Check if we already have roadmap data in state (from a previous generation or navigation)
            if (location.state?.roadmap) {
                setRoadmap(location.state.roadmap);
                setLoading(false);
                return;
            }

            try {
                const response = await api.generateRoadmap(decodedName, lang);
                if (response.success && response.roadmap) {
                    setRoadmap(response.roadmap);
                } else {
                    setError("Failed to generate roadmap.");
                }
            } catch (err: any) {
                console.error("Roadmap Error:", err);
                setError(err.message || "An error occurred while generating the roadmap.");
            } finally {
                setLoading(false);
            }
        };

        fetchRoadmap();
    }, [decodedName, location.state]);

    const handleDownloadPDF = async () => {
        if (!roadmap) return;

        setLoading(true); // Show loader during PDF generation
        try {
            // Updated to use server-side generation for better quality and full content
            const token = await auth.currentUser?.getIdToken();
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${API_BASE_URL}/generate-roadmap-pdf`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    roadmap: roadmap,
                    businessName: decodedName
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to generate PDF');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `KrishiSahAI_Planner_${decodedName.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (err) {
            console.error("PDF Export error:", err);
            alert("Failed to export PDF. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-16 h-16 text-[#1B5E20] animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-[#1E1E1E]">{t.generatingRoadmap}</h2>
                <p className="text-[#555555] mt-2">{t.analyzingRoadmap}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-[#1E1E1E] mb-2">{t.analysisFailed}</h2>
                <p className="text-red-500 mb-6 text-center max-w-md">{error}</p>
                <button
                    onClick={() => navigate('/advisory')}
                    className="px-6 py-3 bg-[#1B5E20] text-white rounded-xl font-bold hover:bg-[#000D0F] transition-all"
                >
                    {t.returnToAdvisory}
                </button>
            </div>
        );
    }

    if (!roadmap) return null;

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header Actions */}
                <div className="flex items-center justify-between mb-8 no-print">
                    <button
                        onClick={() => {
                            if (location.state?.previousState) {
                                navigate('/advisory', { state: location.state.previousState });
                            } else {
                                navigate('/advisory');
                            }
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-deep-green text-white font-bold hover:bg-deep-green/90 transition-all shadow-md uppercase tracking-wider"
                    >
                        <ArrowLeft className="w-5 h-5" /> {t.backToAdvisory}
                    </button>
                </div>

                {/* Printable Content */}
                <div ref={contentRef} className="bg-white rounded-[32px] border border-[#E6E6E6] p-8 md:p-12 shadow-xl">

                    {/* Title Section */}
                    <div className="mb-10 text-center border-b border-gray-100 pb-8">
                        <div className="inline-flex items-center justify-center p-3 bg-[#E6F4EA] rounded-full mb-4">
                            <TrendingUp className="w-8 h-8 text-[#1B5E20]" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1E1E1E] mb-4">{roadmap.title}</h1>
                        <div className="text-[#555555] text-lg max-w-3xl mx-auto leading-relaxed">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    strong: ({ node, ...props }) => <span className="font-extrabold text-[#1E1E1E]" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1 text-left inline-block" {...props} />,
                                    li: ({ node, ...props }) => <li className="mb-1" {...props} />
                                }}
                            >
                                {roadmap.overview}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Verdict Banner */}
                    <div className="mb-10 bg-[#E8F5E9] border-l-4 border-[#1B5E20] p-8 rounded-r-xl">
                        <h3 className="text-sm font-bold text-[#1B5E20] uppercase tracking-widest mb-3">5. {t.strategicVerdict}</h3>
                        <div className="text-xl font-bold text-[#1E1E1E] prose prose-green max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap.verdict}</ReactMarkdown>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Labor Projection */}
                        <div className="bg-white border-2 border-[#E6E6E6] rounded-2xl p-8 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-6">
                                <Users className="w-8 h-8 text-[#1B5E20]" />
                                <h3 className="text-xl font-extrabold text-[#1E1E1E] uppercase tracking-tight">2. {t.laborAging}</h3>
                            </div>
                            <div className="text-[#555555] leading-relaxed font-medium prose prose-green max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap.labor_analysis}</ReactMarkdown>
                            </div>
                        </div>

                        {/* Sustainability */}
                        <div className="bg-white border-2 border-[#E6E6E6] rounded-2xl p-8 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-6">
                                <Shield className="w-8 h-8 text-[#1B5E20]" />
                                <h3 className="text-xl font-extrabold text-[#1E1E1E] uppercase tracking-tight">3. {t.succession}</h3>
                            </div>
                            <div className="text-[#555555] leading-relaxed font-medium prose prose-green max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap.sustainability_plan}</ReactMarkdown>
                            </div>
                        </div>

                        {/* Resilience */}
                        <div className="bg-white border-2 border-[#E6E6E6] rounded-2xl p-8 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-6">
                                <AlertTriangle className="w-8 h-8 text-[#1B5E20]" />
                                <h3 className="text-xl font-extrabold text-[#1E1E1E] uppercase tracking-tight">4. {t.financialResilience}</h3>
                            </div>
                            <div className="text-[#555555] leading-relaxed font-medium prose prose-green max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap.resilience_strategy}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 10-Year Plan Section */}
                <div className="mt-12 mb-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-[#1B5E20]" />
                            <h2 className="text-3xl font-extrabold text-[#1E1E1E] uppercase tracking-tight">1. {t.strategicTimeline}</h2>
                        </div>
                        <button
                            onClick={handleDownloadPDF}
                            className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-deep-green text-deep-green font-bold hover:bg-deep-green hover:text-white transition-all shadow-sm uppercase tracking-wider"
                        >
                            <Download className="w-5 h-5" /> {t.exportPlan}
                        </button>
                    </div>

                    <div className="space-y-8">
                        {roadmap.years ? (
                            roadmap.years.map((year, idx) => (
                                <div key={idx} className="bg-white border-2 border-[#E6E6E6] p-8 shadow-sm relative overflow-hidden group hover:border-deep-green transition-colors">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-deep-green"></div>
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                        <div className="flex-grow">
                                            <h3 className="text-2xl font-extrabold text-deep-green mb-4 uppercase tracking-tighter">
                                                {year.year}: {year.goal}
                                            </h3>

                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-xs font-bold text-[#1B5E20] uppercase tracking-widest mb-1">Strategic Focus</h4>
                                                    <p className="text-[#333] font-bold text-lg">{year.focus}</p>
                                                </div>

                                                <div>
                                                    <h4 className="text-xs font-bold text-[#1B5E20] uppercase tracking-widest mb-2">Key Actions</h4>
                                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {year.actions?.map((action, aIdx) => (
                                                            <li key={aIdx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                                <CheckCircle className="w-5 h-5 text-deep-green flex-shrink-0" />
                                                                <span className="text-sm font-bold text-[#555]">{action}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Profit Badge */}
                                        <div className="flex-shrink-0 md:text-right">
                                            <div className="inline-block bg-[#E8F5E9] border-2 border-deep-green/20 p-4 rounded-2xl">
                                                <p className="text-[10px] font-bold text-deep-green uppercase tracking-[0.2em] mb-1">Expected Profit</p>
                                                <p className="text-2xl font-black text-deep-green">{year.profit}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : roadmap.phases ? (
                            <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
                                <p className="text-amber-800 font-bold mb-2">Legacy Roadmap Format Detected</p>
                                <p className="text-amber-700 text-sm">This roadmap was generated using an older version of the planner. Please re-generate your roadmap for the full 10-year Year-wise experience.</p>
                                <div className="mt-4">
                                    <button
                                        onClick={() => navigate('/advisory')}
                                        className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold text-sm hover:bg-amber-700 transition-colors"
                                    >
                                        Back to Advisory
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 opacity-50">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                <p>No yearly plan data found.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Interaction Button - Fixed at bottom center */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex gap-4 no-print">
                <button
                    onClick={() => {
                        const profileSummary = `Budget: ${roadmap.years[0]?.profit || 'N/A'}, Experience: High, Market Access: Village only, Risk Preference: Safe income`;
                        const comprehensivePrompt = `I want a comprehensive 10-Year Sustainability & Profit Planner for starting a ${decodedName} business.

Please analyze my profile and generate a high-accuracy report with these specific sections:

1. 10-Year Growth & Profit Planner
Provide a Year-wise (Year 1 to Year 10) breakdown. Format each year as a clear block with:
Year X: [Main Goal]
Strategic Focus: What is the primary objective?
Key Actions: 2-3 specific, actionable steps.
Expected Profit: Realistic annual profit projection in ₹.

2. Labor & Aging Analysis
How labor requirements will shift as I age. Include automation triggers for years 4, 7, and 10.

3. Sustainability & Succession
A plan for multi-generational wealth transfer and soil/resource health.

4. Financial Resilience
How to handle 1 "bad year" (drought/pest) during Phase 1 vs Phase 3.

5. Final Verdict
Feasibility score and long-term ROI.

DISCLAIMER: This roadmap is an AI-generated simulation... [rest of disclaimer]

Farmer Details:
${profileSummary}

Format: Please use Markdown with headers and bold text for a professional "Planner" look. STRICTLY NO EMOJIS. Ensure the Disclaimer is clearly visible at the end.`;

                        navigate('/chat', {
                            state: {
                                initialMessage: comprehensivePrompt,
                                isRoadmapPlanner: true,
                                businessName: decodedName,
                                previousState: { roadmap }
                            }
                        });
                    }}
                    className="flex items-center gap-3 px-10 py-5 bg-[#1B5E20] text-white font-black rounded-full shadow-2xl hover:bg-[#000D0F] hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em] border-4 border-white/20 text-sm"
                >
                    <Users className="w-6 h-6" /> {t.askChatbotBtn}
                </button>
            </div>

            {/* Padding for fixed button */}
            <div className="h-40"></div>

            <div className="max-w-5xl mx-auto">
                {/* Disclaimer */}
                <div className="mt-12 p-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-[32px] text-center">
                    <p className="text-xs text-gray-600 leading-relaxed uppercase tracking-widest font-bold">
                        {t.disclaimer}: {roadmap.disclaimer || t.disclaimerText}
                    </p>
                </div>
            </div>
        </div >
    );
};

export default Roadmap;
