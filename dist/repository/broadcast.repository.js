import { User } from '../database/models/user.js';
export class BroadcastRepository {
    /**
     * Get all user telegram IDs for broadcasting
     */
    static async getAllUserTelegramIds() {
        const users = await User.find({}, 'telegramId').lean();
        return users.map(user => user.telegramId);
    }
    /**
     * Get user count for broadcasting statistics
     */
    static async getUserCount() {
        return await User.countDocuments();
    }
}
