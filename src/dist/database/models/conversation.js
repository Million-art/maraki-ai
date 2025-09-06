import mongoose, { Schema } from "mongoose";
const ConversationSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    context: {
        type: String,
        default: "",
    },
}, {
    timestamps: true,
});
// 3. Model
export const Conversation = mongoose.model("Conversation", ConversationSchema);
