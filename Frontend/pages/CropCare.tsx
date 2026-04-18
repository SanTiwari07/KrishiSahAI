import React, { useState, useEffect } from 'react';
import { useLanguage } from '../src/context/LanguageContext';
import { useFarm } from '../src/context/FarmContext';
import { normalizeValue } from '../src/utils/localizationUtils';
import { useNavigate } from 'react-router-dom';
import { Sprout, Bug, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import DetectionHistorySidebar, { getDetectionHistory, clearDetectionHistory } from '../components/DetectionHistorySidebar';

const CropCare: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { activeFarm } = useFarm();

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [globalSelectedCrop, setGlobalSelectedCrop] = useState<string | null>(null);

    const availableCrops = activeFarm?.crops 
        ? [...new Set(activeFarm.crops.map((c: string) => normalizeValue(c, 'crops')))] 
        : [];

    useEffect(() => {
        const handleCropChange = (e: any) => {
             setGlobalSelectedCrop(e.detail);
        };
        window.addEventListener('global-crop-changed', handleCropChange);

        const saved = localStorage.getItem('global_selected_crop');
        if (saved && availableCrops.includes(saved)) {
            setGlobalSelectedCrop(saved);
        } else if (availableCrops.length > 0) {
            setGlobalSelectedCrop(availableCrops[0]);
        }

        return () => window.removeEventListener('global-crop-changed', handleCropChange);
    }, [activeFarm]);

    useEffect(() => {
        // Load combined history
        const diseaseHistory = getDetectionHistory('disease');
        const pestHistory = getDetectionHistory('pest');
        const combined = [...diseaseHistory, ...pestHistory].sort((a, b) => b.timestamp - a.timestamp);
        setHistory(combined);
    }, [isSidebarOpen]);

    // Listen for toggle-sidebar event
    useEffect(() => {
        const handleToggle = () => setIsSidebarOpen(prev => !prev);
        window.addEventListener('toggle-sidebar', (handleToggle as EventListener));
        return () => window.removeEventListener('toggle-sidebar', (handleToggle as EventListener));
    }, []);

    const handleHistorySelect = (entry: any) => {
        setIsSidebarOpen(false);
        if (entry.type === 'disease') {
            navigate('/crop-care/disease');
        } else {
            navigate('/crop-care/pest');
        }
    };

    const handleClearHistory = () => {
        clearDetectionHistory('disease');
        clearDetectionHistory('pest');
        setHistory([]);
    };

    return (
        <React.Fragment>
        <DetectionHistorySidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            type="aggregate"
            entries={history}
            onSelect={handleHistorySelect}
            onClear={handleClearHistory}
        />
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32 relative">
            <div className="mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E6E6E6] text-[#1B5E20] font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    {t.back || "Back"}
                </button>
            </div>

            <div className="mb-12 text-center border-b-4 border-deep-green pb-6">
                <h1 className="text-4xl md:text-5xl font-extrabold text-deep-green tracking-tight mb-4 uppercase">
                    {t.cropCareTitle}
                </h1>
                <p className="text-text-secondary font-medium max-w-2xl mx-auto text-lg mb-2">
                    {t.cropCareSubtitle}
                </p>
                {globalSelectedCrop && (
                     <div className="inline-flex items-center gap-2 bg-[#E8F5E9] border border-[#2E7D32]/20 px-5 py-2.5 rounded-full mt-4 shadow-sm">
                         <Sprout size={18} className="text-[#1B5E20]" />
                         <span className="text-sm font-bold text-[#1B5E20] uppercase tracking-widest">
                             Active Crop: {globalSelectedCrop}
                         </span>
                     </div>
                 )}
            </div>

            {/* Forecast Hero Card — Full Width */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-8"
            >
                <div className="bg-gradient-to-br from-[#1B5E20] to-[#004D40] border-2 border-[#2E7D32]/50 p-8 md:p-10 shadow-2xl rounded-3xl flex flex-col md:flex-row items-center gap-8 group cursor-pointer hover:shadow-[0_20px_50px_rgba(27,94,32,0.3)] transition-all duration-500 relative overflow-hidden"
                    onClick={() => navigate('/crop-care/forecast')}
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                    
                    <motion.div 
                        whileHover={{ rotate: 10, scale: 1.1 }}
                        className="w-24 h-24 bg-gradient-to-br from-green-400/20 to-white/10 text-green-300 flex items-center justify-center font-bold rounded-3xl flex-shrink-0 border border-white/20 shadow-inner"
                    >
                        <ShieldCheck className="w-12 h-12" />
                    </motion.div>
                    <div className="flex-1 text-center md:text-left z-10">
                        <h2 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tight mb-3">
                            {(t as any).forecast?.title || "Pest & Disease Forecast"}
                        </h2>
                        <p className="text-green-50 font-medium text-lg max-w-2xl">
                            {(t as any).forecast?.subtitle || "AI-powered weather-based risk predictions. Know what's coming before it hits your crop."}
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        className="px-8 py-4 bg-white text-[#1B5E20] font-black rounded-2xl hover:bg-green-50 transition-all flex items-center gap-3 uppercase tracking-wider shadow-lg flex-shrink-0 z-10"
                    >
                        {(t as any).forecast?.viewForecast || "View Forecast"} <ArrowRight className="w-6 h-6" />
                    </motion.button>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Disease Detector Card */}
                <div className="bg-white border-2 border-[#E6E6E6] p-8 md:p-12 hover:border-deep-green transition-all shadow-md rounded-3xl flex flex-col items-center text-center group">
                    <div className="w-20 h-20 bg-light-green text-deep-green flex items-center justify-center font-bold rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Sprout className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-deep-green uppercase tracking-tight mb-4">{t.diseaseDetector}</h2>
                    <p className="text-gray-600 mb-8 font-medium">
                        Upload a photo of your crop to instantly identify diseases and get treatment recommendations.
                    </p>
                    <button
                        onClick={() => navigate('/crop-care/disease')}
                        className="mt-auto px-8 py-4 bg-deep-green text-white font-bold rounded-xl hover:bg-deep-green/90 transition-all flex items-center gap-2 uppercase tracking-wider shadow-lg hover:shadow-xl active:scale-95"
                    >
                        {t.getStarted || "Get Started"} <ArrowRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Pest Detector Card */}
                <div className="bg-white border-2 border-[#E6E6E6] p-8 md:p-12 hover:border-[#D97706] transition-all shadow-md rounded-3xl flex flex-col items-center text-center group">
                    <div className="w-20 h-20 bg-[#FFF4E6] text-[#D97706] flex items-center justify-center font-bold rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Bug className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-deep-green uppercase tracking-tight mb-4">{t.pestDetector}</h2>
                    <p className="text-gray-600 mb-8 font-medium">
                        Identify pests affecting your crops and receive immediate control solutions.
                    </p>
                    <button
                        onClick={() => navigate('/crop-care/pest')}
                        className="mt-auto px-8 py-4 bg-[#D97706] text-white font-bold rounded-xl hover:bg-[#B45309] transition-all flex items-center gap-2 uppercase tracking-wider shadow-lg hover:shadow-xl active:scale-95"
                    >
                        {t.getStarted || "Get Started"} <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
        </React.Fragment>
    );
};

export default CropCare;
