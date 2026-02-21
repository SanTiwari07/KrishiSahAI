import React, { Suspense } from 'react';
import { useLanguage } from '../src/context/LanguageContext';
import { Link } from 'react-router-dom';
import { ArrowRight, Sprout, Recycle, Briefcase, BookOpen, Loader2, Target, Activity, ShieldCheck } from 'lucide-react';
import { useFarm } from '../src/context/FarmContext';

const Home: React.FC = () => {
    const { t } = useLanguage();
    const { activeFarm } = useFarm();

    const features = [
        {
            title: t.featurePlannerTitle,
            subtitle: t.featurePlannerSub,
            link: '/planner',
            icon: <Target className="w-8 h-8 md:w-12 md:h-12" />,
            bgColor: 'bg-[#1B5E20]', // Green 900
            hoverColor: 'hover:bg-[#0D3B12]'
        },
        {
            title: t.featureHealthTitle,
            subtitle: t.featureHealthSub,
            link: '/health',
            icon: <Activity className="w-8 h-8 md:w-12 md:h-12" />,
            bgColor: 'bg-[#2E7D32]', // Green 800
            hoverColor: 'hover:bg-[#1B5E20]'
        },
        {
            title: t.featureCropCareTitle,
            subtitle: t.featureCropCareSub,
            link: '/crop-care',
            icon: <ShieldCheck className="w-8 h-8 md:w-12 md:h-12" />,
            bgColor: 'bg-[#388E3C]', // Green 700
            hoverColor: 'hover:bg-[#2E7D32]'
        },
        {
            title: t.featureWasteTitle,
            subtitle: t.featureWasteSub,
            link: '/waste-to-value',
            icon: <Recycle className="w-8 h-8 md:w-12 md:h-12" />,
            bgColor: 'bg-[#43A047]', // Green 600
            hoverColor: 'hover:bg-[#388E3C]'
        },
        {
            title: t.featureBusinessTitle,
            subtitle: t.featureBusinessSub,
            link: '/advisory',
            icon: <Briefcase className="w-8 h-8 md:w-12 md:h-12" />,
            bgColor: 'bg-[#00695C]', // Teal 800
            hoverColor: 'hover:bg-[#004D40]'
        },
        {
            title: t.featureKnowledgeTitle,
            subtitle: t.featureKnowledgeSub,
            link: '/hub',
            icon: <BookOpen className="w-8 h-8 md:w-12 md:h-12" />,
            bgColor: 'bg-[#00796B]', // Teal 700
            hoverColor: 'hover:bg-[#00695C]'
        }
    ];

    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            {/* FARM CONTEXT RIBBON */}
            <div className="w-full bg-deep-green text-white px-4 py-2 flex justify-between items-center text-xs md:text-sm font-bold shadow-md sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <span className="opacity-70 uppercase tracking-widest text-[10px] md:text-xs">Active Farm:</span>
                    <span className="text-white bg-white/10 px-2 py-0.5 rounded-full">{activeFarm?.nickname || 'Default'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="opacity-70 uppercase tracking-widest text-[10px] md:text-xs">Current Crop:</span>
                    <span className="text-white bg-white/10 px-2 py-0.5 rounded-full">
                        {activeFarm?.crops?.join(', ') || 'No Crop'}
                    </span>
                </div>
            </div>

            <div className="h-[calc(100vh-100px)] overflow-y-auto scroll-smooth">
                {/* SECTION 1: MAIN DASHBOARD */}
                <section className="flex flex-col w-full max-w-[1600px] mx-auto p-4 md:p-8 gap-4 md:gap-8 bg-white relative">
                    <div className="w-full flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 h-full">
                            {features.map((feature, index) => (
                                <Link
                                    key={index}
                                    to={feature.link}
                                    className={`group relative w-full h-full min-h-[160px] md:min-h-[200px] flex flex-col justify-center items-center gap-4 md:gap-6 p-6 md:p-8 ${feature.bgColor} ${feature.hoverColor} transition-all duration-300 no-underline shadow-lg hover:shadow-xl rounded-2xl md:rounded-3xl text-center overflow-hidden border border-black/5 active:scale-95`}
                                >
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                        {feature.icon}
                                    </div>
                                    <div className="text-white/90 group-hover:text-white transition-all transform group-hover:scale-110 duration-500 bg-black/10 p-3 md:p-4 rounded-full">
                                        {React.cloneElement(feature.icon as any, { className: 'w-10 h-10 lg:w-16 lg:h-16' })}
                                    </div>
                                    <div className="flex flex-col items-center z-10">
                                        <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight mb-1 md:mb-2 tracking-tight drop-shadow-sm">
                                            {feature.title}
                                        </h3>
                                        <p className="flex text-white/80 text-sm md:text-base font-bold items-center gap-1.5 justify-center leading-relaxed max-w-[80%]">
                                            {feature.subtitle}
                                        </p>
                                    </div>
                                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 duration-300">
                                        <ArrowRight className="text-white w-6 h-6 md:w-8 md:h-8" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Home;
