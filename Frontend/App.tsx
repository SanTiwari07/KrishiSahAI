import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Chatbot from './pages/Chatbot';
import BusinessAdvisory from './pages/BusinessAdvisory';
import CropCare from './pages/CropCare';
import WasteToValue from './pages/WasteToValue';
import KnowledgeHub from './pages/KnowledgeHub';
import BusinessDetail from './pages/BusinessDetail';
import Roadmap from './pages/Roadmap';
import NewsPage from './pages/NewsPage';
import EditProfile from './pages/EditProfile';
import { Language, UserProfile } from './types';
import { auth, db, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from './firebase';
import { onSnapshot, doc, setDoc } from 'firebase/firestore';
import { RefreshCw, LogOut, Settings } from 'lucide-react';
import { api } from './services/api';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import logo from './src/assets/logo.png';
import WeatherModal from './components/WeatherModal';

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
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E6E6E6] py-4 px-6 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="KrishiSahAI Logo" className="h-9 w-auto object-contain translate-y-[3px]" />
          <span className="text-xl font-bold tracking-tight text-[#1E1E1E]">{t.brandName}</span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-10 text-[15px] font-semibold text-[#555555]">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`hover:text-[#043744] transition-colors ${location.pathname === item.path ? 'text-[#043744] border-b-2 border-[#043744] pb-1' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-4">
          {user && (
            <div className={`flex items-center gap-1 bg-[#FAFAF7] border border-[#E6E6E6] rounded-full px-1 py-0.5 transition-all group ${weatherLoading ? 'opacity-80' : ''}`}>
              <button
                onClick={toggleWeather}
                className="flex items-center gap-2 px-3 py-1.5 bg-transparent rounded-full text-[13px] font-bold text-[#043744] hover:bg-[#E8F5E9] transition-all"
                title="View Weather Details"
              >
                <span className="group-hover:scale-110 transition-transform">☁</span>
                <span className="line-clamp-1 max-w-[150px]">{getDisplayLocation(user)}: {getWeatherDisplay()}</span>
              </button>
              <button
                onClick={refreshWeather}
                className={`p-1.5 rounded-full hover:bg-[#E8F5E9] text-[#043744] transition-all ${weatherLoading ? 'animate-spin' : 'hover:scale-110'}`}
                title="Refresh Weather"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}

          <div className="flex bg-[#FAFAF7] border border-[#E6E6E6] rounded-xl p-1 gap-1">
            {[{ code: 'EN', label: 'ENG' }, { code: 'HI', label: 'हिंदी' }, { code: 'MR', label: 'मराठी' }].map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code as Language)}
                className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all ${language === l.code ? 'bg-[#043744] text-white shadow-md' : 'text-stone-400 hover:text-[#043744]'} ${l.code !== 'EN' ? 'devanagari' : ''}`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {user && (
            <div className="relative group">
              <button className="flex items-center gap-2 bg-[#FAFAF7] border border-[#E6E6E6] px-3 py-1.5 rounded-xl hover:bg-stone-100 transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#043744] flex items-center justify-center text-white font-bold text-sm">
                  {user.name && user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-[#1E1E1E] leading-tight">{user.name}</p>
                  <p className="text-[10px] text-[#555555] capitalize">{user.occupation}</p>
                </div>
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E6E6E6] rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link to="/profile/edit" className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-[#555555] hover:bg-[#FAFAF7] hover:text-[#043744] transition-colors">
                  <Settings size={16} /> Edit Profile
                </Link>
                <div className="h-px bg-[#E6E6E6]"></div>
                <button
                  onClick={logout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} /> {t.logout}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header >
  );
};

const LoginFlow: React.FC<{ onLogin: (e: string, p: string) => void; onSwitch: () => void }> = ({ onLogin, onSwitch }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

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
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="bg-white border border-[#E6E6E6] p-10 rounded-[48px] shadow-2xl w-full max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="flex flex-col items-center mb-10">
          <img src={logo} alt="KrishiSahAI Logo" className="h-48 w-auto object-contain mb-4" />
          <p className="text-[#043744] font-bold text-sm tracking-widest uppercase">{t.loginSub}</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.email} *</label>
              <input
                required
                type="email"
                placeholder="farmer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] text-[#1E1E1E] rounded-2xl focus:outline-none focus:border-[#043744] focus:ring-4 focus:ring-[#043744]/5 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.password} *</label>
              <div className="relative">
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] text-[#1E1E1E] rounded-2xl focus:outline-none focus:border-[#043744] focus:ring-4 focus:ring-[#043744]/5 transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-[#043744] text-white rounded-3xl font-extrabold text-xl hover:bg-[#000D0F] transition-all shadow-lg hover:scale-[1.02] disabled:opacity-50"
          >
            {loading ? t.loggingIn : t.login}
          </button>

          <div className="text-center mt-8">
            <p className="text-[#555555] text-sm">
              {t.dontHaveAccount} <button type="button" onClick={onSwitch} className="text-[#043744] font-bold hover:underline">{t.signup}</button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

const SignupFlow: React.FC<{ onSignup: (p: UserProfile, pass: string) => void; onSwitch: () => void }> = ({ onSignup, onSwitch }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [formData, setFormData] = useState<UserProfile>({
    name: '', age: '', gender: 'Male', occupation: 'Farmer', phone: '', email: '',
    state: '', district: '', village: '',
    landSize: '', soilType: 'Alluvial Soil', waterAvailability: 'Borewell', mainCrops: [], location: ''
  });

  const cropsList = ["Rice", "Wheat", "Maize", "Sugarcane", "Cotton", "Groundnut", "Soybean", "Mustard", "Pulses", "Vegetables", "Fruits", "Spices", "Tea", "Coffee", "Jute"];

  const toggleCrop = (crop: string) => {
    setFormData(prev => ({
      ...prev,
      mainCrops: prev.mainCrops.includes(crop)
        ? prev.mainCrops.filter(c => c !== crop)
        : [...prev.mainCrops, crop]
    }));
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSignup({ ...formData, location: `${formData.village}, ${formData.district}` }, password);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="bg-white border border-[#E6E6E6] p-10 rounded-[48px] shadow-2xl w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[#1F5F4A] rounded-xl flex items-center justify-center shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M2.7 10.3l9.3-9.3 9.3 9.3" /><path d="M4 11v11h16V11" /><path d="M9 14h6v8H9z" /></svg>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1E1E1E]">{t.signupTitle}</h1>
          <p className="text-[#555555] font-semibold text-sm">{t.signupSub}</p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-4 mb-10 px-4">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-grow h-2 bg-[#E6E6E6] rounded-full overflow-hidden">
              <div className={`h-full bg-[#1F5F4A] transition-all duration-500 ${step >= s ? 'w-full' : 'w-0'}`} />
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-[#1E1E1E]">{t.personalInfo}</h2>
                <p className="text-xs text-[#555555] font-bold uppercase tracking-widest mt-1">{t.step} 1 / 3</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.fullName} *</label>
                  <input required placeholder="Enter your full name" className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.age} *</label>
                    <input required type="number" placeholder="Enter your age" className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.gender} *</label>
                    <select className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.occupation} *</label>
                  <select className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.occupation} onChange={e => setFormData({ ...formData, occupation: e.target.value })}>
                    <option>Farmer</option><option>Trader</option><option>Agricultural Scientist</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.phoneNumber} *</label>
                  <input required placeholder="+91 XXXXX XXXXX" className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.email} *</label>
                  <input required type="email" placeholder="farmer@example.com" className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.password} *</label>
                  <input required type="password" placeholder="Create a password" className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </div>
              <button type="button" onClick={handleNext} className="w-full py-5 bg-[#1F5F4A] text-white rounded-2xl font-bold text-lg hover:bg-[#184d3c] transition-all flex items-center justify-center gap-2">
                {t.next} <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7l7 7-7 7" /></svg>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-[#1E1E1E]">{t.locationDetails}</h2>
                <p className="text-xs text-[#555555] font-bold uppercase tracking-widest mt-1">{t.step} 2 / 3</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.state} *</label>
                  <select className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })}>
                    <option value="">{t.selectState}</option>
                    <option>Maharashtra</option><option>Karnataka</option><option>Punjab</option><option>Uttar Pradesh</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.district} *</label>
                  <input required placeholder="Enter district name" className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.village} *</label>
                  <input required placeholder="Enter village/town name" className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.village} onChange={e => setFormData({ ...formData, village: e.target.value })} />
                </div >
              </div >
              <div className="flex gap-4">
                <button type="button" onClick={handleBack} className="flex-grow py-5 bg-[#FAFAF7] border border-[#E6E6E6] text-[#555555] rounded-2xl font-bold text-lg hover:bg-stone-100 transition-all">{t.back}</button>
                <button type="button" onClick={handleNext} className="flex-grow py-5 bg-[#1F5F4A] text-white rounded-2xl font-bold text-lg hover:bg-[#184d3c] transition-all flex items-center justify-center gap-2">
                  {t.next} <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7l7 7-7 7" /></svg>
                </button>
              </div>
            </div >
          )}

          {
            step === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-[#1E1E1E]">{t.farmInfo}</h2>
                  <p className="text-xs text-[#555555] font-bold uppercase tracking-widest mt-1">{t.step} 3 / 3</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.landSizeAcres} *</label>
                    <input required type="number" placeholder="Enter land size in acres" className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.landSize} onChange={e => setFormData({ ...formData, landSize: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.soilType} *</label>
                    <select className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.soilType} onChange={e => setFormData({ ...formData, soilType: e.target.value })}>
                      <option>Alluvial Soil</option><option>Black Soil</option><option>Red Soil</option><option>Sandy Soil</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.waterAvailability} *</label>
                    <select className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1F5F4A]" value={formData.waterAvailability} onChange={e => setFormData({ ...formData, waterAvailability: e.target.value })}>
                      <option>Borewell</option><option>Canal</option><option>River</option><option>Rainfed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.mainCrops} *</label>
                    <div className="flex flex-wrap gap-2">
                      {cropsList.map(crop => (
                        <button key={crop} type="button" onClick={() => toggleCrop(crop)} className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${formData.mainCrops.includes(crop) ? 'bg-[#1F5F4A] text-white border-[#1F5F4A]' : 'bg-[#FAFAF7] text-[#555555] border-[#E6E6E6] hover:border-[#1F5F4A]'}`}>
                          {crop}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={handleBack} className="flex-grow py-5 bg-[#FAFAF7] border border-[#E6E6E6] text-[#555555] rounded-2xl font-bold text-lg hover:bg-stone-100 transition-all">{t.back}</button>
                  <button type="submit" className="flex-grow py-5 bg-[#1F5F4A] text-white rounded-2xl font-bold text-lg hover:bg-[#184d3c] transition-all">{t.submit}</button>
                </div>
              </div>
            )
          }
        </form >
      </div >
    </div >
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
    await signInWithEmailAndPassword(auth, e, p);
  };

  const handleSignup = async (profile: UserProfile, pass: string) => {
    const res = await createUserWithEmailAndPassword(auth, profile.email, pass);
    await setDoc(doc(db, "users", res.user.uid), profile);
    setUser(profile);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center text-[#1F5F4A] bg-[#FAFAF7]">{t.loading}</div>
      ) : !user ? (
        authView === 'login' ? <LoginFlow onLogin={handleLogin} onSwitch={() => setAuthView('signup')} /> : <SignupFlow onSignup={handleSignup} onSwitch={() => setAuthView('login')} />
      ) : (
        <Router>
          <div className="min-h-screen bg-[#FDFDFC]">
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
              <Route path="/" element={<Home lang={lang} />} />
              <Route path="/chat" element={<Chatbot lang={lang} />} />
              <Route path="/advisory" element={<BusinessAdvisory lang={lang} user={user} />} />
              <Route path="/news" element={<NewsPage lang={lang} user={user} />} />
              <Route path="/crop-care" element={<CropCare lang={lang} />} />
              <Route path="/waste-to-value" element={<WasteToValue lang={lang} />} />
              <Route path="/hub" element={<KnowledgeHub lang={lang} />} />
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
