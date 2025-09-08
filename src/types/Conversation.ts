import { Document, Types } from "mongoose";

export interface IGrammarMistake {
  mistake: string;
  correction: string;
  grammarType: string;
  createdAt: Date;
}

export interface ILesson {
  topic: string;
  details?: string;
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
