import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
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
import PestForecast from './pages/PestForecast';
import Chatbot from './pages/Chatbot';
import { Leaf } from 'lucide-react';
import { Language, UserProfile, Farm } from './types';

import { auth, db, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from './firebase';
import { onSnapshot, doc, setDoc, getDoc } from 'firebase/firestore';
import { MapPin, Settings, LogOut, Menu, X, Plus, User, Info, Smartphone, CheckCircle, ArrowRight, ChevronRight, Wind, Droplets, Thermometer, Sun, CloudRain, RefreshCw, Cloud, Newspaper, BookOpen, Sprout, Layout, Briefcase, Recycle, Map, ArrowLeft, MessageSquare } from 'lucide-react';
import { api } from './src/services/api';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { FarmProvider, useFarm } from './src/context/FarmContext';
import logo from './src/assets/logo.png';
import WeatherModal from './components/WeatherModal';
import { normalizeValue, getLocalizedValue } from './src/utils/localizationUtils';
import en from './src/locales/en.json';

const getBestLocation = (farm: Farm | null) => {
  if (!farm) return "";
  const { district, state } = farm;
  if (district && state) return `${district}, ${state}`;
  return district || state || "India";
};

const getDisplayLocation = (farm: Farm | null, lang: string) => {
  if (!farm) return "";
  const { district, state } = farm;
  const localizedState = getLocalizedValue(state, 'states', lang);
  return district || localizedState || "India";
};



const Header: React.FC<{

  toggleWeather: () => void;
  user: UserProfile | null;
  logout: () => void;
  weatherData?: any;
  weatherLoading?: boolean;
  refreshWeather: () => void;
  onAuthSwitch: (view: 'login' | 'signup') => void;
}> = ({ toggleWeather, user, logout, weatherData, weatherLoading, refreshWeather, onAuthSwitch }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { activeFarm, setActiveFarm, farms } = useFarm();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const navItems = [
    { label: t.navHome, path: '/' },
    { label: t.navNews, path: '/news' },
  ];

  const getWeatherDisplay = () => {
    if (weatherLoading) return "...";
    if (!weatherData) return "N/A";
    return `${weatherData.temperature}°C`;
  };

  const isFeaturePage = location.pathname !== '/' && location.pathname !== '/chat' && location.pathname !== '/news';

  const quickFeatures = [
    { icon: <Sprout size={22} />, path: '/crop-care', label: t.navCropCare },
    { icon: <Layout size={22} />, path: '/plan', label: t.navPlan },
    { icon: <Recycle size={22} />, path: '/waste-to-value', label: t.navWaste },
  ];

  return (
    <header className="fixed top-0 z-[60] w-full bg-[#1B5E20] border-b border-[#2E7D32] shadow-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-[64px]">
          {/* Left: Navigation Icon (Hamburger everywhere) */}
          <div className="flex items-center gap-1 md:gap-3">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Menu"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Center: Feature Navigation (bigger icons + labels) - Shown on feature pages */}
          {user && isFeaturePage && (
            <div className="flex items-center gap-1 md:gap-2 mx-auto">
              {quickFeatures.map((f) => (
                <Link
                  key={f.path}
                  to={f.path}
                  title={f.label}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all active:scale-95 ${(f.path === '/' ? location.pathname === '/' : location.pathname.startsWith(f.path))
                      ? 'bg-white text-[#1B5E20] shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {f.icon}
                  <span className="hidden sm:inline">{f.label}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Desktop Navigation (Main Links) - Hidden on feature pages if many icons, or keep it? The user said "add buttons here only" */}
          {user && !isFeaturePage && (
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
          <div className="flex items-center gap-2 md:gap-4 relative z-50">
            {user && !isFeaturePage && (
              <div className="flex items-center gap-3 md:gap-6 mr-2">
                <Link
                  to="/news"
                  className="relative flex items-center justify-center w-12 h-12 bg-[#FAFAF7] border border-[#E6E6E6] rounded-full hover:bg-[#E8F5E9] transition-all shadow-sm group"
                  title={t.navNews || "News"}
                >
                  <Newspaper size={22} className="text-[#043744] group-hover:scale-110 transition-transform" />
                </Link>
                <button
                  onClick={toggleWeather}
                  className="relative flex items-center justify-center w-12 h-12 bg-[#FAFAF7] border border-[#E6E6E6] rounded-full hover:bg-[#E8F5E9] transition-all shadow-sm group"
                  title={(t as any).navWeather || "Weather"}
                >
                  <Cloud size={22} className="text-[#043744] group-hover:scale-110 transition-transform" />
                </button>
              </div>
            )}
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(prev => !prev)}
                  className="flex items-center gap-2 md:gap-3 bg-white/5 border border-white/20 px-3 py-2 md:px-4 md:py-2 hover:bg-white/10 transition-colors rounded-xl"
                >
                  <div className="w-8 h-8 bg-white flex items-center justify-center text-[#1B5E20] font-bold text-sm rounded-full">
                    {user.name && user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-white leading-tight uppercase">{user.name}</p>
                  </div>
                </button>

                <div className={`absolute right-0 top-full mt-2 w-64 bg-white border-2 border-[#1B5E20] shadow-xl transition-all z-50 rounded-xl overflow-hidden ${profileOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                  {/* Farm Switcher */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t.switchFarm}</p>
                    <div className="space-y-1">
                      {farms.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => { setActiveFarm(f); setProfileOpen(false); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-all ${activeFarm?.nickname === f.nickname ? 'bg-[#1B5E20] text-white' : 'text-gray-700 hover:bg-green-50'}`}
                        >
                          {f.nickname || `${t.step} ${i + 1}`}
                        </button>
                      ))}
                      <Link
                        to="/profile/edit"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-bold text-[#1B5E20] hover:bg-green-50 mt-1 dashed-border border-2 border-dashed border-green-100"
                      >
                        <Plus size={14} /> {t.addNewFarm}
                      </Link>
                    </div>
                  </div>

                  <Link to="/hub" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 w-full px-5 py-4 text-sm font-bold text-[#1B5E20] hover:bg-green-50 transition-colors border-b border-gray-100">
                    <BookOpen size={16} /> {t.navHub || "Knowledge Hub"}
                  </Link>
                  <Link to="/" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 w-full px-5 py-4 text-sm font-bold text-[#1B5E20] hover:bg-green-50 transition-colors border-b border-gray-100">
                    <Layout size={16} /> {t.navHome || "Home"}
                  </Link>
                  <Link to="/advisory" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 w-full px-5 py-4 text-sm font-bold text-[#1B5E20] hover:bg-green-50 transition-colors border-b border-gray-100">
                    <Briefcase size={16} /> {t.navAdvisory || "Business Advisory"}
                  </Link>
                  {isFeaturePage && (
                    <>
                      <Link to="/news" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 w-full px-5 py-4 text-sm font-bold text-[#1B5E20] hover:bg-green-50 transition-colors border-b border-gray-100">
                        <Newspaper size={16} /> {t.navNews || "News"}
                      </Link>
                      <button onClick={() => { toggleWeather(); setProfileOpen(false); }} className="flex items-center gap-3 w-full px-5 py-4 text-left text-sm font-bold text-[#1B5E20] hover:bg-green-50 transition-colors border-b border-gray-100">
                        <Cloud size={16} /> {(t as any).navWeather || "Weather"}
                      </button>
                    </>
                  )}
                  <Link to="/profile/edit" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 w-full px-5 py-4 text-sm font-bold text-[#1B5E20] hover:bg-green-50 transition-colors border-b border-gray-100">
                    <Settings size={16} /> {t.editProfile}
                  </Link>
                  <button
                    onClick={() => { logout(); setProfileOpen(false); }}
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
      </div>
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
        <div className="min-h-full flex items-center justify-center p-4 md:p-12">
          <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-lg p-5 md:p-10 border border-green-100">
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
                  <div className="flex gap-1 md:gap-2 justify-between">
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
    { nickname: t.signupFlow.defaultFarmName, landType: 'Irrigated', waterResource: 'Borewell', soilType: 'Black', landSize: '', unit: 'Acre', crops: [], state: '', district: '', village: '' }
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
    setSignupFarms(prev => [...prev, { nickname: `${t.signupFlow.step} ${prev.length + 1}`, landType: 'Irrigated', waterResource: 'Borewell', soilType: 'Black', landSize: '', unit: 'Acre', crops: [], state: '', district: '', village: '' }]);
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
        <div className="min-h-full flex items-center justify-center p-4 md:p-12">
          <div className="w-full max-w-[540px] bg-white rounded-2xl shadow-lg p-5 md:p-10 border border-green-100 my-4 md:my-8">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col justify-end">
                          <label className={labelClasses}>{t.signupFlow.age} *</label>
                          <input required type="number" min={18} max={100} placeholder="18–100" className={inputClasses} value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                        </div>
                        <div className="flex flex-col justify-end">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col justify-end">
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
                        <div className="flex flex-col justify-end">
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
                        <div className="flex gap-1 md:gap-2 justify-between">
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
                        <div className="flex gap-1 md:gap-2 justify-between">
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
                                {t.signupFlow.options.states.map((s, i) => (
                                  <option key={en.signupFlow.options.states[i]} value={en.signupFlow.options.states[i]}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="flex flex-col justify-end">
                                <label className={labelClasses}>{t.district} *</label>
                                <input required placeholder={t.signupFlow.placeholders.district} className={inputClasses} value={farm.district || ''} onChange={e => updateFarm(index, 'district', e.target.value)} />
                              </div>
                              <div className="flex flex-col justify-end">
                                <label className={labelClasses}>{t.village}</label>
                                <input placeholder={t.signupFlow.placeholders.village} className={inputClasses} value={farm.village || ''} onChange={e => updateFarm(index, 'village', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Land & Water */}
                        <div className="pt-2 border-t border-gray-100">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col justify-end">
                              <label className={labelClasses}>{t.landType}</label>
                              <select className={inputClasses} value={farm.landType} onChange={e => updateFarm(index, 'landType', e.target.value)}>
                                <option value="Irrigated">{t.landTypes.irrigated}</option>
                                <option value="Rainfed">{t.landTypes.rainfed}</option>
                                <option value="Semi-Irrigated">{t.landTypes.semiIrrigated}</option>
                                <option value="Organic Certified">{t.landTypes.organicCertified}</option>
                                <option value="Greenhouse">{t.landTypes.greenhouse}</option>
                                <option value="Polyhouse">{t.landTypes.polyhouse}</option>
                                <option value="Mixed">{t.landTypes.mixed}</option>
                              </select>
                            </div>
                            <div className="flex flex-col justify-end">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col justify-end">
                            <label className={labelClasses}>{t.landSizeAcres || 'Land Size (Acres) *'}</label>
                            <input required type="number" min="0" step="0.1" placeholder="e.g. 2.5" className={inputClasses} value={farm.landSize} onChange={e => updateFarm(index, 'landSize', e.target.value)} />
                          </div>
                          <div className="flex flex-col justify-end">
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
                                  {selected ? ' ' : ''}{cropName}
                                </button>
                              );
                            })}
                          </div>
                          {/* Custom crop input */}
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              placeholder={t.customCropPlaceholder}
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
                            <p className="text-xs text-gray-500 mt-2 font-bold">{t.common.selected}: {farm.crops.join(', ')}</p>
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
  const { setLanguage, t, language } = useLanguage();
  const { setFarms, setActiveFarm, activeFarm } = useFarm();
  const location = useLocation();
  const navigate = useNavigate();

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
            // Removed direct fetchWeather here as the useEffect below will handle it when activeFarm is set


            // Mandatory Language Sync: If user has a preference, sync it global state
            if (profile.language) {
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

  useEffect(() => {
    if (activeFarm) {
      fetchWeather(getBestLocation(activeFarm));
    }
  }, [activeFarm]);

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
    if (!weatherData && activeFarm) {
      fetchWeather(getBestLocation(activeFarm));
    }
  };

  const handleRefreshWeather = () => {
    if (activeFarm) {
      fetchWeather(getBestLocation(activeFarm));
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
      ) : !user ? (
        authView === 'login' ? <LoginFlow onLogin={handleLogin} onSwitch={() => setAuthView('signup')} /> : <SignupFlow onSignup={handleSignup} onSwitch={() => setAuthView('login')} />
      ) : (
        <div className={`min-h-[100dvh] pt-[68px] ${location.pathname === '/' || location.pathname === '/chat' ? 'bg-white' : ''}`}>
          {/* Updated Header with refresh and loading props */}
          <Header
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
            location={getBestLocation(activeFarm)}
          />



          <Routes>
            <Route path="/" element={<Chatbot />} />
            <Route path="/chat" element={<Chatbot />} />
            <Route path="/plan" element={<Home />} />
            <Route path="/advisory" element={<BusinessAdvisory />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/health" element={<FarmHealth />} />
            <Route path="/crop-care" element={<CropCare />} />
            <Route path="/crop-care/disease" element={<DiseaseDetector />} />
            <Route path="/crop-care/pest" element={<PestDetector />} />
            <Route path="/crop-care/forecast" element={<PestForecast />} />
            <Route path="/waste-to-value" element={<WasteToValue />} />
            <Route path="/hub" element={<KnowledgeHub />} />
            <Route path="/knowledge/:slug" element={<ArticleDetail />} />
            <Route path="/business/:id" element={<BusinessDetail />} />
            <Route path="/roadmap/:businessName" element={<Roadmap />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-8">
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex flex-col items-center justify-center mb-6 shadow-sm">
                  <span className="text-4xl font-black">404</span>
                </div>
                <h1 className="text-3xl font-extrabold text-[#1B5E20] mb-4">Page Not Found</h1>
                <p className="text-gray-500 font-medium mb-8">The page you are looking for has been moved or doesn't exist.</p>
                <Link to="/" className="px-8 py-4 bg-[#1B5E20] text-white rounded-xl font-bold hover:bg-[#2E7D32] transition-colors shadow-lg">
                  Return to Home
                </Link>
              </div>
            } />
          </Routes>

          {/* Floating Chatbot Button — hidden on chat, home, and plan page */}
          {location.pathname !== '/chat' && location.pathname !== '/' && location.pathname !== '/plan' && (
            <Link
              to="/chat"
              state={{ newChatWithGreeting: true }}
              className="fixed bottom-6 right-6 w-16 h-16 bg-white hover:bg-gray-50 text-[#1B5E20] rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 z-50 group border-2 border-[#1B5E20]"
              title="Chat with AI"
            >
              <img src={logo} alt="KrishiSahAI" className="w-10 h-10 object-contain" />

              {/* Tooltip */}
              <span className="absolute right-full mr-4 bg-white text-[#1B5E20] px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap border border-green-100">
                Ask KrishiSahAI
              </span>
            </Link>
          )}

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
