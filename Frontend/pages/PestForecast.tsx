import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../src/context/LanguageContext';
import { useFarm } from '../src/context/FarmContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../src/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Loader2, AlertTriangle, ShieldCheck, CloudRain,
    Thermometer, Droplets, Calendar, ChevronRight, Bug, Sprout,
    Wind, Leaf, Shield, MessageCircle, RefreshCw
} from 'lucide-react';
import { normalizeValue } from '../src/utils/localizationUtils';
import DetectionHistorySidebar, { getDetectionHistory, clearDetectionHistory } from '../components/DetectionHistorySidebar';

import early_shoot_borer_img from '../src/assets/diseases/early_shoot_borer.png';
import top_borer_img from '../src/assets/diseases/top_borer.png';
import pyrilla_img from '../src/assets/diseases/pyrilla.png';
import red_rot_img from '../src/assets/diseases/red_rot.png';
import tikka_leaf_spot_img from '../src/assets/diseases/tikka_leaf_spot.png';
import rosette_virus_img from '../src/assets/diseases/rosette_virus.png';
import early_leaf_spot_img from '../src/assets/diseases/early_leaf_spot.png';
import alternaria_leaf_spot_img from '../src/assets/diseases/alternaria_leaf_spot.png';
import mosaic_img from '../src/assets/diseases/mosaic.png';
import yellow_leaf_img from '../src/assets/diseases/yellow_leaf.png';
import bacterial_blight_img from '../src/assets/diseases/bacterial_blight.png';
import rust_orange_img from '../src/assets/diseases/rust_orange.png';

// Types
interface RiskEntry {
    disease: string;
    risk_score: number;
    risk_level: string;
    weather_reasons: string[];
    description: string;
    ipm_actions: {
        biocontrol?: string[];
        cultural?: string[];
        botanical?: string[];
        chemical_last_resort?: string[];
    };
}

interface ForecastDay {
    date: string;
    weather: {
        temp_max: number;
        temp_min: number;
        temp_mean: number;
        humidity: number;
        rainfall_mm: number;
        condition: string;
    };
    risks: RiskEntry[];
    overall_risk_level: string;
}

interface PhaseInfo {
    crop: string;
    phase_name: string;
    phase_label: string;
    phase_index: number;
    total_phases: number;
    day_in_crop: number;
    day_in_phase: number;
    phase_total_days: number;
    phase_progress_pct: number;
    overall_progress_pct: number;
    sowing_date: string;
    source: string;
    status: string;
}

interface CalendarThreat {
    name: string;
    type: string;
    severity: string;
    note: string;
}

interface ForecastResult {
    crop: string;
    location: string;
    phase_info: PhaseInfo;
    forecast_days: ForecastDay[];
    top_alert: RiskEntry | null;
    calendar_threats: CalendarThreat[];
    upcoming_threats: CalendarThreat[];
    ipm_summary: string;
    generated_at: string;
}

const RISK_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    CRITICAL: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', dot: 'bg-red-500' },
    HIGH: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', dot: 'bg-orange-500' },
    MEDIUM: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    LOW: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500' },
    MINIMAL: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const PEST_DISEASE_IMAGES: Record<string, string> = {
    // Sugarcane
    'Early Shoot Borer': early_shoot_borer_img,
    'Top Borer': top_borer_img,
    'Pyrilla': pyrilla_img,
    'Red Rot': red_rot_img,
    'Mosaic': mosaic_img,
    'Yellow Leaf Disease': yellow_leaf_img,
    'Bacterial Blight Sugarcane': bacterial_blight_img,
    'Rust Orange': rust_orange_img,
    // Groundnut
    'Tikka Leaf Spot': tikka_leaf_spot_img,
    'Rosette Virus': rosette_virus_img,
    'Early Leaf Spot': early_leaf_spot_img,
    'Alternaria Leaf Spot': alternaria_leaf_spot_img
};

const getRiskImage = (name: string, crop: string) => {
    if (!crop) return null;
    for (const [key, url] of Object.entries(PEST_DISEASE_IMAGES)) {
        if (name.toLowerCase().includes(key.toLowerCase())) {
            return url;
        }
    }
    return null;
};

