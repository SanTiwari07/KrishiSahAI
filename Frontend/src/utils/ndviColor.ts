/**
 * KrishiSahAI NDVI heatmap — legend-aligned ramp (UI “NDVI scale” panel).
 * Thresholds match product bins; colours interpolate smoothly between stops.
 * High canopy (0.95–1.00) uses darkest forest green (NDRE / saturated signal band).
 */

export const LEGEND_NDVI_STOPS: ReadonlyArray<readonly [number, string]> = [
    [-1.0, '#4a0a16'], // open soil — maroon
    [0.05, '#7a1222'],
    [0.1, '#901b28'],
    [0.15, '#b01f28'], // open soil — bright red
    [0.2, '#d03a2a'], // sparse — red-orange
    [0.25, '#e0552e'],
    [0.3, '#ed6c38'],
    [0.35, '#f4874a'], // sparse — light orange
    [0.4, '#f9a866'], // moderate
    [0.45, '#fcc885'],
    [0.5, '#fae0a5'],
    [0.55, '#dbe89a'], // moderate — pale yellow-green
    [0.6, '#b8d978'], // dense — pale green
    [0.65, '#96ca62'],
    [0.7, '#6fb95a'],
    [0.75, '#4da656'],
    [0.8, '#34924f'],
    [0.85, '#1f7d47'],
    [0.9, '#0f6840'],
    [0.95, '#0a5236'], // dense — dark green
    [1.0, '#033d2a'], // 0.95–1.00 — forest / “better NDRE” end
] as const;

/** @deprecated alias — same array as LEGEND_NDVI_STOPS */
export const EOS_NDVI_STOPS = LEGEND_NDVI_STOPS;

function lerpHex(a: string, b: string, t: number): string {
    const ar = parseInt(a.slice(1, 3), 16);
    const ag = parseInt(a.slice(3, 5), 16);
    const ab = parseInt(a.slice(5, 7), 16);
    const br = parseInt(b.slice(1, 3), 16);
    const bg = parseInt(b.slice(3, 5), 16);
    const bb = parseInt(b.slice(5, 7), 16);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

/** Map NDVI in [-1, 1] to hex using LEGEND_NDVI_STOPS + linear interpolation. */
export function ndviToColor(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return '#4b5563';
    }
    const stops = LEGEND_NDVI_STOPS as Array<[number, string]>;
    const v = Number(value);
    if (v <= stops[0][0]) return stops[0][1];
    if (v >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];

    let lo = 0;
    for (let i = 1; i < stops.length; i++) {
        if (v < stops[i][0]) {
            lo = i - 1;
            break;
        }
        lo = i;
    }
    const hi = Math.min(lo + 1, stops.length - 1);
    const loV = stops[lo][0];
    const hiV = stops[hi][0];
    const t = hiV === loV ? 0 : (v - loV) / (hiV - loV);
    return lerpHex(stops[lo][1], stops[hi][1], t);
}

export function ndviToRgb(value: number | null | undefined): [number, number, number] {
    const hex = ndviToColor(value);
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
}
