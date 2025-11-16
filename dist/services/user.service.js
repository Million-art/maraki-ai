import { apiService } from "./api.service.js";
export const registerOrUpdate = async (from, referrerId) => {
    const userData = {
        telegramId: from.id,
        firstName: from.first_name || undefined,
        lastName: from.last_name || undefined,
        username: from.username || undefined,
        isPremium: from.is_premium || false,
        isBot: from.is_bot || false,
        referredBy: referrerId, // set referrer if present
    };
    try {
        const user = await apiService.createOrUpdateUser(from.id, userData);
        // Convert IUser to User interface
        return {
            id: user._id.toString(),
            telegramId: user.telegramId,
            first_name: user.firstName,
            last_name: user.lastName,
            level: user.level,
            isPremium: user.isPremium,
            isMarakiPremium: user.isMarakiPremium,
            isBot: user.isBot,
            referredBy: user.referredBy,
            referral: user.referral,
            subscriptionTier: user.subscriptionTier,
            subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString(),
        };
    }
    catch (error) {
        console.error("Error registering/updating user:", error);
        throw new Error("Failed to register/update user");
    }
};
export const referralCount = async (from) => {
    try {
        const user = await apiService.getUserByTelegramId(from.id);
        if (!user) {
            throw new Error("User not found");
        }
        return {
            referralCount: user.referral?.count || 0,
        };
    }
    catch (error) {
        console.error("Error getting referral count:", error);
        return { referralCount: 0 };
    }
};
export const getCurrentLevel = async (from) => {
    try {
        const user = await apiService.getUserByTelegramId(from.id);
        if (!user) {
            throw new Error("User not found");
        }
        return {
            level: user.level,
        };
    }
    catch (error) {
        console.error("Error getting current level:", error);
        return { level: 'beginner' };
    }
};
export const updateUserLevel = async (telegramId, newLevel) => {
    try {
        const updatedUser = await apiService.createOrUpdateUser(telegramId, { level: newLevel });
        return updatedUser;
    }
    catch (error) {
        console.error("Error updating user level:", error);
        throw new Error("Failed to update user level");
    }
};
