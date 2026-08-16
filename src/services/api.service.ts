import axios from 'axios';
import { getSession, setSession } from '../utils/redis.js';

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
  totalQuizzesCompleted?: number;
  quizAttempts?: any[];
}

export class ApiService {
  private backendUrl: string;

  constructor() {
    this.backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
    const internalApiKey = process.env.INTERNAL_API_KEY || 'maraki-internal-secret-key-12345';
    axios.defaults.headers.common['X-Maraki-Bot-Key'] = internalApiKey;
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

  async registerStudent(studentData: { telegramId: number; firstName?: string; lastName?: string; username?: string; level?: string; referredBy?: number }): Promise<any> {
    return this.createOrUpdateUser(studentData.telegramId, studentData);
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
      // Fail closed: deny access when the backend is unreachable to prevent free unlimited usage
      return { hasAccess: false, remaining: 0, reason: 'Service temporarily unavailable. Please try again shortly.' };
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
        { timeout: 30000 },
      );
      return data;
    } catch (error: any) {
      console.error('Verify Bank Payment Error:', error.response?.data || error.message);
      const backendMessage = error.response?.data?.message || error.message;
      return {
        success: false,
        message: `Backend Error: ${backendMessage}`,
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
      // Fail closed: deny quiz/lesson access when backend is unreachable
      return {
        isPremium: false,
        weeklyQuizzesUsed: 99,   // Exceeds limit intentionally
        weeklyQuizLimit: 3,
        remaining: 0,
        weeklyLessonsUsed: 99,
        weeklyLessonLimit: 5,
        remainingLessons: 0,
        hasAccess: false,
        reason: 'Service temporarily unavailable. Please try again shortly.',
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

  // Ultra-fast structured quiz fetching with Anti-Repeat logic and Bulk Pre-fetching
  async getStructuredQuiz(telegramId: number, level: string = 'beginner'): Promise<any[] | null> {
    try {
      const startTime = Date.now();

      // 1. Check Redis for pre-fetched quizzes
      const session = await getSession(telegramId) || {};
      if (session.prefetchedQuizzes && session.prefetchedQuizzes.length > 0) {
        const quizToServe = session.prefetchedQuizzes.shift(); // Take one quiz
        await setSession(telegramId, session); // Save remaining back to Redis
        const latency = Date.now() - startTime;
        console.log(`✅ Loaded quiz from Redis Cache for user ${telegramId} (Latency: ${latency}ms, Remaining: ${session.prefetchedQuizzes.length})`);
        return quizToServe;
      }

      // 2. Fetch active quizzes for this level (Fail-fast 1.5s timeout)
      const user = await this.getUserByTelegramId(telegramId);
      const completedQuizIds = new Set(user?.quizAttempts?.map((a: any) => a.quizId) || []);

      const { data: availableQuizzes } = await axios.get(
        `${this.backendUrl}/api/student/quizzes?level=${level}`,
        { timeout: 1500 }
      );

      if (!availableQuizzes || !Array.isArray(availableQuizzes) || availableQuizzes.length === 0) {
        return null;
      }

      // 3. Anti-Repeat: Filter out completed quizzes
      const unseenQuizzes = availableQuizzes.filter(q => !completedQuizIds.has(q.id));
      
      if (unseenQuizzes.length === 0) {
        return null; // User finished all DB quizzes! Fallback to infinite Gemini.
      }

      // 4. Bulk Fetch up to 5 random unseen quizzes
      const quizzesToFetch = unseenQuizzes.sort(() => 0.5 - Math.random()).slice(0, 5);
      const fetchedQuizzes: any[][] = [];

      await Promise.all(quizzesToFetch.map(async (quizMeta) => {
        try {
          const { data: fullQuiz } = await axios.get(
            `${this.backendUrl}/api/student/quizzes/${quizMeta.id}`,
            { timeout: 1500 }
          );

          if (fullQuiz && fullQuiz.questions && fullQuiz.questions.length > 0) {
            const mappedQuestions = fullQuiz.questions.map((q: any) => {
              const options = q.options.map((o: any) => o.optionText);
              const correctIndex = q.options.findIndex((o: any) => o.isCorrect);
              return {
                question: q.questionText,
                options: options,
                correctAnswer: correctIndex >= 0 ? correctIndex : 0,
                explanation: q.explanation || 'No explanation provided.',
                quizId: fullQuiz.id 
              };
            });
            fetchedQuizzes.push(mappedQuestions);
          }
        } catch (e) {
          // Ignore individual quiz fetch failures
        }
      }));

      if (fetchedQuizzes.length === 0) {
        return null;
      }

      // 5. Serve the first one, cache the rest!
      const quizToServe = fetchedQuizzes.shift();
      if (fetchedQuizzes.length > 0) {
        await setSession(telegramId, { ...session, prefetchedQuizzes: fetchedQuizzes });
      }

      const latency = Date.now() - startTime;
      console.log(`✅ Bulk fetched ${fetchedQuizzes.length + 1} quizzes from DB for user ${telegramId} (Latency: ${latency}ms)`);
      return quizToServe || null;

    } catch (error) {
      // If ANY network error or timeout happens, gracefully return null to fallback to Gemini
      return null;
    }
  }
}

export const apiService = new ApiService();
