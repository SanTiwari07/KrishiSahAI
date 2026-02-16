import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../src/i18n/translations';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Sprout, Upload, Bug, MessageCircle } from 'lucide-react';

const CropCare: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = translations[lang];
    const navigate = useNavigate();

    // Disease Detector State
    const [diseaseFile, setDiseaseFile] = useState<File | null>(null);
    const [diseasePreview, setDiseasePreview] = useState<string | null>(null);
    const [diseaseLoading, setDiseaseLoading] = useState(false);
    const [diseaseResult, setDiseaseResult] = useState<any | null>(null);
    const [diseaseError, setDiseaseError] = useState<string | null>(null);

    // Pest Detector State
    const [pestFile, setPestFile] = useState<File | null>(null);
    const [pestPreview, setPestPreview] = useState<string | null>(null);
    const [pestLoading, setPestLoading] = useState(false);
    const [pestResult, setPestResult] = useState<any | null>(null);
    const [pestError, setPestError] = useState<string | null>(null);

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

        const formData = new FormData();
        formData.append('image', diseaseFile);

        try {
            const data = await api.postMultipart('/disease/detect', formData);
            if (data.success) {
                setDiseaseResult(data.result);
            } else {
                setDiseaseError(data.error || "Detection failed");
            }
        } catch (err: any) {
            console.error("Disease upload error:", err);
            setDiseaseError(err.message || "Failed to upload image");
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

    // Pest Detector Handlers
    const handlePestFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setPestFile(file);
            setPestPreview(URL.createObjectURL(file));
            setPestResult(null);
            setPestError(null);
        }
    };

    const handlePestUpload = async () => {
        if (!pestFile) return;

        setPestLoading(true);
        setPestError(null);

        const formData = new FormData();
        formData.append('image', pestFile);

        try {
            const data = await api.detectPest(formData);
            if (data.success) {
                setPestResult(data.result);
            } else {
                setPestError(data.error || "Detection failed");
            }
        } catch (err: any) {
            console.error("Pest upload error:", err);
            setPestError(err.message || "Failed to upload image");
        } finally {
            setPestLoading(false);
        }
    };

    const handlePestAskChatbot = () => {
        if (!pestResult) return;
        const initialMessage = `I detected ${pestResult.pest_name} with ${(pestResult.confidence * 100).toFixed(1)}% confidence. Can you tell me more about this pest and how to control it?`;

        navigate('/chat', {
            state: {
                initialMessage,
                fromCropCare: true,
                previousState: { result: pestResult, preview: pestPreview, selectedFile: pestFile }
            }
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center py-10 bg-white rounded-[48px] border border-[#E6E6E6] shadow-xl p-6 mb-8">
                <div className="w-20 h-20 bg-[#FAFAF7] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Sprout className="w-10 h-10 text-[#043744]" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#1E1E1E] mb-4">{t.cropCare}</h1>
                <p className="text-[#555555] font-medium text-lg max-w-2xl mx-auto">
                    {t.cropCareSub}
                </p>
            </div>

            {/* Split Layout: Disease + Pest Detectors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Disease Detector */}
                <div className="bg-white rounded-[32px] border border-[#E6E6E6] shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-[#E8F5E9] rounded-2xl flex items-center justify-center">
                            <Sprout className="w-6 h-6 text-[#043744]" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#1E1E1E]">{t.diseaseDetector}</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:border-[#043744] transition-colors cursor-pointer relative bg-gray-50">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleDiseaseFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {diseasePreview ? (
                                <img src={diseasePreview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-md" />
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
                            className={`w-full py-3 rounded-xl font-bold text-white transition-all ${!diseaseFile || diseaseLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-[#043744] hover:bg-[#000D0F] shadow-lg hover:shadow-xl'
                                }`}
                        >
                            {diseaseLoading ? t.analyzingBtn : t.detectDisease}
                        </button>

                        {diseaseError && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
                                {diseaseError}
                            </div>
                        )}

                        {diseaseResult && (
                            <div className="bg-[#FAFAF7] rounded-2xl p-6 border border-[#E6E6E6] text-left animate-fade-in">
                                <h3 className="text-xl font-bold text-[#043744] mb-2">{t.analysisResult}</h3>
                                <div className="space-y-2">
                                    <p><span className="font-semibold">{t.labelCrop}:</span> {diseaseResult.crop}</p>
                                    <p><span className="font-semibold">{t.labelDisease}:</span> {diseaseResult.disease}</p>
                                    <p><span className="font-semibold">{t.labelConfidence}:</span> {(diseaseResult.confidence * 100).toFixed(1)}%</p>
                                    <p><span className="font-semibold">{t.labelSeverity}:</span> <span className={`capitalize ${diseaseResult.severity === 'high' ? 'text-red-500' : 'text-yellow-600'}`}>{diseaseResult.severity}</span></p>
                                    {diseaseResult.pathogen && <p><span className="font-semibold">{t.labelPathogen}:</span> {diseaseResult.pathogen}</p>}

                                    {diseaseResult.treatment && diseaseResult.treatment.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <h4 className="font-bold text-[#1E1E1E] mb-2">{t.labelTreatment}:</h4>
                                            <ul className="list-disc list-inside space-y-1 text-gray-700">
                                                {diseaseResult.treatment.map((t: string, i: number) => (
                                                    <li key={i}>{t}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleDiseaseAskChatbot}
                                        className="w-full mt-6 py-3 bg-[#043744] text-white rounded-xl font-bold hover:bg-[#000D0F] transition-all flex items-center justify-center gap-2 shadow-md"
                                    >
                                        <MessageCircle className="w-5 h-5" /> {t.askChatbotBtn}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pest Detector */}
                <div className="bg-white rounded-[32px] border border-[#E6E6E6] shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-[#FFF4E6] rounded-2xl flex items-center justify-center">
                            <Bug className="w-6 h-6 text-[#D97706]" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#1E1E1E]">{t.pestDetector}</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 hover:border-[#D97706] transition-colors cursor-pointer relative bg-gray-50">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePestFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {pestPreview ? (
                                <img src={pestPreview} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-md" />
                            ) : (
                                <div className="text-gray-500 flex flex-col items-center">
                                    <Upload className="w-10 h-10 mb-2 text-gray-400" />
                                    <p className="font-semibold">{t.uploadPrompt}</p>
                                    <p className="text-sm">{t.supportedFormats}</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handlePestUpload}
                            disabled={!pestFile || pestLoading}
                            className={`w-full py-3 rounded-xl font-bold text-white transition-all ${!pestFile || pestLoading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-[#D97706] hover:bg-[#B45309] shadow-lg hover:shadow-xl'
                                }`}
                        >
                            {pestLoading ? t.analyzingBtn : t.detectPest}
                        </button>

                        {pestError && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
                                {pestError}
                            </div>
                        )}

                        {pestResult && (
                            <div className="bg-[#FFF4E6] rounded-2xl p-6 border border-[#FED7AA] text-left animate-fade-in">
                                <h3 className="text-xl font-bold text-[#D97706] mb-2">{t.analysisResult}</h3>
                                <div className="space-y-2">
                                    <p><span className="font-semibold">{t.labelPest}:</span> {pestResult.pest_name}</p>
                                    <p><span className="font-semibold">{t.labelConfidence}:</span> {(pestResult.confidence * 100).toFixed(1)}%</p>
                                    <p><span className="font-semibold">{t.labelSeverity}:</span> <span className={`capitalize ${pestResult.severity === 'high' ? 'text-red-500' : 'text-yellow-600'}`}>{pestResult.severity}</span></p>
                                    {pestResult.description && (
                                        <p className="text-sm text-gray-700 mt-2">{pestResult.description}</p>
                                    )}

                                    <button
                                        onClick={handlePestAskChatbot}
                                        className="w-full mt-6 py-3 bg-[#D97706] text-white rounded-xl font-bold hover:bg-[#B45309] transition-all flex items-center justify-center gap-2 shadow-md"
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
    );
};

export default CropCare;
