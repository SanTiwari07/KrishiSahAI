import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import '@geoman-io/leaflet-geoman-free';
import { Loader2 } from 'lucide-react';

import iconRetina from 'leaflet/dist/images/marker-icon-2x.png?url';
import iconUrl from 'leaflet/dist/images/marker-icon.png?url';
import iconShadow from 'leaflet/dist/images/marker-shadow.png?url';

import { useLanguage } from '../src/context/LanguageContext';
import { ndviToColor, ndviToRgb } from '../src/utils/ndviColor';

try {
    Reflect.deleteProperty(L.Icon.Default.prototype as object, '_getIconUrl');
} catch {
    /* ignore */
}
try {
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: iconRetina,
        iconUrl: iconUrl,
        shadowUrl: iconShadow,
    });
} catch {
    /* ignore */
}

export type SatelliteMapHandle = {
    startDrawPolygon: () => void;
    clearDrawn: () => void;
};

/** Krishi NDVI scale legend — same class bands as the UI legend panel. */
function bandInterpretation(band: string, v: number): string {
    if (Number.isNaN(v)) return '—';
    const b = band.toLowerCase();
    if (b === 'ndmi') {
        if (v < 0.0) return 'Dry / drought stress';
        if (v < 0.2) return 'Low moisture';
        if (v < 0.4) return 'Moderate moisture';
        return 'High moisture';
    }
    if (b === 'ndwi') {
        if (v < 0.0) return 'No significant water';
        if (v < 0.3) return 'Water likely present';
        return 'High water presence';
    }
    // NDVI / EVI / SAVI / GNDVI / CVI — legend bins (map NDVI-style scale)
    if (v < 0.2) return 'Open soil';
    if (v < 0.4) return 'Sparse vegetation';
    if (v < 0.6) return 'Moderate vegetation';
    if (v < 0.95) return 'Dense vegetation';
    return 'Better to use NDRE';
}

type GridFeature = {
    type: 'Feature';
    geometry: { type: 'Polygon'; coordinates: number[][][] };
    properties: Record<string, number | string | null>;
};

type Props = {
    center: { lat: number; lng: number } | null;
    centerLabel?: string;
    className?: string;
    onPolygonCenter?: (lat: number, lng: number) => void;
    onPolygonGeometry?: (geometry: {
        type: 'Polygon';
        coordinates: number[][][];
    }) => void;
    onDrawMode?: (active: boolean) => void;
    selectedTileUrl?: string | null;
    heatmapFeatures?: GridFeature[];
    activeBand?: string;
    boundaryGeometry?: {
        type: 'Polygon';
        coordinates: number[][][];
    } | null;
};

type HoverInfo = {
    value: number;
    band: string;
    x: number;
    y: number;
};

