export const GEMINI_CONFIG = {
    models: {
        basic: 'gemini-2.5-flash',
        complex: 'gemini-2.5-flash',
        fallback: 'gemini-2.5-flash-lite',
        live: 'gemini-2.5-flash',
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
