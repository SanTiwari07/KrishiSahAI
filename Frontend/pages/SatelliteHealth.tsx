import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Crosshair,
    Droplets,
    Leaf,
    Loader2,
    MapPin,
    Satellite,
    Sun,
} from 'lucide-react';
import { auth } from '../firebase';
import { useFarm } from '../src/context/FarmContext';
import { useLanguage } from '../src/context/LanguageContext';
import { useLoadingTips } from '../src/hooks/useLoadingTips';
import {
    GeoJsonPolygon,
    SatelliteGeometryAnalysisResponse,
    fetchSatelliteAvailableDates,
    fetchSatelliteDayAnalysis,
    fetchSatelliteGeometryAnalysis,
} from '../src/services/api';
import {
    SatelliteFarmMap,
    SatelliteMapHandle,
} from '../components/SatelliteFarmMap';
import KrishiMitraSatellitePanel from '../components/KrishiMitraSatellitePanel';

const PREVIEW_INDICES = ['ndvi', 'evi', 'savi', 'ndmi', 'ndwi', 'gndvi', 'cvi'] as const;

type PreviewIndex = (typeof PREVIEW_INDICES)[number];

function formatMean(v: number | null | undefined): string {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
    return Number(v).toFixed(4);
}

function makeDefaultFieldPolygon(lat: number, lng: number): GeoJsonPolygon {
    const delta = 0.002;
    return {
        type: 'Polygon',
        coordinates: [[
            [lng - delta, lat - delta],
            [lng + delta, lat - delta],
            [lng + delta, lat + delta],
            [lng - delta, lat + delta],
            [lng - delta, lat - delta],
        ]],
    };
}

