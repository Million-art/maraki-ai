export const GEMINI_CONFIG = {
  /**
   * Ordered Gemini model cascade.
   * Requests will try models from top to bottom if a model is unavailable or rate-limited.
   */
  models: [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
  ],

  /**
   * Extract & sanitize API keys from environment variables.
   * Supports comma-separated keys and multiple fallback env variables.
   */
  getApiKeys: (): string[] => {
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
