import { useLanguage } from '../../src/context/LanguageContext';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';

interface NewsItem {
    title: string;
    description: string;
    image: string;
    category: string;
    date: string;
    url: string;
    source: string;
}

const NewsFeed: React.FC = () => {
    const { t } = useLanguage();

    const newsItems: NewsItem[] = [
        {
            title: "Sustainable Farming: The Future of Agriculture",
            description: "How modern techniques are shaping the future of farming.",
            image: "https://images.unsplash.com/photo-1625246333195-003581202711?auto=format&fit=crop&q=80&w=600",
            category: "Innovation",
            date: "2 Hours ago",
            url: "#",
            source: "AgriTech"
        },
        {
            title: "New Irrigation Methods Save Water",
            description: "Farmers are adopting new efficient irrigation systems.",
            image: "https://images.unsplash.com/photo-1563514227146-23429dd94186?auto=format&fit=crop&q=80&w=600",
            category: "Technology",
            date: "5 Hours ago",
            url: "#",
            source: "EcoFarm"
        },
        {
            title: "Crop Yields Increase by 20% this Season",
            description: "Favorable weather and better seeds contribute to high yields.",
            image: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=600",
            category: "Market",
            date: "1 Day ago",
            url: "#",
            source: "DailyAgri"
        }
    ];

    return (
        <div className="w-full bg-white border-t border-deep-green/10 pt-12 pb-8">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-extrabold text-deep-green tracking-tight uppercase">
                        {t.latestNews}
                    </h2>
                    <Link to="/news" className="text-sm font-bold text-deep-green hover:text-deep-blue uppercase tracking-widest border-b-2 border-deep-green hover:border-deep-blue transition-all">
                        {t.viewAll}
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {newsItems.map((news, index) => (
                        <div key={index} className="group bg-white border-2 border-[#E0E6E6] hover:border-deep-green transition-all hover:shadow-lg relative overflow-hidden">
                            <div className="h-48 overflow-hidden relative">
                                <img
                                    src={news.image}
                                    alt={news.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                                <div className="absolute top-0 right-0 bg-deep-green text-white text-xs font-bold px-3 py-1 uppercase tracking-wider">
                                    {news.category}
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                                    {news.date}
                                </p>
                                <h3 className="text-xl font-bold text-deep-green mb-3 leading-tight group-hover:text-deep-blue transition-colors">
                                    {news.title}
                                </h3>
                                <p className="text-sm text-text-secondary line-clamp-2 mb-4">
                                    {news.description}
                                </p>
                                <button className="text-sm font-bold text-deep-green uppercase tracking-wider flex items-center gap-2 group-hover:gap-3 transition-all">
                                    {t.readMore} <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NewsFeed;
