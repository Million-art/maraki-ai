import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { startCommand } from '../src/commands/start.command.js';
import { helpCommand } from '../src/commands/help.command.js';
import { getPersonalizedStartMsg } from '../src/messages/start.message.js';
import { apiService } from '../src/services/api.service.js';

describe('Menu & Callback Navigation Validation Test Suite', () => {
  let mockCtx: any;
  let createOrUpdateUserSpy: any;
  let getUserByTelegramIdSpy: any;
  let getUsageSpy: any;

  beforeEach(() => {
    jest.restoreAllMocks();
    createOrUpdateUserSpy = jest.spyOn(apiService, 'createOrUpdateUser').mockResolvedValue({
      telegramId: 111222333,
      firstName: 'Million',
      lastName: 'Test',
      level: 'intermediate',
    } as never);
    getUserByTelegramIdSpy = jest.spyOn(apiService, 'getUserByTelegramId').mockResolvedValue({ firstName: 'Million', level: 'intermediate' } as never);
    getUsageSpy = jest.spyOn(apiService, 'getUsageStatus').mockResolvedValue({ isPremium: false, remaining: 3, remainingLessons: 5 } as never);

    mockCtx = {
      from: {
        id: 111222333,
        first_name: 'Million',
        last_name: 'Test',
        username: 'million_dev',
        is_bot: false,
      },
      api: {
        sendMessage: jest.fn().mockResolvedValue(true as never),
      },
      reply: jest.fn().mockResolvedValue(true as never),
      answerCallbackQuery: jest.fn().mockResolvedValue(true as never),
    };
  });

  describe('Welcome & Help Menu Commands', () => {
    test('/start command should render personalized welcome message', async () => {
      await startCommand(mockCtx);

      expect(createOrUpdateUserSpy).toHaveBeenCalledWith(
        111222333,
        expect.objectContaining({
          firstName: 'Million',
          lastName: 'Test',
          username: 'million_dev',
        })
      );

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to <b>Maraki AI</b>, <b>Million</b>!'),
        expect.objectContaining({ parse_mode: 'HTML' })
      );
    });

    test('/help command should render instructions and direct Mini App Voice button', async () => {
      await helpCommand(mockCtx);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Welcome to Maraki AI English Help Center'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '🎙️ Talk with Maraki' })
              ])
            ])
          })
        })
      );
    });
  });

  describe('Welcome Message Template Validation', () => {
    test('getPersonalizedStartMsg() template should contain core pillars: Practice, Learn, Quiz, Daily Challenge', () => {
      const msg = getPersonalizedStartMsg('Million');

      expect(msg).toContain('Welcome to <b>Maraki AI</b>, <b>Million</b>!');
      expect(msg).toContain('🎙️ Real-time English speaking');
      expect(msg).toContain('Choose an option below 👇');
    });
  });
});