export const SatelliteFarmMap = forwardRef<SatelliteMapHandle, Props>(
    function SatelliteFarmMap(
        {
            center,
            centerLabel,
            className = '',
            onPolygonCenter,
            onPolygonGeometry,
            onDrawMode,
            selectedTileUrl,
            heatmapFeatures,
            activeBand,
            boundaryGeometry,
        },
        ref
    ) {
        const { t } = useLanguage();
        const containerRef = useRef<HTMLDivElement>(null);
        const mapRef = useRef<L.Map | null>(null);
        const drawnRef = useRef<L.Layer | null>(null);
        const selectedTileRef = useRef<L.TileLayer | null>(null);
        const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);
        const heatCellsRef = useRef<{
            lngs: Float64Array;
            lats: Float64Array;
            values: Float32Array;
        } | null>(null);
        const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
        const onPolyRef = useRef(onPolygonCenter);
        const onGeomRef = useRef(onPolygonGeometry);
        const onDrawRef = useRef(onDrawMode);
        onPolyRef.current = onPolygonCenter;
        onGeomRef.current = onPolygonGeometry;
        onDrawRef.current = onDrawMode;

        const [tilesReady, setTilesReady] = useState(false);
        const [showSlowHint, setShowSlowHint] = useState(false);
        const [hover, setHover] = useState<HoverInfo | null>(null);

        useImperativeHandle(ref, () => ({
            startDrawPolygon: () => {
                const m = mapRef.current;
                if (!m?.pm) return;
                m.pm.enableDraw('Polygon', { snappable: true });
                onDrawRef.current?.(true);
            },
            clearDrawn: () => {
                const m = mapRef.current;
                if (!m || !drawnRef.current) return;
                m.removeLayer(drawnRef.current);
                drawnRef.current = null;
            },
        }));

        // ─── Map init ──────────────────────────────────────────────────────
        useEffect(() => {
            const el = containerRef.current;
            if (!el) return;

            let map: L.Map | null = null;
            let onCreate: ((e: L.LeafletEvent) => void) | null = null;
            let cancelled = false;
            let slowTimer: ReturnType<typeof setTimeout> | null = null;
            let failsafeTimer: ReturnType<typeof setTimeout> | null = null;
            let overlayDismissed = false;

            const ro = new ResizeObserver(() => {
                map?.invalidateSize();
            });

            setTilesReady(false);
            setShowSlowHint(false);

            const dismissLoadingOverlay = () => {
                if (cancelled || overlayDismissed) return;
                overlayDismissed = true;
                if (slowTimer) {
                    clearTimeout(slowTimer);
                    slowTimer = null;
                }
                if (failsafeTimer) {
                    clearTimeout(failsafeTimer);
                    failsafeTimer = null;
                }
                setTilesReady(true);
                setShowSlowHint(false);
                map?.invalidateSize();
            };

            try {
                const fallback = L.latLng(20.5937, 78.9629);
                const ll = center ? L.latLng(center.lat, center.lng) : fallback;
                const z = center ? 15 : 5;

                map = L.map(el, {
                    zoomControl: true,
                    preferCanvas: false,
                    fadeAnimation: false,
                    zoomAnimation: true,
                }).setView(ll, z);

                map.whenReady(() => {
                    map?.invalidateSize();
                    requestAnimationFrame(() => map?.invalidateSize());
                });

                const tiles = L.tileLayer(
                    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    {
                        maxZoom: 19,
                        updateWhenIdle: false,
                        keepBuffer: 2,
                        attribution:
                            '&copy; Esri &mdash; <a href="https://leafletjs.com" target="_blank" rel="noreferrer">Leaflet</a>',
                    }
                );
                tiles.on('load', dismissLoadingOverlay);
                tiles.once('tileload', dismissLoadingOverlay);
                tiles.addTo(map);

                slowTimer = setTimeout(() => {
                    if (!cancelled && !overlayDismissed) setShowSlowHint(true);
                }, 8000);

                failsafeTimer = setTimeout(() => {
                    dismissLoadingOverlay();
                }, 14000);

                if (map.pm) {
                    map.pm.addControls({
                        position: 'topright',
                        drawMarker: false,
                        drawCircle: false,
                        drawRectangle: false,
                        drawPolyline: false,
                        drawPolygon: true,
                        drawCircleMarker: false,
                        editMode: true,
                        dragMode: false,
                        cutPolygon: false,
                        removalMode: true,
                        oneBlock: true,
                    });
                }

                onCreate = (e: L.LeafletEvent) => {
                    const m = mapRef.current;
                    if (!m) return;
                    const layer = (e as L.LeafletEvent & { layer: L.Layer })
                        .layer;
                    if (drawnRef.current) {
                        m.removeLayer(drawnRef.current);
                    }
                    drawnRef.current = layer;
                    if (layer instanceof L.Polygon) {
                        const c = layer.getBounds().getCenter();
                        onPolyRef.current?.(c.lat, c.lng);
                        const geo = layer.toGeoJSON();
                        const geometry = (
                            geo as GeoJSON.Feature<GeoJSON.Polygon>
                        ).geometry;
                        if (geometry?.type === 'Polygon') {
                            onGeomRef.current?.({
                                type: 'Polygon',
                                coordinates: geometry.coordinates as number[][][],
                            });
                        }
                    }
                    onDrawRef.current?.(false);
                    m.pm?.disableDraw('Polygon');
                };

                map.on('pm:create', onCreate);

                if (center) {
                    L.marker([center.lat, center.lng], {
                        title: centerLabel || 'Farm',
                    })
                        .addTo(map)
                        .bindTooltip(centerLabel || 'Farm location', {
                            direction: 'top',
                        });
                }

                ro.observe(el);
                mapRef.current = map;

                const bump = () => map?.invalidateSize();
                bump();
                requestAnimationFrame(bump);
                setTimeout(bump, 50);
                setTimeout(bump, 250);
                setTimeout(bump, 600);
            } catch (err) {
                console.error('[SatelliteFarmMap] init failed', err);
                mapRef.current = null;
                if (!cancelled) setTilesReady(true);
            }

            return () => {
                cancelled = true;
                if (slowTimer) {
                    clearTimeout(slowTimer);
                    slowTimer = null;
                }
                if (failsafeTimer) {
                    clearTimeout(failsafeTimer);
                    failsafeTimer = null;
                }
                ro.disconnect();
                if (map && onCreate) {
                    map.off('pm:create', onCreate);
                }
                if (map) {
                    map.remove();
                }
                mapRef.current = null;
                drawnRef.current = null;
            };
        }, [center?.lat, center?.lng, centerLabel]);

        // ─── Selected GEE tile overlay (optional) ──────────────────────────
        useEffect(() => {
            const map = mapRef.current;
            if (!map) return;
            if (selectedTileRef.current) {
                map.removeLayer(selectedTileRef.current);
                selectedTileRef.current = null;
            }
            if (!selectedTileUrl) return;
            const layer = L.tileLayer(selectedTileUrl, {
                opacity: 0.82,
                maxZoom: 20,
            });
            layer.addTo(map);
            selectedTileRef.current = layer;
            return () => {
                if (selectedTileRef.current) {
                    map.removeLayer(selectedTileRef.current);
                    selectedTileRef.current = null;
                }
            };
        }, [selectedTileUrl]);

        // ─── Canvas heatmap (Shepard IDW, clipped to polygon) ──────────────
        useEffect(() => {
            const map = mapRef.current;
            if (!map) return;

            // Teardown any previous canvas
            const removeCanvas = () => {
                const existing = heatCanvasRef.current;
                if (existing && existing.parentNode) {
                    existing.parentNode.removeChild(existing);
                }
                heatCanvasRef.current = null;
            };
            removeCanvas();

            if (
                !heatmapFeatures ||
                heatmapFeatures.length === 0 ||
                !activeBand
            ) {
                return;
            }

            const bandKey = activeBand.toLowerCase();
            const canvas = L.DomUtil.create(
                'canvas',
                'satellite-heat-canvas'
            ) as HTMLCanvasElement;
            Object.assign(canvas.style, {
                position: 'absolute',
                top: '0',
                left: '0',
                pointerEvents: 'none',
                opacity: '0.75',
            });
            map.getPanes().overlayPane.appendChild(canvas);
            heatCanvasRef.current = canvas;

            let rafId: number | null = null;

            const redraw = () => {
                const c = heatCanvasRef.current;
                if (!c) return;
                const size = map.getSize();
                const W = size.x;
                const H = size.y;
                if (W <= 0 || H <= 0) return;
                c.width = W;
                c.height = H;
                L.DomUtil.setPosition(
                    c,
                    map.containerPointToLayerPoint([0, 0])
                );

                const ctx = c.getContext('2d');
                if (!ctx) return;
                ctx.clearRect(0, 0, W, H);

                // Collect cell centres + values
                const cellsX: number[] = [];
                const cellsY: number[] = [];
                const cellsV: number[] = [];
                const lngArr: number[] = [];
                const latArr: number[] = [];
                for (const feature of heatmapFeatures) {
                    const raw = feature.properties?.[bandKey];
                    const val =
                        typeof raw === 'number' ? raw : Number(raw as string);
                    if (raw === null || raw === undefined || Number.isNaN(val))
                        continue;
                    const ring = feature.geometry?.coordinates?.[0];
                    if (!ring || !ring.length) continue;
                    let sumLng = 0;
                    let sumLat = 0;
                    for (const [lng, lat] of ring) {
                        sumLng += lng;
                        sumLat += lat;
                    }
                    const n = ring.length;
                    const cLat = sumLat / n;
                    const cLng = sumLng / n;
                    const cpt = map.latLngToContainerPoint([cLat, cLng]);
                    cellsX.push(cpt.x);
                    cellsY.push(cpt.y);
                    cellsV.push(Math.max(-1, Math.min(1, val)));
                    lngArr.push(cLng);
                    latArr.push(cLat);
                }

                const N = cellsX.length;
                if (!N) {
                    heatCellsRef.current = null;
                    return;
                }

                // Cache lng/lat/value triples for hover lookups at any pixel
                heatCellsRef.current = {
                    lngs: Float64Array.from(lngArr),
                    lats: Float64Array.from(latArr),
                    values: Float32Array.from(cellsV),
                };

                // Estimate average cell spacing in pixels
                const step = Math.max(1, Math.ceil(N / 24));
                let totalMin = 0;
                let cnt = 0;
                for (let i = 0; i < N; i += step) {
                    let minD2 = Infinity;
                    for (let j = 0; j < N; j++) {
                        if (j === i) continue;
                        const dx = cellsX[j] - cellsX[i];
                        const dy = cellsY[j] - cellsY[i];
                        const d2 = dx * dx + dy * dy;
                        if (d2 < minD2) minD2 = d2;
                    }
                    if (minD2 < Infinity) {
                        totalMin += Math.sqrt(minD2);
                        cnt += 1;
                    }
                }
                const spacing = cnt > 0 ? totalMin / cnt : 40;

                // Pre-compute 512-entry LUT
                const LUT_N = 512;
                const lutR = new Uint8Array(LUT_N);
                const lutG = new Uint8Array(LUT_N);
                const lutB = new Uint8Array(LUT_N);
                for (let i = 0; i < LUT_N; i++) {
                    const v = -1 + (i / (LUT_N - 1)) * 2;
                    const [r, g, b] = ndviToRgb(v);
                    lutR[i] = r;
                    lutG[i] = g;
                    lutB[i] = b;
                }
                const toLutIdx = (v: number) =>
                    Math.round(
                        Math.max(0, Math.min(1, (v + 1) / 2)) * (LUT_N - 1)
                    );

                // Spatial bucket grid
                const bSz = Math.max(1, Math.round(spacing));
                const gCols = Math.ceil(W / bSz) + 2;
                const gRows = Math.ceil(H / bSz) + 2;
                const buckets: number[][] = new Array(gCols * gRows)
                    .fill(null)
                    .map(() => []);
                for (let i = 0; i < N; i++) {
                    const bx = Math.floor(cellsX[i] / bSz);
                    const by = Math.floor(cellsY[i] / bSz);
                    if (bx >= 0 && bx < gCols && by >= 0 && by < gRows) {
                        buckets[by * gCols + bx].push(i);
                    }
                }

                const SEARCH_R = 4;
                const epsSq = (spacing * 0.5) ** 2;

                const imgData = ctx.createImageData(W, H);
                const buf = imgData.data;

                for (let py = 0; py < H; py++) {
                    const by0 = Math.floor(py / bSz);
                    for (let px = 0; px < W; px++) {
                        const bx0 = Math.floor(px / bSz);
                        let wSum = 0;
                        let vSum = 0;
                        let nearD2 = Infinity;
                        let nearIdx = -1;

                        for (let dy = -SEARCH_R; dy <= SEARCH_R; dy++) {
                            const by = by0 + dy;
                            if (by < 0 || by >= gRows) continue;
                            for (let dx = -SEARCH_R; dx <= SEARCH_R; dx++) {
                                const bx = bx0 + dx;
                                if (bx < 0 || bx >= gCols) continue;
                                const bucket = buckets[by * gCols + bx];
                                for (const i of bucket) {
                                    const ddx = cellsX[i] - px;
                                    const ddy = cellsY[i] - py;
                                    const d2 = ddx * ddx + ddy * ddy;
                                    if (d2 < nearD2) {
                                        nearD2 = d2;
                                        nearIdx = i;
                                    }
                                    const w = 1 / (d2 + epsSq);
                                    wSum += w;
                                    vSum += w * cellsV[i];
                                }
                            }
                        }
                        if (nearIdx < 0) continue;

                        const interpV = wSum > 0 ? vSum / wSum : cellsV[nearIdx];
                        const li = toLutIdx(interpV);
                        const pi = (py * W + px) * 4;
                        buf[pi] = lutR[li];
                        buf[pi + 1] = lutG[li];
                        buf[pi + 2] = lutB[li];
                        buf[pi + 3] = 255;
                    }
                }

                // Stamp onto canvas, clipped to farm polygon (if present)
                const offscreen = document.createElement('canvas');
                offscreen.width = W;
                offscreen.height = H;
                const offCtx = offscreen.getContext('2d');
                if (!offCtx) return;
                offCtx.putImageData(imgData, 0, 0);

                const poly = boundaryGeometry;
                const hasClip = !!poly?.coordinates;
                if (hasClip && poly) {
                    ctx.save();
                    ctx.beginPath();
                    const rings: number[][][] = [poly.coordinates[0]];
                    for (const ring of rings) {
                        ring.forEach(([lng, lat], i) => {
                            const pt = map.latLngToContainerPoint([lat, lng]);
                            if (i === 0) ctx.moveTo(pt.x, pt.y);
                            else ctx.lineTo(pt.x, pt.y);
                        });
                        ctx.closePath();
                    }
                    ctx.clip();
                }
                ctx.drawImage(offscreen, 0, 0);
                if (hasClip) ctx.restore();
            };

            const scheduleRedraw = () => {
                if (rafId !== null) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(redraw);
            };

            // During Leaflet's zoom animation, CSS-transform the canvas so the
            // heatmap scales/translates along with the tile layers. Without
            // this the canvas stays at its pre-zoom size until zoomend fires
            // and the heatmap appears detached from the map. Same pattern as
            // Leaflet.heat plugin.
            const mapAny = map as unknown as {
                getZoomScale: (toZoom: number, fromZoom?: number) => number;
                _getCenterOffset: (latlng: L.LatLng) => L.Point;
                _getMapPanePos: () => L.Point;
            };
            const animateZoom = (ev: L.LeafletEvent) => {
                const c = heatCanvasRef.current;
                if (!c) return;
                const e = ev as unknown as {
                    zoom: number;
                    center: L.LatLng;
                };
                try {
                    const scale = mapAny.getZoomScale(e.zoom, map.getZoom());
                    const offset = mapAny
                        ._getCenterOffset(e.center)
                        .multiplyBy(-scale)
                        .subtract(mapAny._getMapPanePos());
                    if (L.DomUtil.setTransform) {
                        L.DomUtil.setTransform(c, offset, scale);
                    } else {
                        (c.style as CSSStyleDeclaration).transform = `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`;
                    }
                } catch {
                    /* ignore */
                }
            };

            scheduleRedraw();
            map.on('moveend zoomend resize', scheduleRedraw);
            map.on('zoomanim', animateZoom);

            return () => {
                if (rafId !== null) cancelAnimationFrame(rafId);
                map.off('moveend zoomend resize', scheduleRedraw);
                map.off('zoomanim', animateZoom);
                removeCanvas();
            };
        }, [heatmapFeatures, activeBand, boundaryGeometry]);

        // ─── Per-pixel hover (map-level mousemove + point-in-polygon) ──────
        useEffect(() => {
            const map = mapRef.current;
            if (!map) return;

            if (
                !heatmapFeatures ||
                heatmapFeatures.length === 0 ||
                !activeBand
            ) {
                setHover(null);
                return;
            }

            const ring: number[][] | null =
                boundaryGeometry?.coordinates?.[0] ?? null;

            const pointInRing = (lng: number, lat: number): boolean => {
                if (!ring || ring.length < 3) return true;
                let inside = false;
                for (
                    let i = 0, j = ring.length - 1;
                    i < ring.length;
                    j = i++
                ) {
                    const xi = ring[i][0];
                    const yi = ring[i][1];
                    const xj = ring[j][0];
                    const yj = ring[j][1];
                    const intersect =
                        yi > lat !== yj > lat &&
                        lng <
                            ((xj - xi) * (lat - yi)) / (yj - yi + 1e-18) + xi;
                    if (intersect) inside = !inside;
                }
                return inside;
            };

            const onMove = (ev: L.LeafletMouseEvent) => {
                const cells = heatCellsRef.current;
                if (!cells) {
                    setHover(null);
                    return;
                }
                const lat = ev.latlng.lat;
                const lng = ev.latlng.lng;
                if (!pointInRing(lng, lat)) {
                    setHover(null);
                    return;
                }

                // Shepard IDW over all cells (tiny N) — matches the rendered
                // heatmap so the tooltip value agrees with the colour under
                // the cursor. Epsilon uses ~30m to stay smooth near centres.
                const { lngs, lats, values } = cells;
                const N = values.length;
                let wSum = 0;
                let vSum = 0;
                let nearestV = 0;
                let nearestD2 = Infinity;
                const EPS2 = 3e-7; // ~approx (30m)^2 in deg^2 at mid-latitudes
                for (let i = 0; i < N; i++) {
                    const dx = lngs[i] - lng;
                    const dy = lats[i] - lat;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < nearestD2) {
                        nearestD2 = d2;
                        nearestV = values[i];
                    }
                    const w = 1 / (d2 + EPS2);
                    wSum += w;
                    vSum += w * values[i];
                }
                const v = wSum > 0 ? vSum / wSum : nearestV;

                const orig = (ev.originalEvent as MouseEvent) || null;
                const x = orig?.clientX ?? 0;
                const y = orig?.clientY ?? 0;
                setHover({ value: v, band: activeBand, x, y });
            };

            const onLeave = () => setHover(null);

            map.on('mousemove', onMove);
            map.on('mouseout', onLeave);

            return () => {
                map.off('mousemove', onMove);
                map.off('mouseout', onLeave);
                setHover(null);
            };
        }, [heatmapFeatures, activeBand, boundaryGeometry]);

        // ─── Boundary outline ──────────────────────────────────────────────
        useEffect(() => {
            const map = mapRef.current;
            if (!map) return;
            if (boundaryLayerRef.current) {
                map.removeLayer(boundaryLayerRef.current);
                boundaryLayerRef.current = null;
            }
            if (!boundaryGeometry) return;
            const layer = L.geoJSON(boundaryGeometry as GeoJSON.GeoJsonObject, {
                style: {
                    color: '#FFFFFF',
                    weight: 4,
                    opacity: 1,
                    fillColor: '#FFFFFF',
                    fillOpacity: 0.03,
                },
            });
            layer.addTo(map);
            boundaryLayerRef.current = layer;
            try {
                const bounds = layer.getBounds();
                if (bounds.isValid()) map.fitBounds(bounds.pad(0.2));
            } catch {
                /* ignore fit errors */
            }
            return () => {
                if (boundaryLayerRef.current) {
                    map.removeLayer(boundaryLayerRef.current);
                    boundaryLayerRef.current = null;
                }
            };
        }, [boundaryGeometry]);

        // ─── Render ────────────────────────────────────────────────────────
        return (
            <div className="relative h-full w-full min-h-[inherit] bg-[#061208]">
                <div
                    ref={containerRef}
                    className={`satellite-leaflet-host z-0 h-full w-full min-w-0 ${className}`}
                />
                {hover && (
                    <div
                        className="pointer-events-none fixed z-[1200] rounded-lg border border-white/10 bg-[#111827]/95 px-3 py-2 text-white shadow-xl backdrop-blur"
                        style={{
                            left: hover.x + 15,
                            top: hover.y + 15,
                        }}
                    >
                        <div
                            className="text-[15px] font-medium leading-tight"
                            style={{ color: '#fff' }}
                        >
                            <span
                                className="font-semibold"
                                style={{
                                    color: ndviToColor(
                                        Math.max(-1, Math.min(1, hover.value))
                                    ),
                                    transition: 'color 0.14s ease-out',
                                }}
                            >
                                {hover.band.toUpperCase()}:{' '}
                            </span>
                            <span
                                className="tabular-nums"
                                style={{ color: '#e2e8f0' }}
                            >
                                {hover.value.toFixed(4)}
                            </span>
                        </div>
                        <div
                            className="mt-1 text-[13px] font-normal leading-tight"
                            style={{
                                color: ndviToColor(
                                    Math.max(-1, Math.min(1, hover.value))
                                ),
                                opacity: Number.isFinite(hover.value) ? 0.88 : 1,
                                transition: 'color 0.14s ease-out, opacity 0.14s ease-out',
                            }}
                        >
                            {Number.isFinite(hover.value)
                                ? bandInterpretation(hover.band, hover.value)
                                : '—'}
                        </div>
                    </div>
                )}
                {!tilesReady && (
                    <div className="pointer-events-none absolute inset-0 z-[500] flex flex-col items-center justify-center gap-2 bg-[#061208]/95 px-4 text-center text-emerald-200">
                        <Loader2 className="h-10 w-10 shrink-0 animate-spin text-emerald-400" />
                        <p className="max-w-xs text-xs font-bold leading-snug">
                            {t.satelliteMapLoading}
                        </p>
                        {showSlowHint && (
                            <p className="max-w-xs text-[11px] font-semibold text-amber-200/90">
                                {t.satelliteMapSlow}
                            </p>
                        )}
                    </div>
                )}
            </div>
        );
    }
);
