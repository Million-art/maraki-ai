import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGrammarMistake {
  mistake: string;
  correction: string;
  grammarType: string;
  createdAt: Date;
}

export interface ILesson {
  topic: string;
  details?: string;
  content?: string;
  createdAt: Date;
}

export interface IChatEntry {
  userMessage: string;
  aiResponse: string;
  createdAt: Date;
}

export interface IQuizAttempt {
  quizId: string;
  userId: string;
  status: string;
  completedAt: Date;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  totalPoints: number;
  earnedPoints: number;
  isPassed: boolean;
  questionAttempts: IQuestionAttempt[];
}

export interface IQuestionAttempt {
  questionId: string;
  selectedOptionId?: string;
  isCorrect: boolean;
  pointsEarned: number;
  maxPoints: number;
  answeredAt: Date;
}

export interface IConversation extends Document {
  user: Types.ObjectId;
  grammarMistakes: IGrammarMistake[];
  lessons: ILesson[];
  chatHistory: IChatEntry[];
  quizAttempts: IQuizAttempt[];
  createdAt: Date;
  updatedAt: Date;
}

const GrammarMistakeSchema = new Schema<IGrammarMistake>({
  mistake: { type: String, required: true },
  correction: { type: String, required: true },
  grammarType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const LessonSchema = new Schema<ILesson>({
  topic: { type: String, required: true },
  details: { type: String },
  content: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const ChatEntrySchema = new Schema<IChatEntry>({
  userMessage: { type: String, required: true },
  aiResponse: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const QuestionAttemptSchema = new Schema<IQuestionAttempt>({
  questionId: { type: String, required: true },
  selectedOptionId: { type: String },
  isCorrect: { type: Boolean, required: true },
  pointsEarned: { type: Number, required: true },
  maxPoints: { type: Number, required: true },
  answeredAt: { type: Date, default: Date.now },
}, { _id: false });

const QuizAttemptSchema = new Schema<IQuizAttempt>({
  quizId: { type: String, required: true },
  userId: { type: String, required: true },
  status: { type: String, required: true },
  completedAt: { type: Date, default: Date.now },
  totalQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  scorePercentage: { type: Number, required: true },
  totalPoints: { type: Number, required: true },
  earnedPoints: { type: Number, required: true },
  isPassed: { type: Boolean, required: true },
  questionAttempts: { type: [QuestionAttemptSchema], default: [] },
}, { _id: false });

const ConversationSchema = new Schema<IConversation>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  grammarMistakes: { type: [GrammarMistakeSchema], default: [] },
  lessons: { type: [LessonSchema], default: [] },
  chatHistory: { type: [ChatEntrySchema], default: [] },
  quizAttempts: { type: [QuizAttemptSchema], default: [] },
}, { timestamps: true });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