const SatelliteHealth: React.FC = () => {
    const { t, language } = useLanguage();
    const { activeFarm } = useFarm();
    const navigate = useNavigate();
    const mapApiRef = useRef<SatelliteMapHandle>(null);
    const timelineScrollRef = useRef<HTMLDivElement>(null);

    const [loading, setLoading] = useState(false);
    const [dayLoading, setDayLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [previewIndex, setPreviewIndex] = useState<PreviewIndex>('ndvi');
    const [fieldGeometry, setFieldGeometry] = useState<GeoJsonPolygon | null>(null);
    const [mapStatus, setMapStatus] = useState<'draw' | 'saved'>('draw');
    const [liveCenter, setLiveCenter] = useState<{ lat: number; lng: number } | null>(null);
    const [liveLocationLabel, setLiveLocationLabel] = useState<string>('');
    const [locating, setLocating] = useState(false);

    const [analysisData, setAnalysisData] = useState<SatelliteGeometryAnalysisResponse | null>(null);
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const { startDefault, endDefault } = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 90);
        const toYmd = (d: Date) => d.toISOString().slice(0, 10);
        return { startDefault: toYmd(start), endDefault: toYmd(end) };
    }, []);

    const startDate = startDefault;
    const endDate = endDefault;

    const loadingTip = useLoadingTips(loading || dayLoading);

    const lat = activeFarm?.latitude;
    const lon = activeFarm?.longitude;
    const hasCoords =
        typeof lat === 'number' &&
        typeof lon === 'number' &&
        !Number.isNaN(lat) &&
        !Number.isNaN(lon);

    const mapCenter = useMemo(() => {
        if (liveCenter) return liveCenter;
        if (!hasCoords || lat === undefined || lon === undefined) return null;
        return { lat, lng: lon };
    }, [liveCenter, hasCoords, lat, lon]);

    const statusLine =
        mapStatus === 'draw'
            ? (t.satelliteStatusDrawPolygon || 'Draw field polygon')
            : (t.satelliteStatusFieldSaved || 'Field boundary saved');

    const farmLocationLabel = useMemo(() => {
        const parts = [activeFarm?.village, activeFarm?.district, activeFarm?.state]
            .map((x) => (x || '').trim())
            .filter(Boolean);
        return parts.join(', ');
    }, [activeFarm?.village, activeFarm?.district, activeFarm?.state]);
    const shownLocationLabel = liveLocationLabel || farmLocationLabel;

    const tileUrl = useMemo(() => {
        if (!analysisData?.index_tiles) return null;
        const key = `${previewIndex}_tile_url`;
        return analysisData.index_tiles[key] || analysisData.ndvi_tile_url || analysisData.tile_url || null;
    }, [analysisData, previewIndex]);

    const apiLang = useMemo(() => {
        const c = (language || 'EN').toString().toLowerCase();
        if (c === 'hi' || c === 'mr') return c;
        return 'en';
    }, [language]);

    const indexDescription = (code: string): string => {
        const map: Record<string, string> = {
            NDVI: t.satelliteIdxNDVI,
            EVI: t.satelliteIdxEVI,
            SAVI: t.satelliteIdxSAVI,
            NDMI: t.satelliteIdxNDMI,
            NDWI: t.satelliteIdxNDWI,
            GNDVI: t.satelliteIdxGNDVI,
            CVI: 'Composite Vegetation Index',
        };
        return map[code] || code;
    };

    const iconForIndex = (code: string) => {
        if (code === 'SAVI') return <Sun className="h-4 w-4 text-amber-400" />;
        if (code === 'NDMI' || code === 'NDWI') return <Droplets className="h-4 w-4 text-sky-400" />;
        return <Leaf className="h-4 w-4 text-emerald-400" />;
    };

    useEffect(() => {
        if (fieldGeometry) return;
        if (hasCoords && lat !== undefined && lon !== undefined) {
            setFieldGeometry(makeDefaultFieldPolygon(lat, lon));
            setMapStatus('saved');
        }
    }, [hasCoords, lat, lon, fieldGeometry]);

    const reverseGeocode = async (latNum: number, lonNum: number): Promise<string> => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
                    String(latNum)
                )}&lon=${encodeURIComponent(String(lonNum))}&zoom=10&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = (await res.json()) as {
                address?: {
                    village?: string;
                    town?: string;
                    city?: string;
                    county?: string;
                    state?: string;
                };
            };
            const addr = data.address || {};
            const place =
                addr.village || addr.town || addr.city || addr.county || 'Current location';
            const state = addr.state || 'Unknown state';
            return `${place}, ${state}`;
        } catch {
            return `Lat ${latNum.toFixed(5)}, Lng ${lonNum.toFixed(5)}`;
        }
    };

    const useLiveLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported in this browser.');
            return;
        }
        setError(null);
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const latNum = position.coords.latitude;
                const lonNum = position.coords.longitude;
                setLiveCenter({ lat: latNum, lng: lonNum });
                setFieldGeometry(makeDefaultFieldPolygon(latNum, lonNum));
                setMapStatus('saved');
                setAnalysisData(null);
                setAvailableDates([]);
                setSelectedDate(null);
                setLiveLocationLabel(await reverseGeocode(latNum, lonNum));
                setLocating(false);
            },
            (geoErr) => {
                setLocating(false);
                setError(
                    geoErr?.message ||
                        'Unable to fetch live location. Please allow location permission.'
                );
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const loadAvailableDates = async (geometry: GeoJsonPolygon, token: string) => {
        try {
            const dates = await fetchSatelliteAvailableDates({ geometry, lookbackDays: 90 }, token);
            setAvailableDates(dates);
            setSelectedDate(dates.length ? dates[dates.length - 1] : null);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setAvailableDates([]);
            setSelectedDate(null);
            setError(msg);
        }
    };

    const runAnalysis = async (geometryOverride?: GeoJsonPolygon) => {
        setError(null);
        setAnalysisData(null);

        let geometry = geometryOverride ?? fieldGeometry;
        if (!geometry) {
            if (hasCoords && lat !== undefined && lon !== undefined) {
                geometry = makeDefaultFieldPolygon(lat, lon);
                setFieldGeometry(geometry);
            } else {
                setError(t.satelliteNoLocation || 'Please set farm location or draw a field.');
                return;
            }
        } else if (geometryOverride) {
            setFieldGeometry(geometryOverride);
        }

        const user = auth.currentUser;
        if (!user) {
            setError('Not signed in.');
            return;
        }

        setLoading(true);
        try {
            const token = await user.getIdToken(true);
            const result = await fetchSatelliteGeometryAnalysis(
                { geometry, startDate, endDate },
                token
            );
            if (result.error) {
                setError(result.error);
            }
            setAnalysisData(result);
            await loadAvailableDates(geometry, token);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const scrollTimeline = (direction: -1 | 1) => {
        const el = timelineScrollRef.current;
        if (!el) return;
        const step = Math.max(180, Math.round(el.clientWidth * 0.55));
        el.scrollBy({ left: direction * step, behavior: 'smooth' });
    };

    const handleDateClick = async (date: string) => {
        if (!fieldGeometry || date === selectedDate) return;
        const user = auth.currentUser;
        if (!user) {
            setError('Not signed in.');
            return;
        }

        setDayLoading(true);
        setSelectedDate(date);
        setError(null);
        try {
            const token = await user.getIdToken(true);
            const result = await fetchSatelliteDayAnalysis(
                { geometry: fieldGeometry, date },
                token
            );
            if (result.error) setError(result.error);
            setAnalysisData(result);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
        } finally {
            setDayLoading(false);
        }
    };

    const pill =
        'inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-2 text-xs font-bold text-white/95 shadow-sm backdrop-blur-sm transition hover:bg-black/35';

    return (
        <div className="flex h-[calc(100dvh-68px)] max-h-[calc(100dvh-68px)] flex-col overflow-hidden bg-[#061208] text-white">
            <header className="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-[#2E7D32]/50 bg-[#1B5E20] px-3 py-3 md:px-5 md:py-3.5">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.back}</span>
                </button>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Satellite className="h-5 w-5 text-emerald-200" />
                        <h1 className="truncate text-base font-black tracking-tight text-white md:text-lg">
                            {t.brandName}
                        </h1>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/90">
                        {t.satelliteLabSubtitle}
                    </p>
                </div>
                <div className="flex w-full flex-1 flex-wrap items-center justify-end gap-2 md:w-auto">
                    <button
                        type="button"
                        className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl bg-[#2E7D32] px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-lg transition hover:bg-[#388E3C] disabled:opacity-60"
                        onClick={() => void runAnalysis()}
                        disabled={loading || dayLoading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Satellite className="h-4 w-4" />
                        )}
                        <span className="max-w-[140px] truncate sm:max-w-none">
                            {loading
                                ? (t.satelliteAnalyzing || 'Analyzing...')
                                : (t.satelliteRunAnalysis || 'Run analysis')}
                        </span>
                    </button>
                    <button
                        type="button"
                        className={pill}
                        onClick={() => mapApiRef.current?.startDrawPolygon()}
                    >
                        <span className="max-w-[140px] truncate sm:max-w-none">
                            {t.satelliteToolbarDraw}
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-70" />
                    </button>
                    <button
                        type="button"
                        className={pill}
                        onClick={useLiveLocation}
                        disabled={locating}
                    >
                        {locating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Crosshair className="h-4 w-4" />
                        )}
                        <span className="max-w-[140px] truncate sm:max-w-none">
                            {locating ? 'Locating...' : 'Use live location'}
                        </span>
                    </button>
                    <div className={pill + ' cursor-default'}>
                        <span className="text-white/70">{t.satelliteToolbarSource}</span>
                        <select
                            aria-label={t.satelliteToolbarSource}
                            className="cursor-pointer bg-transparent font-bold text-white outline-none"
                            value="S2"
                            disabled
                        >
                            <option value="S2">{t.satelliteSourceS2}</option>
                        </select>
                    </div>
                    <div className={pill}>
                        <span className="text-white/70">{t.satelliteToolbarIndex}</span>
                        <select
                            aria-label={t.satelliteToolbarIndex}
                            className="cursor-pointer bg-transparent font-bold text-emerald-100 outline-none"
                            value={previewIndex}
                            onChange={(e) => setPreviewIndex(e.target.value as PreviewIndex)}
                        >
                            {PREVIEW_INDICES.map((ix) => (
                                <option key={ix} value={ix} className="text-black">
                                    {ix.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                    <p className="flex max-w-full items-center gap-1.5 text-[11px] font-semibold text-emerald-100/95 md:max-w-[220px]">
                        <span className="text-amber-300">●</span>
                        <span className="leading-snug">{statusLine}</span>
                    </p>
                </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
                <aside className="flex w-full max-h-[45vh] flex-shrink-0 flex-col overflow-hidden border-b border-[#2E7D32]/35 bg-[#0f2412] md:max-h-none md:max-w-[380px] md:border-b-0 md:border-r">
                    <div className="flex items-center justify-between border-b border-[#2E7D32]/25 px-4 py-3">
                        <h2 className="text-sm font-black uppercase tracking-wide text-emerald-50">
                            NDVI Satellite Health
                        </h2>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                loading || dayLoading
                                    ? 'bg-amber-500/25 text-amber-200'
                                    : 'bg-emerald-500/20 text-emerald-200'
                            }`}
                        >
                            {loading || dayLoading ? (t.satelliteAssistantWorking || 'Working') : (t.satelliteAssistantReady || 'Ready')}
                        </span>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col">
                    <div className="flex shrink-0 flex-col gap-3 px-4 py-3">
                        {shownLocationLabel && (
                            <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/30 px-3 py-2">
                                <p className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-200/80">
                                    Location
                                </p>
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-100">
                                    <MapPin className="h-3.5 w-3.5 text-emerald-300" />
                                    <span className="truncate">{shownLocationLabel}</span>
                                </p>
                            </div>
                        )}

                        {(loading || dayLoading) && (
                            <p className="text-center text-xs font-semibold italic text-emerald-200/80">
                                {loadingTip}
                            </p>
                        )}

                        {error && (
                            <div className="rounded-xl border border-red-500/50 bg-red-950/50 p-3 text-xs font-bold text-red-100">
                                {error}
                            </div>
                        )}
                    </div>
                    <KrishiMitraSatellitePanel
                        analysisData={analysisData}
                        fieldName={(activeFarm?.name || '').trim() || 'Field'}
                    />
                    </div>
                </aside>

                <div className="relative w-full flex-1 min-h-[38svh] md:min-h-0">
                    <div className="absolute inset-0 min-h-0">
                        <SatelliteFarmMap
                            ref={mapApiRef}
                            center={mapCenter}
                            centerLabel={liveLocationLabel || farmLocationLabel || undefined}
                            className="h-full"
                            selectedTileUrl={tileUrl}
                            heatmapFeatures={analysisData?.features}
                            activeBand={previewIndex}
                            boundaryGeometry={(analysisData?.farm_boundary || fieldGeometry) ?? null}
                            onPolygonCenter={() => {
                                setMapStatus('saved');
                                setAnalysisData(null);
                                setAvailableDates([]);
                                setSelectedDate(null);
                            }}
                            onPolygonGeometry={(geometry) => {
                                setFieldGeometry(geometry);
                                setMapStatus('saved');
                                setAnalysisData(null);
                                setAvailableDates([]);
                                setSelectedDate(null);
                                void runAnalysis(geometry);
                            }}
                            onDrawMode={(active) => {
                                if (active) setMapStatus('draw');
                            }}
                        />
                    </div>

                    {analysisData?.farm_summary?.indices &&
                        Object.keys(analysisData.farm_summary.indices).length > 0 && (
                            <div className="pointer-events-none absolute left-3 top-3 z-[710] hidden max-w-[340px] md:block">
                                <div className="pointer-events-auto rounded-2xl border border-[#2E7D32]/45 bg-[#0a180c]/92 p-3 shadow-2xl backdrop-blur">
                                    <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-emerald-200/85">
                                        Indices
                                    </h3>
                                    <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                                        {Object.entries(
                                            analysisData.farm_summary.indices || {}
                                        ).map(([key, row]) => (
                                            <div
                                                key={key}
                                                className="flex items-start justify-between gap-3 rounded-lg border border-[#2E7D32]/25 bg-black/20 px-3 py-2"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 text-xs font-black uppercase text-emerald-300">
                                                        {iconForIndex(key)}
                                                        {key}
                                                    </div>
                                                    <p className="mt-0.5 text-[10px] text-emerald-100/70">
                                                        {indexDescription(key)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black tabular-nums text-white">
                                                        {formatMean(row.mean)}
                                                    </p>
                                                    <p className="max-w-[120px] text-[10px] leading-snug text-emerald-100/80">
                                                        {row.interpretation || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                    {availableDates.length > 0 && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[700] flex justify-center px-3">
                            <div
                                className="pointer-events-auto w-full max-w-4xl rounded-xl border border-[#2E7D32]/40 bg-[#0a180c]/90 p-2 backdrop-blur"
                                onPointerDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                            >
                                <div className="mb-1 px-2 text-[10px] font-black uppercase tracking-widest text-emerald-200/80">
                                    Timeline
                                </div>
                                <div className="flex items-center gap-1 px-1 pb-1">
                                    <button
                                        type="button"
                                        aria-label="Scroll timeline left"
                                        onClick={() => scrollTimeline(-1)}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/35 text-emerald-100 hover:bg-black/50"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    {/* min-w-0 + touch-action so horizontal swipe scrolls the strip instead of the map */}
                                    <div
                                        ref={timelineScrollRef}
                                        className="flex min-h-[44px] min-w-0 max-w-full flex-1 snap-x snap-proximity gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 [-webkit-overflow-scrolling:touch] [touch-action:pan-x]"
                                    >
                                        {availableDates.map((d) => (
                                            <button
                                                key={d}
                                                type="button"
                                                disabled={dayLoading}
                                                onClick={() => void handleDateClick(d)}
                                                className={`shrink-0 snap-center whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                                                    d === selectedDate
                                                        ? 'border-emerald-300 bg-emerald-500/20 text-emerald-100'
                                                        : 'border-white/20 bg-black/25 text-white/80 hover:bg-black/40'
                                                } ${dayLoading ? 'opacity-60' : ''}`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        aria-label="Scroll timeline right"
                                        onClick={() => scrollTimeline(1)}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/35 text-emerald-100 hover:bg-black/50"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SatelliteHealth;
