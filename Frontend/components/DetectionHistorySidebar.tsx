import React, { useState, useEffect } from 'react';
import { History, X, Sprout, Bug, Trash2 } from 'lucide-react';
import { useLanguage } from '../src/context/LanguageContext';
import { useFarm } from '../src/context/FarmContext';
import { normalizeValue } from '../src/utils/localizationUtils';

interface DetectionEntry {
    id: string;
    type: 'disease' | 'pest';
    name: string;
    confidence: number;
    timestamp: number;
    preview?: string;
}

interface DetectionHistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'disease' | 'pest' | 'aggregate';
    entries: DetectionEntry[];
    onSelect: (entry: DetectionEntry) => void;
    onClear: () => void;
}

export const getDetectionHistory = (type: 'disease' | 'pest'): DetectionEntry[] => {
    try {
        const data = localStorage.getItem(`detection_history_${type}`);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

export const saveDetectionHistory = (type: 'disease' | 'pest', entry: Omit<DetectionEntry, 'id' | 'timestamp'>) => {
    const history = getDetectionHistory(type);
    const newEntry: DetectionEntry = {
        ...entry,
        id: Date.now().toString(),
        timestamp: Date.now(),
    };
    const updated = [newEntry, ...history].slice(0, 20);
    localStorage.setItem(`detection_history_${type}`, JSON.stringify(updated));
    return updated;
};

export const clearDetectionHistory = (type: 'disease' | 'pest') => {
    localStorage.removeItem(`detection_history_${type}`);
};

const DetectionHistorySidebar: React.FC<DetectionHistorySidebarProps> = ({
    isOpen, onClose, type, entries, onSelect, onClear
}) => {
    const { t } = useLanguage();
    const { activeFarm } = useFarm();
    const [selectedCrop, setSelectedCrop] = useState<string | null>(null);

    const availableCrops = activeFarm?.crops 
        ? [...new Set(activeFarm.crops.map((c: string) => normalizeValue(c, 'crops')))] 
        : [];

    useEffect(() => {
        if (availableCrops.length > 0) {
            const saved = localStorage.getItem('global_selected_crop');
            if (saved && availableCrops.includes(saved)) {
                setSelectedCrop(saved);
            } else {
                setSelectedCrop(availableCrops[0]);
                localStorage.setItem('global_selected_crop', availableCrops[0]);
            }
        }
    }, [activeFarm]);

    const handleCropChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCrop = e.target.value;
        setSelectedCrop(newCrop);
        localStorage.setItem('global_selected_crop', newCrop);
        window.dispatchEvent(new CustomEvent('global-crop-changed', { detail: newCrop }));
    };

    const icon = type === 'pest' ? <Bug size={16} /> : <Sprout size={16} />;
    const title = type === 'aggregate' 
        ? ((t.sidebar as any)?.aggregateHistory || 'Crop Care History') 
        : type === 'disease' 
            ? (t.sidebar?.diseaseHistory || 'Disease History') 
            : (t.sidebar?.pestHistory || 'Pest History');
    const accentColor = type === 'pest' ? '#D97706' : '#1B5E20';

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/30 z-[100] md:hidden" onClick={onClose} />
            )}
            <div className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 shadow-xl z-[110] transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: accentColor + '30' }}>
                    <div className="flex items-center gap-2 font-bold" style={{ color: accentColor }}>
                        <History size={18} /> {title}
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
                        <X size={18} />
                    </button>
                </div>

                {availableCrops.length > 0 && (
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">
                            {(t.sidebar as any)?.selectedCrop || 'Selected Crop'}
                        </label>
                        <select 
                            value={selectedCrop || ''}
                            onChange={handleCropChange}
                            className="w-full bg-white border border-gray-300 text-gray-800 text-sm rounded-lg focus:ring-[#1B5E20] focus:border-[#1B5E20] block p-2.5 font-bold shadow-sm"
                        >
                            {availableCrops.map(crop => (
                                <option key={crop} value={crop}>{crop}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-400 font-medium mt-1.5">
                            Showing advisory context for: <span className="font-bold text-[#1B5E20]">{selectedCrop}</span>
                        </p>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                    {entries.length === 0 ? (
                        <div className="text-center text-gray-400 py-12">
                            <History size={32} className="mx-auto mb-3 opacity-40" />
                            <p className="text-sm font-medium">{t.sidebar?.noDetections || 'No detections yet'}</p>
                            <p className="text-xs mt-1">{t.sidebar?.resultsAppearHere || 'Results will appear here'}</p>
                        </div>
                    ) : (
                        entries.map((entry) => (
                            <button
                                key={entry.id}
                                onClick={() => onSelect(entry)}
                                className="w-full text-left p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-all group"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg" style={{ 
                                        backgroundColor: type === 'aggregate' ? (entry.type === 'pest' ? '#D9770615' : '#1B5E2015') : accentColor + '15', 
                                        color: type === 'aggregate' ? (entry.type === 'pest' ? '#D97706' : '#1B5E20') : accentColor 
                                    }}>
                                        {type === 'aggregate' ? (entry.type === 'pest' ? <Bug size={16} /> : <Sprout size={16} />) : icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{entry.name}</p>
                                        <p className="text-xs text-gray-400">
                                            {(entry.confidence * 100).toFixed(0)}% • {new Date(entry.timestamp).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {entries.length > 0 && (
                    <div className="p-3 border-t border-gray-100">
                        <button
                            onClick={onClear}
                            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 size={14} /> {t.sidebar?.clearHistory || 'Clear History'}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default DetectionHistorySidebar;
