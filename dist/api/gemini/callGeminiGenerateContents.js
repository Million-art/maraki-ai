export async function callGeminiGenerateContent(promptText) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey)
        throw new Error("GEMINI_API_KEY is not set in environment");
    console.log(`[Maraki Bot Key Debug]: length=${apiKey.length}, prefix="${apiKey.substring(0, 6)}..."`);
    const modelsToTry = [
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash-8b'
    ];
    for (const modelName of modelsToTry) {
        const isBearerToken = apiKey.startsWith('AQ.') || apiKey.startsWith('ya29.');
        const url = isBearerToken
            ? `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`
            : `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const headers = {
            'Content-Type': 'application/json',
        };
        if (isBearerToken) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
            });
            const data = await res.json();
            if (data?.error) {
                console.warn(`Model ${modelName} REST error:`, data.error.message || data.error);
                continue;
            }
            const restText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (restText && restText.trim().length > 0) {
                return restText.trim();
            }
        }
        catch (e) {
            console.warn(`Model ${modelName} fetch error:`, e?.message || e);
        }
    }
    return "No response from Maraki.";
}
