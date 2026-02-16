// Auth removed for offline/mock mode
// import { auth } from '../firebase';

// Use environment variable or default to localhost
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = async (): Promise<HeadersInit | any> => {
    // No auth token needed for now
    const headers: any = {
        'Content-Type': 'application/json',
    };
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

    generateRoadmap: async (businessName: string) => {
        const headers = await getHeaders();
        const res = await fetch(`${BASE_URL}/generate-roadmap`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ business_name: businessName })
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
    }
};
