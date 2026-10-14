import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { handleLessonFollowup } from '../src/commands/lesson.comand.js';
import { setSession, deleteSession, getSession } from '../src/utils/redis.js';

describe('Lesson Follow-up Context Memory', () => {
  let mockCtx: any;
  const testUserId = 123456789;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;

    process.env.GEMINI_API_KEY = 'test-gemini-key-1234567890';

    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'The example "bite the bullet" means to face a difficult situation with courage.',
                    },
                  ],
                },
              },
            ],
          }),
      } as any)
    ) as any;

    mockCtx = {
      from: { id: testUserId, first_name: 'Test' },
      message: { text: 'Can you explain the example above?' },
      reply: jest.fn().mockResolvedValue(true as never),
      chat: { id: testUserId },
      api: {
        sendChatAction: jest.fn().mockResolvedValue(true as never),
      },
    };
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await deleteSession(testUserId);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  test('should reply with AI answer when lesson content is in session', async () => {
    // Arrange: session contains lesson content saved after lesson was generated
    await setSession(testUserId, {
      mode: 'lesson_followup',
      lastLessonContent: 'Lesson about idioms: "bite the bullet" means to endure a painful situation bravely.',
      lastLessonTopic: 'idioms',
      userId: testUserId,
    });

    // Act
    await handleLessonFollowup(mockCtx);

    // Assert: bot sent the AI answer to the user
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('bite the bullet'),
      expect.objectContaining({ parse_mode: 'HTML' })
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  test('should show error when session has NO lesson content (regression test for original bug)', async () => {
    // Arrange: session was overwritten (the original bug)   no lastLessonContent
    await setSession(testUserId, {
      mode: 'lesson_followup',
      userId: testUserId,
      timestamp: Date.now(),
    });

    // Act
    await handleLessonFollowup(mockCtx);

    // Assert: user sees a polite explanation asking them to generate a new lesson
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('የትምህርቱ መረጃ አልተገኘም'),
    );

    // Assert: session mode is reset to null
    const sessionAfter = await getSession(testUserId);
    expect(sessionAfter?.mode).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  test('lesson content should survive the mode switch to lesson_followup', async () => {
    const savedLessonContent = 'Idioms lesson: "hit the sack" means to go to sleep.';
    const savedTopic = 'idioms';

    await setSession(testUserId, {
      mode: null,
      lastLessonContent: savedLessonContent,
      lastLessonTopic: savedTopic,
      userId: testUserId,
      timestamp: Date.now(),
    });

    const savedSession = await getSession(testUserId);
    expect(savedSession?.lastLessonContent).toBe(savedLessonContent);

    // User clicks "Ask Question", adapter switches mode to 'lesson_followup'
    const mergedSession = { ...savedSession, mode: 'lesson_followup', timestamp: Date.now() };
    await setSession(testUserId, mergedSession);

    // User types question, handleLessonFollowup is called
    await handleLessonFollowup(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('bite the bullet'),
      expect.objectContaining({ parse_mode: 'HTML' })
    );
  });

  // ─────────────────────────────────────────────────────────────────────────────
  test('should handle null session gracefully', async () => {
    await deleteSession(testUserId);

    await handleLessonFollowup(mockCtx);

    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining('የትምህርቱ መረጃ አልተገኘም'),
    );
  });
});
