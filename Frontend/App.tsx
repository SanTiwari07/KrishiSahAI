import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Chatbot from './pages/Chatbot';
import BusinessAdvisory from './pages/BusinessAdvisory';
import CropCare from './pages/CropCare';
import DiseaseDetector from './pages/DiseaseDetector';
import PestDetector from './pages/PestDetector';
import WasteToValue from './pages/WasteToValue';
import KnowledgeHub from './pages/KnowledgeHub';
import BusinessDetail from './pages/BusinessDetail';
import Roadmap from './pages/Roadmap';
import NewsPage from './pages/NewsPage';
import EditProfile from './pages/EditProfile';
import ArticleDetail from './pages/ArticleDetail';
import { Leaf } from 'lucide-react';
import { Language, UserProfile } from './types';
import { auth, db, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from './firebase';
import { onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { RefreshCw, LogOut, Settings, Menu, X, Sun, Moon, User, Cloud, ArrowRight } from 'lucide-react';
import { api } from './src/services/api';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import logo from './src/assets/logo.png';
import WeatherModal from './components/WeatherModal';
import NotificationBell from './components/NotificationBell';

const getBestLocation = (u: UserProfile | null) => {
  if (!u) return "";
  if (u.district && u.state) return `${u.district}, ${u.state}`;
  return u.district || u.state || "India";
};

const getDisplayLocation = (u: UserProfile | null) => {
  if (!u) return "";
  return u.district || u.state || "India";
};

const Header: React.FC<{
  toggleNotifications: () => void;
  toggleWeather: () => void;
  user: UserProfile | null;
  logout: () => void;
  weatherData?: any;
  weatherLoading?: boolean;
  refreshWeather: () => void;
}> = ({ toggleNotifications, toggleWeather, user, logout, weatherData, weatherLoading, refreshWeather }) => {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: t.navHome, path: '/' },
    { label: t.navAdvisory, path: '/advisory' },
    { label: t.navAskAI, path: '/chat' },
    { label: t.navNews, path: '/news' },
    { label: t.navKnowledge, path: '/hub' },
  ];

  const getWeatherDisplay = () => {
    if (weatherLoading) return "...";
    if (!weatherData) return "N/A";
    return `${weatherData.temperature}°C`;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#1B5E20] border-b-4 border-[#2E7D32] shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-[64px]">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group mr-8">
            <div className="flex items-center justify-center">
              <img src={logo} alt="Logo" className="h-[50px] w-auto object-contain brightness-0 invert" />
            </div>
            <div className="hidden md:flex flex-col justify-center h-full">
              <span className="text-xl font-bold text-white tracking-tight leading-none">
                {t.brandName}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-6 py-3 text-sm font-bold uppercase tracking-wide transition-all duration-200 border-b-4 whitespace-nowrap rounded-lg ${location.pathname === item.path ? 'text-white border-white bg-white/10' : 'text-white/70 border-transparent hover:text-white hover:bg-white/5'}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            {user && (
              <button
                className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}

            {user && (
              <>
                {/* Weather Info (Desktop) */}
                <div className={`hidden sm:flex items-center gap-1 bg-[#FAFAF7] border border-[#E6E6E6] rounded-full hover:rounded-lg px-1 py-0.5 transition-all group ${weatherLoading ? 'opacity-80' : ''}`}>
                  <button
                    onClick={toggleWeather}
                    className="flex items-center gap-3 px-4 py-2 bg-transparent text-xs font-bold text-[#1B5E20] hover:bg-green-50 transition-all border-r border-gray-200"
                    title="View Weather Details"
                  >
                    <span className="text-lg">☁</span>
                    <span className="uppercase tracking-wider">
                      {getDisplayLocation(user)}: {getWeatherDisplay()}
                    </span>
                  </button>
                  <button
                    onClick={refreshWeather}
                    className={`p-2 hover:bg-green-50 text-[#1B5E20] transition-all ${weatherLoading ? 'animate-spin' : 'hover:rotate-180'}`}
                    title="Refresh Weather"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>

                {/* Weather Button (Mobile) */}
                <button
                  onClick={toggleWeather}
                  className="sm:hidden relative flex items-center justify-center w-10 h-10 bg-[#FAFAF7] border border-[#E6E6E6] rounded-full hover:bg-[#E8F5E9] transition-all"
                  title="Weather"
                >
                  <Cloud size={18} className="text-[#043744]" />
                </button>

                {/* Notifications */}
                <NotificationBell />
              </>
            )}

            {/* Language Switcher */}
            <div className="hidden sm:flex bg-[#1B5E20] border border-white/20 p-0 gap-0 rounded-lg overflow-hidden min-w-[120px]">
              {[{ code: 'EN', label: 'EN' }, { code: 'HI', label: 'HI' }, { code: 'MR', label: 'MR' }].map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code as Language)}
                  className={`flex-1 px-2 py-1.5 text-[11px] font-bold transition-all border-r border-white/20 last:border-r-0 ${language === l.code ? 'bg-white text-[#1B5E20]' : 'text-white hover:bg-white/10'}`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-3 bg-white/5 border border-white/20 px-4 py-2 hover:bg-white/10 transition-colors rounded-xl">
                  <div className="w-8 h-8 bg-white flex items-center justify-center text-[#1B5E20] font-bold text-sm rounded-full">
                    {user.name && user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-white leading-tight uppercase">{user.name}</p>
                    <p className="text-[10px] text-white/60 uppercase tracking-wider">{user.occupation}</p>
                  </div>
                </button>

                <div className="absolute right-0 top-full mt-2 w-56 bg-white border-2 border-[#1B5E20] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 rounded-xl overflow-hidden">
                  <Link to="/profile/edit" className="flex items-center gap-3 w-full px-5 py-4 text-sm font-bold text-[#1B5E20] hover:bg-green-50 transition-colors border-b border-gray-100">
                    <Settings size={16} /> Edit Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-5 py-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={16} /> {t.logout}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-0">
                <Link to="/login" className="px-6 py-2.5 text-sm font-bold text-white uppercase hover:bg-white/10 transition-colors rounded-lg">
                  {t.login}
                </Link>
                <Link to="/signup" className="px-6 py-2.5 bg-white text-[#1B5E20] text-sm font-bold uppercase hover:bg-gray-100 transition-all border-2 border-white rounded-lg">
                  {t.signup}
                </Link>
              </div>
            )}
          </div>
        </div >
      </div >

      {/* Mobile Menu Dropdown */}
      {
        isMobileMenuOpen && user && (
          <div className="lg:hidden bg-[#1B5E20] border-t border-[#2E7D32] absolute w-full left-0 top-[64px] shadow-xl animate-in slide-in-from-top-2 z-40">
            <nav className="flex flex-col p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-4 py-3 text-sm font-bold uppercase tracking-wide rounded-lg transition-colors ${location.pathname === item.path ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  {item.label}
                </Link>
              ))}
              {/* Mobile Language Switcher */}
              <div className="flex bg-[#1B5E20] border border-white/20 p-0 gap-0 rounded-lg overflow-hidden mb-4">
                {[{ code: 'EN', label: 'EN' }, { code: 'HI', label: 'HI' }, { code: 'MR', label: 'MR' }].map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code as Language);
                      // Don't close menu automatically so user can see it works
                    }}
                    className={`flex-1 px-2 py-3 text-xs font-bold transition-all border-r border-white/20 last:border-r-0 ${language === l.code ? 'bg-white text-[#1B5E20]' : 'text-white hover:bg-white/10'}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              {/* Mobile Profile & Logout */}
              <div className="pt-4 mt-2 border-t border-white/10">
                <Link
                  to="/profile/edit"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10 rounded-lg"
                >
                  <Settings size={18} /> Edit Profile
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut size={18} /> {t.logout}
                </button>
              </div>
            </nav>
          </div>
        )
      }
    </header >
  );
};

const LoginFlow: React.FC<{ onLogin: (e: string, p: string) => void; onSwitch: () => void }> = ({ onLogin, onSwitch }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row">
      {/* Left Section - Login Form (Light Section) */}
      <div className="w-full md:w-1/2 h-full overflow-y-auto bg-[#F1F8E9]">
        <div className="min-h-full flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-lg p-8 md:p-10 border border-green-100">
            <div className="mb-8">
              <h1 className="text-[32px] font-bold text-deep-green mb-2">{t.login}</h1>
              <p className="text-gray-600 font-medium">{t.loginTitle}</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold text-center">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-deep-green mb-2 ml-1">{t.email} / {t.phoneNumber}</label>
                  <input
                    required
                    type="text"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:border-deep-green focus:ring-4 focus:ring-green-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-deep-green mb-2 ml-1">{t.password}</label>
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:border-deep-green focus:ring-4 focus:ring-green-500/10 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-deep-green focus:ring-deep-green" />
                    <span className="text-sm font-medium text-gray-600 group-hover:text-deep-green transition-colors">{t.rememberMe}</span>
                  </label>
                  <button type="button" className="text-sm font-bold text-deep-green hover:underline">
                    {t.forgotPassword}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-deep-green text-white rounded-xl font-bold text-lg hover:bg-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? t.loggingIn : t.login}
              </button>

              <div className="text-center mt-6">
                <p className="text-gray-600 text-sm">
                  {t.dontHaveAccount} <button type="button" onClick={onSwitch} className="text-deep-green font-bold hover:underline">{t.signup}</button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Section - Logo (Green Gradient) */}
      <div className="hidden md:flex w-full md:w-1/2 h-full bg-gradient-to-br from-deep-green to-deep-blue flex-col items-center justify-center p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 flex flex-col items-center justify-center">
          <img src={logo} alt="KrishiSahAI Logo" className="h-40 md:h-56 w-auto object-contain mb-8 filter brightness-0 invert drop-shadow-xl" />
          <h2 className="text-white text-4xl md:text-5xl font-extrabold mb-4">{t.brandName}</h2>
          <p className="text-white/90 text-lg md:text-xl font-medium tracking-wide">{t.tagline}</p>
        </div>
      </div>
    </div>
  );
};

const SignupFlow: React.FC<{ onSignup: (p: any, pass: string) => void; onSwitch: () => void }> = ({ onSignup, onSwitch }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formData, setFormData] = useState<any>({
    name: '', age: '', gender: 'male', occupation: 'farmer',
    experience_years: '2', // Default reasonable value
    phone: '', email: '',
    state: '', district: '', village: '',
    landSize: '', landUnit: 'acre', landType: 'Irrigated',
    soilType: 'alluvial', waterAvailability: 'borewell',
    mainCrops: []
  });
  const [customCrop, setCustomCrop] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const toggleCrop = (crop: string) => {
    setFormData((prev: any) => ({
      ...prev,
      mainCrops: prev.mainCrops.includes(crop)
        ? prev.mainCrops.filter((c: string) => c !== crop)
        : [...prev.mainCrops, crop]
    }));
  };

  const handleAddCustomCrop = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    if (e.type === 'keydown') e.preventDefault(); // Prevent form submission on Enter

    const trimmed = customCrop.trim();
    if (trimmed && !formData.mainCrops.includes(trimmed)) {
      setFormData((prev: any) => ({
        ...prev,
        mainCrops: [...prev.mainCrops, trimmed]
      }));
      setCustomCrop('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      handleNext();
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      if (!formData.email || !password) {
        throw new Error("Email and password are required");
      }
      const profile = {
        ...formData,
        location: `${formData.village}, ${formData.district}, ${formData.state}`,
        // Map to snake_case for backend compatibility
        land_size: parseFloat(formData.landSize),
        soil_type: formData.soilType,
        water_availability: formData.waterAvailability,
        crops_grown: formData.mainCrops
      };
      await onSignup(profile, password);
    } catch (err: any) {
      console.error("Signup Error:", err);
      setError(err.message || "Signup failed. Please try again.");
      setLoading(false);
    }
  };

  const inputClasses = "w-full p-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:border-deep-green focus:ring-4 focus:ring-green-500/10 transition-all";
  const labelClasses = "block text-sm font-bold text-deep-green mb-2 ml-1";
  const sectionTitleClasses = "text-xl font-bold text-deep-green mb-6 text-center";

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row">
      {/* Left Section - Logo (Green Gradient) - Fixed */}
      <div className="hidden md:flex w-full md:w-1/2 h-full bg-gradient-to-br from-deep-green to-deep-blue flex-col items-center justify-center p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 flex flex-col items-center justify-center">
          <img src={logo} alt="KrishiSahAI Logo" className="h-40 md:h-56 w-auto object-contain mb-8 filter brightness-0 invert drop-shadow-xl" />
          <h2 className="text-white text-4xl md:text-5xl font-extrabold mb-4">{t.brandName}</h2>
          <p className="text-white/90 text-lg md:text-xl font-medium tracking-wide">{t.tagline}</p>
        </div>
      </div>

      {/* Right Section - Signup Form (Light Section) - Scrollable */}
      <div className="w-full md:w-1/2 h-full overflow-y-auto bg-[#F1F8E9]">
        <div className="min-h-full flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-lg p-8 md:p-10 border border-green-100 my-8">
            <div className="mb-6 text-center">
              <h1 className="text-[28px] font-bold text-deep-green mb-1">{t.signupFlow[step === 1 ? 'personalInfo' : step === 2 ? 'locationDetails' : 'farmInfo']}</h1>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">{t.signupFlow.step} {step} {t.signupFlow.of} 3</p>
            </div>

            <div className="flex gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= s ? 'bg-deep-green' : 'bg-gray-200'}`} />
              ))}
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold text-center">
                  {error}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <label className={labelClasses}>{t.signupFlow.fullName} *</label>
                    <input required placeholder={t.signupFlow.placeholders.fullName} className={inputClasses} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>{t.signupFlow.age} *</label>
                      <input required type="number" placeholder={t.signupFlow.placeholders.age} className={inputClasses} value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelClasses}>{t.signupFlow.gender} *</label>
                      <select className={inputClasses} value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                        <option value="male">{t.signupFlow.options.gender.male}</option>
                        <option value="female">{t.signupFlow.options.gender.female}</option>
                        <option value="other">{t.signupFlow.options.gender.other}</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>{t.signupFlow.occupation} *</label>
                      <select className={inputClasses} value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })}>
                        <option value="farmer">{t.signupFlow.options.occupation.farmer}</option>
                        <option value="student">{t.signupFlow.options.occupation.student}</option>
                        <option value="business">{t.signupFlow.options.occupation.business}</option>
                        <option value="other">{t.signupFlow.options.occupation.other}</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClasses}>{t.experienceYears} *</label>
                      <input required type="number" placeholder="5" className={inputClasses} value={formData.experience_years} onChange={e => setFormData({ ...formData, experience_years: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClasses}>{t.signupFlow.phone} *</label>
                    <input required placeholder={t.signupFlow.placeholders.phone} className={inputClasses} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClasses}>{t.signupFlow.email} *</label>
                    <input required type="email" placeholder={t.signupFlow.placeholders.email} className={inputClasses} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}>{t.signupFlow.password} *</label>
                      <input required type="password" placeholder="••••••••" className={inputClasses} value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClasses}>{t.signupFlow.confirmPassword} *</label>
                      <input required type="password" placeholder="••••••••" className={inputClasses} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <label className={labelClasses}>{t.signupFlow.state} *</label>
                    <select required className={inputClasses} value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })}>
                      <option value="">Select state</option>
                      {t.signupFlow.options.states.map((s: string) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>{t.signupFlow.district} *</label>
                    <input required placeholder={t.signupFlow.placeholders.district} className={inputClasses} value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClasses}>{t.signupFlow.village} *</label>
                    <input required placeholder={t.signupFlow.placeholders.village} className={inputClasses} value={formData.village} onChange={e => setFormData({ ...formData, village: e.target.value })} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <label className={labelClasses}>{t.signupFlow.landSize} *</label>
                    <input required type="number" step="0.1" placeholder={t.signupFlow.placeholders.landSize} className={inputClasses} value={formData.landSize} onChange={e => setFormData({ ...formData, landSize: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelClasses}>{t.signupFlow.soilType} *</label>
                    <select className={inputClasses} value={formData.soilType} onChange={e => setFormData({ ...formData, soilType: e.target.value })}>
                      <option value="alluvial">{t.signupFlow.options.soilType.alluvial}</option>
                      <option value="black">{t.signupFlow.options.soilType.black}</option>
                      <option value="red">{t.signupFlow.options.soilType.red}</option>
                      <option value="laterite">{t.signupFlow.options.soilType.laterite}</option>
                      <option value="desert">{t.signupFlow.options.soilType.desert}</option>
                      <option value="mountain">{t.signupFlow.options.soilType.mountain}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>{t.signupFlow.waterAvailability} *</label>
                    <select className={inputClasses} value={formData.waterAvailability} onChange={e => setFormData({ ...formData, waterAvailability: e.target.value })}>
                      <option value="borewell">{t.signupFlow.options.waterAvailability.borewell}</option>
                      <option value="canal">{t.signupFlow.options.waterAvailability.canal}</option>
                      <option value="rainfed">{t.signupFlow.options.waterAvailability.rainfed}</option>
                      <option value="well">{t.signupFlow.options.waterAvailability.well}</option>
                      <option value="river">{t.signupFlow.options.waterAvailability.river}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>{t.signupFlow.mainCrops}</label>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {t.signupFlow.options.crops.map((crop: string) => (
                        <button
                          key={crop}
                          type="button"
                          onClick={() => toggleCrop(crop)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${formData.mainCrops.includes(crop) ? 'bg-deep-green text-white border-deep-green shadow-md' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-gray-300'}`}
                        >
                          {crop}
                        </button>
                      ))}

                      {/* Show custom crops as tags too */}
                      {formData.mainCrops.filter((c: string) => !t.signupFlow.options.crops.includes(c)).map((crop: string) => (
                        <button
                          key={crop}
                          type="button"
                          onClick={() => toggleCrop(crop)}
                          className="px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 bg-deep-green text-white border-deep-green shadow-md"
                        >
                          {crop} ×
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <input
                        type="text"
                        className={inputClasses}
                        placeholder={t.typeCrop || "Type custom crop..."}
                        value={customCrop}
                        onChange={(e) => setCustomCrop(e.target.value)}
                        onKeyDown={handleAddCustomCrop}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomCrop}
                        className="px-6 bg-deep-green text-white rounded-xl font-bold hover:bg-green-800 transition-all flex items-center justify-center whitespace-nowrap"
                      >
                        {t.submit || "Add"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4 pt-4">
                <div className="flex gap-4">
                  {step > 1 && (
                    <button type="button" onClick={handleBack} className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]">
                      {t.signupFlow.back}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-4 bg-deep-green text-white rounded-xl font-bold hover:bg-green-800 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><RefreshCw className="animate-spin" size={20} /> {t.loading}</>
                    ) : (
                      <>
                        {step === 3 ? t.signupFlow.signUp : t.signupFlow.next}
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center mt-4">
                  <p className="text-gray-500 text-sm font-medium">
                    {t.alreadyHaveAccount} <button type="button" onClick={onSwitch} className="text-deep-green font-bold hover:underline">{t.login}</button>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};


const AppContent: React.FC = () => {
  const { language: lang, t } = useLanguage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);

  // Weather State
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (u) {
        profileUnsub = onSnapshot(doc(db, "users", u.uid), (docSnap) => {
          if (docSnap.exists()) {
            const profile = docSnap.data() as UserProfile;
            setUser(profile);
            fetchWeather(getBestLocation(profile));
          }
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const fetchWeather = async (location: string) => {
    if (!location) return;
    setWeatherLoading(true);
    try {
      const data = await api.getCurrentWeather(location);
      if (data.success) {
        setWeatherData(data.weather);
      }
    } catch (error) {
      console.error("Weather Fetch Error:", error);
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleToggleWeather = () => {
    setIsWeatherOpen(true);
    if (!weatherData && user) {
      fetchWeather(getBestLocation(user));
    }
  };

  const handleRefreshWeather = () => {
    if (user) {
      fetchWeather(getBestLocation(user));
    }
  };

  // ... (Login/Signup logic omitted for brevity, no changes needed inside)

  const handleLogin = async (e: string, p: string) => {
    try {
      await signInWithEmailAndPassword(auth, e, p);
    } catch (err: any) {
      throw err;
    }
  };

  const handleSignup = async (profile: any, pass: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, profile.email, pass);
      await setDoc(doc(db, "users", res.user.uid), profile);
      // setUser(profile); // onSnapshot will handle this or we can set it
    } catch (err: any) {
      throw err;
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center text-[#1F5F4A]">{t.loading}</div>
      ) : !user ? (
        authView === 'login' ? <LoginFlow onLogin={handleLogin} onSwitch={() => setAuthView('signup')} /> : <SignupFlow onSignup={handleSignup} onSwitch={() => setAuthView('login')} />
      ) : (
        <Router>
          <div className="min-h-screen">
            {/* Updated Header with refresh and loading props */}
            <Header
              toggleNotifications={() => { }}
              toggleWeather={handleToggleWeather}
              user={user}
              logout={handleLogout}
              weatherData={weatherData}
              weatherLoading={weatherLoading}
              refreshWeather={handleRefreshWeather}
            />

            <WeatherModal
              isOpen={isWeatherOpen}
              onClose={() => setIsWeatherOpen(false)}
              data={weatherData}
              loading={weatherLoading}
              location={getBestLocation(user)}
            />

            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/chat" element={<Chatbot />} />
              <Route path="/advisory" element={<BusinessAdvisory lang={lang} user={user} />} />
              <Route path="/news" element={<NewsPage lang={lang} user={user} />} />
              <Route path="/crop-care" element={<CropCare lang={lang} />} />
              <Route path="/crop-care/disease" element={<DiseaseDetector lang={lang} />} />
              <Route path="/crop-care/pest" element={<PestDetector lang={lang} />} />
              <Route path="/waste-to-value" element={<WasteToValue lang={lang} />} />
              <Route path="/hub" element={<KnowledgeHub />} />
              <Route path="/knowledge/:slug" element={<ArticleDetail />} />
              <Route path="/business/:id" element={<BusinessDetail lang={lang} />} />
              <Route path="/roadmap/:businessName" element={<Roadmap lang={lang} />} />
              <Route path="/profile/edit" element={<EditProfile lang={lang} />} />
            </Routes>
          </div>
        </Router>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
