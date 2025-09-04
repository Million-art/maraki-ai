// database/repositories/user.repository.ts
import { IUser, User } from "../database/models/user.js";
import { User as TelegramUser } from "grammy/types";

export class UserRepository {
  /**
   * Find user by telegramId
   */
  static async findByTelegramId(telegramId: number): Promise<IUser | null> {
    return User.findOne({ telegramId });
  }

  /**
   * Create a new user
   */
  static async create(userData: Partial<IUser>): Promise<IUser> {
    return User.create(userData);
  }

  /**
   * Find existing user or create if not exists
   */
  static async findOrCreate(from: TelegramUser): Promise<IUser> {
    let user = await this.findByTelegramId(from.id);

    if (!user) {
      const userData: Partial<IUser> = {
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
  static async update(from: TelegramUser): Promise<IUser | null> {
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
  static async updateByTelegramId(
    telegramId: number,
    updateData: Partial<IUser>
  ): Promise<IUser | null> {
    return User.findOneAndUpdate(
      { telegramId },
      { $set: updateData },
      { new: true }
    );
  }

  static async addReferral(referrerId: number, newUserId: number): Promise<void> {
  await User.findOneAndUpdate(
    { telegramId: referrerId },
    {
      $inc: { "referral.count": 1 },
      $push: { "referral.usersTelegramId": newUserId },
    }
  );
}

}
