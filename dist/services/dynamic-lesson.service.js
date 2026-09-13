import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
export class DynamicLessonService {
    /**
     * Generate an adaptive, Ethiopian-localized daily lesson using cost-efficient Gemini models.
     * Returns null if generation fails or times out, triggering immediate offline fallback.
     */
    static async generateLesson(weakness, cefrLevel = 'B1', dayNumber = 1, dayTitle, dayTask) {
        const isListening = weakness.toLowerCase() === 'listening';
        let specializedPrompt = '';
        if (isListening) {
            specializedPrompt = `
You are Maraki AI's expert spoken English audio trainer for Ethiopian learners.
Generate an intelligent, highly immersive, real-world spoken English LISTENING lesson.

Learner Profile:
- Diagnosed Skill Weakness: Listening Comprehension & Spoken Cadence
- Target CEFR Benchmark: ${cefrLevel}
- 7-Day Plan Milestone: Day ${dayNumber} of 7
${dayTitle ? `- Focus Theme: ${dayTitle}` : ''}
${dayTask ? `- Target Skill: ${dayTask}` : ''}

Listening Lesson Requirements:
1. Authentic Scenario: Choose one realistic context:
   - Workplace voicemail / task delegation with specific deadlines & numbers
   - Fast conversational speech with natural spoken contractions ("gonna" for going to, "wanna" for want to, "could've" for could have, "should've" for should have, connected speech)
   - Ethiopian business context (Telebirr/CBE verification, Ethiopian Airlines flight notice, tech startup standup)
   - Conversational pragmatics & politeness ("Would you mind...", "I'd rather...", tone & intent)
   - Number/time disambiguation (14 vs 40, 2:15 vs 2:50, currency amounts)
2. Spoken Passage ("passage"):
   - Must be 2 to 4 natural, conversational spoken sentences (35 to 65 words).
   - Designed specifically to be read aloud via Text-To-Speech (TTS).
   - DO NOT include speaker tags like "Speaker 1:" or "Manager:".
   - DO NOT include brackets, markdown formatting, or stage directions.
3. Comprehension Question ("question"):
   - A question testing true listening comprehension (e.g. implied intention, specific extracted action item, time/number detail, or pragmatic meaning).
   - Do not make it a reading test; the user will ONLY hear this as an audio voice note before seeing the question!
4. Options ("options"):
   - Exactly 3 options (A, B, C). One clearly correct, two representing common auditory or conceptual confusion.
5. Pedagogy & Formatting Rules:
   - "strategy": Practical listening technique on how to train the ear for this pattern.
   - "amharicTip": 1-2 sentence tip in Amharic (ፊደላት) explaining what acoustic clue or phrase to listen for.
   - "explanation": Friendly Amharic/English explanation breaking down the correct audio clue.
   - CRITICAL RULE: NEVER use phonetic symbols or IPA slashes (like /gənə/, /wɑnə/, or /kʊdəv/) anywhere. Always use standard human-readable English words in quotes (e.g. 'gonna', 'wanna', 'could\'ve') and natural Amharic explanations.

Return ONLY a valid JSON object matching this schema:
{
  "title": "Listening Mastery",
  "topic": "Concise Scenario Title (e.g. Voicemail Action Items, Fast Reductions)",
  "duration": "5 mins",
  "strategy": "Practical listening strategy...",
  "amharicTip": "በአማርኛ ጠቃሚ ምክር (የድምፅ ቅላጼውን ወይም ፈጣን አነጋገርን እንዴት እንደሚለዩ)",
  "passage": "Natural spoken English dialogue text to be synthesized into audio...",
  "question": "Comprehension question based on the audio clip?",
  "options": [
    "A) First option",
    "B) Second option",
    "C) Third option"
  ],
  "correctIndex": 0,
  "explanation": "Detailed explanation of why this is correct and what clue in the audio confirms it."
}
`;
        }
        else {
            specializedPrompt = `
You are Maraki AI's expert Ethiopian English curriculum designer.
Generate a targeted, high-yield 5-minute micro-lesson for an Ethiopian professional or university student.

Learner Profile:
- Diagnosed Skill Weakness: ${weakness}
- Target CEFR Benchmark: ${cefrLevel}
- 7-Day Plan Milestone: Day ${dayNumber} of 7
${dayTitle ? `- Required Lesson Title: ${dayTitle}` : ''}
${dayTask ? `- Required Lesson Task: ${dayTask}` : ''}

Requirements:
1. Topic Alignment: You MUST make the lesson content exactly match the Required Lesson Title and Task above.
2. Setting / Context: Real Ethiopian business, tech, education, or cultural settings (Addis Ababa, Telebirr, Bole, Ethiopian Airlines, regional trade, coffee cooperatives, Hawassa/Jimma universities, tech hubs, GERD).
3. Pedagogy:
   - strategy: Clear, punchy explanation of the rule and why Ethiopian learners make the mistake.
   - amharicTip: 1-2 sentence advice in Amharic (ፊደላት).
   - passage: (Required for Reading, optional for Grammar/Vocabulary/Speaking). A realistic 2-4 sentence paragraph.
   - question: Multiple choice question testing the concept.
   - options: Exactly 3 options (A, B, C). One clearly correct, two representing typical Ethiopian learner mistakes.
   - correctIndex: 0, 1, or 2 indicating the correct option.
   - explanation: Friendly, encouraging breakdown explaining why the answer is right and why the distractor was tempting.

Return ONLY a valid JSON object with this exact schema:
{
  "title": "${weakness} Practice",
  "topic": "Short Topic Title",
  "duration": "5 mins",
  "strategy": "English rule and error analysis",
  "amharicTip": "በአማርኛ ጠቃሚ ምክር",
  "passage": "Context paragraph",
  "question": "The question text?",
  "options": [
    "A) First option",
    "B) Second option",
    "C) Third option"
  ],
  "correctIndex": 0,
  "explanation": "Detailed explanation"
}
`;
        }
        try {
            const raw = await callGeminiGenerateContent(specializedPrompt, 'fallback', true);
            if (!raw)
                return null;
            // Extract JSON if wrapped in markdown blocks
            const cleanJson = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (parsed.topic &&
                parsed.question &&
                Array.isArray(parsed.options) &&
                parsed.options.length === 3 &&
                typeof parsed.correctIndex === 'number' &&
                parsed.explanation) {
                return {
                    title: parsed.title || `${weakness} Mastery`,
                    topic: parsed.topic,
                    duration: parsed.duration || '5 mins',
                    strategy: parsed.amharicTip
                        ? `${parsed.strategy}\n\n🇪🇹 <b>የአማርኛ ማስታወሻ:</b> ${parsed.amharicTip}`
                        : parsed.strategy,
                    passage: parsed.passage,
                    question: parsed.question,
                    options: parsed.options,
                    correctIndex: parsed.correctIndex,
                    explanation: parsed.explanation,
                    amharicTip: parsed.amharicTip,
                };
            }
        }
        catch (err) {
            console.warn('[DynamicLesson] Gemini generation failed, falling back to local database:', err?.message);
        }
        return null;
    }
}
