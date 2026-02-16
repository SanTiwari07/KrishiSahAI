
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Language } from '../types';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Save, ArrowLeft, User, MapPin, Sprout, Briefcase } from 'lucide-react';
import { translations } from '../src/i18n/translations';

const EditProfile: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = translations[lang];
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Initial State matching UserProfile interface
    const [formData, setFormData] = useState<UserProfile>({
        name: '',
        age: '',
        gender: 'Male',
        occupation: 'Farmer',
        phone: '',
        email: '',
        state: '',
        district: '',
        village: '',
        location: '',
        landSize: '',
        soilType: 'Alluvial Soil',
        waterAvailability: 'Borewell',
        mainCrops: []
    });

    const cropsList = ["Rice", "Wheat", "Maize", "Sugarcane", "Cotton", "Groundnut", "Soybean", "Mustard", "Pulses", "Vegetables", "Fruits", "Spices", "Tea", "Coffee", "Jute", "Coconut", "Rubber"];

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser) return;

        setLoading(true);
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);

            // Construct location string
            const location = `${formData.village}, ${formData.district}, ${formData.state}`;
            const updatedData = { ...formData, location };

            await updateDoc(userRef, updatedData);

            // Force a reload or notify user
            alert(t.profileUpdated);
            navigate('/');
            window.location.reload(); // Simple way to refresh app state in App.tsx
        } catch (error) {
            console.error("Error updating profile:", error);
            alert(t.profileUpdateFailed);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="min-h-screen flex items-center justify-center">{t.analyzingBtn}</div>;

    return (
        <div className="min-h-screen bg-[#F5F8F8] p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#555555] font-bold mb-6 hover:text-[#043744] transition-colors">
                    <ArrowLeft className="w-5 h-5" /> {t.back}
                </button>

                <div className="bg-white rounded-[32px] border border-[#E6E6E6] shadow-xl p-6 md:p-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-[#043744] rounded-full flex items-center justify-center text-white">
                            <User className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-[#1E1E1E]">{t.editProfile}</h1>
                            <p className="text-[#555555] font-medium">{t.updateProfileDesc}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Personal Details */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-[#1E1E1E] flex items-center gap-2">
                                <User className="w-5 h-5 text-[#043744]" /> {t.personalInfo}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.fullName}</label>
                                    <input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#043744] text-[#1E1E1E]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.email}</label>
                                    <input
                                        name="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full p-4 bg-gray-100 border border-[#E6E6E6] rounded-2xl text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.phoneNumber}</label>
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#043744] text-[#1E1E1E]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.age}</label>
                                    <input
                                        name="age"
                                        type="number"
                                        value={formData.age}
                                        onChange={handleChange}
                                        className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#043744] text-[#1E1E1E]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location Details */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-[#1E1E1E] flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-[#043744]" /> {t.locationDetails}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.state}</label>
                                    <select
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#043744] text-[#1E1E1E]"
                                    >
                                        <option value="">{t.selectState}</option>
                                        <option>Maharashtra</option><option>Karnataka</option><option>Punjab</option><option>Uttar Pradesh</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.district}</label>
                                    <input
                                        name="district"
                                        value={formData.district}
                                        onChange={handleChange}
                                        className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#043744] text-[#1E1E1E]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.village}</label>
                                    <input
                                        name="village"
                                        value={formData.village}
                                        onChange={handleChange}
                                        className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#043744] text-[#1E1E1E]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Farm Details */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-[#1E1E1E] flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-[#043744]" /> {t.farmInfo}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.landSizeAcres}</label>
                                    <input
                                        name="landSize"
                                        type="number"
                                        value={formData.landSize}
                                        onChange={handleChange}
                                        className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#043744] text-[#1E1E1E]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.waterAvailability}</label>
                                    <select
                                        name="waterAvailability"
                                        value={formData.waterAvailability}
                                        onChange={handleChange}
                                        className="w-full p-4 bg-[#FAFAF7] border border-[#E6E6E6] rounded-2xl focus:outline-none focus:border-[#043744] text-[#1E1E1E]"
                                    >
                                        <option>Borewell</option><option>Canal</option><option>River</option><option>Rainfed</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-[#555555] mb-2 ml-2">{t.mainCrops}</label>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                    {/* Standard Crops */}
                                    {cropsList.map(crop => (
                                        <button
                                            key={crop}
                                            type="button"
                                            onClick={() => toggleCrop(crop)}
                                            className={`px-2 py-2 rounded-xl text-xs font-bold border transition-all truncate ${formData.mainCrops.includes(crop)
                                                ? 'bg-[#043744] text-white border-[#043744]'
                                                : 'bg-[#FAFAF7] text-[#555555] border-[#E6E6E6] hover:border-[#043744]'
                                                }`}
                                            title={crop}
                                        >
                                            {crop}
                                        </button>
                                    ))}

                                    {/* Other Option */}
                                    {(() => {
                                        const currentCrops = formData.mainCrops || [];
                                        const customCrop = currentCrops.find(c => !cropsList.includes(c));
                                        return (
                                            <div className="relative">
                                                {customCrop !== undefined ? (
                                                    <input
                                                        autoFocus
                                                        value={customCrop}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            setFormData(prev => {
                                                                const currentCrops = prev.mainCrops || [];
                                                                return {
                                                                    ...prev,
                                                                    mainCrops: [
                                                                        ...currentCrops.filter(c => cropsList.includes(c)),
                                                                        ...(newVal ? [newVal] : [])
                                                                    ]
                                                                };
                                                            });
                                                        }}
                                                        placeholder={t.typeCrop}
                                                        className="w-full h-full px-2 py-2 rounded-xl text-xs font-bold border bg-[#043744] text-white border-[#043744] focus:outline-none placeholder:text-white/50"
                                                    />
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, mainCrops: [...prev.mainCrops, ""] }))}
                                                        className="w-full h-full px-2 py-2 rounded-xl text-xs font-bold border bg-[#FAFAF7] text-[#555555] border-[#E6E6E6] hover:border-[#043744] hover:text-[#043744]"
                                                    >
                                                        {t.other}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-[#043744] text-white rounded-2xl font-bold text-xl hover:bg-[#000D0F] transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {loading ? t.saving : <><Save className="w-5 h-5" /> {t.saveChanges}</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditProfile;