const PestForecast: React.FC = () => {
    const { t, language } = useLanguage();
    const { activeFarm } = useFarm();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [forecast, setForecast] = useState<ForecastResult | null>(null);
    const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
    const [sowingDate, setSowingDate] = useState<string>('');
    const [showSowingPrompt, setShowSowingPrompt] = useState(true);
    const [expandedDay, setExpandedDay] = useState<number>(0);
    const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        const diseaseHistory = getDetectionHistory('disease');
        const pestHistory = getDetectionHistory('pest');
        const combined = [...diseaseHistory, ...pestHistory].sort((a, b) => b.timestamp - a.timestamp);
        setHistory(combined);
    }, [isSidebarOpen]);

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

    // Initialize crop from farm & global state
    useEffect(() => {
        if (!activeFarm?.crops || activeFarm.crops.length === 0) return;
        const crops = [...new Set(activeFarm.crops.map(c => normalizeValue(c, 'crops')))];
        
        const handleCropChange = (e: any) => {
            setSelectedCrop(e.detail);
        };
        window.addEventListener('global-crop-changed', handleCropChange);

        const saved = localStorage.getItem('global_selected_crop');
        if (saved && crops.includes(saved)) {
            setSelectedCrop(saved);
        } else {
            setSelectedCrop(crops[0]);
        }
        
        return () => window.removeEventListener('global-crop-changed', handleCropChange);
    }, [activeFarm]);

    // Check localStorage for saved sowing date, clear forecast on crop switch
    useEffect(() => {
        if (selectedCrop) {
            // Reset forecast when crop changes
            setForecast(null);
            
            const saved = localStorage.getItem(`sowing_date_${selectedCrop}`);
            if (saved) {
                setSowingDate(saved);
                setShowSowingPrompt(false);
            } else {
                setSowingDate('');
                setShowSowingPrompt(true);
            }
        }
    }, [selectedCrop]);



    const fetchForecast = useCallback(async () => {
        if (!selectedCrop || !activeFarm) return;

        setLoading(true);
        setError(null);

        try {
            const location = activeFarm.district && activeFarm.state
                ? `${activeFarm.district}, ${activeFarm.state}`
                : activeFarm.state || 'Pune';

            const result = await api.post('/forecast/predict', {
                crop: selectedCrop,
                location,
                soil_type: activeFarm.soilType || 'Unknown',
                sowing_date: sowingDate || null,
                language: language.toLowerCase(),
            });

            if (result.success) {
                setForecast(result.forecast);
            } else {
                setError(result.error || 'Forecast generation failed');
            }
        } catch (err: any) {
            console.error('Forecast error:', err);
            setError(err.message || 'Failed to generate forecast');
        } finally {
            setLoading(false);
        }
    }, [selectedCrop, activeFarm, sowingDate, language]);

    // Trigger forecast automatically if sowing prompt is bypassed
    useEffect(() => {
        if (!showSowingPrompt && selectedCrop && !forecast && !loading && !error) {
            fetchForecast();
        }
    }, [showSowingPrompt, selectedCrop, forecast, loading, error, fetchForecast]);

    const handleSowingSubmit = () => {
        if (sowingDate && selectedCrop) {
            localStorage.setItem(`sowing_date_${selectedCrop}`, sowingDate);
        }
        setShowSowingPrompt(false);
        fetchForecast();
    };

    const handleSkipSowing = () => {
        setShowSowingPrompt(false);
        fetchForecast();
    };

    const getRiskColor = (level: string) => RISK_COLORS[level] || RISK_COLORS.MINIMAL;

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (d.toDateString() === today.toDateString()) return (t as any).forecast?.today || 'Today';
        if (d.toDateString() === tomorrow.toDateString()) return (t as any).forecast?.tomorrow || 'Tomorrow';
        return d.toLocaleDateString(language === 'HI' ? 'hi-IN' : language === 'MR' ? 'mr-IN' : 'en-IN', {
            weekday: 'short', day: 'numeric', month: 'short',
        });
    };
    const handleAskChatbot = () => {
        if (!forecast?.top_alert) return;
        
        // Ensure location is explicitly sent so KrishiSahAI can give region-specific proactive warnings
        const locationStr = activeFarm?.district ? ` in ${activeFarm.district} district` : '';
        const msg = `My ${forecast.crop} crop${locationStr} is at ${forecast.top_alert.risk_level} risk of ${forecast.top_alert.disease}. Weather factors: ${forecast.top_alert.weather_reasons.join(', ')}. What should I do to protect my crop?`;
        
        navigate('/chat', {
            state: { initialMessage: msg, fromCropCare: true }
        });
    };

    // ─── Missing Data State ───
    if (!activeFarm || !activeFarm.crops || activeFarm.crops.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-yellow-100 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#1E1E1E] mb-3">No Crops Found</h2>
                    <p className="text-gray-500 mb-6 font-medium">Please add crops to your farm profile to view pest and disease forecasts.</p>
                    <button
                        onClick={() => navigate('/profile/edit')}
                        className="w-full py-3 bg-[#1B5E20] text-white rounded-xl font-bold hover:bg-[#2E7D32] transition-colors"
                    >
                        Go to Farm Settings
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-3 mt-3 bg-transparent text-gray-500 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // ─── Sowing Date Prompt ───
    if (showSowingPrompt && selectedCrop) {
        return (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="min-h-screen bg-gray-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-50 to-gray-50"
            >
                <div className="max-w-lg mx-auto p-4 md:p-8 pt-12">
                    <div className="mb-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur border border-[#E6E6E6] text-[#1B5E20] font-bold rounded-xl hover:bg-white transition-all shadow-sm group"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            {t.back || "Back"}
                        </button>
                    </div>

                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bg-white/90 backdrop-blur-md border-2 border-green-100/50 rounded-3xl p-8 shadow-xl text-center"
                    >
                        <motion.div 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                            className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-50 text-[#1B5E20] flex items-center justify-center rounded-2xl mx-auto mb-6 shadow-inner"
                        >
                            <Calendar className="w-10 h-10" />
                        </motion.div>

                        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] mb-2 uppercase tracking-tight">
                            {(t as any).forecast?.sowingTitle || "When Did You Sow?"}
                        </h2>
                        <p className="text-gray-500 font-medium mb-8">
                            {(t as any).forecast?.sowingSubtitle || `Enter the sowing date for ${selectedCrop} to get accurate predictions.`}
                        </p>

                        {/* Crop selector if multiple crops */}
                        {activeFarm?.crops && activeFarm.crops.length > 1 && (
                            <div className="mb-6 text-left">
                                <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-wider text-center">
                                    {(t as any).forecast?.selectCrop || "Select Crop"}
                                </label>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {[...new Set(activeFarm.crops.map(c => normalizeValue(c, 'crops')))].map(crop => (
                                        <button
                                            key={crop}
                                            onClick={() => setSelectedCrop(crop)}
                                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${selectedCrop === crop
                                                ? 'bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white shadow-md shadow-green-900/20 scale-105'
                                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                                }`}
                                        >
                                            {crop}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-6 relative">
                            <input
                                type="date"
                                value={sowingDate}
                                onChange={(e) => setSowingDate(e.target.value)}
                                className="w-full p-4 bg-gray-50 border-2 border-gray-200 text-[#1B5E20] rounded-xl focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-green-500/10 transition-all font-black text-center text-xl shadow-inner appearance-none"
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleSowingSubmit}
                            className="w-full py-4 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white font-black rounded-xl hover:shadow-lg transition-all uppercase tracking-wider shadow-md mb-4"
                        >
                            {(t as any).forecast?.generateForecast || "Generate Forecast"}
                        </motion.button>

                        <button
                            onClick={handleSkipSowing}
                            className="w-full py-3 bg-transparent text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm group"
                        >
                            <span className="border-b border-transparent group-hover:border-gray-400 transition-colors">
                                {(t as any).forecast?.skipSowing || "Skip — Use Regional Calendar Default"}
                            </span>
                        </button>
                    </motion.div>
                </div>
            </motion.div>
        );
    }

    // ─── Loading State ───
    if (loading) {
        return (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4"
            >
                <div className="relative">
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 bg-green-200 rounded-full blur-xl" 
                    />
                    <Loader2 className="w-16 h-16 text-[#1B5E20] animate-spin relative z-10" />
                </div>
                <h2 className="text-2xl font-extrabold text-[#1E1E1E] mt-8 tracking-tight text-center">
                    {(t as any).forecast?.analyzing || "Analyzing Weather & Risk Data..."}
                </h2>
                <p className="text-gray-500 mt-2 font-medium text-center max-w-sm">
                    {(t as any).forecast?.analyzingDesc || `Predicting pest & disease risks for ${selectedCrop}`}
                </p>
            </motion.div>
        );
    }

    // ─── Error State ───
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#1E1E1E] mb-3">Forecast Error</h2>
                    <p className="text-gray-500 mb-6 font-medium">{error}</p>
                    <button
                        onClick={() => { setError(null); setShowSowingPrompt(true); }}
                        className="w-full py-3 bg-[#1B5E20] text-white rounded-xl font-bold hover:bg-[#2E7D32] transition-colors"
                    >
                        {(t as any).forecast?.tryAgain || "Try Again"}
                    </button>
                </div>
            </div>
        );
    }

    // ─── No Forecast Yet ───
    if (!forecast) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
                 <Loader2 className="w-12 h-12 animate-spin text-[#1B5E20] mb-4" />
                 <h2 className="text-xl font-bold text-gray-700">Preparing Forecast...</h2>
            </div>
        );
    }

    const { phase_info, forecast_days, top_alert, calendar_threats, ipm_summary } = forecast;

    return (
        <div className="min-h-screen bg-[#FDFDF9] pb-32 relative">
            <DetectionHistorySidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                type="aggregate"
                entries={history}
                onSelect={handleHistorySelect}
                onClear={handleClearHistory}
            />
            <div className="max-w-5xl mx-auto p-4 md:p-8">
                {/* Back Button */}
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E6E6E6] text-[#1B5E20] font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        {t.back || "Back"}
                    </button>
                    <button
                        onClick={fetchForecast}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E6E6E6] text-[#1B5E20] font-bold rounded-xl hover:bg-gray-50 transition-all shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                        {(t as any).forecast?.refresh || "Refresh"}
                    </button>
                </div>

                {/* ─── Phase Progress Card ─── */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                    className="bg-white/80 backdrop-blur border-2 border-[#E6E6E6] rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow mb-6"
                >
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-green-50 to-green-100 text-[#1B5E20] flex items-center justify-center rounded-2xl shadow-inner flex-shrink-0">
                            <Sprout className="w-8 h-8" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-extrabold text-[#1B5E20] uppercase tracking-tight">
                                {forecast.crop} <span className="text-gray-300 mx-2">|</span> {phase_info.phase_label}
                            </h2>
                            <p className="text-sm text-gray-500 font-medium mt-1">
                                {phase_info.source === 'farmer_input'
                                    ? `Sowed: ${phase_info.sowing_date} · Day ${phase_info.day_in_crop}`
                                    : `Phase estimated from regional calendar`}
                                {' · '}<span className="text-[#1B5E20] font-bold">{forecast.location}</span>
                            </p>
                        </div>
                    </div>

                    {/* Phase Progress Bar */}
                    {phase_info.status === 'active' && (
                        <div className="mt-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="flex justify-between text-xs font-black text-gray-500 mb-2 uppercase tracking-wider">
                                <span>Phase {phase_info.phase_index + 1} of {phase_info.total_phases}</span>
                                <span className="text-[#1B5E20]">{phase_info.phase_progress_pct}% Completed</span>
                            </div>
                            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${phase_info.phase_progress_pct}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                                    className="h-full bg-gradient-to-r from-[#2E7D32] to-[#4CAF50] rounded-full relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
                                </motion.div>
                            </div>
                            <div className="flex justify-between text-xs font-bold text-gray-400 mt-2">
                                <span>Day {phase_info.day_in_phase} / {phase_info.phase_total_days}</span>
                                <span>Overall Crop Progress: {phase_info.overall_progress_pct}%</span>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* ─── Top Alert Card ─── */}
                {top_alert && top_alert.risk_score > 0.3 && (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                        className={`${getRiskColor(top_alert.risk_level).bg} border-2 ${getRiskColor(top_alert.risk_level).border} rounded-3xl p-6 md:p-8 shadow-md hover:shadow-lg transition-shadow mb-6 relative overflow-hidden group`}
                    >
                        <div className="absolute top-0 left-0 w-2 h-full bg-current opacity-80"
                            style={{ color: getRiskColor(top_alert.risk_level).dot.replace('bg-', '') }} />

                        <div className="flex flex-col md:flex-row items-start gap-6">
                            <div className={`w-16 h-16 ${getRiskColor(top_alert.risk_level).dot} text-white flex items-center justify-center rounded-2xl flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <h3 className={`text-2xl font-black ${getRiskColor(top_alert.risk_level).text} uppercase tracking-tight`}>
                                        {top_alert.risk_level} Risk
                                    </h3>
                                    <span className="text-gray-400 font-bold">•</span>
                                    <h3 className="text-xl font-extrabold text-gray-800 tracking-tight">
                                        {top_alert.disease}
                                    </h3>
                                    <span className={`px-3 py-1 ${getRiskColor(top_alert.risk_level).dot} text-white text-xs font-black rounded-full uppercase ml-auto hidden md:inline-block`}>
                                        Score: {(top_alert.risk_score * 100).toFixed(0)}%
                                    </span>
                                </div>

                                {getRiskImage(top_alert.disease, forecast.crop) && (
                                    <img src={getRiskImage(top_alert.disease, forecast.crop)!} alt={top_alert.disease} className="w-full md:w-64 max-h-48 object-cover rounded-xl mb-4 shadow-sm border border-black/5" />
                                )}

                                <p className="text-base text-gray-700 font-medium mb-4 leading-relaxed">{top_alert.description}</p>
                                <div className="flex flex-wrap gap-2">
                                    {top_alert.weather_reasons.map((reason, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-white/80 backdrop-blur text-gray-800 text-xs font-bold rounded-xl border border-black/5 shadow-sm">
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Quick Action */}
                        <motion.button
                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                            onClick={handleAskChatbot}
                            className={`mt-6 w-full py-4 bg-white border-2 ${getRiskColor(top_alert.risk_level).border} ${getRiskColor(top_alert.risk_level).text} font-black rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-sm shadow-sm`}
                        >
                            <MessageCircle size={18} /> {(t as any).forecast?.askChatbot || "Ask AI for Protection Plan"}
                        </motion.button>
                    </motion.div>
                )}



                {/* ─── Daily Forecast Timeline ─── */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                    className="mb-8"
                >
                    <h3 className="text-xl font-extrabold text-[#1B5E20] uppercase tracking-tight mb-4 flex items-center gap-2">
                        <CloudRain className="w-6 h-6" /> {(t as any).forecast?.dailyForecast || "Daily Risk Forecast"}
                    </h3>
                    <div className="space-y-4">
                        {forecast_days.map((day, idx) => {
                            const dayColor = getRiskColor(day.overall_risk_level);
                            const isExpanded = expandedDay === idx;

                            return (
                                <motion.div 
                                    layout
                                    key={idx} 
                                    className={`bg-white border-2 ${isExpanded ? dayColor.border : 'border-[#E6E6E6] hover:border-gray-300'} rounded-2xl shadow-sm overflow-hidden transition-colors`}
                                >
                                    {/* Day Header */}
                                    <button
                                        onClick={() => setExpandedDay(isExpanded ? -1 : idx)}
                                        className="w-full p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50/50 transition-colors gap-3 md:gap-0"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl ${dayColor.bg} flex items-center justify-center flex-shrink-0 border border-black/5`}>
                                                <Calendar className={`w-6 h-6 ${dayColor.text}`} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-extrabold text-gray-900 text-lg">{formatDate(day.date)}</p>
                                                <p className="text-sm text-gray-500 font-bold">
                                                    {day.weather.condition}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 justify-between md:justify-end w-full md:w-auto">
                                            {/* Weather Pills */}
                                            <div className="flex items-center gap-2 md:gap-3 text-sm font-bold text-gray-600">
                                                <span className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                                                    <Thermometer size={14} className="text-orange-500" /> {day.weather.temp_min}–{day.weather.temp_max}°C
                                                </span>
                                                <span className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 shadow-sm">
                                                    <Droplets size={14} className="text-blue-500" /> {day.weather.humidity}%
                                                </span>
                                                {day.weather.rainfall_mm > 0 && (
                                                    <span className="flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 text-blue-700 shadow-sm">
                                                        <CloudRain size={14} /> {day.weather.rainfall_mm}mm
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className={`px-4 py-1.5 ${dayColor.bg} ${dayColor.text} text-xs font-black rounded-xl uppercase border ${dayColor.border} shadow-sm hidden md:block`}>
                                                    {day.overall_risk_level}
                                                </span>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 ${isExpanded ? 'bg-gray-100' : ''}`}>
                                                    <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded Details */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="border-t border-gray-100"
                                            >
                                                <div className="p-4 md:p-6 space-y-4 bg-gray-50/50">
                                                    {day.risks.length === 0 ? (
                                                        <div className="text-center py-10 text-gray-500 font-medium bg-white rounded-xl border border-gray-100 shadow-sm">
                                                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                                                <ShieldCheck className="w-8 h-8 text-green-500" />
                                                            </div>
                                                            <p className="text-lg font-bold text-gray-700">{(t as any).forecast?.noRisks || "No significant risks detected for this day"}</p>
                                                            <p className="text-sm mt-1">Weather conditions are favorable for crop health.</p>
                                                        </div>
                                                    ) : (
                                                        day.risks.map((risk, rIdx) => {
                                                            const rc = getRiskColor(risk.risk_level);
                                                            const riskKey = `${idx}-${rIdx}`;
                                                            const isRiskExpanded = expandedRisk === riskKey;

                                                            return (
                                                                <div key={rIdx} className={`bg-white border-2 ${rc.border} rounded-2xl overflow-hidden shadow-sm`}>
                                                                    <button
                                                                        onClick={() => setExpandedRisk(isRiskExpanded ? null : riskKey)}
                                                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={`w-2.5 h-10 ${rc.dot} rounded-full flex-shrink-0`} />

                                                                            <div className="text-left">
                                                                                <p className={`font-black text-lg ${rc.text}`}>{risk.disease}</p>
                                                                                <p className="text-sm font-bold text-gray-500 mt-0.5">{risk.weather_reasons[0]}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`px-3 py-1 rounded-lg ${rc.bg} border ${rc.border}`}>
                                                                                <span className={`text-sm font-black ${rc.text}`}>
                                                                                    {(risk.risk_score * 100).toFixed(0)}%
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50">
                                                                                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isRiskExpanded ? 'rotate-90' : ''}`} />
                                                                            </div>
                                                                        </div>
                                                                    </button>

                                                                    <AnimatePresence>
                                                                        {isRiskExpanded && (
                                                                            <motion.div 
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: "auto", opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                className="border-t border-gray-100 bg-gray-50/30"
                                                                            >
                                                                                <div className="px-5 py-4 space-y-4">
                                                                                    {getRiskImage(risk.disease, forecast.crop) && (
                                                                                        <img src={getRiskImage(risk.disease, forecast.crop)!} alt={risk.disease} className="w-full md:w-64 max-h-40 object-cover rounded-xl shadow-sm border border-gray-100" />
                                                                                    )}
                                                                                    <p className="text-sm font-medium text-gray-700 leading-relaxed bg-white p-3 rounded-xl border border-gray-100 shadow-sm">{risk.description}</p>

                                                                                    {/* Weather Reasons */}
                                                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                                                        {risk.weather_reasons.map((r, i) => (
                                                                                            <span key={i} className="px-3 py-1.5 bg-white text-xs font-bold text-gray-700 rounded-lg border border-gray-200 shadow-sm flex items-center gap-1.5">
                                                                                                <CloudRain size={12} className="text-blue-400" /> {r}
                                                                                            </span>
                                                                                        ))}
                                                                                    </div>

                                                                                    {/* IPM Actions */}
                                                                                    {risk.ipm_actions && (
                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                                                                            {risk.ipm_actions.biocontrol && risk.ipm_actions.biocontrol.length > 0 && (
                                                                                                <div className="bg-white border-2 border-green-100 rounded-xl p-4 shadow-sm">
                                                                                                    <p className="text-xs font-black text-[#1B5E20] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                                                        <Leaf size={14} /> Biocontrol
                                                                                                    </p>
                                                                                                    <ul className="space-y-1.5">
                                                                                                        {risk.ipm_actions.biocontrol.map((a, i) => (
                                                                                                            <li key={i} className="text-sm text-gray-800 font-medium pl-3 border-l-2 border-green-300">{a}</li>
                                                                                                        ))}
                                                                                                    </ul>
                                                                                                </div>
                                                                                            )}
                                                                                            {risk.ipm_actions.cultural && risk.ipm_actions.cultural.length > 0 && (
                                                                                                <div className="bg-white border-2 border-blue-100 rounded-xl p-4 shadow-sm">
                                                                                                    <p className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                                                        <Sprout size={14} /> Cultural
                                                                                                    </p>
                                                                                                    <ul className="space-y-1.5">
                                                                                                        {risk.ipm_actions.cultural.map((a, i) => (
                                                                                                            <li key={i} className="text-sm text-gray-800 font-medium pl-3 border-l-2 border-blue-300">{a}</li>
                                                                                                        ))}
                                                                                                    </ul>
                                                                                                </div>
                                                                                            )}
                                                                                            {risk.ipm_actions.botanical && risk.ipm_actions.botanical.length > 0 && (
                                                                                                <div className="bg-white border-2 border-orange-100 rounded-xl p-4 shadow-sm">
                                                                                                    <p className="text-xs font-black text-orange-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                                                        <Leaf size={14} /> Botanical
                                                                                                    </p>
                                                                                                    <ul className="space-y-1.5">
                                                                                                        {risk.ipm_actions.botanical.map((a, i) => (
                                                                                                            <li key={i} className="text-sm text-gray-800 font-medium pl-3 border-l-2 border-orange-300">{a}</li>
                                                                                                        ))}
                                                                                                    </ul>
                                                                                                </div>
                                                                                            )}
                                                                                            {risk.ipm_actions.chemical_last_resort && risk.ipm_actions.chemical_last_resort.length > 0 && (
                                                                                                <div className="bg-red-50/50 border-2 border-red-100 rounded-xl p-4 shadow-sm">
                                                                                                    <p className="text-xs font-black text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                                                        <AlertTriangle size={14} /> Chemical (Last Resort)
                                                                                                    </p>
                                                                                                    <ul className="space-y-1.5">
                                                                                                        {risk.ipm_actions.chemical_last_resort.map((a, i) => (
                                                                                                            <li key={i} className="text-sm text-gray-800 font-medium pl-3 border-l-2 border-red-300">{a}</li>
                                                                                                        ))}
                                                                                                    </ul>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* ─── Seasonal Threats Calendar ─── */}
                {calendar_threats && calendar_threats.length > 0 && (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                        className="bg-white border-2 border-[#E6E6E6] rounded-3xl p-6 md:p-8 shadow-sm mb-6"
                    >
                        <h3 className="text-xl font-extrabold text-[#1B5E20] uppercase tracking-tight mb-5 flex items-center gap-2">
                            <Bug className="w-6 h-6" /> {(t as any).forecast?.seasonalThreats || "Seasonal Threats This Month"}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {calendar_threats.map((threat, idx) => (
                                <motion.div 
                                    whileHover={{ y: -2, scale: 1.01 }}
                                    key={idx} 
                                    className={`flex flex-col gap-3 p-5 rounded-2xl border ${threat.severity === 'high'
                                    ? 'bg-red-50 border-red-200'
                                    : threat.severity === 'medium'
                                        ? 'bg-yellow-50 border-yellow-200'
                                        : 'bg-green-50 border-green-200'
                                    } shadow-sm group transition-shadow hover:shadow-md cursor-default`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${threat.severity === 'high' ? 'bg-red-200 text-red-800' : threat.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                                            {threat.severity} Risk
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${threat.severity === 'high' ? 'bg-red-100 text-red-600' : threat.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                                            {threat.type.toLowerCase().includes('pest') ? <Bug size={14} /> : <Sprout size={14} />}
                                        </div>
                                    </div>
                                    <div>
                                        {getRiskImage(threat.name, forecast.crop) && (
                                            <img src={getRiskImage(threat.name, forecast.crop)!} alt={threat.name} className="w-full h-32 object-cover rounded-xl mb-3 shadow-sm border border-black/5" />
                                        )}
                                        <p className="font-extrabold text-gray-900 text-base">{threat.name}</p>
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{threat.type}</p>
                                        <p className="text-sm text-gray-600 font-medium leading-relaxed bg-white/60 p-2.5 rounded-xl border border-white/50">{threat.note}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default PestForecast;
