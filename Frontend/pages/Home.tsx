import React, { Suspense } from 'react';
import { useLanguage } from '../src/context/LanguageContext';
import { Link } from 'react-router-dom';
import { ArrowRight, Sprout, Recycle, Briefcase, BookOpen, Loader2, Sparkles, ChevronDown } from 'lucide-react';
import HomeChatPanel from '../components/Home/HomeChatPanel';
import logo from '../src/assets/logo.png';

const PhaseZero = React.lazy(() => import('../components/Home/PhaseZero'));

const Home: React.FC = () => {
    const { t } = useLanguage();

    const features = [
        {
            title: t.featureCropCareTitle,
            subtitle: t.featureCropCareSub,
            link: '/crop-care',
            icon: <Sprout className="w-16 h-16 md:w-20 md:h-20" />,
            bgColor: 'bg-[#2E7D32]', // Medium Green
            hoverColor: 'hover:bg-[#1B5E20]'
        },
        {
            title: t.featureWasteTitle,
            subtitle: t.featureWasteSub,
            link: '/waste-to-value',
            icon: <Recycle className="w-16 h-16 md:w-20 md:h-20" />,
            bgColor: 'bg-[#00695C]', // Blue-Green (Teal)
            hoverColor: 'hover:bg-[#004D40]'
        },
        {
            title: t.featureBusinessTitle,
            subtitle: t.featureBusinessSub,
            link: '/advisory',
            icon: <Briefcase className="w-16 h-16 md:w-20 md:h-20" />,
            bgColor: 'bg-[#1B5E20]', // Dark Green
            hoverColor: 'hover:bg-[#0D3B12]'
        },
        {
            title: t.featureKnowledgeTitle,
            subtitle: t.featureKnowledgeSub,
            link: '/hub',
            icon: <BookOpen className="w-16 h-16 md:w-20 md:h-20" />,
            bgColor: 'bg-[#1565C0]', // Blue
            hoverColor: 'hover:bg-[#0D47A1]'
        }
    ];

    return (
        <div className="h-[calc(100vh-64px)] overflow-y-auto snap-y snap-mandatory scroll-smooth bg-white">
            {/* SECTION 1: MAIN DASHBOARD (Split Screen) */}
            <section className="snap-start h-full flex flex-col w-full max-w-[1600px] mx-auto p-2 md:p-4 gap-2 md:gap-4 bg-white">
                <div className="flex flex-col lg:flex-row h-full w-full gap-2 md:gap-4 flex-1">
                    {/* LEFT SIDE (40%) - CHATBOT PANEL */}
                    <div className="w-full lg:w-[40%] h-[60%] lg:h-full order-1">
                        <HomeChatPanel />
                    </div>

                    {/* RIGHT SIDE (60%) - FEATURE GRID PANEL */}
                    <div className="w-full lg:w-[60%] h-[40%] lg:h-full order-2">
                        <div className="grid grid-cols-2 gap-2 md:gap-4 h-full">
                            {features.map((feature, index) => (
                                <Link
                                    key={index}
                                    to={feature.link}
                                    className={`group relative w-full h-full min-h-[140px] md:min-h-[200px] flex flex-col justify-center items-center gap-3 md:gap-6 p-4 md:p-8 ${feature.bgColor} ${feature.hoverColor} transition-colors duration-200 no-underline shadow-sm rounded-3xl text-center`}
                                >
                                    <div className="text-white/80 group-hover:text-white transition-colors group-hover:scale-110 duration-300">
                                        {feature.icon}
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <h3 className="text-lg md:text-3xl font-extrabold text-white leading-tight mb-1 md:mb-2 tracking-tight">
                                            {feature.title}
                                        </h3>
                                        <p className="hidden md:flex text-white/80 text-xs md:text-lg font-medium items-center gap-1 md:gap-2 justify-center">
                                            {feature.subtitle} <ArrowRight className="w-3 h-3 md:w-4 md:h-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300" />
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 2: Validation Phase */}
            <section className="snap-start min-h-full flex flex-col items-center justify-center bg-white">
                <div className="w-full">
                    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-deep-green" /></div>}>
                        <PhaseZero />
                    </Suspense>
                </div>
            </section>
        </div>
    );
};

export default Home;
