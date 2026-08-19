export const GEMINI_CONFIG = {
    models: {
        basic: 'gemini-3.1-flash-lite',
        complex: 'gemini-3.5-flash-lite',
        fallback: 'gemini-2.0-flash',
        live: 'gemini-3.5-flash-lite',
    },
    getApiKeys: () => {
        const rawKeys = [
            process.env.GEMINI_API_KEY,
            process.env.GEMINI_API_KEY_2,
            process.env.GEMINI_API_KEY_3,
            process.env.GEMINI_API_KEY_4,
            process.env.GOOGLE_API_KEY,
            process.env.VITE_GEMINI_API_KEY,
        ]
            .filter(Boolean)
            .flatMap(k => String(k).split(','))
            .map(k => k.trim().replace(/^["']|["']$/g, ''))
            .filter(k => k.length > 10);
        return Array.from(new Set(rawKeys));
    },
};
