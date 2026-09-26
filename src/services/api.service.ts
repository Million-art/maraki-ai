import axios from 'axios';
import { getSession, setSession, redis } from '../utils/redis.js';

export interface IUser {
  telegramId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  cefrLevel?: string;
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
    axios.defaults.headers.common['x-internal-token'] = process.env.INTERNAL_API_TOKEN || 'dev-internal-token-123';
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
        cefrLevel: 'UNTESTED',
        level: 'UNTESTED',
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
  async getVoiceQuota(telegramId: number): Promise<{ allowed: boolean; remainingSeconds: number; quotaSeconds: number; usedSeconds: number; tier: string; isExpired: boolean; shouldWarnWrapUp?: boolean; wrapUpPrompt?: string }> {
    try {
      const { data } = await axios.get(`${this.backendUrl}/api/student/usage/${telegramId}/voice-quota`, { timeout: 5000 });
      return data;
    } catch (error) {
      return { allowed: true, remainingSeconds: 120, quotaSeconds: 120, usedSeconds: 0, tier: 'FREE', isExpired: false, shouldWarnWrapUp: false };
    }
  }

  async incrementVoiceSeconds(telegramId: number, durationSeconds: number): Promise<any> {
    try {
      const { data } = await axios.post(`${this.backendUrl}/api/student/usage/${telegramId}/increment-live-seconds`, { durationSeconds }, { timeout: 5000 });
      return data;
    } catch (error) {
      return null;
    }
  }

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
        cefrLevel: user?.cefrLevel || 'UNTESTED',
        level: user?.cefrLevel || 'UNTESTED',
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
      if (process.env.NODE_ENV === 'development') {
        return {
          isPremium: true,
          weeklyQuizzesUsed: 0,
          weeklyQuizLimit: -1,
          remaining: 999,
          weeklyLessonsUsed: 0,
          weeklyLessonLimit: -1,
          remainingLessons: 999,
          hasAccess: true,
          reason: 'Development mode local testing',
        };
      }

