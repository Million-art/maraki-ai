import { jest } from '@jest/globals';
import axios from 'axios';
import { apiService } from './api.service.js';
import * as redisUtils from '../utils/redis.js';

// Mock dependencies
jest.mock('axios');
jest.mock('../utils/redis.js', () => ({
  getSession: jest.fn(),
  setSession: jest.fn(),
}));

describe('ApiService - getStructuredQuiz (Bulk Fetch & Cache Edge Cases)', () => {
  const telegramId = 123456;
  let mockedAxiosGet: jest.MockedFunction<typeof axios.get>;
  let mockedGetSession: jest.Mock;
  let mockedSetSession: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;
    mockedGetSession = (redisUtils.getSession as unknown) as jest.Mock;
    mockedSetSession = (redisUtils.setSession as unknown) as jest.Mock;

    // Default mock for getUserByTelegramId so we don't hit the real backend in tests
    jest.spyOn(apiService, 'getUserByTelegramId').mockResolvedValue({
      telegramId,
      quizAttempts: []
    } as any);
  });

  it('1. The Cache Hit: Serves instantly from Redis without calling DB', async () => {
    const cachedQuiz = [{ question: 'Cached Q1' }];
    
    mockedGetSession.mockResolvedValue({
      prefetchedQuizzes: [cachedQuiz] // User has 1 quiz in cache
    });

    const result = await apiService.getStructuredQuiz(telegramId, 'beginner');

    expect(result).toEqual(cachedQuiz);
    expect(mockedAxiosGet).not.toHaveBeenCalled(); // 0 DB calls!
    expect(mockedSetSession).toHaveBeenCalledWith(telegramId, { prefetchedQuizzes: [] }); // Updated cache
  });

  it('2. The Anti-Repeat Guarantee: Drops completed quizzes', async () => {
    // User already completed Quiz A
    jest.spyOn(apiService, 'getUserByTelegramId').mockResolvedValue({
      telegramId,
      quizAttempts: [{ quizId: 'quiz-A' }]
    } as any);

    mockedGetSession.mockResolvedValue({}); // Empty cache

    // Backend returns both Quiz A and Quiz B
    mockedAxiosGet.mockImplementation(async (url) => {
      if (url.includes('quizzes?level=')) {
        return { data: [{ id: 'quiz-A' }, { id: 'quiz-B' }] };
      }
      if (url.includes('quizzes/quiz-B')) {
        return { data: { id: 'quiz-B', questions: [{ questionText: 'Q1', options: [] }] } };
      }
      return { data: null };
    });

    const result = await apiService.getStructuredQuiz(telegramId, 'beginner');

    expect(result).toBeTruthy();
    expect(result![0].quizId).toBe('quiz-B'); // Only Quiz B should be fetched!
    expect(mockedAxiosGet).not.toHaveBeenCalledWith(expect.stringContaining('quiz-A'), expect.any(Object));
  });

  it('3. Exhausted Database: Returns null to trigger Gemini fallback', async () => {
    // User already completed Quiz A
    jest.spyOn(apiService, 'getUserByTelegramId').mockResolvedValue({
      telegramId,
      quizAttempts: [{ quizId: 'quiz-A' }]
    } as any);

    mockedGetSession.mockResolvedValue({});

    // Backend ONLY has Quiz A active
    mockedAxiosGet.mockImplementation(async (url) => {
      if (url.includes('quizzes?level=')) {
        return { data: [{ id: 'quiz-A' }] };
      }
      return { data: null };
    });

    const result = await apiService.getStructuredQuiz(telegramId, 'beginner');

    expect(result).toBeNull(); // Exhausted! Gemini should take over.
    // Ensure we didn't try to fetch details for anything
    expect(mockedAxiosGet).toHaveBeenCalledTimes(1); 
  });

  it('4. Network Blackout / ETIMEDOUT: Returns null safely without crashing', async () => {
    mockedGetSession.mockResolvedValue({});
    
    // Simulate connection reset / timeout
    mockedAxiosGet.mockRejectedValue(new Error('connect ETIMEDOUT 149.154.166.110:443'));

    const result = await apiService.getStructuredQuiz(telegramId, 'beginner');

    expect(result).toBeNull(); // Caught safely
  });

  it('5. Partial Bulk Failure: Succeeds if some fetches fail', async () => {
    mockedGetSession.mockResolvedValue({});

    mockedAxiosGet.mockImplementation(async (url) => {
      if (url.includes('quizzes?level=')) {
        return { data: [{ id: 'quiz-1' }, { id: 'quiz-2' }] };
      }
      if (url.includes('quizzes/quiz-1')) {
        return { data: { id: 'quiz-1', questions: [{ questionText: 'Q1', options: [] }] } };
      }
      if (url.includes('quizzes/quiz-2')) {
        throw new Error('Database chunk corruption'); // Simulate partial failure
      }
      return { data: null };
    });

    const result = await apiService.getStructuredQuiz(telegramId, 'beginner');

    expect(result).toBeTruthy();
    expect(result![0].quizId).toBe('quiz-1'); // Served the good one
    // Nothing left for cache because 2 failed, so cache is empty (setSession not called with 1 since we served it)
  });
});
