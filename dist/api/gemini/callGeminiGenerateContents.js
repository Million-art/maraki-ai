export async function callGeminiGenerateContent(promptText) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error("GEMINI_API_KEY is not set");
    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-goog-api-key": apiKey,
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: promptText }],
                    },
                ],
            }),
        });
        const data = await response.json();
        // Extract text safely
        return (data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
            "No response from Gemini.");
    }
    catch (err) {
        console.error("Error calling Gemini API:", err);
        return "An error occurred while generating content. Please try again later.";
    }
}