      // Fail closed in production: deny quiz/lesson access when backend is unreachable
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
      console.log(`💾 [SAVING QUIZ RESULT] Telegram User ${telegramId} | Quiz ID: ${quizData.quizId || 'AI-Generated'} | Score: ${quizData.score}%`);
      const { data } = await axios.post(`${this.backendUrl}/api/student/quizzes/general/attempt`, {
        telegramId,
        quizId: quizData.quizId,
        score: quizData.score || 0,
        correctAnswers: quizData.correctAnswers || 0,
        totalQuestions: quizData.totalQuestions || 5,
      }, { timeout: 5000 });
      console.log(`✅ [QUIZ RESULT SAVED] Recorded Attempt ID: ${data?.id} for Quiz ID: ${data?.quizId}`);
      return data;
    } catch (error) {
      console.error('❌ Error in saveQuizResult:', (error as Error).message);
      return { success: false };
    }
  }

  // Ultra-fast structured quiz fetching with Anti-Repeat logic and Bulk Pre-fetching
  async getStructuredQuiz(telegramId: number, level: string = 'beginner'): Promise<any[] | null> {
    try {
      const startTime = Date.now();

      // 1. Fetch user completed quiz IDs first
      const user = await Promise.race([
        this.getUserByTelegramId(telegramId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
      ]).catch(() => null) as any;
      const completedQuizIds = new Set(user?.quizAttempts?.map((a: any) => a.quizId).filter(Boolean) || []);

      // 2. Check Redis for pre-fetched quizzes (ensuring none are already completed)
      const session = await getSession(telegramId) || {};
      if (session.prefetchedQuizzes && Array.isArray(session.prefetchedQuizzes) && session.prefetchedQuizzes.length > 0) {
        // Filter out any prefetched quizzes that user has completed in the meantime
        session.prefetchedQuizzes = session.prefetchedQuizzes.filter((qArray: any[]) => {
          const qId = qArray?.[0]?.quizId;
          return !qId || !completedQuizIds.has(qId);
        });

        if (session.prefetchedQuizzes.length > 0) {
          const quizToServe = session.prefetchedQuizzes.shift(); // Take one unseen quiz
          await setSession(telegramId, session); // Save remaining back to Redis
          const latency = Date.now() - startTime;
          console.log(`✅ Loaded unseen quiz from Redis Cache for user ${telegramId} (Latency: ${latency}ms, Remaining: ${session.prefetchedQuizzes.length})`);
          return quizToServe;
        }
      }

      // 2. Fetch active quizzes for this level (with fallback to all active quizzes if level match is empty)
      let availableQuizzes: any[] = [];
      try {
        const { data } = await axios.get(
          `${this.backendUrl}/api/student/quizzes?level=${level}`,
          { timeout: 10000 }
        );
        availableQuizzes = data;
      } catch (e) { }

      if (!availableQuizzes || !Array.isArray(availableQuizzes) || availableQuizzes.length === 0) {
        try {
          const { data } = await axios.get(
            `${this.backendUrl}/api/student/quizzes`,
            { timeout: 10000 }
          );
          availableQuizzes = data;
        } catch (e) { }
      }

      if (!availableQuizzes || !Array.isArray(availableQuizzes) || availableQuizzes.length === 0) {
        return null;
      }

      // 3. Anti-Repeat: Filter out completed quizzes
      const unseenQuizzes = availableQuizzes.filter(q => !completedQuizIds.has(q.id));

      if (unseenQuizzes.length === 0) {
        console.log(`⚠️ User ${telegramId} completed ALL DB quizzes for ${level}! Switching to dynamic AI generation.`);
        return null; // User finished all DB quizzes! Fallback to infinite Gemini AI generation.
      }

      // Load asked question texts history from session to prevent duplicate question texts across different quiz IDs
      const askedTextsSet = new Set<string>((session.askedQuestionTexts || []).map((t: string) => t.trim().toLowerCase()));

      // 4. Bulk Fetch up to 8 random unseen quizzes to find quizzes with completely unique questions
      const quizzesToFetch = unseenQuizzes.sort(() => 0.5 - Math.random()).slice(0, 8);
      const fetchedQuizzes: any[][] = [];

      await Promise.all(quizzesToFetch.map(async (quizMeta) => {
        try {
          const { data: fullQuiz } = await axios.get(
            `${this.backendUrl}/api/student/quizzes/${quizMeta.id}`,
            { timeout: 10000 }
          );

          if (fullQuiz && fullQuiz.questions && fullQuiz.questions.length > 0) {
            // Check if any question text in this quiz has already been answered by the user
            const hasDuplicateText = fullQuiz.questions.some((q: any) =>
              askedTextsSet.has(q.questionText.trim().toLowerCase())
            );

            if (hasDuplicateText) {
              console.log(`⚠️ Skipping Quiz ID: ${fullQuiz.id} because it contains duplicate question texts seen previously.`);
              return;
            }

            const mappedQuestions = fullQuiz.questions.map((q: any) => {
              // Extract options with correctness flag
              const optionsWithFlag = q.options.map((o: any) => ({
                text: o.optionText,
                isCorrect: !!o.isCorrect
              }));

              // Fisher-Yates random shuffle
              for (let i = optionsWithFlag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [optionsWithFlag[i], optionsWithFlag[j]] = [optionsWithFlag[j], optionsWithFlag[i]];
              }

              const shuffledTexts = optionsWithFlag.map((o: any) => o.text);
              const newCorrectIndex = optionsWithFlag.findIndex((o: any) => o.isCorrect);

              return {
                question: q.questionText,
                options: shuffledTexts,
                correctAnswer: newCorrectIndex >= 0 ? newCorrectIndex : 0,
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

  /**
   * Fetch the Daily Challenge directly from the DB.
   * If it fails or returns null, the bot falls back to Gemini.
   */
  async getDailyChallenge(level: string): Promise<any | null> {
    try {
      const response = await axios.get(`${this.backendUrl}/api/challenges/today`, {
        params: { level },
        timeout: 2000 // 2 seconds max
      });
      return response.data?.data || null;
    } catch (error) {
      console.error('Failed to fetch daily challenge from DB:', error);
      return null;
    }
  }
  // ── Survey Methods ──────────────────────────────────────────────────────────

  async saveSurveyStep1(telegramId: number, primaryChoice: string): Promise<void> {
    const token = process.env.INTERNAL_API_TOKEN || 'dev-internal-token-123';
    try {
      const { data } = await axios.post(
        `${this.backendUrl}/survey/internal/step1`,
        { telegramId: String(telegramId), primaryChoice },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': token,
          },
          timeout: 10000,
        }
      );
      console.log(`[Survey Step1] Saved for Telegram ID ${telegramId}: ${primaryChoice}`);
    } catch (error: any) {
      console.error(`[Survey Step1 ERROR] Failed for Telegram ID ${telegramId}:`, error?.response?.data || error?.message);
      throw error;
    }
  }

  async saveSurveyStep2(telegramId: number, followUpChoice: string): Promise<void> {
    const token = process.env.INTERNAL_API_TOKEN || 'dev-internal-token-123';
    try {
      const { data } = await axios.post(
        `${this.backendUrl}/survey/internal/step2`,
        { telegramId: String(telegramId), followUpChoice },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': token,
          },
          timeout: 10000,
        }
      );
      console.log(`[Survey Step2] Saved for Telegram ID ${telegramId}: ${followUpChoice}`);
    } catch (error: any) {
      console.error(`[Survey Step2 ERROR] Failed for Telegram ID ${telegramId}:`, error?.response?.data || error?.message);
      throw error;
    }
  }

  // ── Maraki English Assessment & Maraki Level ──────────────────────────────

  async getAssessmentQuestions(): Promise<any> {
    try {
      const { data } = await axios.get(`${this.backendUrl}/api/assessment/questions`, { timeout: 10000 });
      return data;
    } catch (error: any) {
      console.error('[Assessment API] Failed to fetch questions:', error?.message);
      return null;
    }
  }

  async submitAssessment(payload: { telegramId: number; firstName?: string; lastName?: string; username?: string; answers: Record<string, number>; questions?: any[]; speaking?: any; durationSeconds?: number }): Promise<any> {
    try {
      const { data } = await axios.post(`${this.backendUrl}/api/assessment/submit`, payload, { timeout: 10000 });
      if (data) {
        try {
          await redis.set(`user:assessment_report:${payload.telegramId}`, JSON.stringify(data), { EX: 60 * 60 * 24 * 7 });
        } catch (e) {}
        return data;
      }
    } catch (error: any) {
      console.warn('[Assessment API] Backend unreachable, computing resilient local report:', error?.message);
    }

    // Local Fallback Report Computation
    const questions = payload.questions || [];
    let grammarPoints = 0, grammarTotal = 0;
    let vocabPoints = 0, vocabTotal = 0;
    let listeningPoints = 0, listeningTotal = 0;

    for (const q of questions) {
      const selected = payload.answers[q.id];
      const isCorrect = selected !== undefined && selected === q.correctIndex;
      const pts = 10;
      const earned = isCorrect ? pts : 0;
      const skill = (q.skill || '').toLowerCase();
      if (skill === 'grammar') { grammarTotal += pts; grammarPoints += earned; }
      else if (skill === 'vocabulary') { vocabTotal += pts; vocabPoints += earned; }
      else if (skill === 'listening') { listeningTotal += pts; listeningPoints += earned; }
    }

    const scale = (pts: number, tot: number) => tot <= 0 ? 55 : Math.round(25 + ((pts / tot) * 75));
    const grammarScore = scale(grammarPoints, grammarTotal);
    const vocabularyScore = scale(vocabPoints, vocabTotal);
    const listeningScore = scale(listeningPoints, listeningTotal);
    const speakingScore = payload.speaking?.scores?.overall ?? (payload.speaking ? 65 : null);
    const isSpeakingTested = speakingScore !== null;

    const overallScore = isSpeakingTested
      ? Math.round((grammarScore * 0.30) + (vocabularyScore * 0.25) + (listeningScore * 0.25) + (speakingScore * 0.20))
      : Math.round((grammarScore * 0.40) + (vocabularyScore * 0.30) + (listeningScore * 0.30));

    const cefrLevel = overallScore >= 85 ? 'C1' : overallScore >= 70 ? 'B2' : overallScore >= 55 ? 'B1' : overallScore >= 36 ? 'A2' : 'A1';

    const localReport = {
      assessmentId: `local-${Date.now()}`,
      cefrLevel,
      overallScore,
      skills: {
        grammar: grammarScore,
        vocabulary: vocabularyScore,
        listening: listeningScore,
        speaking: speakingScore,
      },
      speakingTested: isSpeakingTested,
      primaryWeakness: payload.speaking ? 'Prepositions & Collocations' : 'Speaking Fluency',
      diagnosis: {
        tag: 'Conversational Fluency',
        headlineAmharic: payload.speaking ? 'የሰዋሰው እና የቃላት አጠቃቀም' : 'የንግግር ቅልጥፍና (Speaking Fluency)',
        summary: 'አጫጭር የቋንቋ እና የድምፅ ልምምዶችን በማድረግ እንግሊዝኛዎን ወደሚቀጥለው ደረጃ ማሳደግ ይችላሉ።',
      },
    };

    try {
      await redis.set(`user:assessment_report:${payload.telegramId}`, JSON.stringify(localReport), { EX: 60 * 60 * 24 * 7 });
    } catch (e) {}

    return localReport;
  }

  async getStudentMarakiLevel(telegramId: number): Promise<any> {
    try {
      const { data } = await axios.get(`${this.backendUrl}/api/assessment/level/${telegramId}`, { timeout: 5000 });
      return data;
    } catch (error: any) {
      try {
        const raw = await redis.get(`user:assessment_report:${telegramId}`);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return null;
    }
  }

  async evaluateSpeakingAudio(payload: { transcript?: string; audioBase64?: string; mimeType?: string; durationSeconds?: number }): Promise<any> {
    try {
      const { data } = await axios.post(`${this.backendUrl}/api/assessment/evaluate-speaking`, payload, { timeout: 25000 });
      return data;
    } catch (error: any) {
      console.error('[Assessment API] Speaking evaluation failed:', error?.message);
      return null;
    }
  }

  async getAssessmentProductIntelligence(): Promise<any> {
    try {
      const { data } = await axios.get(`${this.backendUrl}/api/assessment/admin/intelligence`, { timeout: 15000 });
      return data;
    } catch (error: any) {
      console.error('[Assessment API] Failed to get product intelligence:', error?.message);
      return null;
    }
  }

  // Persistent 7-Day Plan & Streak Management (PostgreSQL via Backend API)
  async getStudentPlanProgress(telegramId: number): Promise<{ currentDay: number; completedDays: number[]; lastCompletedAt?: string; activeLesson?: any }> {
    try {
      const { data } = await axios.get(`${this.backendUrl}/api/student/${telegramId}/plan-progress`, { timeout: 5000 });
      return data;
    } catch (error: any) {
      return { currentDay: 1, completedDays: [] };
    }
  }

  async saveStudentPlanProgress(telegramId: number, body: { completedDay?: number; currentDay?: number; activeLesson?: any }): Promise<any> {
    try {
      const { data } = await axios.post(`${this.backendUrl}/api/student/${telegramId}/plan-progress`, body, { timeout: 5000 });
      return data;
    } catch (error: any) {
      return null;
    }
  }

  async getStudentStreak(telegramId: number): Promise<number> {
    try {
      const { data } = await axios.get(`${this.backendUrl}/api/student/${telegramId}/streak`, { timeout: 5000 });
      return data?.streak || 0;
    } catch (error: any) {
      return 1;
    }
  }

  async updateStudentStreak(telegramId: number): Promise<{ streak: number; isNewDay: boolean }> {
    try {
      const { data } = await axios.post(`${this.backendUrl}/api/student/${telegramId}/streak`, {}, { timeout: 5000 });
      return { streak: data?.streak || 1, isNewDay: !!data?.isNewDay };
    } catch (error: any) {
      return { streak: 1, isNewDay: false };
    }
  }

  async getActivePlanLearners(): Promise<Array<{
    telegramId: number;
    firstName: string;
    currentDay: number;
    completedDaysCount: number;
    streak: number;
    level: string;
  }>> {
    try {
      const { data } = await axios.get(`${this.backendUrl}/api/student/plan/active-learners`, { timeout: 10000 });
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('[ApiService] Failed to fetch active plan learners:', error?.message);
      return [];
    }
  }
}

export const apiService = new ApiService();
