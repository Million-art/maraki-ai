import mongoose, { Schema } from 'mongoose';
export var QuestionType;
(function (QuestionType) {
    QuestionType["MULTIPLE_CHOICE"] = "multiple_choice";
    QuestionType["TRUE_FALSE"] = "true_false";
    QuestionType["FILL_IN_BLANK"] = "fill_in_blank";
    QuestionType["SHORT_ANSWER"] = "short_answer";
    QuestionType["ESSAY"] = "essay";
    QuestionType["MATCHING"] = "matching";
    QuestionType["ORDERING"] = "ordering";
})(QuestionType || (QuestionType = {}));
export var Difficulty;
(function (Difficulty) {
    Difficulty["EASY"] = "easy";
    Difficulty["MEDIUM"] = "medium";
    Difficulty["HARD"] = "hard";
    Difficulty["EXPERT"] = "expert";
})(Difficulty || (Difficulty = {}));
const QuestionOptionSchema = new Schema({
    id: { type: String, required: true },
    questionId: { type: String, required: true },
    optionText: { type: String, required: true },
    isCorrect: { type: Boolean, default: false },
    orderIndex: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    selectionCount: { type: Number, default: 0 },
}, { _id: false });
const QuestionAttemptSchema = new Schema({
    id: { type: String, required: true },
    quizAttemptId: { type: String, required: true },
    questionId: { type: String, required: true },
    selectedOptionId: { type: String },
    textAnswer: { type: String },
    booleanAnswer: { type: Boolean },
    isCorrect: { type: Boolean, default: false },
    pointsEarned: { type: Number, default: 0 },
    maxPoints: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number },
    answeredAt: { type: Date, required: true },
}, { _id: false });
const QuizAttemptSchema = new Schema({
    id: { type: String, required: true },
    quizId: { type: String, required: true },
    userId: { type: String, required: true },
    userType: { type: String },
    status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
    startedAt: { type: Date },
    completedAt: { type: Date },
    totalQuestions: { type: Number, default: 0 },
    answeredQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    scorePercentage: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    earnedPoints: { type: Number, default: 0 },
    isPassed: { type: Boolean, default: false },
    timeSpentSeconds: { type: Number },
    questionAttempts: { type: [QuestionAttemptSchema], default: [] },
}, { _id: false });
const QuestionSchema = new Schema({
    id: { type: String, required: true },
    quizId: { type: String, required: true },
    questionText: { type: String, required: true },
    explanation: { type: String },
    questionType: { type: String, enum: Object.values(QuestionType), required: true },
    difficulty: { type: String, enum: Object.values(Difficulty), default: Difficulty.EASY },
    points: { type: Number, default: 1 },
    orderIndex: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isRequired: { type: Boolean, default: false },
    timeLimitSeconds: { type: Number },
    totalAttempts: { type: Number, default: 0 },
    correctAttempts: { type: Number, default: 0 },
    averageTimeSeconds: { type: Number, default: 0 },
    options: { type: [QuestionOptionSchema], default: [] },
    attempts: { type: [QuestionAttemptSchema], default: [] },
}, { _id: false });
const QuizSchema = new Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    difficulty: { type: String, enum: Object.values(Difficulty), default: Difficulty.EASY },
    durationMinutes: { type: Number, default: 30 },
    passingScorePercentage: { type: Number, default: 70 },
    maxAttempts: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isRandomized: { type: Boolean, default: false },
    showCorrectAnswers: { type: Boolean, default: true },
    showExplanations: { type: Boolean, default: true },
    createdBy: { type: String },
    lastModifiedBy: { type: String },
    questions: { type: [QuestionSchema], default: [] },
    attempts: { type: [QuizAttemptSchema], default: [] },
}, { timestamps: true });
export const Quiz = mongoose.model('Quiz', QuizSchema);
