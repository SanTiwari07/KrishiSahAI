import React, { useState } from 'react';
import { useLanguage } from '../src/context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../src/services/api';
import { Bug, Upload, MessageCircle, ArrowLeft } from 'lucide-react';

const PestDetector: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Pest Detector State
    const [pestFile, setPestFile] = useState<File | null>(null);
    const [pestPreview, setPestPreview] = useState<string | null>(null);
    const [pestLoading, setPestLoading] = useState(false);
    const [pestResult, setPestResult] = useState<any | null>(null);
    const [pestError, setPestError] = useState<string | null>(null);

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
        <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32">
            <button
                onClick={() => navigate('/crop-care')}
                className="flex items-center text-deep-green font-bold mb-6 hover:underline"
            >
                <ArrowLeft className="w-5 h-5 mr-1" /> {t.back}
            </button>

            <div className="bg-white border-2 border-[#E6E6E6] p-8 hover:border-deep-green transition-all shadow-sm rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-[#FFF4E6] text-[#D97706] flex items-center justify-center font-bold rounded-xl">
                        <Bug className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-deep-green uppercase tracking-tight">{t.pestDetector}</h2>
                </div>

                <div className="space-y-6">
                    <div className="border-2 border-dashed border-gray-300 p-8 hover:border-deep-green transition-colors cursor-pointer relative bg-gray-50 text-center rounded-xl">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handlePestFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {pestPreview ? (
                            <img src={pestPreview} alt="Preview" className="max-h-64 mx-auto shadow-md rounded-lg" />
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
                        className={`w-full py-4 font-bold text-white transition-all uppercase tracking-wider rounded-xl ${!pestFile || pestLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-[#D97706] hover:bg-[#B45309] shadow-lg'
                            }`}
                    >
                        {pestLoading ? t.analyzingBtn : t.detectPest}
                    </button>

                    {pestError && (
                        <div className="p-4 bg-red-50 text-red-600 border border-red-100 font-medium rounded-lg">
                            {pestError}
                        </div>
                    )}

                    {pestResult && (
                        <div className="bg-[#FFF4E6] p-6 border border-[#FED7AA] rounded-xl">
                            <h3 className="text-xl font-bold text-[#D97706] mb-4 uppercase">{t.analysisResult}</h3>
                            <div className="space-y-3 text-[#78350F]">
                                <p><span className="font-bold">{t.labelPest}:</span> {pestResult.pest_name}</p>
                                <p><span className="font-bold">{t.labelConfidence}:</span> {(pestResult.confidence * 100).toFixed(1)}%</p>
                                <p><span className="font-bold">{t.labelSeverity}:</span> <span className={`capitalize ${pestResult.severity === 'high' ? 'text-red-500' : 'text-yellow-600'}`}>{pestResult.severity}</span></p>

                                {pestResult.description && (
                                    <p className="text-sm mt-2">{pestResult.description}</p>
                                )}

                                <button
                                    onClick={handlePestAskChatbot}
                                    className="w-full mt-6 py-3 bg-white border-2 border-[#D97706] text-[#D97706] font-bold hover:bg-[#D97706] hover:text-white transition-all flex items-center justify-center gap-2 uppercase tracking-wider rounded-xl"
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

export default PestDetector;
