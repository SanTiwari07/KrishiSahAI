import React, { useState, useEffect } from 'react';
import { Article } from '../src/types/article';
import ArticleCard from '../components/KnowledgeHub/ArticleCard';
import { useLanguage } from '../src/context/LanguageContext';

const KnowledgeHub: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const { language, t } = useLanguage();

    useEffect(() => {
        const loadArticles = async () => {
            const modules = import.meta.glob('/src/articles/*/index.json', { eager: true });
            const imageModules = import.meta.glob('/src/articles/*/*.{png,jpg,jpeg,svg,webp}', { eager: true });

            const loadedArticles: Article[] = Object.entries(modules).map(([path, mod]: [string, any]) => {
                const data = mod.default || mod;
                const parts = path.split('/');
                const folderName = parts[parts.length - 2];
                // Prioritize the slug from the JSON data, fallback to folder name
                const slug = data.slug || folderName;

                let heroImage = data.heroImage;

                // Robust image path resolution
                if (heroImage) {
                    // Try exact path first
                    const exactPath = `/src/articles/${folderName}/${heroImage}`;
                    if (imageModules[exactPath]) {
                        heroImage = (imageModules[exactPath] as any).default || imageModules[exactPath];
                    } else {
                        // Fallback: search for the image file name within the article's folder
                        const relativeImageEntry = Object.entries(imageModules).find(([imgPath]) =>
                            imgPath.includes(`/${folderName}/`) && imgPath.endsWith(heroImage)
                        );
                        if (relativeImageEntry) {
                            heroImage = (relativeImageEntry[1] as any).default || relativeImageEntry[1];
                        }
                    }
                }

                return {
                    ...data,
                    heroImage: heroImage,
                    slug: slug
                };
            });

            setArticles(loadedArticles);
        };

        loadArticles();
    }, []);

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-deep-green mb-4 font-display">
                        {t.knowledgeHubTitle}
                    </h1>
                    <p className="text-xl text-deep-green/80 max-w-2xl mx-auto">
                        {t.knowledgeHubSubtitle}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {articles.map((article) => (
                        <ArticleCard key={article.slug} article={article} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeHub;
