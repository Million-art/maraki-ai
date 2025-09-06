import { Document,Types } from "mongoose";

export interface IConversation extends Document {
  user: Types.ObjectId; 
  context: string; // e.g. current lesson focus like "subject-verb agreement"
  createdAt: Date;
  updatedAt: Date;
}
