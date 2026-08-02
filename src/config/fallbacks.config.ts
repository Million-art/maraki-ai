/**
 * Centralized Static Fallbacks configuration for Maraki AI Tutor.
 * Used across Quiz, Daily Challenge, and Lesson commands when AI services are unavailable or rate-limited.
 */

export const FALLBACK_DAILY_CHALLENGE = {
  wordOfTheDay: {
    word: "Resilient",
    partOfSpeech: "adjective",
    definition: "Able to recover quickly from difficult conditions.",
    example: "She is resilient and never gives up on learning English."
  },
  idiomOfTheDay: {
    idiom: "Break the ice",
    meaning: "Make people feel more comfortable in a social setting.",
    example: "A friendly smile helps break the ice in conversation."
  },
  miniQuiz: {
    question: "Choose the correct option: She ___ to school every day.",
    options: ["A) go", "B) goes", "C) going"],
    correctIndex: 1,
    explanation: "With third-person singular ('she'), we add '-s' or '-es' in the present simple tense."
  }
};

export const FALLBACK_QUIZ_QUESTIONS = [
  {
    question: "Choose the correct form: 'She ___ to school every day.'",
    options: ["A) go", "B) goes", "C) going", "D) went"],
    correctAnswer: 1,
    explanation: "With 'she', we use 'goes' in present simple.",
    type: 'general'
  },
  {
    question: "What is the plural of 'child'?",
    options: ["A) childs", "B) children", "C) childes", "D) childrens"],
    correctAnswer: 1,
    explanation: "'Child' becomes 'children' in plural.",
    type: 'general'
  },
  {
    question: "Which word is a synonym of 'happy'?",
    options: ["A) sad", "B) joyful", "C) angry", "D) tired"],
    correctAnswer: 1,
    explanation: "'Joyful' means the same as 'happy'.",
    type: 'general'
  },
  {
    question: "Complete the sentence: 'I ___ a student.'",
    options: ["A) am", "B) is", "C) are", "D) be"],
    correctAnswer: 0,
    explanation: "With 'I', we use 'am' in present simple.",
    type: 'general'
  },
  {
    question: "Which option is correct? 'They ___ playing football now.'",
    options: ["A) is", "B) am", "C) are", "D) was"],
    correctAnswer: 2,
    explanation: "With plural subject 'They' in present continuous, we use 'are'.",
    type: 'general'
  }
];

export function getFallbackMistakeQuestion(mistakeText: string, correctionText: string) {
  return {
    question: `Which of these is the correct version of: "${mistakeText}"?`,
    options: [
      `A) ${mistakeText}`,
      `B) ${correctionText}`,
      "C) Neither",
      "D) Both"
    ],
    correctAnswer: 1,
    explanation: `The correct expression is: ${correctionText}`,
    type: 'mistake'
  };
}

export const FALLBACK_LESSON = {
  topic: "Grammar Basics",
  title: "Essential English Tenses",
  content: 
    "📘 <b>PRESENT SIMPLE TENSE</b>\n\n" +
    "Use Present Simple for daily habits, routines, and general facts.\n\n" +
    "• <b>Structure:</b> Subject + Verb (s/es for He/She/It)\n" +
    "• <b>Example:</b> I practice English every morning.\n" +
    "• <b>Example:</b> She speaks Amharic and English fluently.\n\n" +
    "💡 <i>Tip: Don't forget to add '-s' when talking about He, She, or It!</i>"
};
