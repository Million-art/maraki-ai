import { jest } from '@jest/globals';
import { trackUpgradeIntent, trackPaymentAttempt, handleAdminFollowupAction, ADMIN_TELEGRAM_ID } from '../src/utils/analytics.util.js';
import { redis } from '../src/utils/redis.js';

describe('Bot Support, Follow-Up, and Admin Relay E2E Integration Suite', () => {
  const mockUser = {
    id: 99887766,
    first_name: 'Test',
    last_name: 'Student',
    username: 'teststudent',
  };

  const mockSendMessage = jest.fn().mockImplementation(() => Promise.resolve({ message_id: 123 }));
  const mockAnswerCallback = jest.fn().mockImplementation(() => Promise.resolve(true));
  const mockReply = jest.fn().mockImplementation(() => Promise.resolve({ message_id: 456 }));

  const mockCtx: any = {
    from: mockUser,
    api: {
      sendMessage: mockSendMessage,
    },
    answerCallbackQuery: mockAnswerCallback,
    reply: mockReply,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. trackUpgradeIntent sends Admin alert with interactive follow-up buttons and stores Redis TTL key', async () => {
    await trackUpgradeIntent(mockCtx);

    expect(mockSendMessage).toHaveBeenCalledWith(
      ADMIN_TELEGRAM_ID,
      expect.stringContaining('User Viewed Payment Details!'),
      expect.objectContaining({
        parse_mode: 'HTML',
        reply_markup: expect.anything(),
      })
    );

    if (redis.isOpen) {
      const redisKey = await redis.get(`followup:intent:${mockUser.id}`);
      expect(redisKey).toBeTruthy();
      const parsed = JSON.parse(redisKey!);
      expect(parsed.userId).toBe(mockUser.id);
    }
  });

  test('2. handleAdminFollowupAction delivers 1-click follow-up message to target user via Maraki Bot', async () => {
    const adminCtx: any = {
      from: { id: ADMIN_TELEGRAM_ID },
      api: { sendMessage: mockSendMessage },
      answerCallbackQuery: mockAnswerCallback,
      reply: mockReply,
    };

    await handleAdminFollowupAction(adminCtx, `admin_followup_${mockUser.id}`);

    expect(mockSendMessage).toHaveBeenCalledWith(
      mockUser.id,
      expect.stringContaining('checking out Maraki VIP'),
      expect.objectContaining({
        parse_mode: 'Markdown',
        reply_markup: expect.anything(),
      })
    );
    expect(mockAnswerCallback).toHaveBeenCalledWith(expect.stringContaining('Follow-up sent'));
  });

  test('3. handleAdminFollowupAction delivers discount offer to target user via Maraki Bot', async () => {
    const adminCtx: any = {
      from: { id: ADMIN_TELEGRAM_ID },
      api: { sendMessage: mockSendMessage },
      answerCallbackQuery: mockAnswerCallback,
      reply: mockReply,
    };

    await handleAdminFollowupAction(adminCtx, `admin_discount_${mockUser.id}`);

    expect(mockSendMessage).toHaveBeenCalledWith(
      mockUser.id,
      expect.stringContaining('SPECIAL MARAKI VIP DISCOUNT OFFER!'),
      expect.objectContaining({
        parse_mode: 'Markdown',
      })
    );
    expect(mockAnswerCallback).toHaveBeenCalledWith(expect.stringContaining('Discount offer sent'));
  });

  test('4. trackPaymentAttempt clears Redis TTL key & cancels follow-up timer on payment success', async () => {
    // Set intent key
    if (redis.isOpen) {
      await redis.set(`followup:intent:${mockUser.id}`, 'pending');
    }

    const successResult = {
      success: true,
      user: { subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString() },
      result: { bankName: 'CBE', amount: 299, referenceNumber: 'FT260813XXXX' },
    };

    await trackPaymentAttempt(mockCtx, 'https://mbreciept.cbe.com.et/v2-FT260813XXXX', successResult);

    expect(mockSendMessage).toHaveBeenCalledWith(
      ADMIN_TELEGRAM_ID,
      expect.stringContaining('Payment Verified & VIP Activated!'),
      expect.objectContaining({ parse_mode: 'HTML' })
    );

    if (redis.isOpen) {
      const redisKey = await redis.get(`followup:intent:${mockUser.id}`);
      expect(redisKey).toBeFalsy(); // Successfully deleted!
    }
  });
});
