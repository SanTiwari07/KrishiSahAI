import React, { useState, useEffect } from 'react';
import { useLanguage } from '../src/context/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../src/services/api';
import { Sprout, Upload, MessageCircle, ArrowLeft, Loader2 } from 'lucide-react';
import DetectionHistorySidebar, { getDetectionHistory, saveDetectionHistory, clearDetectionHistory, type DetectionEntry } from '../components/DetectionHistorySidebar';
import { useLoadingTips } from '../src/hooks/useLoadingTips';

const DiseaseDetector: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    // Recover from history (Crop Care sidebar or in-page history)
    useEffect(() => {
        if (location.state?.historyItem) {
            const item = location.state.historyItem as DetectionEntry;
            const d = item.details || {};
            setDiseaseResult({
                disease: item.name,
                confidence: item.confidence,
                ...(typeof d === 'object' ? d : {}),
            });
            if (item.preview) setDiseasePreview(item.preview);
        }
    }, [location.state]);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [history, setHistory] = useState(getDetectionHistory('disease'));

    // Disease Detector State
    const [diseaseFile, setDiseaseFile] = useState<File | null>(null);
    const [diseasePreview, setDiseasePreview] = useState<string | null>(null);
    const [diseaseLoading, setDiseaseLoading] = useState(false);
    const [diseaseResult, setDiseaseResult] = useState<any | null>(null);
    const [diseaseError, setDiseaseError] = useState<string | null>(null);
    const loadingTip = useLoadingTips(diseaseLoading);

    // Listen for toggle-sidebar event
    useEffect(() => {
        const handleToggle = () => setIsSidebarOpen(prev => !prev);
        window.addEventListener('toggle-sidebar', (handleToggle as EventListener));
        return () => window.removeEventListener('toggle-sidebar', (handleToggle as EventListener));
    }, []);

    // Disease Detector Handlers
    const handleDiseaseFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setDiseaseFile(file);
            setDiseasePreview(URL.createObjectURL(file));
            setDiseaseResult(null);
            setDiseaseError(null);
        }
    };

    const handleDiseaseUpload = async () => {
        if (!diseaseFile) return;

        setDiseaseLoading(true);
        setDiseaseError(null);

        try {
            const formData = new FormData();
            formData.append('image', diseaseFile);
            const data = await api.detectDisease(formData);
            if (!data?.success || !data?.result) {
                throw new Error(data?.error || 'Detection failed');
            }
            const r = data.result;
            const next = {
                disease: r.disease,
                crop: r.crop,
                confidence: r.confidence,
                treatment: Array.isArray(r.treatment) ? r.treatment : [],
                severity: r.severity,
                pathogen: r.pathogen ?? null,
                raw_class_label: r.raw_class_label ?? null,
                description: r.description ?? null,
            };
            setDiseaseResult(next);
            const updated = saveDetectionHistory('disease', {
                type: 'disease',
                name: next.disease,
                confidence: next.confidence,
                preview: diseasePreview || undefined,
                details: {
                    crop: next.crop,
                    treatment: next.treatment,
                    severity: next.severity,
                    pathogen: next.pathogen,
                    raw_class_label: next.raw_class_label,
                    description: next.description,
                },
            });
            setHistory(updated);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Detection failed';
            setDiseaseError(msg);
            setDiseaseResult(null);
        } finally {
            setDiseaseLoading(false);
        }
    };

    const handleDiseaseAskChatbot = () => {
        if (!diseaseResult) return;
        const initialMessage = `I found ${diseaseResult.disease} in my ${diseaseResult.crop}. ${diseaseResult.treatment ? 'Recommended treatment involves: ' + diseaseResult.treatment.join(', ') : ''}. Can you tell me more about this disease and how to prevent it?`;

        navigate('/chat', {
            state: {
                initialMessage,
                fromCropCare: true,
                previousState: { result: diseaseResult, preview: diseasePreview, selectedFile: diseaseFile }
            }
        });
    };

    const handleHistorySelect = (entry: DetectionEntry) => {
        const d = entry.details || {};
        setDiseaseResult({
            disease: entry.name,
            confidence: entry.confidence,
            ...(typeof d === 'object' ? d : {}),
        });
        if (entry.preview) setDiseasePreview(entry.preview);
        setIsSidebarOpen(false);
    };

    const handleClearHistory = () => {
        clearDetectionHistory('disease');
        setHistory([]);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <DetectionHistorySidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                type="disease"
                entries={history}
                onSelect={handleHistorySelect}
                onClear={handleClearHistory}
            />
            <div className="relative">

            <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
                <div className="mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E6E6E6] text-deep-green font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        {t.back || "Back"}
                    </button>
                </div>

                <div className="bg-white border-2 border-[#E6E6E6] p-8 hover:border-deep-green transition-all shadow-sm rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-light-green text-deep-green flex items-center justify-center font-bold rounded-xl">
                            <Sprout className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-deep-green uppercase tracking-tight">{t.diseaseDetector}</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="border-2 border-dashed border-gray-300 p-8 hover:border-deep-green transition-colors cursor-pointer relative bg-gray-50 text-center rounded-xl">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleDiseaseFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {diseasePreview ? (
                                <img src={diseasePreview} alt="Preview" className="max-h-64 mx-auto shadow-md rounded-lg" />
                            ) : (
                                <div className="text-gray-500 flex flex-col items-center">
                                    <Upload className="w-10 h-10 mb-2 text-gray-400" />
                                    <p className="font-semibold">{t.uploadPrompt}</p>
                                    <p className="text-sm">{t.supportedFormats}</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleDiseaseUpload}
                            disabled={!diseaseFile || diseaseLoading}
                            className={`w-full py-4 font-bold text-white transition-all uppercase tracking-wider rounded-2xl ${!diseaseFile || diseaseLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-deep-green hover:bg-deep-green/90 shadow-lg'
                                }`}
                        >
                            {diseaseLoading ? t.analyzingBtn : t.detectDisease}
                        </button>

                        {diseaseLoading && (
                            <div className="bg-[#E8F5E9] p-4 rounded-xl border border-deep-green/20 animate-in fade-in zoom-in text-center mt-4">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Loader2 className="w-5 h-5 text-deep-green animate-spin" />
                                    <span className="font-bold text-deep-green">{t.analyzingBtn}...</span>
                                </div>
                                <p className="text-sm font-medium italic text-deep-green/80">"{loadingTip}"</p>
                            </div>
                        )}

                        {diseaseError && (
                            <div className="p-4 bg-red-50 text-red-600 border border-red-100 font-medium rounded-lg">
                                {diseaseError}
                            </div>
                        )}

                        {diseaseResult && (
                            <div className="bg-[#E8F5E9] p-6 border border-deep-green rounded-xl">
                                <h3 className="text-xl font-bold text-deep-green mb-4 uppercase">{t.analysisResult}</h3>
                                <div className="space-y-3 text-deep-green">
                                    {diseaseResult.crop != null && diseaseResult.crop !== '' && (
                                        <p><span className="font-bold">{t.labelCrop}:</span> {diseaseResult.crop}</p>
                                    )}
                                    <p><span className="font-bold">{t.labelDisease}:</span> {diseaseResult.disease}</p>
                                    <p><span className="font-bold">{t.labelConfidence}:</span> {(diseaseResult.confidence * 100).toFixed(1)}%</p>
                                    {diseaseResult.severity != null && (
                                        <p><span className="font-bold">{t.labelSeverity}:</span> <span className="capitalize">{diseaseResult.severity}</span></p>
                                    )}
                                    {diseaseResult.pathogen != null && diseaseResult.pathogen !== '' && (
                                        <p><span className="font-bold">{t.labelPathogen}:</span> {diseaseResult.pathogen}</p>
                                    )}
                                    {diseaseResult.description != null && diseaseResult.description !== '' && (
                                        <p className="text-sm text-deep-green/90 border-t border-deep-green/15 pt-3 mt-1">{diseaseResult.description}</p>
                                    )}
                                    {diseaseResult.raw_class_label != null && diseaseResult.raw_class_label !== '' && (
                                        <p className="text-xs text-deep-green/70 font-mono break-all">Model class: {diseaseResult.raw_class_label}</p>
                                    )}

                                    {diseaseResult.treatment && (
                                        <div className="mt-4 pt-4 border-t border-deep-green/20">
                                            <h4 className="font-bold mb-2 uppercase text-sm tracking-wide">{t.labelTreatment}:</h4>
                                            <ul className="list-disc list-inside space-y-1">
                                                {diseaseResult.treatment.map((treatment: string, index: number) => (
                                                    <li key={index}>{treatment}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleDiseaseAskChatbot}
                                        className="w-full mt-6 py-3 bg-white border-2 border-deep-green text-deep-green font-bold hover:bg-deep-green hover:text-white transition-all flex items-center justify-center gap-2 uppercase tracking-wider rounded-2xl"
                                    >
                                        <MessageCircle className="w-5 h-5" /> {t.askChatbotBtn}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
};

export default DiseaseDetector;
