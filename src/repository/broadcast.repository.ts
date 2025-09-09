import { User } from '../database/models/user.js';

export class BroadcastRepository {
  /**
   * Get all user telegram IDs for broadcasting
   */
  static async getAllUserTelegramIds(): Promise<number[]> {
    const users = await User.find({}, 'telegramId').lean();
    return users.map(user => user.telegramId);
  }

  /**
   * Get user count for broadcasting statistics
   */
  static async getUserCount(): Promise<number> {
    return await User.countDocuments();
  }
}
