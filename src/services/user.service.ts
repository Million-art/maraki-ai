import { User as TelegramUser } from "grammy/types";
import { User } from "../types/User.js";
import { apiService } from "./api.service.js";
import { getLocalReferralCount } from '../utils/analytics.util.js';

export const registerOrUpdate = async (
  from: TelegramUser,
  referrerId?: number
): Promise<User> => {
  const userData = {
    telegramId: from.id,
    firstName: from.first_name || undefined,
    lastName: from.last_name || undefined,
    username: from.username || undefined,
    isPremium: from.is_premium || false,
    isBot: from.is_bot || false,
    referredBy: referrerId,
  };

  try {
    const user = await apiService.createOrUpdateUser(from.id, userData);
    const telegramId = user?.telegramId ?? from.id;
    return {
      id: telegramId.toString(),
      telegramId,
      first_name: user?.firstName,
      last_name: user?.lastName,
      cefrLevel: user?.cefrLevel || 'UNTESTED',
      level: user?.cefrLevel || 'UNTESTED',
      isPremium: user?.isPremium,
      isMarakiPremium: user?.isMarakiPremium,
      isBot: user?.isBot,
      referredBy: user?.referredBy,
      referral: user?.referral ? { count: user.referral.count, usersTelegramId: [] } : undefined,
      subscriptionTier: user?.subscriptionTier,
      subscriptionExpiresAt: user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toISOString() : undefined,
      isNewUser: (user as any)?.isNewUser !== undefined ? (user as any).isNewUser : undefined,
    };
  } catch (error) {
    console.error("Error registering/updating user:", error);
    throw new Error("Failed to register/update user");
  }
};

export const referralCount = async (from: TelegramUser) => {
  let dbCount = 0;
  try {
    const stats = await apiService.getReferralStats(from.id);
    if (stats?.totalReferred) {
      dbCount = stats.totalReferred;
    }
  } catch (error) {
    console.error("Error getting referral count from API:", error);
  }

  // Combine with local Redis/memory referral tracker
  let localCount = 0;
  try {
    localCount = await getLocalReferralCount(from.id);
  } catch (e) { }

  const finalCount = Math.max(dbCount, localCount);
  const target = 10;
  const remaining = Math.max(0, target - finalCount);
  const progressPercentage = Math.min(100, Math.round((finalCount / target) * 100));

  return {
    referralCount: finalCount,
    target,
    remaining,
    progressPercentage,
    rewardUnlocked: finalCount >= target,
  };
};

export const getCurrentLevel = async (from: TelegramUser) => {
  try {
    const user = await apiService.getUserByTelegramId(from.id);
    return {
      level: user?.cefrLevel || 'UNTESTED',
      cefrLevel: user?.cefrLevel || 'UNTESTED',
    };
  } catch (error) {
    console.error("Error getting current level:", error);
    return { level: 'UNTESTED', cefrLevel: 'UNTESTED' };
  }
};

export const updateUserLevel = async (telegramId: number, newLevel: string) => {
  try {
    const updatedUser = await apiService.createOrUpdateUser(telegramId, { level: newLevel });
    return updatedUser;
  } catch (error) {
    console.error("Error updating user level:", error);
    throw new Error("Failed to update user level");
  }
};
