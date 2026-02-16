import React from 'react';
import { Language } from '../types';
import { translations } from '../src/i18n/translations';
import { BookOpen } from 'lucide-react';

const KnowledgeHub: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = translations[lang];

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="text-center py-20 bg-white rounded-[48px] border border-[#E6E6E6] shadow-xl">
                <div className="w-24 h-24 bg-[#FAFAF7] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
                    <BookOpen className="w-12 h-12 text-[#043744]" />
                </div>
                <h1 className="text-4xl font-extrabold text-[#1E1E1E] mb-4">{t.navKnowledge}</h1>
                <p className="text-[#555555] font-medium text-lg max-w-xl mx-auto">{t.learn}</p>
                <div className="mt-12 opacity-50 text-sm font-bold uppercase tracking-widest text-[#043744]">{t.comingSoon}</div>
            </div>
        </div>
    );
};

export default KnowledgeHub;
