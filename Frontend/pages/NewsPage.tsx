import React, { useState, useEffect } from 'react';
import { Language, UserProfile } from '../types';
import { translations } from '../src/i18n/translations';
import { api } from '../services/api';
import { auth } from '../firebase';

interface NewsArticle {
    headline: string;
    source: string;
    summary: string;
    url: string;
    published_at: string;
    image?: string;
}

interface NewsPageProps {
    lang: Language;
    user: UserProfile | null;
}

type NewsMode = 'personalized' | 'general';

const NewsPage: React.FC<NewsPageProps> = ({ lang, user }) => {
    const t = translations[lang];
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newsMode, setNewsMode] = useState<NewsMode>('general');

    const fetchNews = async (mode: NewsMode = newsMode) => {
        setLoading(true);
        setError('');

        try {
            let data;

            if (mode === 'personalized') {
                // Personalized news requires authentication
                if (!user || !auth.currentUser) {
                    setError('Please login to view personalized news');
                    setLoading(false);
                    return;
                }

                const uid = auth.currentUser.uid;
                data = await api.get(`/news/${uid}`);
            } else {
                // General news - no authentication required
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/news/general`);
                data = await response.json();
            }

            if (data.success) {
                setNews(data.news);
            } else {
                setError(data.error || 'Failed to load news');
            }
        } catch (err: any) {
            console.error("News Fetch Error:", err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews(newsMode);
    }, [newsMode, user]);

    const handleRefresh = () => {
        fetchNews(newsMode);
    };

    const handleModeChange = (mode: NewsMode) => {
        setNewsMode(mode);
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-extrabold text-[#000D0F] tracking-tight mb-3">
                        {t.newsTitle}
                    </h1>
                    <p className="text-lg text-[#043744] font-medium">
                        {newsMode === 'personalized'
                            ? t.newsSubtitlePersonalized
                            : t.newsSubtitleGeneral
                        }
                    </p>
                </div>

                {/* Refresh Button */}
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-[#043744] text-[#043744] rounded-xl font-bold hover:bg-[#043744] hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                    {t.refresh}
                </button>
            </div>

            {/* Toggle Buttons */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => handleModeChange('personalized')}
                    className={`flex-1 py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${newsMode === 'personalized'
                        ? 'bg-[#043744] text-white shadow-lg'
                        : 'bg-white text-[#6B7878] border-2 border-[#E0E6E6] hover:border-[#043744]'
                        }`}
                >
                    {t.personalizedNews}
                </button>
                <button
                    onClick={() => handleModeChange('general')}
                    className={`flex-1 py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 ${newsMode === 'general'
                        ? 'bg-[#043744] text-white shadow-lg'
                        : 'bg-white text-[#6B7878] border-2 border-[#E0E6E6] hover:border-[#043744]'
                        }`}
                >
                    {t.generalNews}
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#043744]"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-600 p-6 rounded-2xl text-center">
                    <p className="font-bold">{error}</p>
                    <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-white border border-red-200 rounded-lg text-sm hover:bg-gray-50">
                        {t.retry}
                    </button>
                </div>
            ) : news.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-[#E0E6E6]">
                    <p className="text-[#6B7878] text-lg">{t.noNewsFound}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {news.map((item, index) => (
                        <div key={index} className="bg-white border border-[#E0E6E6] rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group">
                            {item.image && (
                                <div className="h-48 overflow-hidden">
                                    <img src={item.image} alt={item.headline} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                </div>
                            )}
                            <div className="p-6 flex flex-col flex-grow">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-bold uppercase tracking-widest text-[#043744] bg-[#E8F5F5] px-3 py-1 rounded-full">
                                        {item.source}
                                    </span>
                                    <span className="text-xs text-[#6B7878] font-medium">
                                        {new Date(item.published_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-[#000D0F] mb-3 leading-tight group-hover:text-[#043744] transition-colors">
                                    {item.headline}
                                </h3>
                                <p className="text-[#043744] text-sm leading-relaxed mb-6 flex-grow">
                                    {item.summary}
                                </p>
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-[#043744] font-bold hover:underline mt-auto"
                                >
                                    {t.readFullArticle}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7l7 7-7 7" /></svg>
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NewsPage;
