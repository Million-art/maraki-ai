export async function callGeminiGenerateContent(promptText: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment");

  console.log(`[Maraki Bot Key Debug]: length=${apiKey.length}, prefix="${apiKey.substring(0, 6)}..."`);

  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash-8b'
  ];

  for (const modelName of modelsToTry) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (e: any) {
      console.warn(`Model ${modelName} fetch error:`, e?.message || e);
    }
  }

  return "No response from Maraki.";
}
