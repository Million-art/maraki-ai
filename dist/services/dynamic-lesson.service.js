import { callGeminiGenerateContent } from '../api/gemini/callGeminiGenerateContents.js';
export class DynamicLessonService {
    /**
     * Generate an adaptive, Ethiopian-localized daily lesson using cost-efficient Gemini models.
     * Returns null if generation fails or times out, triggering immediate offline fallback.
     */
    static async generateLesson(weakness, cefrLevel = 'B1', dayNumber = 1, dayTitle, dayTask) {
        const normalizedSkill = weakness.trim().toLowerCase();
        let specializedPrompt = '';
        if (normalizedSkill === 'listening') {
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
  "topic": "Concise Scenario Title",
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
        else if (normalizedSkill === 'speaking') {
            specializedPrompt = `
You are Maraki AI's expert spoken English fluency and pronunciation coach for Ethiopian professionals and students.
Generate a dynamic, interactive SPEAKING fluency micro-lesson.

Learner Profile:
- Diagnosed Skill Weakness: Spoken Fluency, Hesitation, & Speech Cadence
- Target CEFR Benchmark: ${cefrLevel}
- 7-Day Plan Milestone: Day ${dayNumber} of 7
${dayTitle ? `- Focus Theme: ${dayTitle}` : ''}
${dayTask ? `- Target Skill: ${dayTask}` : ''}

Speaking Lesson Requirements:
1. Focus Topics:
   - Thought-chunk cadence: Grouping 3-4 words together naturally without pausing after every single word
   - STAR Method (Situation, Task, Action, Result) for job interviews and meetings
   - Diplomatic workplace disagreement & polite framing ("I appreciate that point, however...")
   - Minimal pair pronunciation & rhythm (e.g. /p/ vs /b/, /v/ vs /f/, vowel length)
   - Professional self-introductions, pitching ideas, or elevator summaries
2. Spoken Passage ("passage"):
   - A model spoken answer or script (2 to 4 natural sentences) demonstrating clear rhythm and cadence.
3. Multiple Choice Question ("question"):
   - Ask about the most effective, diplomatic, or naturally chunked spoken response.
4. Options ("options"):
   - 3 choices (A, B, C). One clearly fluent/diplomatic, two representing common Ethiopian hesitation/literal phrasing habits.
5. Pedagogy:
   - "strategy": Concrete spoken technique on pacing, breath control, and thought chunks.
   - "amharicTip": Practical advice in Amharic on building mouth muscle memory and speaking without fear.
   - "explanation": Friendly breakdown of why the selected phrasing creates confidence and executive presence.

Return ONLY a valid JSON object matching this schema:
{
  "title": "Spoken Fluency Mastery",
  "topic": "Short Topic Title (e.g. Thought Chunks, STAR Interview Framework)",
  "duration": "5 mins",
  "strategy": "Spoken fluency and pacing analysis...",
  "amharicTip": "በአማርኛ የንግግር ቅልጥፍና ምክር",
  "passage": "Model spoken phrasing or dialogue...",
  "question": "Which spoken phrasing is most natural and effective?",
  "options": [
    "A) First option",
    "B) Second option",
    "C) Third option"
  ],
  "correctIndex": 0,
  "explanation": "Explanation of why this cadence sounds professional and natural."
}
`;
        }
        else if (normalizedSkill === 'reading') {
            specializedPrompt = `
You are Maraki AI's expert English reading comprehension and speed trainer for Ethiopian learners.
Generate a dynamic, high-yield READING comprehension micro-lesson.

Learner Profile:
- Diagnosed Skill Weakness: Reading Speed, Thesis Skimming, & Context Clues
- Target CEFR Benchmark: ${cefrLevel}
- 7-Day Plan Milestone: Day ${dayNumber} of 7
${dayTitle ? `- Focus Theme: ${dayTitle}` : ''}
${dayTask ? `- Target Skill: ${dayTask}` : ''}

Reading Lesson Requirements:
1. Context / Passage ("passage"):
   - A realistic, engaging 3 to 4 sentence paragraph grounded in Ethiopian business, technology, economy, universities, or culture (e.g. Telebirr, Ethiopian Airlines, regional logistics, tech startups, renewable energy, coffee cooperatives).
2. Targeted Reading Skill:
   - Skimming for core thesis under 45 seconds (avoiding word-by-word Amharic translation)
   - Scanning for exact figures, percentages, dates, and names
   - Contextual deduction of sophisticated vocabulary using contrast markers
   - Deep inference and reading between the lines
3. Multiple Choice Question ("question"):
   - A sharp question testing comprehension, thesis extraction, or vocabulary inference.
4. Options ("options"):
   - Exactly 3 options (A, B, C). One correct, two plausible distractors.
5. Pedagogy:
   - "strategy": Specific speed-reading technique.
   - "amharicTip": Practical advice in Amharic on boosting WPM reading speed.
   - "explanation": Clear evidence from the passage confirming the answer.

Return ONLY a valid JSON object matching this schema:
{
  "title": "Reading Comprehension",
  "topic": "Topic Title (e.g. Core Thesis Skimming, Context Clues)",
  "duration": "5 mins",
  "strategy": "Speed-reading strategy...",
  "amharicTip": "በአማርኛ የንባብ ፍጥነት ምክር",
  "passage": "3-4 sentence realistic Ethiopian contextual paragraph...",
  "question": "Comprehension question?",
  "options": [
    "A) First option",
    "B) Second option",
    "C) Third option"
  ],
  "correctIndex": 0,
  "explanation": "Detailed explanation citing the passage."
}
`;
        }
        else if (normalizedSkill === 'grammar') {
            specializedPrompt = `
You are Maraki AI's expert English grammar diagnostician specializing in Ethiopian L1 transfer errors.
Generate a dynamic, targeted GRAMMAR & SYNTAX micro-lesson.

Learner Profile:
- Diagnosed Skill Weakness: Grammar & Sentence Structure Habits
- Target CEFR Benchmark: ${cefrLevel}
- 7-Day Plan Milestone: Day ${dayNumber} of 7
${dayTitle ? `- Focus Theme: ${dayTitle}` : ''}
${dayTask ? `- Target Skill: ${dayTask}` : ''}

Grammar Lesson Requirements:
1. Target Verified Ethiopian L1 Habits:
   - Stative verbs in continuous tense (saying "I am having" or "I am knowing" instead of "I have", "I know")
   - Redundant prepositions (saying "discuss about", "order for", "accompany with")
   - Uncountable workplace nouns (saying "advices", "softwares", "equipments", "informations")
   - First and Second Conditionals (confusing "if I will see" with "if I see")
   - Subject-verb agreement across parenthetical phrases ("The director, along with his assistants, is...")
   - Gerunds after prepositional phrases ("look forward to meeting", "committed to finalizing")
2. Multiple Choice Question ("question"):
   - Select the grammatically standard sentence or correct missing verb/preposition.
3. Options ("options"):
   - Exactly 3 options (A, B, C). One standard, two representing common Ethiopian transfer errors.
4. Pedagogy:
   - "strategy": Precise grammatical rule explanation.
   - "amharicTip": Amharic note directly comparing the Amharic thought process with standard English syntax.
   - "explanation": Friendly breakdown of why the distractor fails and why the rule works.

Return ONLY a valid JSON object matching this schema:
{
  "title": "Grammar & Syntax",
  "topic": "Grammar Topic (e.g. Stative Verbs, Redundant Prepositions)",
  "duration": "5 mins",
  "strategy": "Rule explanation...",
  "amharicTip": "በአማርኛ የሰዋሰው ማስታወሻ",
  "question": "Which sentence is grammatically standard?",
  "options": [
    "A) First option",
    "B) Second option",
    "C) Third option"
  ],
  "correctIndex": 0,
  "explanation": "Clear explanation of the rule."
}
`;
        }
        else {
            // Vocabulary Mastery
            specializedPrompt = `
You are Maraki AI's expert English vocabulary and collocation trainer for Ethiopian professionals.
Generate a dynamic, targeted VOCABULARY mastery micro-lesson.

Learner Profile:
- Diagnosed Skill Weakness: Workplace Vocabulary & Collocations
- Target CEFR Benchmark: ${cefrLevel}
- 7-Day Plan Milestone: Day ${dayNumber} of 7
${dayTitle ? `- Focus Theme: ${dayTitle}` : ''}
${dayTask ? `- Target Skill: ${dayTask}` : ''}

Vocabulary Lesson Requirements:
1. Target High-Yield Professional Themes:
   - Natural business collocations (saying "conduct research" not "make research", "reach agreement" not "take agreement")
   - False friends & literal translation habits (saying "postpone/reschedule the meeting" instead of "shift the meeting")
   - International tech & workplace phrasal verbs ("follow up on", "iron out", "touch base", "run out of")
   - High-precision analytical adjectives ("feasible", "robust", "imperative", "prevalent")
   - Business idioms in executive meetings ("on the same page", "cut corners", "hit the ground running")
2. Multiple Choice Question ("question"):
   - Choose the natural collocation, phrasal verb, or idiomatic expression.
3. Options ("options"):
   - Exactly 3 options (A, B, C). One natural professional usage, two literal/non-standard phrasing.
4. Pedagogy:
   - "strategy": Collocation analysis and professional phrasing guidelines.
   - "amharicTip": Amharic tip warning against direct word-for-word translation.
   - "explanation": Explanation of why the collocation is standard in professional English.

Return ONLY a valid JSON object matching this schema:
{
  "title": "Vocabulary Mastery",
  "topic": "Vocabulary Topic (e.g. High-Yield Collocations, Workplace Phrasal Verbs)",
  "duration": "5 mins",
  "strategy": "Vocabulary and collocation strategy...",
  "amharicTip": "በአማርኛ የቃላት አጠቃቀም ማስታወሻ",
  "question": "Which phrase uses standard professional English?",
  "options": [
    "A) First option",
    "B) Second option",
    "C) Third option"
  ],
  "correctIndex": 0,
  "explanation": "Detailed explanation of the collocation."
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
