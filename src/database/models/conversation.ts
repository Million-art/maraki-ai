import mongoose, { Schema } from "mongoose";

const GrammarMistakeSchema = new Schema(
  {
    mistake: { type: String, required: true },
    correction: { type: String, required: true },
    grammarType: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const LessonSchema = new Schema(
  {
    topic: { type: String, required: true },
    details: { type: String },
    content: { type: String }, // Store full lesson content for follow-up questions
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ConversationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    grammarMistakes: {
      type: [GrammarMistakeSchema],
      default: [],
    },
    lessons: {
      type: [LessonSchema],
      default: [],
    },
    chatHistory: {
      type: [
        {
          userMessage: String,
          aiResponse: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Conversation = mongoose.model("Conversation", ConversationSchema);
