import mongoose, { Schema } from 'mongoose';
export var Level;
(function (Level) {
    Level["Beginner"] = "beginner";
    Level["Intermediate"] = "intermediate";
    Level["Advanced"] = "advanced";
})(Level || (Level = {}));
const UserSchema = new Schema({
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
export const User = mongoose.model('User', UserSchema);
