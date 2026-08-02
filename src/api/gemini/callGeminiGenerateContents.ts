export async function callGeminiGenerateContent(promptText: string) {
  const rawKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GOOGLE_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
  ]
    .filter(Boolean)
    .flatMap(k => String(k).split(','))
    .map(k => k.trim().replace(/^["']|["']$/g, ''))
    .filter(k => k.length > 10);

  // Remove duplicates
  const apiKeys = Array.from(new Set(rawKeys));

  if (apiKeys.length === 0) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }

  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-pro',
  ];

  for (const apiKey of apiKeys) {
    for (const modelName of modelsToTry) {
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
