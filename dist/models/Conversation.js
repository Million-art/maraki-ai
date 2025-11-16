import mongoose, { Schema } from 'mongoose';
const GrammarMistakeSchema = new Schema({
    mistake: { type: String, required: true },
    correction: { type: String, required: true },
    grammarType: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const LessonSchema = new Schema({
    topic: { type: String, required: true },
    details: { type: String },
    content: { type: String },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const ChatEntrySchema = new Schema({
    userMessage: { type: String, required: true },
    aiResponse: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const ConversationSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    grammarMistakes: { type: [GrammarMistakeSchema], default: [] },
    lessons: { type: [LessonSchema], default: [] },
    chatHistory: { type: [ChatEntrySchema], default: [] },
}, { timestamps: true });
export const Conversation = mongoose.model('Conversation', ConversationSchema);
