import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
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
import FarmHealth from './pages/FarmHealth';
import ArticleDetail from './pages/ArticleDetail';
import Planner from './pages/Planner';
import { Leaf } from 'lucide-react';
import { Language, UserProfile, Farm } from './types';

import { auth, db, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from './firebase';
import { onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { MapPin, Settings, LogOut, Menu, X, Plus, User, Info, Smartphone, CheckCircle, ArrowRight, ChevronRight, Wind, Droplets, Thermometer, Sun, CloudRain, RefreshCw, Cloud } from 'lucide-react';
import { api } from './src/services/api';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { FarmProvider, useFarm } from './src/context/FarmContext';
import logo from './src/assets/logo.png';
import WeatherModal from './components/WeatherModal';
import NotificationBell from './components/NotificationBell';

const getBestLocation = (u: UserProfile | null) => {
  if (!u || !u.farms || u.farms.length === 0) return "";
  const primaryFarm = u.farms[0];
  const { district, state } = primaryFarm;
  if (district && state) return `${district}, ${state}`;
  return district || state || "India";
};

const getDisplayLocation = (u: UserProfile | null) => {
  if (!u || !u.farms || u.farms.length === 0) return "";
  const primaryFarm = u.farms[0];
  const { district, state } = primaryFarm;
  return district || state || "India";
};


const LanguageSelection: React.FC<{ onSelect: (lang: Language) => void }> = ({ onSelect }) => {
  const { t } = useLanguage();
  const languages: { code: Language; label: string; sub: string }[] = [
    { code: 'EN', label: 'English', sub: 'Continue in English' },
    { code: 'HI', label: 'हिंदी', sub: 'हिंदी में जारी रखें' },
    { code: 'MR', label: 'मराठी', sub: 'मराठीत सुरू ठेवा' },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-[#F1F8E9] flex items-center justify-center p-6 overflow-y-auto font-poppins">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <img src={logo} alt="KrishiSahAI Logo" className="h-32 mx-auto mb-8 drop-shadow-lg" />
          <h1 className="text-4xl md:text-6xl font-black text-[#1B5E20] mb-6 tracking-tight">{t.selectLanguage}</h1>
          <p className="text-xl md:text-2xl text-gray-600 font-bold opacity-80">अपनी भाषा चुनें | आपली भाषा निवडा</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {languages.map((l, i) => (
            <button
              key={l.code}
              onClick={() => onSelect(l.code)}
              className="group relative bg-white border-b-8 border-r-8 border-[#1B5E20] hover:translate-y-[-6px] hover:translate-x-[-3px] hover:border-[#2E7D32] transition-all p-10 md:p-12 rounded-3xl text-center shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 overflow-hidden"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-[#1B5E20] group-hover:bg-[#2E7D32] transition-colors"></div>
              <h2 className="text-4xl font-black text-[#1B5E20] mb-3 group-hover:text-green-700 transition-colors uppercase tracking-tight">{l.label}</h2>
              <p className="text-gray-500 font-black uppercase tracking-widest text-xs opacity-60">{l.sub}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const Header: React.FC<{

  toggleNotifications: () => void;
  toggleWeather: () => void;
  user: UserProfile | null;
  logout: () => void;
  weatherData?: any;
  weatherLoading?: boolean;
  refreshWeather: () => void;
  onAuthSwitch: (view: 'login' | 'signup') => void;
}> = ({ toggleNotifications, toggleWeather, user, logout, weatherData, weatherLoading, refreshWeather, onAuthSwitch }) => {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { activeFarm, setActiveFarm, farms } = useFarm();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: t.navHome, path: '/' },
    { label: t.navAdvisory, path: '/advisory' },
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


            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-3 bg-white/5 border border-white/20 px-4 py-2 hover:bg-white/10 transition-colors rounded-xl">
                  <div className="w-8 h-8 bg-white flex items-center justify-center text-[#1B5E20] font-bold text-sm rounded-full">
                    {user.name && user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-white leading-tight uppercase">{user.name}</p>
                  </div>
                </button>

                <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-[#1B5E20] shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 rounded-xl overflow-hidden">
                  {/* Farm Switcher */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Switch Farm</p>
                    <div className="space-y-1">
                      {farms.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveFarm(f)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all ${activeFarm?.nickname === f.nickname ? 'bg-[#1B5E20] text-white' : 'text-gray-700 hover:bg-green-50'}`}
                        >
                          {f.nickname || `Farm ${i + 1}`}
                        </button>
                      ))}
                      <Link
                        to="/profile/edit"
                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-[#1B5E20] hover:bg-green-50 mt-1 dashed-border border-2 border-dashed border-green-100"
                      >
                        <Plus size={14} /> {t.addNewFarm}
                      </Link>
                    </div>
                  </div>

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
                <button
                  onClick={() => onAuthSwitch('login')}
                  className="px-6 py-2.5 text-sm font-bold text-white uppercase hover:bg-white/10 transition-colors rounded-lg"
                >
                  {t.login}
                </button>
                <button
                  onClick={() => onAuthSwitch('signup')}
                  className="px-6 py-2.5 bg-white text-[#1B5E20] text-sm font-bold uppercase hover:bg-gray-100 transition-all border-2 border-white rounded-lg"
                >
                  {t.signup}
                </button>
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
    </header>
  );
};

const LoginFlow: React.FC<{ onLogin: (phone: string, password: string) => void; onSwitch: () => void }> = ({ onLogin, onSwitch }) => {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState<string[]>(Array(6).fill(''));
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const arr = [...pin];
    arr[idx] = digit;
    setPin(arr);
    setPassword(arr.join(''));
    if (digit && idx < 5) pinRefs.current[idx + 1]?.focus();
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const arr = [...pin];
      if (arr[idx]) { arr[idx] = ''; setPin(arr); setPassword(arr.join('')); }
      else if (idx > 0) pinRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) pinRefs.current[idx - 1]?.focus();
    else if (e.key === 'ArrowRight' && idx < 5) pinRefs.current[idx + 1]?.focus();
  };

  const inputClasses = "w-full p-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-green-500/10 transition-all font-bold";
  const labelClasses = "block text-sm font-black text-[#1B5E20] mb-2 ml-1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!phone || !password) {
        setError(t.validation.loginBoth);
        setLoading(false);
        return;
      }
      await onLogin(phone, password);
    } catch (err: any) {
      setError(t.validation.invalidLogin);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row">
      {/* Left Section - Login Form (Light Section) */}
      <div className="w-full md:w-1/2 flex-1 min-h-0 overflow-y-auto bg-[#F1F8E9]">
        <div className="min-h-full flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-lg p-8 md:p-10 border border-green-100">
            <div className="mb-8 font-poppins">
              <h1 className="text-[32px] font-black text-[#1B5E20] mb-2">{t.login}</h1>
              <p className="text-gray-600 font-bold">{t.loginTitle}</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold text-center">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <label className={labelClasses}>{t.phoneNumber}</label>
                  <div className="flex gap-2">
                    <span className="p-4 bg-gray-100 border-2 border-gray-200 text-gray-500 rounded-xl font-bold flex items-center">+91</span>
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      placeholder="XXXXX XXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={inputClasses}
                    />
                  </div>
                </div>

                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                  <label className={labelClasses}>{t.password} <span className="text-xs font-bold text-gray-400">{t.pinHint}</span></label>
                  <div className="flex gap-2 justify-between">
                    {Array(6).fill(0).map((_, i) => (
                      <input
                        key={i}
                        ref={el => { pinRefs.current[i] = el; }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={pin[i]}
                        onChange={e => handlePinChange(i, e.target.value)}
                        onKeyDown={e => handlePinKeyDown(i, e)}
                        onFocus={e => e.target.select()}
                        className="w-full aspect-square text-center text-xl font-black border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-green-500/10 bg-white text-gray-900"
                      />
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <button type="button" className="text-sm font-bold text-[#1B5E20] hover:underline cursor-not-allowed opacity-50">
                      {t.forgotPassword}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#1B5E20] text-white rounded-xl font-black text-lg hover:bg-[#2E7D32] transition-all shadow-lg hover:shadow-xl disabled:opacity-50 active:scale-[0.98] uppercase tracking-wider"
              >
                {loading ? t.loading : t.loginButton}
              </button>
            </form>

            <div className="text-center mt-8 pt-6 border-t border-gray-100">
              <p className="text-gray-600 text-sm font-bold">
                {t.dontHaveAccount} <button type="button" onClick={onSwitch} className="text-[#1B5E20] font-black hover:underline px-2 py-1">{t.signup}</button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Logo (Green Gradient) */}
      <div className="hidden md:flex w-full md:w-1/2 h-full bg-gradient-to-br from-[#1B5E20] to-[#004D40] flex-col items-center justify-center p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 flex flex-col items-center justify-center">
          <img src={logo} alt="KrishiSahAI Logo" className="h-40 md:h-56 w-auto object-contain mb-8 filter brightness-0 invert drop-shadow-xl" />
          <h2 className="text-white text-4xl md:text-5xl font-black mb-4">{t.brandName}</h2>
          <p className="text-white/90 text-lg md:text-xl font-bold tracking-wide italic">{t.tagline}</p>
        </div>
      </div>
    </div>
  );
};

const SignupFlow: React.FC<{ onSignup: (p: UserProfile, password?: string) => void; onSwitch: () => void }> = ({ onSignup, onSwitch }) => {
  const { t, language, setLanguage } = useLanguage();
  const { setFarms, setActiveFarm } = useFarm();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<any>({
    name: '', phone: '', email: '',
    age: '', gender: 'male',
    language_choice: language, experience_years: '',
    state: '', district: '', village: '',
    password: '', confirmPassword: ''
  });
  const [signupFarms, setSignupFarms] = useState<Farm[]>([
    { nickname: 'Home Farm', landType: 'Irrigated', waterResource: 'Borewell', soilType: 'Black', landSize: '', unit: 'Acre', crops: [], state: '', district: '', village: '' }
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [customCropInputs, setCustomCropInputs] = useState<string[]>(['']);
  const [pin, setPin] = useState<string[]>(Array(6).fill(''));
  const [confirmPin, setConfirmPin] = useState<string[]>(Array(6).fill(''));
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync pin arrays → formData
  const handlePinChange = (idx: number, val: string, isConfirm: boolean) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const arr = isConfirm ? [...confirmPin] : [...pin];
    arr[idx] = digit;
    if (isConfirm) {
      setConfirmPin(arr);
      setFormData((prev: any) => ({ ...prev, confirmPassword: arr.join('') }));
    } else {
      setPin(arr);
      setFormData((prev: any) => ({ ...prev, password: arr.join('') }));
    }
    if (digit && idx < 5) {
      const refs = isConfirm ? confirmPinRefs : pinRefs;
      refs.current[idx + 1]?.focus();
    }
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>, isConfirm: boolean) => {
    const refs = isConfirm ? confirmPinRefs : pinRefs;
    if (e.key === 'Backspace') {
      const arr = isConfirm ? [...confirmPin] : [...pin];
      if (arr[idx]) {
        arr[idx] = '';
        if (isConfirm) { setConfirmPin(arr); setFormData((prev: any) => ({ ...prev, confirmPassword: arr.join('') })); }
        else { setPin(arr); setFormData((prev: any) => ({ ...prev, password: arr.join('') })); }
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      refs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      refs.current[idx + 1]?.focus();
    }
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const addFarm = () => {
    setSignupFarms(prev => [...prev, { nickname: `Farm ${prev.length + 1}`, landType: 'Irrigated', waterResource: 'Borewell', soilType: 'Black', landSize: '', unit: 'Acre', crops: [], state: '', district: '', village: '' }]);
    setCustomCropInputs(prev => [...prev, '']);
  };

  const removeFarm = (index: number) => {
    setSignupFarms(prev => prev.filter((_, i) => i !== index));
    setCustomCropInputs(prev => prev.filter((_, i) => i !== index));
  };

  const updateFarm = (index: number, field: keyof Farm, value: any) => {
    setSignupFarms(prev => {
      const newFarms = [...prev];
      newFarms[index] = { ...newFarms[index], [field]: value };
      return newFarms;
    });
  };

  const toggleCrop = (farmIndex: number, cropName: string) => {
    setSignupFarms(prev => {
      const newFarms = [...prev];
      const current = newFarms[farmIndex].crops || [];
      const updated = current.includes(cropName)
        ? current.filter(c => c !== cropName)
        : [...current, cropName];
      newFarms[farmIndex] = { ...newFarms[farmIndex], crops: updated };
      return newFarms;
    });
  };

  const addCustomCrop = (farmIndex: number) => {
    const val = (customCropInputs[farmIndex] || '').trim();
    if (!val) return;
    setSignupFarms(prev => {
      const newFarms = [...prev];
      const current = newFarms[farmIndex].crops || [];
      if (current.includes(val)) return prev;
      const updated = [...current, val];
      newFarms[farmIndex] = { ...newFarms[farmIndex], crops: updated };
      return newFarms;
    });
    setCustomCropInputs(prev => { const n = [...prev]; n[farmIndex] = ''; return n; });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      if (!formData.name || !formData.phone || !formData.age || !formData.password) {
        setError(t.validation.fillAll);
        return;
      }
      if (formData.password.length !== 6 || !/^\d{6}$/.test(formData.password)) {
        setError(t.validation.pinLength);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError(t.validation.pinMismatch);
        return;
      }
      handleNext();
      return;
    }
    setLoading(true);
    setError('');

    // Check if nicknames are provided for all added farms
    const invalidFarms = signupFarms.some(f => !f.nickname.trim());
    if (invalidFarms) {
      setError(t.validation.farmNickname);
      setLoading(false);
      return;
    }

    await finalizeSignup(signupFarms);
  };

  const finalizeSignup = async (finalFarms: Farm[]) => {
    try {
      const profile: UserProfile = {
        name: formData.name,
        age: formData.age,
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email,
        language: language,
        farms: finalFarms,
        experience_years: formData.experience_years || ''
      };

      await onSignup(profile, formData.password);
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
      setLoading(false);
    }
  };

  const inputClasses = "w-full p-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-green-500/10 transition-all font-bold";
  const labelClasses = "block text-sm font-black text-[#1B5E20] mb-2 ml-1";
  const sectionTitleClasses = "text-xl font-black text-[#1B5E20] mb-6";

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row">
      <div className="hidden md:flex w-full md:w-1/2 h-full bg-gradient-to-br from-[#1B5E20] to-[#004D40] flex-col items-center justify-center p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 flex flex-col items-center justify-center">
          <img src={logo} alt="KrishiSahAI Logo" className="h-40 md:h-56 w-auto object-contain mb-8 filter brightness-0 invert drop-shadow-xl" />
          <h2 className="text-white text-4xl md:text-5xl font-black mb-4">{t.brandName}</h2>
          <p className="text-white/90 text-lg md:text-xl font-bold tracking-wide italic">{t.tagline}</p>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex-1 min-h-0 overflow-y-auto bg-[#F1F8E9]">
        <div className="min-h-full flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-[540px] bg-white rounded-2xl shadow-lg p-8 md:p-10 border border-green-100 my-8">
            <div className="mb-6">
              <h1 className="text-[32px] font-black text-[#1B5E20] mb-1">{t.signup}</h1>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">{t.signupFlow.step} {step} {t.signupFlow.of} 2</p>
            </div>

            <div className="flex gap-2 mb-8">
              {[1, 2].map(s => (
                <div key={s} className={`h-2 flex-1 rounded-full transition-all duration-300 ${step >= s ? 'bg-[#1B5E20]' : 'bg-gray-200'}`} />
              ))}
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold text-center">
                  {error}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className={sectionTitleClasses}>{t.signupFlow.personalInfo}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className={labelClasses}>{t.signupFlow.fullName} *</label>
                        <input required placeholder={t.signupFlow.placeholders.fullName} className={inputClasses} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClasses}>{t.signupFlow.age} *</label>
                          <input required type="number" min={18} max={100} placeholder="18–100" className={inputClasses} value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                        </div>
                        <div>
                          <label className={labelClasses}>{t.signupFlow.gender} *</label>
                          <select required className={inputClasses} value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                            <option value="male">{t.signupFlow.options.gender.male}</option>
                            <option value="female">{t.signupFlow.options.gender.female}</option>
                            <option value="other">{t.signupFlow.options.gender.other}</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={labelClasses}>{t.signupFlow.phone} *</label>
                        <input required placeholder={t.signupFlow.placeholders.phone} type="text" inputMode="numeric" className={inputClasses} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClasses}>{t.signupFlow.language} *</label>
                          <select required className={inputClasses} value={formData.language_choice} onChange={e => {
                            const newLang = e.target.value as any;
                            setFormData({ ...formData, language_choice: newLang });
                            setLanguage(newLang);
                          }}>
                            <option value="EN">English</option>
                            <option value="HI">हिन्दी (Hindi)</option>
                            <option value="MR">मराठी (Marathi)</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelClasses}>{t.signupFlow.experienceYears} *</label>
                          <input required type="text" inputMode="numeric" placeholder="0" className={inputClasses} value={formData.experience_years || ''} onChange={e => {
                            const val = e.target.value.replace(/\D/g, '');
                            setFormData({ ...formData, experience_years: val });
                          }} />
                        </div>
                      </div>
                      {/* 6-Box PIN */}
                      <div>
                        <label className={labelClasses}>{t.signupFlow.password} * <span className="text-xs font-bold text-gray-400">{t.pinHint}</span></label>
                        <div className="flex gap-2 justify-between">
                          {Array(6).fill(0).map((_, i) => (
                            <input
                              key={i}
                              ref={el => { pinRefs.current[i] = el; }}
                              type="password"
                              inputMode="numeric"
                              maxLength={1}
                              value={pin[i]}
                              onChange={e => handlePinChange(i, e.target.value, false)}
                              onKeyDown={e => handlePinKeyDown(i, e, false)}
                              onFocus={e => e.target.select()}
                              className="w-full aspect-square text-center text-xl font-black border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-green-500/10 bg-white text-gray-900"
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={labelClasses}>{t.signupFlow.confirmPassword} *</label>
                        <div className="flex gap-2 justify-between">
                          {Array(6).fill(0).map((_, i) => (
                            <input
                              key={i}
                              ref={el => { confirmPinRefs.current[i] = el; }}
                              type="password"
                              inputMode="numeric"
                              maxLength={1}
                              value={confirmPin[i]}
                              onChange={e => handlePinChange(i, e.target.value, true)}
                              onKeyDown={e => handlePinKeyDown(i, e, true)}
                              onFocus={e => e.target.select()}
                              className="w-full aspect-square text-center text-xl font-black border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#1B5E20] focus:ring-4 focus:ring-green-500/10 bg-white text-gray-900"
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={labelClasses}>{t.signupFlow.email} ({t.other})</label>
                        <input type="email" placeholder={t.signupFlow.placeholders.email} className={inputClasses} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={sectionTitleClasses}>{t.signupFlow.farmInfo}</h3>
                    <button type="button" onClick={addFarm} className="px-4 py-2 bg-green-50 text-[#1B5E20] border-2 border-[#1B5E20] rounded-xl font-black text-sm hover:bg-green-100 transition-all">
                      {t.addAnotherFarm}
                    </button>
                  </div>

                  {signupFarms.map((farm, index) => (
                    <div key={index} className="p-6 bg-white border-2 border-gray-100 rounded-2xl relative shadow-sm hover:border-green-200 transition-colors">
                      {signupFarms.length > 1 && (
                        <button type="button" onClick={() => removeFarm(index)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 font-black p-2">
                          {t.removeFarm}
                        </button>
                      )}

                      <div className="space-y-4">
                        {/* Farm Nickname */}
                        <div>
                          <label className={labelClasses}>{t.farmNickname} *</label>
                          <input required placeholder="e.g. Home Farm" className={inputClasses} value={farm.nickname} onChange={e => updateFarm(index, 'nickname', e.target.value)} />
                        </div>

                        {/* Location Details per farm */}
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-sm font-black text-[#1B5E20] mb-3">{t.signupFlow.locationDetails}</p>
                          <div className="space-y-3">
                            <div>
                              <label className={labelClasses}>{t.signupFlow.state} *</label>
                              <select required className={inputClasses} value={farm.state || ''} onChange={e => updateFarm(index, 'state', e.target.value)}>
                                <option value="">{t.selectState}</option>
                                {t.signupFlow.options.states.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className={labelClasses}>{t.district} *</label>
                                <input required placeholder={t.signupFlow.placeholders.district} className={inputClasses} value={farm.district || ''} onChange={e => updateFarm(index, 'district', e.target.value)} />
                              </div>
                              <div>
                                <label className={labelClasses}>{t.village}</label>
                                <input placeholder={t.signupFlow.placeholders.village} className={inputClasses} value={farm.village || ''} onChange={e => updateFarm(index, 'village', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Land & Water */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={labelClasses}>{t.landType}</label>
                              <select className={inputClasses} value={farm.landType} onChange={e => updateFarm(index, 'landType', e.target.value)}>
                                <option value="Irrigated">{t.irrigated}</option>
                                <option value="Rainfed">{t.rainfed}</option>
                                <option value="Semi-Irrigated">{language === 'HI' ? 'अर्द्ध-सिंचित' : language === 'MR' ? 'अर्ध-ओलिताखालील' : 'Semi-Irrigated'}</option>
                                <option value="Organic Certified">{language === 'HI' ? 'जैविक प्रमाणित' : language === 'MR' ? 'सेंद्रिय प्रमाणित' : 'Organic Certified'}</option>
                                <option value="Greenhouse">{language === 'HI' ? 'ग्रीनहाउस' : language === 'MR' ? 'ग्रीनहाउस' : 'Greenhouse'}</option>
                                <option value="Polyhouse">{language === 'HI' ? 'पॉलीहाउस' : language === 'MR' ? 'पॉलीहाउस' : 'Polyhouse'}</option>
                                <option value="Mixed">{t.mixed}</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelClasses}>{t.signupFlow.waterAvailabilityTitle}</label>
                              <select className={inputClasses} value={farm.waterResource} onChange={e => updateFarm(index, 'waterResource', e.target.value)}>
                                <option value="Borewell">{t.signupFlow.options.waterAvailability.borewell}</option>
                                <option value="Canal">{t.signupFlow.options.waterAvailability.canal}</option>
                                <option value="River">{t.signupFlow.options.waterAvailability.river}</option>
                                <option value="Rainfed">{t.signupFlow.options.waterAvailability.rainfed}</option>
                                <option value="Tank">{t.signupFlow.options.waterAvailability.tank}</option>
                                <option value="Drip">{t.signupFlow.options.waterAvailability.drip}</option>
                                <option value="Sprinkler">{t.signupFlow.options.waterAvailability.sprinkler}</option>
                                <option value="Other">{t.other}</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Land Size + Soil Type */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClasses}>{t.landSizeAcres || 'Land Size (Acres) *'}</label>
                            <input required type="number" min="0" step="0.1" placeholder="e.g. 2.5" className={inputClasses} value={farm.landSize} onChange={e => updateFarm(index, 'landSize', e.target.value)} />
                          </div>
                          <div>
                            <label className={labelClasses}>{t.soilType}</label>
                            <select className={inputClasses} value={farm.soilType || 'black'} onChange={e => updateFarm(index, 'soilType', e.target.value)}>
                              <option value="black">{t.signupFlow.options.soilType.black}</option>
                              <option value="red">{t.signupFlow.options.soilType.red}</option>
                              <option value="loamy">{t.signupFlow.options.soilType.loamy}</option>
                              <option value="sandy">{t.signupFlow.options.soilType.sandy}</option>
                              <option value="clay">{t.signupFlow.options.soilType.clay}</option>
                              <option value="alluvial">{t.signupFlow.options.soilType.alluvial}</option>
                              <option value="laterite">{t.signupFlow.options.soilType.laterite}</option>
                            </select>
                          </div>
                        </div>

                        {/* Main Crops — prebuilt chips + custom add */}
                        <div>
                          <label className={labelClasses}>{t.mainCrops}</label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {t.signupFlow.options.crops.map(cropName => {
                              const selected = (farm.crops || []).includes(cropName);
                              return (
                                <button
                                  key={cropName}
                                  type="button"
                                  onClick={() => toggleCrop(index, cropName)}
                                  className={`px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-colors ${selected
                                    ? 'bg-[#1B5E20] text-white border-[#1B5E20]'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B5E20] hover:text-[#1B5E20]'
                                    }`}
                                >
                                  {selected ? '✓ ' : ''}{cropName}
                                </button>
                              );
                            })}
                          </div>
                          {/* Custom crop input */}
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              placeholder="Add custom crop..."
                              className={`${inputClasses} text-sm py-2`}
                              value={customCropInputs[index] || ''}
                              onChange={e => setCustomCropInputs(prev => { const n = [...prev]; n[index] = e.target.value; return n; })}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCrop(index); } }}
                            />
                            <button
                              type="button"
                              onClick={() => addCustomCrop(index)}
                              className="px-4 py-2 bg-[#1B5E20] text-white rounded-xl font-black text-lg hover:bg-[#2E7D32] transition-colors flex-shrink-0"
                            >+</button>
                          </div>
                          {(farm.crops && farm.crops.length > 0) && (
                            <p className="text-xs text-gray-500 mt-2 font-bold">Selected: {farm.crops.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-4 pt-4">
                <div className="flex gap-4">
                  {step > 1 && (
                    <button type="button" onClick={handleBack} className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-black hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]">
                      {t.back}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-4 bg-[#1B5E20] text-white rounded-xl font-black text-lg hover:bg-[#2E7D32] transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? t.loading : (step === 2 ? t.submit : t.next)}
                  </button>
                </div>
              </div>

              <div className="text-center mt-4">
                <p className="text-gray-500 text-sm font-bold">
                  {t.alreadyHaveAccount} <button type="button" onClick={onSwitch} className="text-[#1B5E20] font-black hover:underline">{t.login}</button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div >
    </div >
  );
};


const AppContent: React.FC = () => {
  const { setLanguage, hasSelectedLanguage, t, language } = useLanguage();
  const { setFarms, setActiveFarm } = useFarm();
  const location = useLocation();

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
            setFarms(profile.farms || []);
            if (profile.farms && profile.farms.length > 0) setActiveFarm(profile.farms[0]);
            fetchWeather(getBestLocation(profile));

            // Mandatory Language Sync: If user has a preference, sync it global state
            if (profile.language && profile.language !== language) {
              setLanguage(profile.language);
            }
          }
        });
      } else {
        setUser(null);
        setFarms([]);
        setActiveFarm(null);
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

  const handleLogin = async (phone: string, password?: string) => {
    if (!password) {
      throw new Error("Password required");
    }
    const email = `${phone}@krishisahai.fake`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login Error:", error);
      throw error;
    }
  };

  const handleSignup = async (profile: UserProfile, password?: string) => {
    if (!password) {
      throw new Error("Password required");
    }
    const email = `${profile.phone}@krishisahai.fake`;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Ensure the current application language is saved with the profile
      const finalProfile = { ...profile, language };
      await setDoc(doc(db, "users", userCredential.user.uid), finalProfile);
    } catch (error: any) {
      console.error("Signup Error:", error);
      throw error;
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center text-[#1F5F4A] font-bold text-xl animate-pulse">
          <RefreshCw className="animate-spin mr-2" /> {t.loading}
        </div>
      ) : !hasSelectedLanguage ? (
        <LanguageSelection onSelect={setLanguage} />
      ) : !user ? (
        authView === 'login' ? <LoginFlow onLogin={handleLogin} onSwitch={() => setAuthView('signup')} /> : <SignupFlow onSignup={handleSignup} onSwitch={() => setAuthView('login')} />
      ) : (

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
            onAuthSwitch={setAuthView}
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
            <Route path="/advisory" element={<BusinessAdvisory />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/health" element={<FarmHealth />} />
            <Route path="/crop-care" element={<CropCare />} />
            <Route path="/crop-care/disease" element={<DiseaseDetector />} />
            <Route path="/crop-care/pest" element={<PestDetector />} />
            <Route path="/waste-to-value" element={<WasteToValue />} />
            <Route path="/hub" element={<KnowledgeHub />} />
            <Route path="/knowledge/:slug" element={<ArticleDetail />} />
            <Route path="/business/:id" element={<BusinessDetail />} />
            <Route path="/roadmap/:businessName" element={<Roadmap />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/profile/edit" element={<EditProfile />} />
          </Routes>

        </div>
      )}
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ThemeProvider>
        <LanguageProvider>
          <FarmProvider>
            <AppContent />
          </FarmProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Router>
  );
};

export default App;
