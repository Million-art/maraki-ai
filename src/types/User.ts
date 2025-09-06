import { Document } from "mongoose";

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
  isPremium?: boolean;
  isBot?: boolean;
  level: Level;
  referredBy?: number | null;
  referral: {
    count: number;
    usersTelegramId: number[];
  };
  createdAt: Date;
  updatedAt: Date;
}
