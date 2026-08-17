import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { quizCommand } from '../src/commands/quiz.command.js';
import { lessonCommand } from '../src/commands/lesson.comand.js';
import { levelCommand } from '../src/commands/level.command.js';
import { referralCommand } from '../src/commands/referral.command.js';
import { challengeCommand } from '../src/commands/challenge.command.js';
import { handlePaymentCommand } from '../src/commands/payment.command.js';
import { apiService } from '../src/services/api.service.js';
import { quizStatsService } from '../src/utils/quiz-stats.util.js';

describe('Callback Navigation & All Menu Option Buttons Test Suite', () => {
  let mockCtx: any;
  let getUsageSpy: any;
  let getLocalQuizStatsSpy: any;
  let getUserByTelegramIdSpy: any;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test_key_for_jest_mock';
    jest.restoreAllMocks();
    jest.spyOn(apiService, 'registerStudent').mockResolvedValue({ success: true } as never);
    jest.spyOn(apiService, 'createOrUpdateUser').mockResolvedValue({ success: true } as never);
    getUserByTelegramIdSpy = jest.spyOn(apiService, 'getUserByTelegramId').mockResolvedValue({
      firstName: 'Million',
      level: 'intermediate',
      isMarakiPremium: false,
    } as never);
    getUsageSpy = jest.spyOn(apiService, 'getUsageStatus');
    getLocalQuizStatsSpy = jest.spyOn(quizStatsService, 'getLocalQuizStats').mockResolvedValue({
      totalQuizzesCompleted: 0,
      totalQuestions: 0,
      totalCorrect: 0,
    });

    mockCtx = {
      from: {
        id: 555666777,
        first_name: 'Million',
        last_name: 'Tester',
        username: 'million_tester',
      },
      callbackQuery: { data: '' },
      reply: jest.fn().mockResolvedValue(true as never),
      answerCallbackQuery: jest.fn().mockResolvedValue(true as never),
      api: {
        getChatMember: jest.fn().mockResolvedValue({ status: 'member' } as never),
        sendMessage: jest.fn().mockResolvedValue(true as never),
      },
    };
  });

  describe('Menu Button 1: "🧠 Quiz" Button Access Control', () => {
    test('Clicking "🧠 Quiz" button when 3/3 quizzes completed locally should BLOCK access', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyQuizzesUsed: 3,
        weeklyQuizLimit: 3,
        remaining: 0,
      });

      getLocalQuizStatsSpy.mockResolvedValueOnce({
        totalQuizzesCompleted: 3,
        totalQuestions: 15,
        totalCorrect: 10,
      });

      await quizCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Quiz Limit Reached!'),
        expect.objectContaining({ parse_mode: 'Markdown' })
      );
    });

    test('Clicking "🧠 Quiz" button when 0/3 quizzes completed should ALLOW quiz start', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyQuizzesUsed: 0,
        weeklyQuizLimit: 3,
        remaining: 3,
      });

      getLocalQuizStatsSpy.mockResolvedValueOnce({
        totalQuizzesCompleted: 0,
        totalQuestions: 0,
        totalCorrect: 0,
      });

      await quizCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("Starting your English quiz!")
      );
    });
  });

  describe('Menu Button 2: "📚 Lessons" Button Access Control', () => {
    test('Clicking "📚 Lessons" button when 5/5 lessons used should BLOCK access', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyLessonsUsed: 5,
        weeklyLessonLimit: 5,
        remainingLessons: 0,
      });

      await lessonCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Weekly Lesson Limit Reached!'),
        expect.objectContaining({ parse_mode: 'Markdown' })
      );
    });

    test('Clicking "📚 Lessons" button when 2/5 lessons used should ALLOW lesson access', async () => {
      getUsageSpy.mockResolvedValueOnce({
        isPremium: false,
        weeklyLessonsUsed: 2,
        weeklyLessonLimit: 5,
        remainingLessons: 3,
      });

      await lessonCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalled();
    });
  });

  describe('Menu Button 3: "⚙️ My Progress / Level" Option', () => {
    test('Clicking "⚙️ My Progress" button should render progress dashboard & level selection keyboard', async () => {
      await levelCommand(mockCtx);

      expect(getUserByTelegramIdSpy).toHaveBeenCalledWith(555666777);
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('LEARNING PROGRESS DASHBOARD'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '🟢 Beginner' }),
                expect.objectContaining({ text: '✅ Intermediate' }),
              ])
            ])
          })
        })
      );
    });
  });

  describe('Menu Button 4: "💳 Upgrade to VIP" & Payment Actions', () => {
    test('Clicking "💳 Upgrade to VIP" ("pay" callback) should render payment instructions & bank details', async () => {
      await handlePaymentCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('የMaraki AI VIP ክፍያ'),
        expect.objectContaining({ parse_mode: 'Markdown' })
      );
    });

    test('Clicking "🎁 Premium Challenge" button should return personalized referral link', async () => {
      jest.spyOn(apiService, 'getReferralStats').mockResolvedValueOnce({
        totalReferred: 2,
        target: 10,
        remaining: 8,
        progressPercentage: 20,
        rewardUnlocked: false,
        referralLink: 'https://t.me/marakiai_bot?start=555666777',
      } as never);

      await referralCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('https://t.me/marakiai_bot?start=555666777'),
        expect.objectContaining({ parse_mode: 'HTML' })
      );
    });

    test('Clicking "🔥 Daily Challenge" button should render current daily question', async () => {
      await challengeCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('MARAKI AI DAILY CHALLENGE'),
        expect.anything()
      );
    });
  });
});
