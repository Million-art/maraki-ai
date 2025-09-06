import { Document } from "mongoose";

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