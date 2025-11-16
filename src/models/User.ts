import mongoose, { Document, Schema } from 'mongoose';

export enum Level {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
}

export interface IUser extends Document {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  isPremium: boolean;
  isMarakiPremium: boolean;
  isBot: boolean;
  level: Level;
  referredBy?: number;
  referral: {
    count: number;
    usersTelegramId: number[];
  };
  subscriptionTier: string;
  subscriptionExpiresAt?: Date;
  paymentMethod: string;
  dailyTokensUsed: number;
  monthlyTokensUsed: number;
  lastTokenReset: Date;
  totalQuizzesCompleted: number;
  totalMaterialsAccessed: number;
  totalTimeSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  telegramId: { type: Number, required: true, unique: true, index: true },
  username: { type: String, default: null },
  firstName: { type: String, default: null },
  lastName: { type: String, default: null },
  isPremium: { type: Boolean, default: false },
  isMarakiPremium: { type: Boolean, default: false },
  isBot: { type: Boolean, default: false },
  level: { type: String, enum: Object.values(Level), default: Level.Beginner },
  referredBy: { type: Number, default: null },
  referral: {
    count: { type: Number, default: 0 },
    usersTelegramId: { type: [Number], default: [] },
  },
  subscriptionTier: { type: String, enum: ['free', 'premium', 'pro'], default: 'free' },
  subscriptionExpiresAt: { type: Date, default: null },
  paymentMethod: { type: String, enum: ['chapa', 'free'], default: 'free' },
  dailyTokensUsed: { type: Number, default: 0 },
  monthlyTokensUsed: { type: Number, default: 0 },
  lastTokenReset: { type: Date, default: Date.now },
  totalQuizzesCompleted: { type: Number, default: 0 },
  totalMaterialsAccessed: { type: Number, default: 0 },
  totalTimeSpent: { type: Number, default: 0 },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
