import { auth } from "../../firebase";

// Dynamically derive the backend URL from the browser's current hostname.
// This makes it work for both localhost dev and LAN/mobile access without any config changes.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL ||
    `http://${window.location.hostname}:5000/api`;

const getHeaders = async (): Promise<HeadersInit | any> => {
    // Wait for Auth to be ready
    if (auth.currentUser === null) {
        // Small delay to allow auth state to settle on page load
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    const headers: any = {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
        'ngrok-skip-browser-warning': 'true'
    };
    if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true); // Force refresh to ensure valid
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const api = {
    get: async (endpoint: string) => {
        const headers = await getHeaders();
        const res = await fetch(`${BASE_URL}${endpoint}`, { headers });
        if (res.status === 401) {
            // Optional: trigger logout or token refresh logic if needed
            // Firebase handles token refresh automatically, so 401 usually means
            // token is invalid/expired and refresh failed, or user is not auth'd.
            throw new Error("Unauthorized");
        }
        return res.json();
    },

    post: async (endpoint: string, body: any) => {
        const headers = await getHeaders();
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        if (res.status === 401) throw new Error("Unauthorized");
        return res.json();
    },

    // Special handler for FormData (Image Uploads)
    postMultipart: async (endpoint: string, formData: FormData) => {
        const headers: any = await getHeaders();
        delete headers['Content-Type']; // Let browser set boundary

        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData
        });

        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP Error ${res.status}`);
        }
        return res.json();
    },

    stream: async (endpoint: string, body: any, onChunk: (text: string) => void, onError: (err: any) => void) => {
        try {
            const headers = await getHeaders();
            const res = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });

            if (res.status === 401) throw new Error("Unauthorized");
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP Error ${res.status}`);
            }
            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || ''; // Keep the last incomplete chunk in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const jsonStr = line.slice(6); // Remove 'data: '
                            if (jsonStr.trim() === '[DONE]') continue;

                            const data = JSON.parse(jsonStr);
                            if (data.chunk) {
                                onChunk(data.chunk);
                            } else if (data.error) {
                                throw new Error(data.error);
                            }
                        } catch (e) {
                            console.warn("Failed to parse SSE chunk:", line);
                        }
                    }
                }
            }
        } catch (error) {
            onError(error);
        }
    },

    generateRoadmap: async (businessName: string, language: string = 'en') => {
        const headers = await getHeaders();
        const res = await fetch(`${BASE_URL}/generate-roadmap`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                business_name: businessName,
                language: language.toLowerCase()
            })
        });
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP Error ${res.status}`);
        }
        return res.json();
    },

    generateCropRoadmap: async (cropName: string, language: string = 'en') => {
        const headers = await getHeaders();
        const res = await fetch(`${BASE_URL}/generate-crop-roadmap`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                crop_name: cropName,
                language: language.toLowerCase()
            })
        });
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP Error ${res.status}`);
        }
        return res.json();
    },

    detectPest: async (formData: FormData) => {
        const headers: any = await getHeaders();
        delete headers['Content-Type']; // Let browser set boundary

        const res = await fetch(`${BASE_URL}/pest/detect`, {
            method: 'POST',
            headers,
            body: formData
        });

        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP Error ${res.status}`);
        }
        return res.json();
    },

    getCurrentWeather: async (location: string) => {
        const headers = await getHeaders();
        const res = await fetch(`${BASE_URL}/weather/current?location=${encodeURIComponent(location)}`, {
            headers
        });
        if (res.status === 401) throw new Error("Unauthorized");
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP Error ${res.status}`);
        }
        return res.json();
    },


    getMandiPrices: async (crop: string, district: string) => {
        const headers = await getHeaders();
        const res = await fetch(`${BASE_URL}/mandi/prices?crop=${encodeURIComponent(crop)}&district=${encodeURIComponent(district)}`, { headers });
        if (!res.ok) throw new Error("Failed to fetch mandi prices");
        return res.json();
    },

    getFertilizerAdvice: async (crop: string, soilData: any) => {
        const headers = await getHeaders();
        const res = await fetch(`${BASE_URL}/fertilizer/advice`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ crop, soilData })
        });
        if (!res.ok) throw new Error("Failed to fetch fertilizer advice");
        return res.json();
    }
};

