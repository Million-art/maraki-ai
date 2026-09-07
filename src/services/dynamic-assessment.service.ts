import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';

export interface DiagnosticQuestion {
  id: string;
  skill: 'grammar' | 'vocabulary' | 'reading' | 'listening';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  ethiopianL1Note: string;
  readingPassage?: string;
  audioUrl?: string;
}

export class DynamicAssessmentService {
  /**
   * Generate fresh diagnostic assessment questions (Q1-Q8) using Gemini AI,
   * calibrated for Ethiopian English learners.
   * Returns null if generation fails, falling back to static questions.
   */
  static async generateWrittenQuestions(): Promise<DiagnosticQuestion[] | null> {
    const prompt = `
You are Maraki AI's expert English assessment test designer specializing in evaluating Ethiopian learners (Amharic, Afaan Oromoo, Tigrinya L1 speakers).

Generate exactly 8 multiple-choice English diagnostic test questions covering:
- Questions 1 to 4: Grammar & Sentence Structure (stative tenses, prepositions like since/for, verb agreements, common Amharic transfer habits like "I am having").
- Questions 5 to 7: Vocabulary & Collocations (formal workplace vocabulary, false cognates, high-yield collocations in business/daily life).
- Question 8: Reading Comprehension (include a 3-4 sentence realistic passage about Ethiopian context e.g., telebirr, Ethiopian Airlines, coffee trade, university education, or Addis Ababa transport, followed by a comprehension question).

Requirements:
1. Every question MUST have exactly 4 options.
2. One option is correct, and the other 3 distractors should represent common Ethiopian learner mistakes.
3. correctIndex MUST be 0, 1, 2, or 3.
4. ethiopianL1Note MUST explain in Amharic (ፊደላት) why Ethiopian learners commonly make this error.
5. explanation MUST clearly explain the English grammatical/lexical rule.

Return ONLY a valid JSON array of 8 objects matching this structure:
[
  {
    "id": "q1_grammar",
    "skill": "grammar",
    "prompt": "Select the grammatically correct sentence:",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 1,
    "explanation": "Explanation of the rule",
    "ethiopianL1Note": "የአማርኛ ማብራሪያ..."
  },
  {
    "id": "q8_reading",
    "skill": "reading",
    "readingPassage": "3-4 sentence passage...",
    "prompt": "In the passage above, what does the author conclude?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Why this option is correct",
    "ethiopianL1Note": "የአማርኛ ማብራሪያ..."
  }
]
`;

    try {
      const response = await callGeminiGenerateContent(prompt, 'complex', true);
      if (!response) return null;

      let cleanJson = response.trim();
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

      const parsed = JSON.parse(cleanJson);
      if (!Array.isArray(parsed) || parsed.length < 6) {
        return null;
      }

      return parsed.map((q: any, idx: number) => ({
        id: q.id || `dyn_q${idx + 1}`,
        skill: q.skill || (idx < 4 ? 'grammar' : idx < 7 ? 'vocabulary' : 'reading'),
        prompt: q.prompt,
        options: Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'],
        correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3 ? q.correctIndex : 0,
        explanation: q.explanation || 'Correct answer based on standard English usage.',
        ethiopianL1Note: q.ethiopianL1Note || 'ይህ የተለመደ የእንግሊዝኛ ሰዋሰው ህግ ነው።',
        ...(q.readingPassage ? { readingPassage: q.readingPassage } : {}),
      }));
    } catch (error: any) {
      console.warn('[DynamicAssessmentService] AI question generation failed, using fallback:', error?.message || error);
      return null;
    }
  }
}
