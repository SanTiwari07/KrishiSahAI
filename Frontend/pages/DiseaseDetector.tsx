import React, { useState } from 'react';
import { Language } from '../types';
import { translations } from '../src/i18n/translations';
import { useNavigate } from 'react-router-dom';
import { api } from '../src/services/api';
import { Sprout, Upload, MessageCircle, ArrowLeft } from 'lucide-react';

const DiseaseDetector: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = translations[lang];
    const navigate = useNavigate();

    // Disease Detector State
    const [diseaseFile, setDiseaseFile] = useState<File | null>(null);
    const [diseasePreview, setDiseasePreview] = useState<string | null>(null);
    const [diseaseLoading, setDiseaseLoading] = useState(false);
    const [diseaseResult, setDiseaseResult] = useState<any | null>(null);
    const [diseaseError, setDiseaseError] = useState<string | null>(null);

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

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
            <button
                onClick={() => navigate('/crop-care')}
                className="flex items-center text-deep-green font-bold mb-6 hover:underline"
            >
                <ArrowLeft className="w-5 h-5 mr-1" /> {t.back}
            </button>

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
                        className={`w-full py-4 font-bold text-white transition-all uppercase tracking-wider rounded-xl ${!diseaseFile || diseaseLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-deep-green hover:bg-deep-green/90 shadow-lg'
                            }`}
                    >
                        {diseaseLoading ? t.analyzingBtn : t.detectDisease}
                    </button>

                    {diseaseError && (
                        <div className="p-4 bg-red-50 text-red-600 border border-red-100 font-medium rounded-lg">
                            {diseaseError}
                        </div>
                    )}

                    {diseaseResult && (
                        <div className="bg-[#E8F5E9] p-6 border border-deep-green rounded-xl">
                            <h3 className="text-xl font-bold text-deep-green mb-4 uppercase">{t.analysisResult}</h3>
                            <div className="space-y-3 text-deep-green">
                                <p><span className="font-bold">{t.labelDisease}:</span> {diseaseResult.disease}</p>
                                <p><span className="font-bold">{t.labelConfidence}:</span> {(diseaseResult.confidence * 100).toFixed(1)}%</p>

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
                                    className="w-full mt-6 py-3 bg-white border-2 border-deep-green text-deep-green font-bold hover:bg-deep-green hover:text-white transition-all flex items-center justify-center gap-2 uppercase tracking-wider rounded-xl"
                                >
                                    <MessageCircle className="w-5 h-5" /> {t.askChatbotBtn}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiseaseDetector;
