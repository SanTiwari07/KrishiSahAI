import React from 'react';
import { useLanguage } from '../../src/context/LanguageContext';

const images = [
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.39.14 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.39.15 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.39.16 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.41.32 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.42.22 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.42.25 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.42.26 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.42.28 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.42.29 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.42.30 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.42.31 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.42.32 PM.jpeg',
  '/phase_zero/WhatsApp Image 2026-02-15 at 12.47.11 PM.jpeg',
];

const PhaseZero: React.FC = () => {
  const { t } = useLanguage();

  // Duplicate list for seamless loop
  const displayImages = [...images, ...images];

  return (
    <section id="validation" className="w-full bg-white py-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-8 mb-12 text-center">
        {/* Validation Badge removed as per user request */}
        <h2 className="text-5xl md:text-6xl font-extrabold text-deep-green leading-tight tracking-tight">
          {t.validationTitle}
        </h2>
      </div>

      <div className="relative group">
        <div className="flex animate-scroll hover:pause-scroll">
          {displayImages.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="px-4 flex-shrink-0"
              style={{ width: 'calc(100vw / 1.5)', maxWidth: '400px' }}
            >
              <div className="bg-white shadow-md overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border-2 border-deep-green/20 hover:border-deep-green rounded-2xl">
                <div className="aspect-[4/5] relative">
                  <img
                    src={src}
                    alt={`Validation phase ${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover transition-all duration-500"
                  />
                  {/* Overlay for sharp look */}
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/10"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-360px * ${images.length} - 32px * ${images.length}));
          }
        }

        .animate-scroll {
          display: flex;
          width: max-content;
          animation: scroll 25s linear infinite;
        }

        .hover\\:pause-scroll:hover {
          animation-play-state: paused;
        }

        @media (min-width: 768px) {
           @keyframes scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(calc(-360px * ${images.length} - 32px * ${images.length}));
            }
          }
        }
      `}</style>
    </section>
  );
};

export default PhaseZero;
