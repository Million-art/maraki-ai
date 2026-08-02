import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { quizCommand } from '../src/commands/quiz.command.js';
import { lessonCommand } from '../src/commands/lesson.comand.js';
import { apiService } from '../src/services/api.service.js';
import { checkCentralAuthAndAccess } from '../src/middleware/authGuard.middleware.js';

describe('Multi-Button Entry Paths Test Suite (Quiz & Lesson)', () => {
  let mockCtx: any;
  let getUsageSpy: any;
  let registerSpy: any;
  let createOrUpdateSpy: any;
  let getUserByTelegramIdSpy: any;

  beforeEach(() => {
    jest.restoreAllMocks();
    registerSpy = jest.spyOn(apiService, 'registerStudent').mockResolvedValue({ success: true } as never);
    createOrUpdateSpy = jest.spyOn(apiService, 'createOrUpdateUser').mockResolvedValue({ success: true } as never);
    getUserByTelegramIdSpy = jest.spyOn(apiService, 'getUserByTelegramId').mockResolvedValue({ firstName: 'Million', level: 'intermediate' } as never);
    getUsageSpy = jest.spyOn(apiService, 'getUsageStatus');

    mockCtx = {
      from: {
        id: 777888999,
        first_name: 'Million',
        last_name: 'Dev',
        username: 'million_dev',
      },
      callbackQuery: { data: '' },
      reply: jest.fn().mockResolvedValue(true as never),
      answerCallbackQuery: jest.fn().mockResolvedValue(true as never),
    };
  });

  describe('Quiz Entry Paths (Commands & Buttons)', () => {
    test('Path 1: Direct Slash Command (/quiz) when within limit', async () => {
      getUsageSpy.mockResolvedValue({
        isPremium: false,
        weeklyQuizzesUsed: 1,
        weeklyQuizLimit: 3,
        remaining: 2,
      });

      await quizCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("Starting your English quiz!")
      );
    });

    test('Path 2: Callback Button "🧠 Take Quiz" from Main Menu', async () => {
      mockCtx.callbackQuery.data = 'quiz';

      getUsageSpy.mockResolvedValue({
        isPremium: false,
        weeklyQuizzesUsed: 0,
        weeklyQuizLimit: 3,
        remaining: 3,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'quiz');
      if (allowed) await quizCommand(mockCtx);

      expect(allowed).toBe(true);
      expect(mockCtx.reply).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("Starting your English quiz!")
      );
    });

    test('Path 3: Callback Button "🧠 Take Another Quiz" after Quiz Results', async () => {
      mockCtx.callbackQuery.data = 'quiz';

      getUsageSpy.mockResolvedValue({
        isPremium: false,
        weeklyQuizzesUsed: 2,
        weeklyQuizLimit: 3,
        remaining: 1,
      });

      await quizCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("Starting your English quiz!")
      );
    });

    test('Path 4: "🧠 Take Another Quiz" button BLOCKED on 4th attempt when quota depleted', async () => {
      mockCtx.callbackQuery.data = 'quiz';

      getUsageSpy.mockResolvedValue({
        isPremium: false,
        weeklyQuizzesUsed: 3,
        weeklyQuizLimit: 3,
        remaining: 0,
      });

      await quizCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Quiz Limit Reached!'),
        expect.objectContaining({ parse_mode: 'HTML' })
      );
    });
  });

  describe('Lesson Entry Paths (Commands & Buttons)', () => {
    test('Path 1: Direct Slash Command (/lesson) when within limit', async () => {
      getUsageSpy.mockResolvedValue({
        isPremium: false,
        weeklyLessonsUsed: 2,
        weeklyLessonLimit: 5,
        remainingLessons: 3,
      });

      await lessonCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalled();
    });

    test('Path 2: Callback Button "📚 Learn a Lesson" from Main Menu', async () => {
      mockCtx.callbackQuery.data = 'lesson';

      getUsageSpy.mockResolvedValue({
        isPremium: false,
        weeklyLessonsUsed: 0,
        weeklyLessonLimit: 5,
        remainingLessons: 5,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'lesson');
      if (allowed) await lessonCommand(mockCtx);

      expect(allowed).toBe(true);
      expect(mockCtx.reply).toHaveBeenCalled();
    });

    test('Path 3: Callback Button "📖 Learn a Lesson" from Quiz Results', async () => {
      mockCtx.callbackQuery.data = 'lesson';

      getUsageSpy.mockResolvedValue({
        isPremium: false,
        weeklyLessonsUsed: 4,
        weeklyLessonLimit: 5,
        remainingLessons: 1,
      });

      await lessonCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalled();
    });

    test('Path 4: Callback Button "📚 New Lesson" from Lesson Footer', async () => {
      mockCtx.callbackQuery.data = 'lesson_back_to_parts';

      getUsageSpy.mockResolvedValue({
        isPremium: false,
        weeklyLessonsUsed: 1,
        weeklyLessonLimit: 5,
        remainingLessons: 4,
      });

      const allowed = await checkCentralAuthAndAccess(mockCtx, 'lesson');
      if (allowed) await lessonCommand(mockCtx);

      expect(allowed).toBe(true);
    });

    test('Path 5: "📚 Learn a Lesson" BLOCKED on 6th attempt when quota depleted', async () => {
      mockCtx.callbackQuery.data = 'lesson';

      getUsageSpy.mockResolvedValue({
        isPremium: false,
        weeklyLessonsUsed: 5,
        weeklyLessonLimit: 5,
        remainingLessons: 0,
      });

      await lessonCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Lesson Limit Reached!'),
        expect.objectContaining({ parse_mode: 'HTML' })
      );
    });
  });
});
