
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Language } from '../types';
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Save, ArrowLeft, User, MapPin, Sprout, Briefcase, RefreshCw } from 'lucide-react';
import { translations } from '../src/i18n/translations';

const EditProfile: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = translations[lang];
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [customCrop, setCustomCrop] = useState('');

    // Initial State matching UserProfile interface
    const [formData, setFormData] = useState<UserProfile>({
        name: '',
        age: '',
        gender: 'male',
        occupation: 'farmer',
        phone: '',
        email: '',
        state: '',
        district: '',
        village: '',
        location: '',
        landSize: '',
        landUnit: 'acre',
        landType: 'Irrigated',
        soilType: 'alluvial',
        waterAvailability: 'borewell',
        mainCrops: [],
        experience_years: '2'
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
                    const data = docSnap.data();
                    setFormData({
                        ...data,
                        mainCrops: data.mainCrops || []
                    } as UserProfile);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            } finally {
                setFetching(false);
            }
        };
        fetchProfile();
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleCrop = (crop: string) => {
        setFormData(prev => {
            const currentCrops = prev.mainCrops || [];
            return {
                ...prev,
                mainCrops: currentCrops.includes(crop)
                    ? currentCrops.filter(c => c !== crop)
                    : [...currentCrops, crop]
            };
        });
    };

    const handleAddCustomCrop = (e: React.KeyboardEvent | React.MouseEvent) => {
        if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
        if (e.type === 'keydown') e.preventDefault();

        const trimmed = customCrop.trim();
        if (trimmed && !formData.mainCrops.includes(trimmed)) {
            setFormData(prev => ({
                ...prev,
                mainCrops: [...(prev.mainCrops || []), trimmed]
            }));
            setCustomCrop('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        setLoading(true);
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);

            // Construct location string
            const location = `${formData.village}, ${formData.district}, ${formData.state}`;

            // Map to snake_case for backend compatibility
            const updatedData = {
                ...formData,
                location,
                land_size: parseFloat(formData.landSize),
                soil_type: formData.soilType,
                water_availability: formData.waterAvailability,
                crops_grown: formData.mainCrops
            };

            await updateDoc(userRef, updatedData);

            // Force a reload or notify user
            alert(t.profileUpdated || "Profile updated successfully!");
            navigate('/');
            window.location.reload(); // Simple way to refresh app state in App.tsx
        } catch (error) {
            console.error("Error updating profile:", error);
            alert(t.profileUpdateFailed || "Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="min-h-screen flex items-center justify-center text-deep-green font-bold">{t.loading || "Loading..."}</div>;

    const inputClasses = "w-full p-4 bg-[#E8F5E9] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#1B5E20] text-[#1E1E1E] font-medium transition-all shadow-sm";
    const labelClasses = "block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2";

    return (
        <div className="min-h-screen p-4 md:p-8 bg-[#F5F9F6]">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 font-bold mb-6 hover:text-deep-green transition-colors">
                    <ArrowLeft className="w-5 h-5" /> {t.back}
                </button>

                <div className="bg-white rounded-[40px] border border-green-100 shadow-xl p-6 md:p-10">
                    <div className="flex items-center gap-6 mb-10 pb-6 border-b border-gray-100">
                        <div className="w-20 h-20 bg-gradient-to-br from-deep-green to-green-600 rounded-3xl flex items-center justify-center text-white shadow-lg transform -rotate-3">
                            <User className="w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-[#1E1E1E] tracking-tight">{t.editProfile}</h1>
                            <p className="text-[#688A7E] font-semibold">{t.updateProfileDesc}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        {/* Personal Details */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-extrabold text-[#1B5E20] flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                    <User className="w-4 h-4 text-green-700" />
                                </div>
                                {t.signupFlow.personalInfo}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClasses}>{t.signupFlow.fullName}</label>
                                    <input name="name" value={formData.name} onChange={handleChange} className={inputClasses} required />
                                </div>
                                <div>
                                    <label className={labelClasses}>{t.signupFlow.email}</label>
                                    <input name="email" value={formData.email} disabled className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 cursor-not-allowed font-medium" />
                                </div>
                                <div>
                                    <label className={labelClasses}>{t.signupFlow.phone}</label>
                                    <input name="phone" value={formData.phone} onChange={handleChange} className={inputClasses} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClasses}>{t.signupFlow.age}</label>
                                        <input name="age" type="number" value={formData.age} onChange={handleChange} className={inputClasses} required />
                                    </div>
                                    <div>
                                        <label className={labelClasses}>{t.signupFlow.gender}</label>
                                        <select name="gender" value={formData.gender} onChange={handleChange} className={inputClasses}>
                                            <option value="male">{t.signupFlow.options.gender.male}</option>
                                            <option value="female">{t.signupFlow.options.gender.female}</option>
                                            <option value="other">{t.signupFlow.options.gender.other}</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClasses}>{t.experienceYears || "Experience (Years)"}</label>
                                    <input name="experience_years" type="number" value={formData.experience_years} onChange={handleChange} className={inputClasses} required />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={labelClasses}>{t.signupFlow.occupation}</label>
                                    <select name="occupation" value={formData.occupation} onChange={handleChange} className={inputClasses}>
                                        <option value="farmer">{t.signupFlow.options.occupation.farmer}</option>
                                        <option value="student">{t.signupFlow.options.occupation.student}</option>
                                        <option value="business">{t.signupFlow.options.occupation.business}</option>
                                        <option value="other">{t.signupFlow.options.occupation.other}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Location Details */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-extrabold text-[#1B5E20] flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                    <MapPin className="w-4 h-4 text-green-700" />
                                </div>
                                {t.signupFlow.locationDetails}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={labelClasses}>{t.signupFlow.state}</label>
                                    <select name="state" value={formData.state} onChange={handleChange} className={inputClasses} required>
                                        <option value="">{t.selectState}</option>
                                        {t.signupFlow.options.states.map((s: string) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>{t.signupFlow.district}</label>
                                    <input name="district" value={formData.district} onChange={handleChange} className={inputClasses} required />
                                </div>
                                <div>
                                    <label className={labelClasses}>{t.signupFlow.village}</label>
                                    <input name="village" value={formData.village} onChange={handleChange} className={inputClasses} required />
                                </div>
                            </div>
                        </div>

                        {/* Farm Information */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-extrabold text-[#1B5E20] flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                    <Sprout className="w-4 h-4 text-green-700" />
                                </div>
                                {t.signupFlow.farmInfo}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={labelClasses}>{t.signupFlow.landSize}</label>
                                    <input name="landSize" type="number" step="0.1" value={formData.landSize} onChange={handleChange} className={inputClasses} required />
                                </div>
                                <div>
                                    <label className={labelClasses}>{t.signupFlow.soilType}</label>
                                    <select name="soilType" value={formData.soilType} onChange={handleChange} className={inputClasses}>
                                        <option value="alluvial">{t.signupFlow.options.soilType.alluvial}</option>
                                        <option value="black">{t.signupFlow.options.soilType.black}</option>
                                        <option value="red">{t.signupFlow.options.soilType.red}</option>
                                        <option value="laterite">{t.signupFlow.options.soilType.laterite}</option>
                                        <option value="desert">{t.signupFlow.options.soilType.desert}</option>
                                        <option value="mountain">{t.signupFlow.options.soilType.mountain}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>{t.signupFlow.waterAvailability}</label>
                                    <select name="waterAvailability" value={formData.waterAvailability} onChange={handleChange} className={inputClasses}>
                                        <option value="borewell">{t.signupFlow.options.waterAvailability.borewell}</option>
                                        <option value="canal">{t.signupFlow.options.waterAvailability.canal}</option>
                                        <option value="rainfed">{t.signupFlow.options.waterAvailability.rainfed}</option>
                                        <option value="well">{t.signupFlow.options.waterAvailability.well}</option>
                                        <option value="river">{t.signupFlow.options.waterAvailability.river}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className={labelClasses}>{t.signupFlow.mainCrops}</label>
                                <div className="flex flex-wrap gap-3 p-6 bg-white border border-green-50 rounded-3xl shadow-inner min-h-[100px]">
                                    {t.signupFlow.options.crops.map((crop: string) => (
                                        <button
                                            key={crop}
                                            type="button"
                                            onClick={() => toggleCrop(crop)}
                                            className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all border-2 ${formData.mainCrops.includes(crop)
                                                ? 'bg-deep-green text-white border-deep-green shadow-md scale-105'
                                                : 'bg-green-50/30 text-green-800 border-green-50/50 hover:border-green-200 hover:bg-green-50'
                                                }`}
                                        >
                                            {crop}
                                        </button>
                                    ))}

                                    {/* Show custom crops as tags too */}
                                    {(formData.mainCrops || []).filter((c: string) => !t.signupFlow.options.crops.includes(c)).map((crop: string) => (
                                        <button
                                            key={crop}
                                            type="button"
                                            onClick={() => toggleCrop(crop)}
                                            className="px-5 py-3 rounded-2xl text-sm font-bold transition-all border-2 bg-deep-green text-white border-deep-green shadow-md scale-105"
                                        >
                                            {crop} ×
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-4 flex gap-3">
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
                                        className="px-10 bg-deep-green text-white rounded-2xl font-bold hover:bg-green-800 transition-all flex items-center justify-center whitespace-nowrap shadow-md active:scale-95"
                                    >
                                        {t.submit || "Add"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-gradient-to-r from-deep-green to-green-700 text-white rounded-[24px] font-black text-xl hover:shadow-[0_8px_30px_rgb(27,94,32,0.3)] transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 mt-4"
                        >
                            {loading ? (
                                <RefreshCw className="w-7 h-7 animate-spin" />
                            ) : (
                                <><Save className="w-6 h-6" /> {t.saveChanges || "Save Profile"}</>
                            )}
                        </button>
                    </form>
                </div>
            </div >
        </div >
    );
};

export default EditProfile;
