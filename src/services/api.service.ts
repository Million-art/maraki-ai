import axios from 'axios';

export interface IUser {
  telegramId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  level?: string;
  isBot?: boolean;
  isPremium?: boolean;
  isMarakiPremium?: boolean;
  subscriptionTier?: string;
  subscriptionExpiresAt?: Date;
  dailyTokensUsed?: number;
  monthlyTokensUsed?: number;
  referredBy?: number;
  referral?: {
    code: string;
    count: number;
  };
}

export class ApiService {
  private backendUrl: string;

  constructor() {
    this.backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
  }

  // User Management via REST API
  async getUserByTelegramId(telegramId: number): Promise<IUser | null> {
    try {
      const { data } = await axios.get(`${this.backendUrl}/api/students/${telegramId}`, { timeout: 5000 });
      return data;
    } catch (error) {
      return {
        telegramId,
        firstName: 'Learner',
        level: 'beginner',
        isPremium: false,
        isMarakiPremium: false,
      };
    }
  }

  async createOrUpdateUser(telegramId: number, userData: any): Promise<IUser> {
    try {
      const { data } = await axios.post(`${this.backendUrl}/api/student/register`, {
        telegramId,
        ...userData,
      }, { timeout: 5000 });
      return data;
    } catch (error) {
      return { telegramId, ...userData };
    }
  }

  async getReferralStats(telegramId: number): Promise<any> {
    try {
      const { data } = await axios.get(`${this.backendUrl}/api/student/referral-stats/${telegramId}`, { timeout: 5000 });
      return data;
    } catch (error) {
      return {
        totalReferred: 0,
        target: 10,
        remaining: 10,
        progressPercentage: 0,
        rewardUnlocked: false,
        referralLink: `https://t.me/marakiai_bot?start=${telegramId}`,
      };
    }
  }

  // Premium & Usage Management
  async checkPremiumAccess(telegramId: number, feature: string): Promise<{ hasAccess: boolean; remaining: number; reason: string }> {
    try {
      const { data } = await axios.get(`${this.backendUrl}/api/student/usage/${telegramId}`, { timeout: 5000 });
      return {
        hasAccess: data.hasAccess,
        remaining: data.remaining,
        reason: data.reason || 'Usage check',
      };
    } catch (error) {
      return { hasAccess: true, remaining: 5, reason: 'Fallback default' };
    }
  }

  async incrementUsage(telegramId: number, feature: string): Promise<any> {
    try {
      const { data } = await axios.post(`${this.backendUrl}/api/student/usage/${telegramId}/increment`, {}, { timeout: 5000 });
      return data;
    } catch (error) {
      return { success: true };
    }
  }

  // Direct Bank Receipt Verification via NestJS Backend (Neon PostgreSQL)
  async verifyBankPayment(telegramId: number, referenceNumber: string, tier: string = 'monthly'): Promise<any> {
    try {
      const { data } = await axios.post(
        `${this.backendUrl}/api/student/verify-payment`,
        {
          telegramId,
          referenceNumber,
          tier,
        },
        { timeout: 15000 },
      );
      return data;
    } catch (error: any) {
      return {
        success: false,
        message: 'Bank verification service unavailable or invalid reference.',
      };
    }
  }

  // Non-Mongoose Conversation & Interaction Handlers
  async getConversation(telegramId: number): Promise<any> {
    return {
      user: telegramId,
      grammarMistakes: [],
      lessons: [],
      chatHistory: [],
    };
  }

  async addGrammarMistake(telegramId: number, mistake: any): Promise<any> {
    return { success: true };
  }

  async addLesson(telegramId: number, lesson: any): Promise<any> {
    try {
      const { data } = await axios.post(
        `${this.backendUrl}/api/student/materials/access`,
        { telegramId, materialId: lesson?.materialId },
        { timeout: 5000 }
      );
      return data;
    } catch (error) {
      console.error('Error recording lesson access:', error);
      return { success: true };
    }
  }

  async addChatMessage(telegramId: number, chatEntry: any): Promise<any> {
    return { success: true };
  }

  async getStudentProgress(telegramId: number): Promise<any> {
    try {
      const user = await this.getUserByTelegramId(telegramId);
      return {
        level: user?.level || 'beginner',
        isPremium: user?.isMarakiPremium || false,
        subscriptionTier: user?.subscriptionTier || 'FREE',
      };
    } catch (error) {
      return null;
    }
  }

  async getUsageStatus(telegramId: number): Promise<any> {
    try {
      const { data } = await axios.get(`${this.backendUrl}/api/student/usage/${telegramId}`, { timeout: 5000 });
      return data;
    } catch (error) {
      return {
        isPremium: false,
        weeklyQuizzesUsed: 1,
        weeklyQuizLimit: 3,
        remaining: 2,
        weeklyLessonsUsed: 1,
        weeklyLessonLimit: 5,
        remainingLessons: 4,
      };
    }
  }

  async saveQuizResult(telegramId: number, quizData: any): Promise<any> {
    try {
      const { data } = await axios.post(`${this.backendUrl}/api/student/quizzes/general/attempt`, {
        telegramId,
        score: quizData.score || 0,
        correctAnswers: quizData.correctAnswers || 0,
        totalQuestions: quizData.totalQuestions || 5,
      }, { timeout: 5000 });
      return data;
    } catch (error) {
      console.error('Error in saveQuizResult:', error);
      return { success: false };
    }
  }
}

export const apiService = new ApiService();
