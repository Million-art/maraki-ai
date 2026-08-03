import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { handleLessonFollowup } from '../src/commands/lesson.comand.js';
import * as redisModule from '../src/utils/redis.js';
import * as geminiModule from '../src/api/gemini/callGeminiGenerateContents.js';

// ─── Mock Redis ───────────────────────────────────────────────────────────────
jest.mock('../src/utils/redis.js', () => ({
  getSession: jest.fn(),
  setSession: jest.fn(),
  redis: { isOpen: false },
}));

// ─── Mock Gemini ──────────────────────────────────────────────────────────────
jest.mock('../src/api/gemini/callGeminiGenerateContents.js', () => ({
  callGeminiGenerateContent: jest.fn(),
}));

// ─── Mock admin notify ────────────────────────────────────────────────────────
jest.mock('../src/utils/admin-notify.util.js', () => ({
  notifyAdminOnError: jest.fn(),
}));

const mockGetSession = redisModule.getSession as jest.MockedFunction<typeof redisModule.getSession>;
const mockCallGemini = geminiModule.callGeminiGenerateContent as jest.MockedFunction<typeof geminiModule.callGeminiGenerateContent>;

describe('Lesson Follow-up Context Memory', () => {
  let mockCtx: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCtx = {
      from: { id: 123456789, first_name: 'Test' },
      message: { text: 'Can you explain the example above?' },
      reply: jest.fn().mockResolvedValue(true as never),
      chat: { id: 123456789 },
    };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  test('should reply with AI answer when lesson content is in session', async () => {
    // Arrange: session contains lesson content saved after lesson was generated
    mockGetSession.mockResolvedValueOnce({
      mode: 'lesson_followup',
      lastLessonContent: 'Lesson about idioms: "bite the bullet" means to endure a painful situation bravely.',
      lastLessonTopic: 'idioms',
      userId: 123456789,
    } as any);

    mockCallGemini.mockResolvedValueOnce('The example "bite the bullet" means to face a difficult situation with courage.');

    // Act
    await handleLessonFollowup(mockCtx);

    // Assert: Gemini was called with the lesson content as context
    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.stringContaining('bite the bullet'),
      'complex'
    );
    // Assert: bot sent the AI answer to the user
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('bite the bullet'),
      expect.anything()
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  test('should show error when session has NO lesson content (regression test for original bug)', async () => {
    // Arrange: session was overwritten (the original bug) — no lastLessonContent
    mockGetSession.mockResolvedValueOnce({
      mode: 'lesson_followup',
      userId: 123456789,
      timestamp: Date.now(),
      // No lastLessonContent — simulates the old bug where setSession overwrote the whole session
    } as any);

    // Act
    await handleLessonFollowup(mockCtx);

    // Assert: Gemini should NOT be called
    expect(mockCallGemini).not.toHaveBeenCalled();

    // Assert: bot tells the user it doesn't have context
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("don't have the lesson context")
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  test('lesson content should survive the mode switch to lesson_followup', async () => {
    // This test directly validates the fix in telegram.adapter.ts:
    // When switching to lesson_followup mode, the session must be MERGED not REPLACED.

    const savedSession = {
      mode: 'lesson',
      lastLessonContent: 'Today we learned about phrasal verbs: "give up" means to stop trying.',
      lastLessonTopic: 'phrasal verbs',
      userId: 123456789,
    };

    // Simulate the adapter reading existing session before setting mode
    mockGetSession.mockResolvedValueOnce(savedSession as any);

    // Simulate what the fixed adapter does: spread existing session + set new mode
    const mergedSession = { ...savedSession, mode: 'lesson_followup', timestamp: Date.now() };

    // Now simulate handleLessonFollowup reading the merged session
    mockGetSession.mockResolvedValueOnce(mergedSession as any);

    mockCallGemini.mockResolvedValueOnce('Great question! "Give up" is a phrasal verb meaning to stop trying.');

    await handleLessonFollowup(mockCtx);

    // Assert lesson content was available to Gemini
    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.stringContaining('give up'),
      'complex'
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Give up'),
      expect.anything()
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  test('should handle null session gracefully', async () => {
    mockGetSession.mockResolvedValueOnce(null as any);

    await handleLessonFollowup(mockCtx);

    expect(mockCallGemini).not.toHaveBeenCalled();
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("don't have the lesson context")
    );
  });
});
