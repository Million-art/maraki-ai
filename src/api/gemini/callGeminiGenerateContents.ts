import { GEMINI_CONFIG } from '../../config/gemini.config.js';

export async function callGeminiGenerateContent(
  promptText: string,
  taskType: 'basic' | 'complex' | 'fallback' | 'live' = 'complex',
  jsonMode: boolean = false
) {
  const apiKeys = GEMINI_CONFIG.getApiKeys();

  if (apiKeys.length === 0) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  const primaryModel = GEMINI_CONFIG.models[taskType];
  const fallbackModel = GEMINI_CONFIG.models.fallback;
  const modelsToTry = Array.from(new Set([primaryModel, fallbackModel]));

  for (const apiKey of apiKeys) {
    for (const modelName of modelsToTry) {
      try {
        const bodyPayload: any = {
          contents: [{ parts: [{ text: promptText }] }],
        };

        if (jsonMode) {
          bodyPayload.generationConfig = {
            responseMimeType: 'application/json',
          };
        }

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(bodyPayload),
        });

        const data = await res.json();

        if (data?.error) {
          const errMsg = data.error.message || JSON.stringify(data.error);
          // Only log warnings if it's not an expected rate-limit cascade
          if (!errMsg.includes('Quota exceeded')) {
            console.warn(`Model ${modelName} (Key ${apiKey.substring(0, 6)}...): ${errMsg}`);
          }
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