// Satellite Health types
export interface SatelliteHealthRequest {
    lat: number;
    lon: number;
    startDate: string;
    endDate: string;
    crop?: string;
    language?: string;
}

export interface IndexStat {
    mean: number;
    median: number;
    stdDev: number;
    interpretation: string;
}

export interface SatelliteHealthResponse {
    cvi: IndexStat & { status: string; confidence: number };
    indices: Record<string, IndexStat>;
    timeSeries: { date: string; cvi: number }[];
    advisory: string;
    meta: {
        lat: number;
        lon: number;
        startDate: string;
        endDate: string;
        crop: string;
        generatedAt: string;
    };
}

export type GeoJsonPolygon = {
    type: 'Polygon';
    coordinates: number[][][];
};

export interface SatelliteGridFeature {
    type: 'Feature';
    geometry: GeoJsonPolygon;
    properties: Record<string, number | string | null>;
}

export interface SatelliteFieldSummary {
    confidence: number;
    scene_count: number;
    indices: Record<string, { mean: number | null; interpretation: string }>;
    cvi?: IndexStat & { status: string; confidence: number };
}

export interface SatelliteGeometryAnalysisResponse {
    type?: 'FeatureCollection';
    features?: SatelliteGridFeature[];
    farm_boundary: GeoJsonPolygon;
    farm_summary: SatelliteFieldSummary;
    index_tiles: Record<string, string | null>;
    ndvi_tile_url?: string | null;
    tile_url?: string | null;
    startDate?: string;
    endDate?: string;
    date?: string;
    scene_count?: number;
    error?: string;
}

export const fetchSatelliteHealth = async (
    payload: SatelliteHealthRequest,
    token: string
): Promise<SatelliteHealthResponse> => {
    const res = await fetch(`${BASE_URL}/satellite-health`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true',
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            lat: payload.lat,
            lon: payload.lon,
            startDate: payload.startDate,
            endDate: payload.endDate,
            crop: payload.crop ?? 'crop',
            language: payload.language ?? 'en',
        }),
    });
    if (res.status === 401) throw new Error('Unauthorized');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error((data as { error?: string }).error || `HTTP Error ${res.status}`);
    }
    const body = data as { status?: string; data?: SatelliteHealthResponse; error?: string };
    if (body.status === 'success' && body.data) {
        return body.data;
    }
    throw new Error(body.error || 'Satellite analysis failed');
};

export const fetchSatelliteGeometryAnalysis = async (
    payload: {
        geometry: GeoJsonPolygon;
        startDate: string;
        endDate: string;
    },
    token: string
): Promise<SatelliteGeometryAnalysisResponse> => {
    const res = await fetch(`${BASE_URL}/satellite-health/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true',
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    if (res.status === 401) throw new Error('Unauthorized');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error((data as { error?: string }).error || `HTTP Error ${res.status}`);
    }
    const body = data as { status?: string; data?: SatelliteGeometryAnalysisResponse; error?: string };
    if (body.status === 'success' && body.data) return body.data;
    throw new Error(body.error || 'Satellite geometry analysis failed');
};

export const fetchSatelliteAvailableDates = async (
    payload: { geometry: GeoJsonPolygon; lookbackDays?: number },
    token: string
): Promise<string[]> => {
    const res = await fetch(`${BASE_URL}/satellite-health/dates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true',
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    if (res.status === 401) throw new Error('Unauthorized');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error((data as { error?: string }).error || `HTTP Error ${res.status}`);
    }
    const body = data as {
        status?: string;
        data?: { dates?: string[] };
        error?: string;
    };
    if (body.status === 'success') return body.data?.dates ?? [];
    throw new Error(body.error || 'Failed to fetch satellite dates');
};

export const fetchSatelliteDayAnalysis = async (
    payload: { geometry: GeoJsonPolygon; date: string },
    token: string
): Promise<SatelliteGeometryAnalysisResponse> => {
    const res = await fetch(`${BASE_URL}/satellite-health/day`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true',
            'ngrok-skip-browser-warning': 'true',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
    if (res.status === 401) throw new Error('Unauthorized');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error((data as { error?: string }).error || `HTTP Error ${res.status}`);
    }
    const body = data as { status?: string; data?: SatelliteGeometryAnalysisResponse; error?: string };
    if (body.status === 'success' && body.data) return body.data;
    throw new Error(body.error || 'Failed to fetch day analysis');
};
