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
export const QUIZ_FALLBACK_POOL = [
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
    },
    {
        question: "Select the correct past tense of 'buy':",
        options: ["A) buyed", "B) bought", "C) buying", "D) buys"],
        correctAnswer: 1,
        explanation: "The irregular past tense of 'buy' is 'bought'.",
        type: 'general'
    },
    {
        question: "Which sentence uses the preposition 'at' correctly?",
        options: ["A) I will arrive at Monday.", "B) She lives at Addis Ababa.", "C) We met at 5 o'clock.", "D) He is at home on July."],
        correctAnswer: 2,
        explanation: "We use 'at' for specific times (e.g. at 5 o'clock).",
        type: 'general'
    },
    {
        question: "Choose the correct antonym for 'ancient':",
        options: ["A) modern", "B) old", "C) historical", "D) traditional"],
        correctAnswer: 0,
        explanation: "'Modern' is the opposite (antonym) of 'ancient'.",
        type: 'general'
    },
    {
        question: "Fill in the blank: 'If it rains, we ___ at home.'",
        options: ["A) will stay", "B) stayed", "C) staying", "D) stays"],
        correctAnswer: 0,
        explanation: "First conditional structure: If + present simple, will + base verb.",
        type: 'general'
    },
    {
        question: "Which word is spelled correctly?",
        options: ["A) Receive", "B) Recieve", "C) Receve", "D) Receeve"],
        correctAnswer: 0,
        explanation: "'Receive' follows the rule: 'i before e except after c'.",
        type: 'general'
    },
    {
        question: "Complete: 'She has been working here ___ 3 years.'",
        options: ["A) since", "B) for", "C) during", "D) from"],
        correctAnswer: 1,
        explanation: "Use 'for' to indicate a period or duration of time (for 3 years).",
        type: 'general'
    },
    {
        question: "What does the idiom 'Piece of cake' mean?",
        options: ["A) A delicious dessert", "B) Something very easy", "C) A birthday celebration", "D) Something very expensive"],
        correctAnswer: 1,
        explanation: "'Piece of cake' is an idiom that means something is very easy to do.",
        type: 'general'
    },
    {
        question: "Choose the correct option: 'Neither of the answers ___ correct.'",
        options: ["A) is", "B) are", "C) were", "D) be"],
        correctAnswer: 0,
        explanation: "'Neither' is singular in formal grammar and takes 'is'.",
        type: 'general'
    },
    {
        question: "Select the sentence with correct punctuation:",
        options: [
            "A) Lets go to the market",
            "B) Let's go to the market.",
            "C) Lets' go to the market.",
            "D) Let go to the market."
        ],
        correctAnswer: 1,
        explanation: "'Let's' is a contraction of 'Let us' and requires an apostrophe.",
        type: 'general'
    },
    {
        question: "Complete: 'He is interested ___ learning web development.'",
        options: ["A) on", "B) at", "C) in", "D) about"],
        correctAnswer: 2,
        explanation: "The adjective 'interested' is followed by the preposition 'in'.",
        type: 'general'
    },
    {
        question: "Which word means 'to make something better'?",
        options: ["A) Impair", "B) Improve", "C) Ignore", "D) Impose"],
        correctAnswer: 1,
        explanation: "'Improve' means to make or become better.",
        type: 'general'
    },
    {
        question: "Choose the correct modal verb: 'You ___ drive without a seatbelt.'",
        options: ["A) shouldn't", "B) mustn't", "C) couldn't", "D) needn't"],
        correctAnswer: 1,
        explanation: "'Mustn't' expresses strict prohibition or law.",
        type: 'general'
    },
    {
        question: "Complete: 'By next year, I ___ my degree.'",
        options: ["A) finish", "B) will have finished", "C) am finishing", "D) finished"],
        correctAnswer: 1,
        explanation: "Use Future Perfect ('will have finished') for actions completed before a future time.",
        type: 'general'
    }
];
export function getFallbackQuizQuestions() {
    const shuffled = [...QUIZ_FALLBACK_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
}
export function getFallbackMistakeQuestion(mistakeText, correctionText) {
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
    content: "📘 <b>PRESENT SIMPLE TENSE</b>\n\n" +
        "Use Present Simple for daily habits, routines, and general facts.\n\n" +
        "• <b>Structure:</b> Subject + Verb (s/es for He/She/It)\n" +
        "• <b>Example:</b> I practice English every morning.\n" +
        "• <b>Example:</b> She speaks Amharic and English fluently.\n\n" +
        "💡 <i>Tip: Don't forget to add '-s' when talking about He, She, or It!</i>"
};
