import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  isPremium?: boolean;
  isBot?: boolean;
  referredBy?: number | null;
  referral: {
    count: number;
    usersTelegramId: number[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    username: { type: String, default: null },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    isPremium: { type: Boolean, default: false }, 
    isBot: {type: Boolean, default:false},
    referredBy: { type: Number, default: null },
    referral: {
      count: { type: Number, default: 0 },
      usersTelegramId: { type: [Number], default: [] }, 
    },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
