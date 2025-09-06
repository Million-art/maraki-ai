import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "../../types/User.js";



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
