
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Language, Farm } from '../types';
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Save, ArrowLeft, User, MapPin, Sprout, RefreshCw, Plus, Trash2, Globe } from 'lucide-react';
import { useLanguage } from '../src/context/LanguageContext';
import { useFarm } from '../src/context/FarmContext';
import en from '../src/locales/en.json';
import hi from '../src/locales/hi.json';
import mr from '../src/locales/mr.json';

const normalizeValue = (val: string, category: 'states' | 'crops') => {
    if (!val) return val;
    const enList = en.signupFlow.options[category];
    if (enList.includes(val)) return val;

    const hiList = hi.signupFlow.options[category];
    const hiIdx = hiList.indexOf(val);
    if (hiIdx !== -1) return enList[hiIdx];

    const mrList = mr.signupFlow.options[category];
    const mrIdx = mrList.indexOf(val);
    if (mrIdx !== -1) return enList[mrIdx];

    return val;
};

const EditProfile: React.FC = () => {
    const { t, setLanguage, language } = useLanguage();
    const { setFarms: setGlobalFarms } = useFarm();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState<UserProfile>({
        name: '',
        phone: '',
        email: '',
        age: '',
        gender: 'male',
        language: language,
        farms: [
            { nickname: 'My Farm', landType: 'Irrigated', waterResource: 'Borewell', soilType: 'black', landSize: '', unit: 'Acre', crops: [], state: '', district: '', village: '' }
        ],
        experience_years: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            if (!auth.currentUser) {
                navigate('/');
                return;
            }
            try {
                const docRef = doc(db, "users", auth.currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as UserProfile;
                    // Ensure farms are properly initialized
                    setFormData({
                        ...data,
                        language: data.language || language,
                        farms: (data.farms || []).map((f: any) => ({
                            nickname: f.nickname || '',
                            landType: f.landType || 'Irrigated',
                            waterResource: f.waterResource || 'Borewell',
                            soilType: f.soilType || 'black',
                            landSize: f.landSize?.toString() || '',
                            unit: f.unit || 'Acre',
                            crops: (f.crops || []).map((c: string) => normalizeValue(c, 'crops')),
                            state: normalizeValue(f.state || (data as any).location?.state || '', 'states'),
                            district: f.district || (data as any).location?.district || '',
                            village: f.village || (data as any).location?.village || ''
                        }))
                    });
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setFetching(false);
            }
        };
        fetchProfile();
    }, [navigate, language]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'experience_years') {
            const val = value.replace(/\D/g, '');
            setFormData(prev => ({ ...prev, experience_years: val }));
            return;
        }
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...(prev as any)[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const addFarm = () => {
        setFormData(prev => ({
            ...prev,
            farms: [...prev.farms, { nickname: `Farm ${prev.farms.length + 1}`, landType: 'Irrigated', waterResource: 'Borewell', soilType: 'black', landSize: '', unit: 'Acre', crops: [], state: '', district: '', village: '' }]
        }));
    };

    const removeFarm = (index: number) => {
        if (formData.farms.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            farms: prev.farms.filter((_, i) => i !== index)
        }));
    };

    const updateFarm = (index: number, field: keyof Farm, value: any) => {
        const newFarms = [...formData.farms];
        newFarms[index] = { ...newFarms[index], [field]: value };
        setFormData(prev => ({ ...prev, farms: newFarms }));
    };

    const toggleCrop = (farmIndex: number, cropName: string) => {
        const newFarms = [...formData.farms];
        const currentCrops = newFarms[farmIndex].crops || [];
        if (currentCrops.includes(cropName)) {
            newFarms[farmIndex].crops = currentCrops.filter(c => c !== cropName);
        } else {
            newFarms[farmIndex].crops = [...currentCrops, cropName];
        }
        setFormData(prev => ({ ...prev, farms: newFarms }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        setLoading(true);
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, { ...formData });

            // Sync with Global Context
            setGlobalFarms(formData.farms);

            // Update app language if changed
            if (formData.language !== language) {
                setLanguage(formData.language);
            }

            alert(t.profileUpdated || "Profile updated successfully!");
            navigate('/');
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="min-h-screen flex items-center justify-center text-[#1B5E20] font-bold">Loading...</div>;

    const inputClasses = "w-full p-4 bg-[#E8F5E9] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1B5E20] text-[#1E1E1E] font-medium transition-all shadow-sm";
    const labelClasses = "block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2";

    return (
        <div className="min-h-screen p-4 md:p-8 bg-[#F5F9F6]">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 font-bold mb-6 hover:text-[#1B5E20] transition-colors">
                    <ArrowLeft className="w-5 h-5" /> {t.back}
                </button>

                <div className="bg-white rounded-[40px] border border-green-100 shadow-xl p-6 md:p-10">
                    <div className="flex items-center gap-6 mb-10 pb-6 border-b border-gray-100">
                        <div className="w-20 h-20 bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] rounded-3xl flex items-center justify-center text-white shadow-lg transform -rotate-3">
                            <User className="w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-[#1E1E1E] tracking-tight">{t.editProfile}</h1>
                            <p className="text-[#688A7E] font-semibold">{t.updateProfileDesc}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* Language Selection */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-extrabold text-[#1B5E20] flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-[#1B5E20]" />
                                </div>
                                {t.selectLanguage}
                            </h2>
                            <div className="grid grid-cols-3 gap-4">
                                {['EN', 'HI', 'MR'].map((l) => (
                                    <button
                                        key={l}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, language: l as Language })}
                                        className={`p-4 rounded-2xl border-2 font-black transition-all ${formData.language === l ? 'bg-[#1B5E20] text-white border-[#1B5E20] shadow-lg scale-105' : 'bg-white text-gray-400 border-gray-100 hover:border-green-200'}`}
                                    >
                                        {l === 'EN' ? 'English' : l === 'HI' ? 'हिंदी' : 'मराठी'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Age & Gender Fields */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-extrabold text-[#1B5E20] flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                    <User className="w-4 h-4 text-[#1B5E20]" />
                                </div>
                                {t.signupFlow.personalInfo}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex flex-col justify-end">
                                    <label className={labelClasses}>{t.signupFlow.age}</label>
                                    <input type="number" name="age" value={formData.age} onChange={handleChange} className={inputClasses} required />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className={labelClasses}>{t.signupFlow.gender}</label>
                                    <select name="gender" value={formData.gender} onChange={handleChange} className={inputClasses} required>
                                        <option value="male">{t.signupFlow.options.gender.male}</option>
                                        <option value="female">{t.signupFlow.options.gender.female}</option>
                                        <option value="other">{t.signupFlow.options.gender.other}</option>
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className={labelClasses}>{t.signupFlow.experienceYears}</label>
                                    <input type="text" inputMode="numeric" name="experience_years" value={formData.experience_years || ''} onChange={handleChange} className={inputClasses} placeholder="0" required />
                                </div>
                            </div>
                        </div>

                        {/* Personal Details */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-extrabold text-[#1B5E20] flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                    <User className="w-4 h-4 text-[#1B5E20]" />
                                </div>
                                {t.personalInfo}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col justify-end">
                                    <label className={labelClasses}>{t.fullName}</label>
                                    <input name="name" value={formData.name} onChange={handleChange} className={inputClasses} required />
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className={labelClasses}>{t.phoneNumber}</label>
                                    <input name="phone" value={formData.phone} onChange={handleChange} className={inputClasses} required />
                                </div>
                                <div className="md:col-span-2 flex flex-col justify-end">
                                    <label className={labelClasses}>{t.email} ({t.other})</label>
                                    <input name="email" value={formData.email} onChange={handleChange} className={inputClasses} />
                                </div>
                            </div>
                        </div>

                        {/* Note: Top-level location is now automatically updated from Farm #1 */}

                        {/* Farm Information */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-extrabold text-[#1B5E20] flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                        <Sprout className="w-4 h-4 text-[#1B5E20]" />
                                    </div>
                                    {t.farmInfo}
                                </h2>
                                <button type="button" onClick={addFarm} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-[#1B5E20] rounded-xl font-bold hover:bg-green-100 transition-all text-sm">
                                    <Plus size={16} /> {t.addNewFarm}
                                </button>
                            </div>

                            <div className="space-y-8">
                                {formData.farms.map((farm, index) => (
                                    <div key={index} className="p-6 bg-[#FAFAF7] border border-gray-100 rounded-[32px] relative group/farm">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-sm font-black text-[#1B5E20] uppercase tracking-widest">Farm #{index + 1}</h3>
                                            {formData.farms.length > 1 && (
                                                <button type="button" onClick={() => removeFarm(index)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="md:col-span-2">
                                                <label className={labelClasses}>{t.farmNickname}</label>
                                                <input placeholder="e.g. Home Farm" className={inputClasses} value={farm.nickname} onChange={e => updateFarm(index, 'nickname', e.target.value)} required />
                                            </div>

                                            {/* Farm Location */}
                                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-white/50 rounded-2xl border border-dashed border-green-100">
                                                <div className="flex flex-col justify-end">
                                                    <label className={labelClasses}>{t.signupFlow.state}</label>
                                                    <select className={inputClasses} value={farm.state || ''} onChange={e => updateFarm(index, 'state', e.target.value)} required>
                                                        <option value="">{t.selectState}</option>
                                                        {t.signupFlow.options.states.map((s, i) => (
                                                            <option key={en.signupFlow.options.states[i]} value={en.signupFlow.options.states[i]}>
                                                                {s}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col justify-end">
                                                    <label className={labelClasses}>{t.district}</label>
                                                    <input placeholder={t.signupFlow.placeholders.district} className={inputClasses} value={farm.district || ''} onChange={e => updateFarm(index, 'district', e.target.value)} required />
                                                </div>
                                                <div className="flex flex-col justify-end">
                                                    <label className={labelClasses}>{t.village}</label>
                                                    <input placeholder={t.signupFlow.placeholders.village} className={inputClasses} value={farm.village || ''} onChange={e => updateFarm(index, 'village', e.target.value)} />
                                                </div>
                                            </div>

                                            <div className="flex flex-col justify-end">
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

                                            {/* Crops */}
                                            <div className="md:col-span-2">
                                                <label className={labelClasses}>{t.mainCrops}</label>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {t.signupFlow.options.crops.map((cropLabel, i) => {
                                                        const cropValue = en.signupFlow.options.crops[i];
                                                        const selected = (farm.crops || []).includes(cropValue);
                                                        return (
                                                            <button
                                                                key={cropValue}
                                                                type="button"
                                                                onClick={() => toggleCrop(index, cropValue)}
                                                                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${selected
                                                                    ? 'bg-[#1B5E20] text-white border-[#1B5E20]'
                                                                    : 'bg-white text-gray-600 border-gray-100 hover:border-[#1B5E20] hover:text-[#1B5E20]'
                                                                    }`}
                                                            >
                                                                {selected ? '✓ ' : ''}{cropLabel}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white rounded-[24px] font-black text-xl hover:shadow-[0_8px_30px_rgb(27,94,32,0.3)] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 mt-4"
                        >
                            {loading ? (
                                <RefreshCw className="w-7 h-7 animate-spin" />
                            ) : (
                                <><Save className="w-6 h-6" /> {t.saveProfile}</>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditProfile;
