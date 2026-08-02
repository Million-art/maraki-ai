import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { checkCentralAuthAndAccess } from '../src/middleware/authGuard.middleware.js';
import { apiService } from '../src/services/api.service.js';

describe('Subscriptions & VIP Tier Test Suite', () => {
  let mockCtx: any;
  let getUsageSpy: any;
  let registerSpy: any;

  beforeEach(() => {
    jest.restoreAllMocks();
    registerSpy = jest.spyOn(apiService, 'registerStudent').mockResolvedValue({ success: true } as never);
    getUsageSpy = jest.spyOn(apiService, 'getUsageStatus');

    mockCtx = {
      from: {
        id: 987654321,
        first_name: 'VIPUser',
        last_name: 'Maraki',
        username: 'vip_learner',
      },
      reply: jest.fn().mockResolvedValue(true as never),
    };
  });

  describe('Active VIP Subscription', () => {
    test('Active VIP user should BYPASS quiz limits completely', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: true,
        remaining: -1,
        weeklyQuizzesUsed: 50,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');

      expect(allowed).toBe(true);
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });

    test('Active VIP user should BYPASS lesson limits completely', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: true,
        remainingLessons: -1,
        weeklyLessonsUsed: 100,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'lesson');

      expect(allowed).toBe(true);
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });
  });

  describe('Expired VIP Subscription Handling', () => {
    test('Expired VIP user should REVERT to free tier and be BLOCKED if weekly limit exceeded', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyQuizzesUsed: 3,
        weeklyQuizLimit: 3,
        remaining: 0,
        reason: 'Weekly free limits reached. Upgrade to Premium!',
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');

      expect(allowed).toBe(false);
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Quiz Limit Reached!'),
        expect.anything()
      );
    });

    test('Expired VIP user should be ALLOWED if within free tier weekly limits', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyQuizzesUsed: 1,
        weeklyQuizLimit: 3,
        remaining: 2,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');

      expect(allowed).toBe(true);
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });
  });
});
