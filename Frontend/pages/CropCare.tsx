import React from 'react';
import { Language } from '../types';
import { translations } from '../src/i18n/translations';
import { useNavigate } from 'react-router-dom';
import { Sprout, Bug, ArrowRight } from 'lucide-react';

const CropCare: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = translations[lang];
    const navigate = useNavigate();

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32">
            {/* Header */}
            <div className="mb-12 text-center border-b-4 border-deep-green pb-6">
                <h1 className="text-4xl md:text-5xl font-extrabold text-deep-green tracking-tight mb-4 uppercase">
                    {t.cropCareTitle}
                </h1>
                <p className="text-text-secondary font-medium max-w-2xl mx-auto text-lg">
                    {t.cropCareSubtitle}
                </p>
            </div>

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
    );
};

export default CropCare;
