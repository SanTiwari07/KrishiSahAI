import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';
import { Language } from '../types';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (typeof translations)['EN'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem('appLanguage');
        return (saved as Language) || 'EN';
    });

    useEffect(() => {
        localStorage.setItem('appLanguage', language);
    }, [language]);

    const value = {
        language,
        setLanguage,
        t: translations[language] || translations['EN']
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
