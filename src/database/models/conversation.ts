import mongoose, { Schema, Document, Types } from "mongoose";

// 1. Conversation interface
export interface IConversation extends Document {
  user: Types.ObjectId; 
  context: string; // e.g. current lesson focus like "subject-verb agreement"
  createdAt: Date;
  updatedAt: Date;
}

// 2. Schema
const ConversationSchema = new Schema<IConversation>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    context: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// 3. Model
export const Conversation = mongoose.model<IConversation>(
  "Conversation",
  ConversationSchema
);
