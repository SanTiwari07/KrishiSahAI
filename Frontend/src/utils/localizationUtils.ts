
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import mr from '../locales/mr.json';

const translations: Record<string, any> = {
    EN: en,
    HI: hi,
    MR: mr
};

export const normalizeValue = (val: string, category: 'states' | 'crops'): string => {
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

export const getLocalizedValue = (val: string, category: 'states' | 'crops', lang: string): string => {
    if (!val) return val;
    // First normalize to English key (handles values stored in any language)
    const englishKey = normalizeValue(val, category);
    const enList = en.signupFlow.options[category];
    const idx = enList.indexOf(englishKey);
    if (idx === -1) return val;

    const currentT = translations[lang] || en;
    return currentT.signupFlow.options[category][idx] || val;
};
