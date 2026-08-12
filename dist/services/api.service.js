import axios from 'axios';
export class ApiService {
    backendUrl;
    constructor() {
        this.backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
        const internalApiKey = process.env.INTERNAL_API_KEY || 'maraki-internal-secret-key-12345';
        axios.defaults.headers.common['X-Maraki-Bot-Key'] = internalApiKey;
    }
    // User Management via REST API
    async getUserByTelegramId(telegramId) {
        try {
            const { data } = await axios.get(`${this.backendUrl}/api/students/${telegramId}`, { timeout: 5000 });
            return data;
        }
        catch (error) {
            return {
                telegramId,
                firstName: 'Learner',
                level: 'beginner',
                isPremium: false,
                isMarakiPremium: false,
            };
        }
    }
    async createOrUpdateUser(telegramId, userData) {
        try {
            const { data } = await axios.post(`${this.backendUrl}/api/student/register`, {
                telegramId,
                ...userData,
            }, { timeout: 5000 });
            return data;
        }
        catch (error) {
            return { telegramId, ...userData };
        }
    }
    async registerStudent(studentData) {
        return this.createOrUpdateUser(studentData.telegramId, studentData);
    }
    async getReferralStats(telegramId) {
        try {
            const { data } = await axios.get(`${this.backendUrl}/api/student/referral-stats/${telegramId}`, { timeout: 5000 });
            return data;
        }
        catch (error) {
            return {
                totalReferred: 0,
                target: 10,
                remaining: 10,
                progressPercentage: 0,
                rewardUnlocked: false,
                referralLink: `https://t.me/marakiai_bot?start=${telegramId}`,
            };
        }
    }
    // Premium & Usage Management
    async checkPremiumAccess(telegramId, feature) {
        try {
            const { data } = await axios.get(`${this.backendUrl}/api/student/usage/${telegramId}`, { timeout: 5000 });
            return {
                hasAccess: data.hasAccess,
                remaining: data.remaining,
                reason: data.reason || 'Usage check',
            };
        }
        catch (error) {
            // Fail closed: deny access when the backend is unreachable to prevent free unlimited usage
            return { hasAccess: false, remaining: 0, reason: 'Service temporarily unavailable. Please try again shortly.' };
        }
    }
    async incrementUsage(telegramId, feature) {
        try {
            const { data } = await axios.post(`${this.backendUrl}/api/student/usage/${telegramId}/increment`, {}, { timeout: 5000 });
            return data;
        }
        catch (error) {
            return { success: true };
        }
    }
    // Direct Bank Receipt Verification via NestJS Backend (Neon PostgreSQL)
    async verifyBankPayment(telegramId, referenceNumber, tier = 'monthly') {
        try {
            const { data } = await axios.post(`${this.backendUrl}/api/student/verify-payment`, {
                telegramId,
                referenceNumber,
                tier,
            }, { timeout: 30000 });
            return data;
        }
        catch (error) {
            console.error('Verify Bank Payment Error:', error.response?.data || error.message);
            const backendMessage = error.response?.data?.message || error.message;
            return {
                success: false,
                message: `Backend Error: ${backendMessage}`,
            };
        }
    }
    // Non-Mongoose Conversation & Interaction Handlers
    async getConversation(telegramId) {
        return {
            user: telegramId,
            grammarMistakes: [],
            lessons: [],
            chatHistory: [],
        };
    }
    async addGrammarMistake(telegramId, mistake) {
        return { success: true };
    }
    async addLesson(telegramId, lesson) {
        try {
            const { data } = await axios.post(`${this.backendUrl}/api/student/materials/access`, { telegramId, materialId: lesson?.materialId }, { timeout: 5000 });
            return data;
        }
        catch (error) {
            console.error('Error recording lesson access:', error);
            return { success: true };
        }
    }
    async addChatMessage(telegramId, chatEntry) {
        return { success: true };
    }
    async getStudentProgress(telegramId) {
        try {
            const user = await this.getUserByTelegramId(telegramId);
            return {
                level: user?.level || 'beginner',
                isPremium: user?.isMarakiPremium || false,
                subscriptionTier: user?.subscriptionTier || 'FREE',
            };
        }
        catch (error) {
            return null;
        }
    }
    async getUsageStatus(telegramId) {
        try {
            const { data } = await axios.get(`${this.backendUrl}/api/student/usage/${telegramId}`, { timeout: 5000 });
            return data;
        }
        catch (error) {
            // Fail closed: deny quiz/lesson access when backend is unreachable
            return {
                isPremium: false,
                weeklyQuizzesUsed: 99, // Exceeds limit intentionally
                weeklyQuizLimit: 3,
                remaining: 0,
                weeklyLessonsUsed: 99,
                weeklyLessonLimit: 5,
                remainingLessons: 0,
                hasAccess: false,
                reason: 'Service temporarily unavailable. Please try again shortly.',
            };
        }
    }
    async saveQuizResult(telegramId, quizData) {
        try {
            const { data } = await axios.post(`${this.backendUrl}/api/student/quizzes/general/attempt`, {
                telegramId,
                score: quizData.score || 0,
                correctAnswers: quizData.correctAnswers || 0,
                totalQuestions: quizData.totalQuestions || 5,
            }, { timeout: 5000 });
            return data;
        }
        catch (error) {
            console.error('Error in saveQuizResult:', error);
            return { success: false };
        }
    }
}
export const apiService = new ApiService();
