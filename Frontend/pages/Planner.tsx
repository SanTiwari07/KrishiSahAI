import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../src/services/api';
import { ArrowLeft, Download, CheckCircle, AlertTriangle, TrendingUp, Users, Calendar, Shield, Loader2 } from 'lucide-react';
import { auth } from '../firebase';
import { useLanguage } from '../src/context/LanguageContext';
import { useFarm } from '../src/context/FarmContext';
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
    labor_analysis: string;
    sustainability_plan: string;
    resilience_strategy: string;
    verdict: string;
    disclaimer?: string;
}

const Planner: React.FC = () => {
    const navigate = useNavigate();
    const { t, language: lang } = useLanguage();
    const { activeFarm } = useFarm();
    const [loading, setLoading] = useState(true);
    const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
    const [error, setError] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    const cropName = activeFarm?.crops?.[0] || '';

    useEffect(() => {
        const fetchCropRoadmap = async () => {
            if (!cropName) {
                setError("No crop found in your active farm. Please add a crop to use the planner.");
                setLoading(false);
                return;
            }

            try {
                const response = await api.generateCropRoadmap(cropName, lang);
                if (response.success && response.roadmap) {
                    setRoadmap(response.roadmap);
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
    }, [cropName, lang]);

    const handleDownloadPDF = async () => {
        if (!roadmap) return;

        setLoading(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch('http://localhost:5000/api/generate-roadmap-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    roadmap: roadmap,
                    businessName: cropName,
                    isCrop: true
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
            link.download = `KrishiSahAI_CropPlanner_${cropName.replace(/\s+/g, '_')}.pdf`;
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
                <h2 className="text-2xl font-bold text-[#1E1E1E]">{t.generatingRoadmap || 'Generating Plan...'}</h2>
                <p className="text-[#555555] mt-2">{t.analyzingRoadmap || 'Analyzing crop lifecycle...'}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
                <h2 className="text-2xl font-bold text-[#1E1E1E] mb-2">Planner Error</h2>
                <p className="text-gray-500 mb-6 max-w-md">{error}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-[#1B5E20] text-white rounded-xl font-bold hover:bg-green-800 transition-all"
                >
                    Return Home
                </button>
            </div>
        );
    }

    if (!roadmap) return null;

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-6 py-3 bg-deep-green text-white font-bold hover:bg-deep-green/90 transition-all shadow-md uppercase tracking-wider"
                    >
                        <ArrowLeft className="w-5 h-5" /> {t.backToHome || 'Back to Home'}
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-deep-green text-deep-green font-bold hover:bg-deep-green hover:text-white transition-all shadow-sm uppercase tracking-wider"
                    >
                        <Download className="w-5 h-5" /> {t.exportPlan || 'Export Plan'}
                    </button>
                </div>

                <div ref={contentRef} className="bg-white rounded-[32px] border border-[#E6E6E6] p-8 md:p-12 shadow-xl">
                    <div className="mb-10 text-center border-b border-gray-100 pb-8">
                        <div className="inline-flex items-center justify-center p-3 bg-[#E6F4EA] rounded-full mb-4">
                            <Calendar className="w-8 h-8 text-[#1B5E20]" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1E1E1E] mb-4">{roadmap.title}</h1>
                        <div className="text-[#555555] text-lg max-w-3xl mx-auto leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap.overview}</ReactMarkdown>
                        </div>
                    </div>

                    <div className="mb-10 bg-[#E8F5E9] border-l-4 border-[#1B5E20] p-8 rounded-r-xl">
                        <h3 className="text-sm font-bold text-[#1B5E20] uppercase tracking-widest mb-3">5. Final Harvest Verdict</h3>
                        <div className="text-xl font-bold text-[#1E1E1E] prose prose-green max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap.verdict}</ReactMarkdown>
                        </div>
                    </div>

                    <div className="space-y-8 mb-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white border-2 border-[#E6E6E6] rounded-2xl p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <Users className="w-6 h-6 text-[#1B5E20]" />
                                    <h3 className="text-lg font-extrabold text-[#1E1E1E]">2. Resources</h3>
                                </div>
                                <div className="text-sm text-[#555555] leading-relaxed prose prose-green max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap.labor_analysis}</ReactMarkdown>
                                </div>
                            </div>

                            <div className="bg-white border-2 border-[#E6E6E6] rounded-2xl p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <Shield className="w-6 h-6 text-[#1B5E20]" />
                                    <h3 className="text-lg font-extrabold text-[#1E1E1E]">3. Quality</h3>
                                </div>
                                <div className="text-sm text-[#555555] leading-relaxed prose prose-green max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap.sustainability_plan}</ReactMarkdown>
                                </div>
                            </div>

                            <div className="bg-white border-2 border-[#E6E6E6] rounded-2xl p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertTriangle className="w-6 h-6 text-[#1B5E20]" />
                                    <h3 className="text-lg font-extrabold text-[#1E1E1E]">4. Risks</h3>
                                </div>
                                <div className="text-sm text-[#555555] leading-relaxed prose prose-green max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{roadmap.resilience_strategy}</ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12">
                        <div className="flex items-center gap-3 mb-8">
                            <TrendingUp className="w-8 h-8 text-[#1B5E20]" />
                            <h2 className="text-3xl font-extrabold text-[#1E1E1E] uppercase tracking-tight">1. Crop Lifecycle Timeline</h2>
                        </div>

                        <div className="space-y-8">
                            {roadmap.years?.map((year, idx) => (
                                <div key={idx} className="bg-white border-2 border-[#E6E6E6] p-8 shadow-sm relative overflow-hidden group hover:border-deep-green transition-colors">
                                    <div className="absolute top-0 left-0 w-2 h-full bg-deep-green"></div>
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                        <div className="flex-grow">
                                            <h3 className="text-2xl font-extrabold text-deep-green mb-4 uppercase tracking-tighter">
                                                {year.year}: {year.goal}
                                            </h3>

                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="text-xs font-bold text-[#1B5E20] uppercase tracking-widest mb-1">Critical Focus</h4>
                                                    <p className="text-[#333] font-bold text-lg">{year.focus}</p>
                                                </div>

                                                <div>
                                                    <h4 className="text-xs font-bold text-[#1B5E20] uppercase tracking-widest mb-2">Required Actions</h4>
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

                                        <div className="flex-shrink-0 md:text-right">
                                            <div className="inline-block bg-[#E8F5E9] border-2 border-deep-green/20 p-4 rounded-2xl">
                                                <p className="text-[10px] font-bold text-deep-green uppercase tracking-[0.2em] mb-1">Projected Yield</p>
                                                <p className="text-2xl font-black text-deep-green">{year.profit}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-12 p-8 bg-gray-100 border-2 border-dashed border-gray-300 rounded-[32px] text-center">
                        <p className="text-xs text-gray-600 leading-relaxed uppercase tracking-widest font-bold">
                            {t.disclaimer || 'Disclaimer'}: {roadmap.disclaimer || 'This crop plan is AI-generated and should be verified with local agricultural conditions.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Planner;
