import mongoose, { Schema } from "mongoose";
const MessageSchema = new Schema({
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
}, { timestamps: { createdAt: true, updatedAt: false } });
export const Message = mongoose.model("message", MessageSchema);
