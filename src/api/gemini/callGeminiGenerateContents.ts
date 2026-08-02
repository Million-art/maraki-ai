import { GEMINI_CONFIG } from '../../config/gemini.config.js';

export async function callGeminiGenerateContent(promptText: string) {
  const apiKeys = GEMINI_CONFIG.getApiKeys();

  if (apiKeys.length === 0) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  for (const apiKey of apiKeys) {
    for (const modelName of GEMINI_CONFIG.models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
        });
        const data = await res.json();

        if (data?.error) {
          const errMsg = data.error.message || JSON.stringify(data.error);
          console.warn(`Model ${modelName} (Key ${apiKey.substring(0, 6)}...) error: ${errMsg}`);
          
          // If quota exceeded or model not found, try next model/key
          continue;
        }

        const restText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (restText && restText.trim().length > 0) {
          return restText.trim();
        }
      } catch (e: any) {
        console.warn(`Model ${modelName} fetch error:`, e?.message || e);
      }
    }
  }

  return "Sorry, I'm experiencing high traffic right now. Please try again in a moment! ⏳";
}
