import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { checkCentralAuthAndAccess } from '../src/middleware/authGuard.middleware.js';
import { apiService } from '../src/services/api.service.js';

describe('Strict Feature Usage Limits Test Suite', () => {
  let mockCtx: any;
  let getUsageSpy: any;
  let registerSpy: any;

  beforeEach(() => {
    jest.restoreAllMocks();
    registerSpy = jest.spyOn(apiService, 'registerStudent').mockResolvedValue({ success: true } as never);
    getUsageSpy = jest.spyOn(apiService, 'getUsageStatus');

    mockCtx = {
      from: {
        id: 123456789,
        first_name: 'TestUser',
        last_name: 'Maraki',
        username: 'test_user',
      },
      reply: jest.fn().mockResolvedValue(true as never),
    };
  });

  describe('Quiz Limit Enforcement (Max 3/week for Free Tier)', () => {
    test('Should ALLOW quiz access when free user has 2/3 quizzes used (1 remaining)', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyQuizzesUsed: 2,
        weeklyQuizLimit: 3,
        remaining: 1,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');

      expect(allowed).toBe(true);
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });

    test('Should BLOCK quiz access when free user has 3/3 quizzes used (0 remaining)', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyQuizzesUsed: 3,
        weeklyQuizLimit: 3,
        remaining: 0,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');

      expect(allowed).toBe(false);
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Quiz Limit Reached!'),
        expect.objectContaining({ parse_mode: 'Markdown' })
      );
    });

    test('Should BLOCK quiz access when free user attempts excess 4th quiz', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyQuizzesUsed: 4,
        weeklyQuizLimit: 3,
        remaining: 0,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');

      expect(allowed).toBe(false);
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Quiz Limit Reached!'),
        expect.anything()
      );
    });
  });

  describe('Lesson Limit Enforcement (Max 5/week for Free Tier)', () => {
    test('Should ALLOW lesson access when free user has 4/5 lessons used (1 remaining)', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyLessonsUsed: 4,
        weeklyLessonLimit: 5,
        remainingLessons: 1,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'lesson');

      expect(allowed).toBe(true);
      expect(mockCtx.reply).not.toHaveBeenCalled();
    });

    test('Should BLOCK lesson access when free user has 5/5 lessons used (0 remaining)', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyLessonsUsed: 5,
        weeklyLessonLimit: 5,
        remainingLessons: 0,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'lesson');

      expect(allowed).toBe(false);
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Lesson Limit Reached!'),
        expect.objectContaining({ parse_mode: 'Markdown' })
      );
    });
  });
});
