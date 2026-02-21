import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from '../../types';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';

const translations = {
    EN: en,
    HI: hi,
    MR: mr
};

type TranslationType = typeof en;

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    hasSelectedLanguage: boolean;
    t: TranslationType;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>(() => {
        const saved = localStorage.getItem('appLanguage');
        return (saved as Language) || 'EN';
    });

    const [hasSelectedLanguage, setHasSelectedLanguage] = useState<boolean>(() => {
        return !!localStorage.getItem('appLanguage');
    });

    useEffect(() => {
        if (hasSelectedLanguage) {
            localStorage.setItem('appLanguage', language);
        }
    }, [language, hasSelectedLanguage]);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        setHasSelectedLanguage(true);
        localStorage.setItem('appLanguage', lang);
    };

    const value = {
        language,
        setLanguage: handleSetLanguage,
        hasSelectedLanguage,
        t: (translations[language] || translations['EN']) as TranslationType
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

