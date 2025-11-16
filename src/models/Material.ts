import mongoose, { Document, Schema } from 'mongoose';

export interface IMaterial extends Document {
  id: string;
  title: string;
  description?: string;
  type: string;
  url?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  tags?: string[];
  difficulty: string;
  isActive: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const MaterialSchema = new Schema<IMaterial>({
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

export const Material = mongoose.model<IMaterial>('Material', MaterialSchema);
