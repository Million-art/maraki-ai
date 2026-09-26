export interface User {
  id: string;
  cefrLevel?: string;
  level?: string;
  first_name?: string;
  last_name?: string;   
  telegramId?: number;
  isPremium?: boolean;
  isMarakiPremium?: boolean;
  isBot?: boolean;
  referredBy?: number;
  referral?: {
    count: number;
    usersTelegramId: number[];
  };
  subscriptionTier?: string;
  subscriptionExpiresAt?: string;
  isNewUser?: boolean;
}
