import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Download, CheckCircle, AlertTriangle, TrendingUp, Users, Calendar, Shield, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Language } from '../types';
import { translations } from '../src/i18n/translations';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Quarter {
    period: string;
    actions: string[];
    milestones: string[];
    financial_target: string;
}

interface Phase {
    phase: string;
    timeframe: string;
    focus: string;
    quarters: Quarter[];
    cumulative_investment?: string;
    expected_revenue?: string;
    break_even?: string;
    profit_margin?: string;
    cumulative_wealth?: string;
    passive_income?: string;
    succession_readiness?: string;
}

interface RoadmapData {
    title: string;
    overview: string;
    labor_aging_projection?: string;
    phases: Phase[];
    automation_recommendations: (string | { recommendation: string } | any)[];
    financial_resilience_strategy: string;
    risk_mitigation?: string;
    final_verdict: string;
}

const Roadmap: React.FC<{ lang: Language }> = ({ lang }) => {
    const { businessName } = useParams<{ businessName: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const t = translations[lang];
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
                const response = await api.generateRoadmap(decodedName);
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
        if (!contentRef.current || !roadmap) return;

        const element = contentRef.current;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            windowHeight: element.scrollHeight,
            windowWidth: element.scrollWidth
        });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // Calculate scaling to fit width
        const ratio = pdfWidth / imgWidth;
        const scaledHeight = imgHeight * ratio;

        let heightLeft = scaledHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;

        // Add additional pages if content is longer than one page
        while (heightLeft > 0) {
            position = heightLeft - scaledHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`KrishiSahAI_10_Year_Strategy_${decodedName.replace(/\s+/g, '_')}.pdf`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAF7]">
                <Loader2 className="w-16 h-16 text-[#043744] animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-[#1E1E1E]">{t.generatingRoadmap}</h2>
                <p className="text-[#555555] mt-2">{t.analyzingRoadmap}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAF7] p-8">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-[#1E1E1E] mb-2">{t.analysisFailed}</h2>
                <p className="text-red-500 mb-6 text-center max-w-md">{error}</p>
                <button
                    onClick={() => navigate('/advisory')}
                    className="px-6 py-3 bg-[#043744] text-white rounded-xl font-bold hover:bg-[#000D0F] transition-all"
                >
                    {t.returnToAdvisory}
                </button>
            </div>
        );
    }

    if (!roadmap) return null;

    return (
        <div className="min-h-screen bg-[#FAFAF7] p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header Actions */}
                <div className="flex items-center justify-between mb-8 no-print">
                    <button
                        onClick={() => navigate('/advisory')}
                        className="flex items-center gap-2 text-[#555555] font-bold hover:text-[#043744] transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" /> {t.backToOptions}
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-6 py-3 bg-[#043744] text-white rounded-xl font-bold hover:bg-[#000D0F] transition-all shadow-md"
                    >
                        <Download className="w-5 h-5" /> {t.downloadPDF}
                    </button>
                </div>

                {/* Printable Content */}
                <div ref={contentRef} className="bg-white rounded-[32px] border border-[#E6E6E6] p-8 md:p-12 shadow-xl">

                    {/* Title Section */}
                    <div className="mb-10 text-center border-b border-gray-100 pb-8">
                        <div className="inline-flex items-center justify-center p-3 bg-[#E6F4EA] rounded-full mb-4">
                            <TrendingUp className="w-8 h-8 text-[#043744]" />
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
                    <div className="mb-10 bg-[#FAFAF7] border-l-4 border-[#043744] p-6 rounded-r-xl">
                        <h3 className="text-sm font-bold text-[#043744] uppercase tracking-widest mb-2">{t.strategicVerdict}</h3>
                        <p className="text-xl font-bold text-[#1E1E1E]">{roadmap.final_verdict}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        {/* Labor Projection */}
                        {roadmap.labor_aging_projection && (
                            <div className="bg-white border border-[#E6E6E6] rounded-2xl p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <Users className="w-6 h-6 text-[#3B82F6]" />
                                    <h3 className="text-lg font-bold text-[#1E1E1E]">{t.laborAging}</h3>
                                </div>
                                <p className="text-[#555555] leading-relaxed text-sm">{roadmap.labor_aging_projection}</p>
                            </div>
                        )}
                    </div>

                    {/* Financial Resilience */}
                    <div className="bg-white border border-[#E6E6E6] rounded-2xl p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="w-6 h-6 text-[#EAB308]" />
                            <h3 className="text-lg font-bold text-[#1E1E1E]">{t.financialResilience}</h3>
                        </div>
                        <p className="text-[#555555] leading-relaxed text-sm">{roadmap.financial_resilience_strategy}</p>
                    </div>

                    {/* Risk Mitigation (if available) */}
                    {roadmap.risk_mitigation && (
                        <div className="bg-white border border-[#E6E6E6] rounded-2xl p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-4">
                                <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
                                <h3 className="text-lg font-bold text-[#1E1E1E]">{t.riskMitigation}</h3>
                            </div>
                            <p className="text-[#555555] leading-relaxed text-sm">{roadmap.risk_mitigation}</p>
                        </div>
                    )}
                </div>

                {/* 3-Phase Timeline with Quarterly Breakdown */}
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-8">
                        <Calendar className="w-6 h-6 text-[#043744]" />
                        <h2 className="text-2xl font-bold text-[#1E1E1E]">{t.strategicTimeline}</h2>
                    </div>

                    <div className="space-y-10">
                        {roadmap.phases.map((phase, phaseIndex) => (
                            <div key={phaseIndex} className="bg-gradient-to-br from-white to-[#FAFAF7] rounded-3xl border-2 border-[#E6E6E6] p-8 shadow-lg">
                                {/* Phase Header */}
                                <div className="mb-6 border-b border-[#E6E6E6] pb-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#043744] text-white shadow-md">
                                            <span className="font-bold text-lg">{phaseIndex + 1}</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-2xl font-bold text-[#1E1E1E]">{phase.phase}</h3>
                                            <p className="text-sm text-[#555555] font-medium">{phase.timeframe}</p>
                                        </div>
                                    </div>
                                    {/* Profit Margin Card - Detailed & Centered */}
                                    <div className="mt-6 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
                                        <div className="p-3 bg-white rounded-xl shadow-sm mb-3">
                                            <TrendingUp className="w-6 h-6 text-[#1F5F4A]" />
                                        </div>
                                        <h4 className="text-sm font-bold text-[#555555] uppercase tracking-widest mb-2">{t.estimatedProfitMargin}</h4>
                                        <div className="text-3xl font-extrabold text-[#1F5F4A]">
                                            {phase.profit_margin && phase.profit_margin !== "N/A" ? phase.profit_margin : t.analyzingBtn}
                                        </div>
                                        <p className="text-xs text-[#555555] mt-2 max-w-xs mx-auto">
                                            {t.profitMarginDesc} {roadmap.title}.
                                        </p>
                                    </div>

                                    <div className="text-base font-semibold text-[#043744] mt-6 prose prose-sm max-w-none">
                                        <span className="font-bold mr-2 text-lg">{t.focus}:</span>
                                        <div className="mt-2 text-[#555555] leading-relaxed">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    strong: ({ node, ...props }) => <span className="font-extrabold text-[#043744]" {...props} />,
                                                    p: ({ node, ...props }) => <div className="mb-2" {...props} />
                                                }}
                                            >
                                                {phase.focus}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>

                                {/* Quarterly Breakdown - Only if quarters exist */}
                                {phase.quarters && phase.quarters.length > 0 ? (
                                    <div className="space-y-6 mb-6">
                                        {phase.quarters.map((quarter, qIndex) => (
                                            <div key={qIndex} className="bg-white rounded-2xl border border-[#E6E6E6] p-6 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="text-lg font-bold text-[#1E1E1E]">{quarter.period}</h4>
                                                    <span className="text-xs font-bold text-white bg-[#043744] px-3 py-1 rounded-full">
                                                        {quarter.financial_target}
                                                    </span>
                                                </div>

                                                {/* Actions */}
                                                <div className="mb-4">
                                                    <h5 className="text-sm font-bold text-[#555555] uppercase tracking-wide mb-2">{t.actions}</h5>
                                                    <ul className="space-y-2">
                                                        {quarter.actions.map((action, aIndex) => (
                                                            <li key={aIndex} className="flex items-start gap-2 text-sm text-[#555555]">
                                                                <CheckCircle className="w-4 h-4 text-[#043744] mt-0.5 flex-shrink-0" />
                                                                <span>{action}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Milestones */}
                                                <div>
                                                    <h5 className="text-sm font-bold text-[#555555] uppercase tracking-wide mb-2">{t.milestones}</h5>
                                                    <div className="space-y-2">
                                                        {quarter.milestones.map((milestone, mIndex) => (
                                                            <div key={mIndex} className="flex items-start gap-2 text-sm text-[#1E1E1E] bg-[#E6F4EA] px-3 py-2 rounded-lg">
                                                                <TrendingUp className="w-4 h-4 text-[#043744] mt-0.5 flex-shrink-0" />
                                                                <span className="font-medium">{milestone}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="mb-6 p-6 bg-amber-50 border border-amber-200 rounded-xl">
                                        <p className="text-sm text-amber-800">
                                            {t.roadmapSimplified}
                                        </p>
                                    </div>
                                )}

                                {/* Phase Summary Metrics */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-slate-200">
                                    {phase.cumulative_investment && (
                                        <div className="text-center">
                                            <p className="text-xs text-[#555555] uppercase tracking-wide mb-1">{t.investment}</p>
                                            <p className="text-sm font-bold text-[#1E1E1E]">{phase.cumulative_investment}</p>
                                        </div>
                                    )}
                                    {phase.expected_revenue && (
                                        <div className="text-center">
                                            <p className="text-xs text-[#555555] uppercase tracking-wide mb-1">{t.revenue}</p>
                                            <p className="text-sm font-bold text-[#1E1E1E]">{phase.expected_revenue}</p>
                                        </div>
                                    )}
                                    {phase.break_even && (
                                        <div className="text-center">
                                            <p className="text-xs text-[#555555] uppercase tracking-wide mb-1">{t.breakEven}</p>
                                            <p className="text-sm font-bold text-[#1E1E1E]">{phase.break_even}</p>
                                        </div>
                                    )}
                                    {phase.profit_margin && (
                                        <div className="text-center">
                                            <p className="text-xs text-[#555555] uppercase tracking-wide mb-1">{t.profitLabel}</p>
                                            <p className="text-sm font-bold text-[#1E1E1E]">{phase.profit_margin}</p>
                                        </div>
                                    )}
                                    {phase.cumulative_wealth && (
                                        <div className="text-center">
                                            <p className="text-xs text-[#555555] uppercase tracking-wide mb-1">{t.wealth}</p>
                                            <p className="text-sm font-bold text-[#1E1E1E]">{phase.cumulative_wealth}</p>
                                        </div>
                                    )}
                                    {phase.passive_income && (
                                        <div className="text-center">
                                            <p className="text-xs text-[#555555] uppercase tracking-wide mb-1">{t.passiveIncome}</p>
                                            <p className="text-sm font-bold text-[#1E1E1E]">{phase.passive_income}</p>
                                        </div>
                                    )}
                                    {phase.succession_readiness && (
                                        <div className="text-center">
                                            <p className="text-xs text-[#555555] uppercase tracking-wide mb-1">{t.succession}</p>
                                            <p className="text-sm font-bold text-[#1E1E1E]">{phase.succession_readiness}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Automation Recommendations */}
                {roadmap.automation_recommendations && roadmap.automation_recommendations.length > 0 && (
                    <div className="bg-[#F8FAFC] rounded-2xl p-8 border border-slate-100">
                        <h3 className="text-lg font-bold text-[#1E1E1E] mb-6">{t.automation}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {roadmap.automation_recommendations.map((rec, i) => {
                                // Handle both string and object formats
                                const recText = typeof rec === 'string' ? rec : ((rec as any)?.recommendation || JSON.stringify(rec));
                                return (
                                    <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-200">
                                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                        <p className="text-sm font-medium text-[#555555]">{recText}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Disclaimer */}
                <div className="mt-12 p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
                    <p className="text-xs text-gray-500 leading-relaxed italic">
                        <strong>{t.disclaimer}:</strong> {t.disclaimerText}
                    </p>
                </div>

            </div>
        </div>
    );
};

export default Roadmap;
