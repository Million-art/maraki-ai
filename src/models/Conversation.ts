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

export interface IConversation extends Document {
  user: Types.ObjectId;
  grammarMistakes: IGrammarMistake[];
  lessons: ILesson[];
  chatHistory: IChatEntry[];
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

const ConversationSchema = new Schema<IConversation>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  grammarMistakes: { type: [GrammarMistakeSchema], default: [] },
  lessons: { type: [LessonSchema], default: [] },
  chatHistory: { type: [ChatEntrySchema], default: [] },
}, { timestamps: true });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
