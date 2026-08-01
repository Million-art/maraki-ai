import { GoogleGenerativeAI } from '@google/generative-ai';
export async function callGeminiGenerateContent(promptText) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey)
        throw new Error("GEMINI_API_KEY is not set in environment");
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
        'gemini-1.5-flash-8b',
        'gemini-2.0-flash-lite',
        'gemini-1.5-flash',
        'gemini-2.0-flash'
    ];
    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(promptText);
            const response = await result.response;
            const text = response.text();
            if (text && text.trim().length > 0) {
                return text.trim();
            }
        }
        catch (err) {
            console.warn(`Model ${modelName} attempt error:`, err?.message || err);
        }
    }
    // Direct REST fallback with gemini-1.5-flash
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
        });
        const data = await res.json();
        const restText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (restText) {
            return restText.trim();
        }
    }
    catch (e) {
        // Ignore fallback error
    }
    return "No response from Maraki.";
}
