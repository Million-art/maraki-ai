import mongoose, { Document, Schema } from 'mongoose';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FILL_IN_BLANK = 'fill_in_blank',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  MATCHING = 'matching',
  ORDERING = 'ordering',
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

export interface IQuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
  isActive: boolean;
  selectionCount: number;
}

export interface IQuestionAttempt {
  id: string;
  quizAttemptId: string;
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
  booleanAnswer?: boolean;
  isCorrect: boolean;
  pointsEarned: number;
  maxPoints: number;
  timeSpentSeconds?: number;
  answeredAt: Date;
}

export interface IQuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  userType?: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt?: Date;
  completedAt?: Date;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  totalPoints: number;
  earnedPoints: number;
  isPassed: boolean;
  timeSpentSeconds?: number;
  questionAttempts: IQuestionAttempt[];
}

export interface IQuestion {
  id: string;
  quizId: string;
  questionText: string;
  explanation?: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  points: number;
  orderIndex: number;
  isActive: boolean;
  isRequired: boolean;
  timeLimitSeconds?: number;
  totalAttempts: number;
  correctAttempts: number;
  averageTimeSeconds: number;
  options: IQuestionOption[];
  attempts?: IQuestionAttempt[];
}

export interface IQuiz extends Document {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty: Difficulty;
  durationMinutes: number;
  passingScorePercentage: number;
  maxAttempts: number;
  isActive: boolean;
  isRandomized: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  createdBy?: string;
  lastModifiedBy?: string;
  questions: IQuestion[];
  attempts?: IQuizAttempt[];
  createdAt: Date;
  updatedAt: Date;
}

const QuestionOptionSchema = new Schema<IQuestionOption>({
  id: { type: String, required: true },
  questionId: { type: String, required: true },
  optionText: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
  orderIndex: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  selectionCount: { type: Number, default: 0 },
}, { _id: false });

const QuestionAttemptSchema = new Schema<IQuestionAttempt>({
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

const QuizAttemptSchema = new Schema<IQuizAttempt>({
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

const QuestionSchema = new Schema<IQuestion>({
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

const QuizSchema = new Schema<IQuiz>({
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

export const Quiz = mongoose.model<IQuiz>('Quiz', QuizSchema);
