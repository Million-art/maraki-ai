 import { UserRepository } from "../repository/userRepository.js";
import { User as TelegramUser } from "grammy/types";
import { IUser } from "../types/User.js";

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


export const referralCount = async (from: TelegramUser) => {
  const userTelegramId = from.id;
  const user = await UserRepository.findByTelegramId(userTelegramId);

  if (!user) {
    throw new Error("User not found");
  }

  return {
    referralCount: user.referral?.count || 0,
  };
};
