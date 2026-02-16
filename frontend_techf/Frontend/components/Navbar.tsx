import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Menu, X, Globe, Leaf } from 'lucide-react';
import { translations } from '../translations';

const Navbar: React.FC = () => {
    const { t, language, setLanguage } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path ? 'text-[#043744] font-bold bg-[#E8F5F5]' : 'text-[#6B7878] hover:text-[#043744] hover:bg-[#FAFCFC]';

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const navLinks = [
        { path: '/', label: t.navHome },
        { path: '/crop-care', label: t.navCropCare },
        { path: '/waste-to-value', label: t.navWaste },
        { path: '/advisory', label: t.navAdvisory },
        { path: '/hub', label: t.navHub },
        { path: '/news', label: t.navNews },
    ];

    return (
        <nav className="bg-white border-b border-[#E0E6E6] sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="flex items-center justify-between h-[73px]">
                    {/* Brand */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#043744] to-[#0A5F73] rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                            <Leaf className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-[#043744] to-[#0A5F73] bg-clip-text text-transparent">
                            {t.brandName}
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive(link.path)}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right Side: Language & Auth */}
                    <div className="hidden lg:flex items-center gap-4">
                        {/* Language Switcher */}
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-3 py-2 text-[#043744] hover:bg-[#F5F8F8] rounded-xl transition-all">
                                <Globe className="w-5 h-5" />
                                <span className="font-medium text-sm">{language}</span>
                            </button>
                            {/* Dropdown */}
                            <div className="absolute right-0 top-full mt-2 w-32 bg-white border border-[#E0E6E6] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
                                {(['EN', 'HI', 'MR'] as const).map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => setLanguage(lang)}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F5F8F8] ${language === lang ? 'font-bold text-[#043744] bg-[#E8F5F5]' : 'text-[#6B7878]'}`}
                                    >
                                        {lang === 'EN' ? 'English' : lang === 'HI' ? 'हिंदी' : 'मराठी'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-6 w-px bg-[#E0E6E6]"></div>

                        <Link to="/login" className="text-sm font-bold text-[#043744] hover:text-[#0A5F73]">
                            {t.login}
                        </Link>
                        <Link to="/signup" className="px-5 py-2.5 bg-[#043744] text-white rounded-xl text-sm font-bold hover:bg-[#000D0F] transition-all shadow-md hover:shadow-lg">
                            {t.signup}
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button onClick={toggleMenu} className="lg:hidden p-2 text-[#043744] hover:bg-[#F5F8F8] rounded-xl">
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="lg:hidden bg-white border-t border-[#E0E6E6] absolute w-full left-0 top-[73px] shadow-xl py-4 px-4 flex flex-col gap-2 animate-in slide-in-from-top-4">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsMenuOpen(false)}
                            className={`p-4 rounded-xl text-base font-medium transition-all ${isActive(link.path)}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div className="h-px w-full bg-[#E0E6E6] my-2"></div>

                    {/* Mobile Language Switcher */}
                    <div className="flex gap-2 p-2 justify-center bg-[#F5F8F8] rounded-xl">
                        {(['EN', 'HI', 'MR'] as const).map((lang) => (
                            <button
                                key={lang}
                                onClick={() => setLanguage(lang)}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${language === lang ? 'bg-white text-[#043744] shadow-md' : 'text-[#6B7878] hover:bg-white/50'}`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                        <Link to="/login" className="w-full py-3 text-center text-[#043744] font-bold border border-[#E0E6E6] rounded-xl hover:bg-[#F5F8F8]">
                            {t.login}
                        </Link>
                        <Link to="/signup" className="w-full py-3 text-center bg-[#043744] text-white font-bold rounded-xl hover:bg-[#000D0F] shadow-md">
                            {t.signup}
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
