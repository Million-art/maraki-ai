import { GoogleGenerativeAI } from '@google/generative-ai';
export async function callGeminiGenerateContent(promptText) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error("GEMINI_API_KEY is not set");
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
        'gemini-3.1-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash'
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
    // Direct REST fallback with gemini-3.1-flash-lite
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
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
    return "No response from Gemini.";
}
