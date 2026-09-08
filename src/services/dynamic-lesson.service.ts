import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';

export interface DynamicLesson {
  title: string;
  topic: string;
  duration: string;
  strategy: string;
  passage?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  amharicTip?: string;
}

export class DynamicLessonService {
  /**
   * Generate an adaptive, Ethiopian-localized daily lesson using cost-efficient Gemini models.
   * Returns null if generation fails or times out, triggering immediate offline fallback.
   */
  static async generateLesson(
    weakness: string,
    cefrLevel: string = 'B1',
    dayNumber: number = 1,
    dayTitle?: string,
    dayTask?: string
  ): Promise<DynamicLesson | null> {
    const prompt = `
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
   - passage: (Required for Reading & Listening, optional for Grammar/Vocabulary/Speaking). A realistic 2-4 sentence passage.
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
  "passage": "Optional or required context passage",
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

    try {
      // Use 'fallback' or 'basic' taskType for cost-efficient gemini-2.0-flash / gemini-1.5-flash
      const raw = await callGeminiGenerateContent(prompt, 'fallback', true);
      if (!raw) return null;

      // Extract JSON if wrapped in markdown blocks
      const cleanJson = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (
        parsed.topic &&
        parsed.question &&
        Array.isArray(parsed.options) &&
        parsed.options.length === 3 &&
        typeof parsed.correctIndex === 'number' &&
        parsed.explanation
      ) {
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
    } catch (err: any) {
      console.warn('[DynamicLesson] Gemini generation failed, falling back to local database:', err?.message);
    }

    return null;
  }
}

