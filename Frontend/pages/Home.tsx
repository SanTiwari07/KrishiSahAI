import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { Link } from 'react-router-dom';
import { Briefcase, Sprout, Recycle, ArrowRight, BookOpen, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import { auth } from '../firebase';
import { getUserProfile } from '../services/firebase_db';

const Home: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = translations[lang];

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="h-[calc(100vh-73px)] overflow-y-scroll snap-y snap-mandatory scroll-smooth bg-[#F5F8F8]">
            {/* Section 1: Hero */}
            <section id="hero" className="h-full w-full snap-start relative flex items-center justify-center bg-[#F5F8F8] p-4 md:p-8">
                <div className="relative w-full max-w-6xl mx-auto bg-gradient-to-br from-[#043744] via-[#065A6F] to-[#0A5F73] text-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col items-center justify-center py-20 px-6 md:py-32 md:px-12">
                    {/* Background Blobs inside the card */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#0A5F73]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10 max-w-4xl mx-auto text-center">
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-8 leading-tight animate-in fade-in slide-in-from-bottom-8">
                            {t.heroTitle}
                        </h1>
                        <p className="text-lg md:text-2xl font-medium text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
                            {t.heroSub}
                        </p>
                        <Link
                            to="/chat"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[#043744] rounded-2xl font-bold text-lg hover:bg-[#E8F5F5] transition-all shadow-lg hover:scale-105"
                        >
                            {t.startConv} <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>

                    {/* Scroll indicator inside the card */}
                    <button
                        onClick={() => scrollToSection('problem')}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ChevronDown className="w-8 h-8 text-white/80" />
                    </button>
                </div>
            </section>

            {/* Section 2: Crop Disease Problem */}
            <section id="problem" className="h-full w-full snap-start relative flex items-center justify-center bg-[#F5F8F8]">
                <div className="max-w-7xl mx-auto px-8 w-full">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1 animate-in fade-in slide-in-from-left-8 duration-700">
                            <div className="aspect-[4/3] bg-gradient-to-br from-[#E8F5F5] to-[#FAFCFC] rounded-[40px] shadow-2xl overflow-hidden border border-[#E0E6E6]">
                                <img
                                    src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&h=600&fit=crop&q=80"
                                    alt="Farmer examining diseased crop"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        </div>
                        <div className="order-1 md:order-2 space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 delay-100">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fee2e2] text-red-800 rounded-full text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> Problem
                            </div>
                            <h2 className="text-4xl md:text-6xl font-extrabold text-[#000D0F] leading-tight">
                                Crop Disease Threatening Your Harvest?
                            </h2>
                            <p className="text-lg md:text-xl text-[#043744] leading-relaxed max-w-lg">
                                Identify crop diseases and pests instantly with AI-powered detection. Get expert recommendations to protect your crops and maximize yield.
                            </p>
                            <Link
                                to="/crop-care"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[#043744] text-white rounded-2xl font-bold text-lg hover:bg-[#0A5F73] transition-all shadow-xl hover:scale-105"
                            >
                                Go to Crop Care <ArrowRight className="w-6 h-6" />
                            </Link>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => scrollToSection('challenge')}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer p-2 hover:bg-[#043744]/5 rounded-full transition-colors hidden md:block"
                >
                    <ChevronDown className="w-8 h-8 text-[#043744]/40" />
                </button>
            </section>

            {/* Section 3: Waste/Loss Challenge */}
            <section id="challenge" className="h-full w-full snap-start relative flex items-center justify-center bg-white">
                <div className="max-w-7xl mx-auto px-8 w-full">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-1 md:order-2 animate-in fade-in slide-in-from-right-8 duration-700">
                            <div className="aspect-[4/3] bg-gradient-to-br from-[#D0E8ED] to-[#FAFCFC] rounded-[40px] shadow-2xl overflow-hidden border border-[#E0E6E6]">
                                <img
                                    src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&h=600&fit=crop&q=80"
                                    alt="Agricultural waste in field"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        </div>
                        <div className="order-2 md:order-1 space-y-8 animate-in fade-in slide-in-from-left-8 duration-700 delay-100">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffedd5] text-orange-800 rounded-full text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span> Challenge
                            </div>
                            <h2 className="text-4xl md:text-6xl font-extrabold text-[#000D0F] leading-tight">
                                Turn Agricultural Waste into Value
                            </h2>
                            <p className="text-lg md:text-xl text-[#043744] leading-relaxed max-w-lg">
                                Don't let crop residue go to waste. Discover innovative ways to convert agricultural waste into profitable products and sustainable solutions.
                            </p>
                            <Link
                                to="/waste-to-value"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A5F73] text-white rounded-2xl font-bold text-lg hover:bg-[#043744] transition-all shadow-xl hover:scale-105"
                            >
                                Waste to Value <ArrowRight className="w-6 h-6" />
                            </Link>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => scrollToSection('solution')}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer p-2 hover:bg-[#043744]/5 rounded-full transition-colors hidden md:block"
                >
                    <ChevronDown className="w-8 h-8 text-[#043744]/40" />
                </button>
            </section>

            {/* Section 4: Business Growth Solution */}
            <section id="solution" className="h-full w-full snap-start relative flex items-center justify-center bg-[#F5F8F8]">
                <div className="max-w-7xl mx-auto px-8 w-full">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1 animate-in fade-in slide-in-from-left-8 duration-700">
                            <div className="aspect-[4/3] bg-gradient-to-br from-[#E8F5F5] to-[#D0E8ED] rounded-[40px] shadow-2xl overflow-hidden border border-[#E0E6E6]">
                                <img
                                    src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&h=600&fit=crop&q=80"
                                    alt="Prosperous farmer with harvest"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        </div>
                        <div className="order-1 md:order-2 space-y-8 animate-in fade-in slide-in-from-right-8 duration-700 delay-100">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#dcfce7] text-green-800 rounded-full text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span> Solution
                            </div>
                            <h2 className="text-4xl md:text-6xl font-extrabold text-[#000D0F] leading-tight">
                                Grow Your Agricultural Business
                            </h2>
                            <p className="text-lg md:text-xl text-[#043744] leading-relaxed max-w-lg">
                                Access expert business advisory, market insights, and strategic planning tools to scale your farming operations and increase profitability.
                            </p>
                            <Link
                                to="/advisory"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[#043744] text-white rounded-2xl font-bold text-lg hover:bg-[#0A5F73] transition-all shadow-xl hover:scale-105"
                            >
                                Business Advisory <ArrowRight className="w-6 h-6" />
                            </Link>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => scrollToSection('empowerment')}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer p-2 hover:bg-[#043744]/5 rounded-full transition-colors hidden md:block"
                >
                    <ChevronDown className="w-8 h-8 text-[#043744]/40" />
                </button>
            </section>

            {/* Section 5: Knowledge Empowerment */}
            <section id="empowerment" className="h-full w-full snap-start relative flex items-center justify-center bg-white">
                <div className="max-w-7xl mx-auto px-8 w-full">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-1 md:order-2 animate-in fade-in slide-in-from-right-8 duration-700">
                            <div className="aspect-[4/3] bg-gradient-to-br from-[#D0E8ED] to-[#E8F5F5] rounded-[40px] shadow-2xl overflow-hidden border border-[#E0E6E6]">
                                <img
                                    src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop&q=80"
                                    alt="Farmer learning with technology"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        </div>
                        <div className="order-2 md:order-1 space-y-8 animate-in fade-in slide-in-from-left-8 duration-700 delay-100">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e0f2fe] text-blue-800 rounded-full text-sm font-bold">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span> Empowerment
                            </div>
                            <h2 className="text-4xl md:text-6xl font-extrabold text-[#000D0F] leading-tight">
                                Learn Modern Farming Techniques
                            </h2>
                            <p className="text-lg md:text-xl text-[#043744] leading-relaxed max-w-lg">
                                Access comprehensive agricultural knowledge, best practices, and cutting-edge farming techniques to stay ahead in modern agriculture.
                            </p>
                            <Link
                                to="/hub"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[#0A5F73] text-white rounded-2xl font-bold text-lg hover:bg-[#043744] transition-all shadow-xl hover:scale-105"
                            >
                                Knowledge Hub <ArrowRight className="w-6 h-6" />
                            </Link>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => scrollToSection('footer')}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer p-2 hover:bg-[#043744]/5 rounded-full transition-colors hidden md:block"
                >
                    <ChevronDown className="w-8 h-8 text-[#043744]/40" />
                </button>
            </section>

            {/* Section 6: Footer / CTA */}
            <section id="footer" className="h-full w-full snap-start relative flex items-center justify-center bg-[#F5F8F8] p-4 md:p-8">
                <div className="relative w-full max-w-6xl mx-auto bg-gradient-to-br from-[#043744] via-[#065A6F] to-[#0A5F73] text-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col items-center justify-center py-12 px-6 md:py-20 md:px-12">
                    <div className="max-w-5xl mx-auto text-center relative z-10">
                        <h2 className="text-3xl md:text-5xl font-extrabold mb-6 animate-in fade-in slide-in-from-bottom-8">
                            Ready to Transform Your Farming Journey?
                        </h2>
                        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
                            Join thousands of farmers using AI-powered tools to increase productivity, sustainability, and profitability.
                        </p>
                        <div className="flex flex-col md:flex-row gap-6 justify-center">
                            <Link
                                to="/chat"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#043744] rounded-2xl font-bold text-lg hover:bg-[#f0f9fa] transition-all shadow-xl hover:scale-105"
                            >
                                Start with AI Assistant <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>

                        <div className="mt-12 pt-6 border-t border-white/10 text-white/60 text-sm">
                            <p>© 2025 KrishiSahAI TechFiesta. Empowering Farmers with Technology.</p>
                        </div>
                    </div>

                    {/* Background Blobs inside the card */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#0A5F73]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                </div>
            </section>
        </div>
    );
};

export default Home;
