import mongoose, { Schema } from "mongoose";
import { IConversation } from "../../types/Conversation.js";

 

 
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
