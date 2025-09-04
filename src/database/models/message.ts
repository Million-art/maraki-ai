import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMessage extends Document{
    conversation: Types.ObjectId,
    sender: "user" | "bot",
    content: String,
    createdAt: Date;
}
const MessageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ["user", "bot"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Message = mongoose.model<IMessage>("message",MessageSchema)