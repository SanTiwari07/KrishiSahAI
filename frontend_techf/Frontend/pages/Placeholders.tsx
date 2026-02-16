import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const PlaceholderPage = ({ title }: { title: string }) => {
    const { t } = useLanguage();
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F8F8] p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-[#E0E6E6]">
                <h1 className="text-3xl font-extrabold text-[#043744] mb-4">{title}</h1>
                <p className="text-[#6B7878]">This page is currently under maintenance or being restored.</p>
            </div>
        </div>
    );
};

export const CropCare = () => <PlaceholderPage title="Crop Care" />;
export const WasteToValue = () => <PlaceholderPage title="Waste to Value" />;
export const Advisory = () => <PlaceholderPage title="Business Advisory" />;
export const Hub = () => <PlaceholderPage title="Knowledge Hub" />;
export const News = () => <PlaceholderPage title="News" />;
export const Login = () => <PlaceholderPage title="Login" />;
export const Signup = () => <PlaceholderPage title="Sign Up" />;
