import { User } from "../database/models/user.js";
export class UserRepository {
    /**
     * Find user by telegramId
     */
    static async findByTelegramId(telegramId) {
        return User.findOne({ telegramId });
    }
    /**
     * Create a new user
     */
    static async create(userData) {
        return User.create(userData);
    }
    /**
     * Find existing user or create if not exists
     */
    static async findOrCreate(from) {
        let user = await this.findByTelegramId(from.id);
        if (!user) {
            const userData = {
                telegramId: from.id,
                firstName: from.first_name || undefined,
                lastName: from.last_name || undefined,
                username: from.username || undefined,
                isPremium: from.is_premium || false,
                isBot: from.is_bot || false,
            };
            user = await this.create(userData);
        }
        return user;
    }
    /**
     * Update user info by TelegramUser object
     */
    static async update(from) {
        return this.updateByTelegramId(from.id, {
            firstName: from.first_name || undefined,
            lastName: from.last_name || undefined,
            username: from.username || undefined,
            isPremium: from.is_premium || false,
            isBot: from.is_bot || false,
        });
    }
    /**
     * Update user info by telegramId and partial user data
     */
    static async updateByTelegramId(telegramId, updateData) {
        return User.findOneAndUpdate({ telegramId }, { $set: updateData }, { new: true });
    }
    static async addReferral(referrerId, newUserId) {
        await User.findOneAndUpdate({ telegramId: referrerId }, {
            $inc: { "referral.count": 1 },
            $push: { "referral.usersTelegramId": newUserId },
        });
    }
}
