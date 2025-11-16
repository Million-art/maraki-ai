import mongoose, { Schema } from 'mongoose';
const MaterialSchema = new Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, required: true },
    url: { type: String },
    filePath: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    mimeType: { type: String },
    category: { type: String },
    tags: { type: [String], default: [] },
    difficulty: { type: String, default: 'easy' },
    isActive: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },
}, { timestamps: true });
export const Material = mongoose.model('Material', MaterialSchema);
