import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { checkCentralAuthAndAccess } from '../src/middleware/authGuard.middleware.js';
import { apiService } from '../src/services/api.service.js';
import { quizStatsService } from '../src/utils/quiz-stats.util.js';

describe('Central Auth Guard & Access Control Test Suite', () => {
  let mockCtx: any;
  let getUsageSpy: any;
  let registerSpy: any;
  let getLocalQuizStatsSpy: any;

  beforeEach(() => {
    jest.restoreAllMocks();
    registerSpy = jest.spyOn(apiService, 'registerStudent').mockResolvedValue({ success: true } as never);
    getUsageSpy = jest.spyOn(apiService, 'getUsageStatus');
    getLocalQuizStatsSpy = jest.spyOn(quizStatsService, 'getLocalQuizStats').mockResolvedValue({
      totalQuizzesCompleted: 0,
      totalQuestions: 0,
      totalCorrect: 0,
    });

    mockCtx = {
      from: {
        id: 999888777,
        first_name: 'TestLearner',
        last_name: 'User',
        username: 'test_learner',
      },
      reply: jest.fn().mockResolvedValue(true as never),
    };
  });

  describe('Local Stats & Backend Sync Edge Cases', () => {
    test('CRITICAL: Should BLOCK quiz access when backend returns 0 used BUT local stats has 3 quizzes completed', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyQuizzesUsed: 0,
        weeklyQuizLimit: 3,
        remaining: 3,
      });

      getLocalQuizStatsSpy.mockResolvedValueOnce({
        totalQuizzesCompleted: 3,
        totalQuestions: 15,
        totalCorrect: 12,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');

      expect(allowed).toBe(false);
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Quiz Limit Reached!'),
        expect.objectContaining({ parse_mode: 'HTML' })
      );
    });

    test('Should BLOCK quiz access when backend returns 3 quizzes used regardless of local stats', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyQuizzesUsed: 3,
        weeklyQuizLimit: 3,
        remaining: 0,
      });

      getLocalQuizStatsSpy.mockResolvedValueOnce({
        totalQuizzesCompleted: 0,
        totalQuestions: 0,
        totalCorrect: 0,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');

      expect(allowed).toBe(false);
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Quiz Limit Reached!'),
        expect.objectContaining({ parse_mode: 'HTML' })
      );
    });

    test('Should ALLOW quiz access when both backend and local stats indicate remaining quota (1/3 used)', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyQuizzesUsed: 1,
        weeklyQuizLimit: 3,
        remaining: 2,
      });

      getLocalQuizStatsSpy.mockResolvedValueOnce({
        totalQuizzesCompleted: 1,
        totalQuestions: 5,
        totalCorrect: 4,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');

      expect(allowed).toBe(true);
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });
  });

  describe('VIP & Subscription Tier Authorization', () => {
    test('VIP user should ALWAYS be allowed for quiz regardless of completed quiz count', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: true,
        weeklyQuizzesUsed: 10,
        weeklyQuizLimit: -1,
        remaining: -1,
      });

      getLocalQuizStatsSpy.mockResolvedValueOnce({
        totalQuizzesCompleted: 15,
        totalQuestions: 75,
        totalCorrect: 70,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');

      expect(allowed).toBe(true);
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });

    test('VIP user should ALWAYS be allowed for lesson regardless of lesson count', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: true,
        weeklyLessonsUsed: 20,
        weeklyLessonLimit: -1,
        remainingLessons: -1,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'lesson');

      expect(allowed).toBe(true);
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });
  });

  describe('Fail-Closed Resilience & Error Handling', () => {
    test('Should FAIL CLOSED (block quiz) if apiService throws an unhandled error AND local stats indicate 3+ completed', async () => {
      getUsageSpy.mockRejectedValueOnce(new Error('Database connection timeout'));

      getLocalQuizStatsSpy.mockResolvedValueOnce({
        totalQuizzesCompleted: 3,
        totalQuestions: 15,
        totalCorrect: 10,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');

      expect(allowed).toBe(false);
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Quiz Limit Reached!'),
        expect.anything()
      );
    });

    test('Should deny access if Telegram Context has no user profile (ctx.from undefined)', async () => {
      const invalidCtx = { reply: jest.fn().mockResolvedValue(true as never) } as any;

      const allowed = await checkCentralAuthAndAccess(invalidCtx, 'quiz');

      expect(allowed).toBe(false);
      expect(invalidCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Could not verify your Telegram ID'));
    });
  });
});
