import { IUser } from "../database/models/user.js";
import { UserRepository } from "../repository/userRepository.js";
import { User as TelegramUser } from "grammy/types";

export const registerOrUpdate = async (
  from: TelegramUser,
  referrerId?: number
): Promise<IUser> => {
  const existingUser = await UserRepository.findByTelegramId(from.id);

  const userData: Partial<IUser> = {
    telegramId: from.id,
    firstName: from.first_name || undefined,
    lastName: from.last_name || undefined,
    username: from.username || undefined,
    isPremium: from.is_premium || false,
    isBot: from.is_bot || false,
    referredBy: referrerId, // set referrer if present
  };

  if (existingUser) {
    const updatedUser = await UserRepository.updateByTelegramId(from.id, userData);
    if (!updatedUser) throw new Error("Failed to update user");
    return updatedUser;
  } else {
    const newUser = await UserRepository.create(userData);

    // If there is a referrer, increment their referral info
    if (referrerId) {
      await UserRepository.addReferral(referrerId, from.id);
    }

    return newUser;
  }
};

