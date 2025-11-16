import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Payment, PaymentProvider, PaymentStatus, SubscriptionTier } from '../models/Payment.js';
export class ApiService {
    mongoUri;
    constructor() {
        this.mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/maraki';
    }
    // User Management
    async getUserByTelegramId(telegramId) {
        try {
            const user = await User.findOne({ telegramId });
            return user;
        }
        catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }
    async createOrUpdateUser(telegramId, userData) {
        try {
            const user = await User.findOneAndUpdate({ telegramId }, { ...userData, telegramId }, { upsert: true, new: true, runValidators: true });
            return user;
        }
        catch (error) {
            console.error('Error creating/updating user:', error);
            throw error;
        }
    }
    // Premium Management
    async checkPremiumAccess(telegramId, feature) {
        try {
            const user = await User.findOne({ telegramId });
            if (!user) {
                return { hasAccess: false, remaining: 0, reason: 'User not found' };
            }
            // Check if user has active premium subscription
            const now = new Date();
            const hasActivePremium = user.isMarakiPremium && (!user.subscriptionExpiresAt || user.subscriptionExpiresAt > now);
            if (!hasActivePremium) {
                // Free tier limits based on feature
                let dailyLimit = 0;
                let monthlyLimit = 0;
                switch (feature) {
                    case 'grammar':
                        dailyLimit = 5;
                        monthlyLimit = 50;
                        break;
                    case 'lesson':
                        dailyLimit = 3;
                        monthlyLimit = 30;
                        break;
                    case 'chat':
                        dailyLimit = 10;
                        monthlyLimit = 100;
                        break;
                    case 'translation':
                        dailyLimit = 5;
                        monthlyLimit = 50;
                        break;
                    default:
                        dailyLimit = 5;
                        monthlyLimit = 50;
                }
                // Reset counters if needed
                const lastReset = user.lastTokenReset;
                const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
                if (daysSinceReset >= 1) {
                    user.dailyTokensUsed = 0;
                    user.lastTokenReset = now;
                }
                const remainingDaily = Math.max(0, dailyLimit - user.dailyTokensUsed);
                const remainingMonthly = Math.max(0, monthlyLimit - user.monthlyTokensUsed);
                if (remainingDaily > 0 && remainingMonthly > 0) {
                    return { hasAccess: true, remaining: Math.min(remainingDaily, remainingMonthly), reason: 'Free tier' };
                }
                else {
                    return { hasAccess: false, remaining: 0, reason: remainingDaily <= 0 ? 'Daily limit exceeded' : 'Monthly limit exceeded' };
                }
            }
            // Premium users have unlimited access
            return { hasAccess: true, remaining: -1, reason: 'Premium user' };
        }
        catch (error) {
            console.error('Error checking premium access:', error);
            return { hasAccess: false, remaining: 0, reason: 'API Error' };
        }
    }
    async incrementUsage(telegramId, feature) {
        try {
            const user = await User.findOne({ telegramId });
            if (!user) {
                throw new Error('User not found');
            }
            // Increment usage counters
            user.dailyTokensUsed += 1;
            user.monthlyTokensUsed += 1;
            await user.save();
            return { success: true };
        }
        catch (error) {
            console.error('Error incrementing usage:', error);
            throw error;
        }
    }
    async upgradeToPremium(telegramId, paymentData) {
        try {
            const user = await User.findOne({ telegramId });
            if (!user) {
                throw new Error('User not found');
            }
            // Update user premium status
            user.isMarakiPremium = true;
            user.subscriptionTier = paymentData?.subscriptionTier || 'premium';
            if (paymentData?.subscriptionDuration) {
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + paymentData.subscriptionDuration);
                user.subscriptionExpiresAt = expiresAt;
            }
            await user.save();
            return user;
        }
        catch (error) {
            console.error('Error upgrading to premium:', error);
            throw error;
        }
    }
    // Dynamic Payment Methods
    async createPayment(paymentData) {
        try {
            const payment = new Payment({
                telegramId: paymentData.telegramId,
                provider: paymentData.provider,
                amount: paymentData.amount,
                subscriptionTier: paymentData.subscriptionTier,
                subscriptionDuration: paymentData.subscriptionDuration,
                providerData: paymentData.metadata || {},
                description: paymentData.description,
            });
            await payment.save();
            return payment;
        }
        catch (error) {
            console.error('Error creating payment:', error);
            throw error;
        }
    }
    async verifyPayment(provider, transactionId) {
        try {
            const payment = await Payment.findOne({
                'providerData.transactionId': transactionId,
                provider: provider
            });
            if (!payment) {
                throw new Error('Payment not found');
            }
            payment.status = PaymentStatus.COMPLETED;
            await payment.save();
            // Upgrade user to premium
            await this.upgradeToPremium(payment.telegramId, {
                subscriptionTier: payment.subscriptionTier,
                subscriptionDuration: payment.subscriptionDuration,
            });
            return { success: true, payment };
        }
        catch (error) {
            console.error('Error verifying payment:', error);
            throw error;
        }
    }
    async getPaymentHistory(telegramId, limit) {
        try {
            const payments = await Payment.find({ telegramId })
                .sort({ createdAt: -1 })
                .limit(limit || 10);
            return payments;
        }
        catch (error) {
            console.error('Error fetching payment history:', error);
            return [];
        }
    }
    async getActiveSubscriptions(telegramId) {
        try {
            const user = await User.findOne({ telegramId });
            if (!user || !user.isMarakiPremium) {
                return [];
            }
            return [{
                    tier: user.subscriptionTier,
                    expiresAt: user.subscriptionExpiresAt,
                    isActive: !user.subscriptionExpiresAt || user.subscriptionExpiresAt > new Date(),
                }];
        }
        catch (error) {
            console.error('Error fetching active subscriptions:', error);
            return [];
        }
    }
    async getAvailableProviders() {
        return Object.values(PaymentProvider);
    }
    async getProviderBalance(telegramId, provider) {
        // This would need integration with actual payment provider APIs
        // For now, return 0
        return { provider, balance: 0 };
    }
    async addProviderFunds(telegramId, provider, amount) {
        // This would need integration with actual payment provider APIs
        throw new Error('Provider funds management not implemented');
    }
    // Chapa payment methods
    async processChapaPayment(telegramId, chapaData) {
        return this.createPayment({
            telegramId,
            provider: PaymentProvider.CHAPA,
            amount: chapaData.amount,
            currency: chapaData.currency || 'ETB',
            subscriptionTier: SubscriptionTier.PREMIUM,
            subscriptionDuration: 30,
            metadata: chapaData
        });
    }
    // Conversation Management
    async getConversation(telegramId) {
        try {
            const user = await User.findOne({ telegramId });
            if (!user)
                return null;
            let conversation = await Conversation.findOne({ user: user._id });
            if (!conversation) {
                conversation = new Conversation({ user: user._id });
                await conversation.save();
            }
            return conversation;
        }
        catch (error) {
            console.error('Error fetching conversation:', error);
            return null;
        }
    }
    async addGrammarMistake(telegramId, mistake) {
        try {
            const conversation = await this.getConversation(telegramId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }
            conversation.grammarMistakes.push({
                mistake: mistake.mistake,
                correction: mistake.correction,
                grammarType: mistake.grammarType,
                createdAt: new Date(),
            });
            await conversation.save();
            return { success: true };
        }
        catch (error) {
            console.error('Error adding grammar mistake:', error);
            throw error;
        }
    }
    async addLesson(telegramId, lesson) {
        try {
            const conversation = await this.getConversation(telegramId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }
            conversation.lessons.push({
                topic: lesson.topic,
                details: lesson.details,
                content: lesson.content,
                createdAt: new Date(),
            });
            await conversation.save();
            return { success: true };
        }
        catch (error) {
            console.error('Error adding lesson:', error);
            throw error;
        }
    }
    async addChatMessage(telegramId, chatEntry) {
        try {
            const conversation = await this.getConversation(telegramId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }
            conversation.chatHistory.push({
                userMessage: chatEntry.userMessage,
                aiResponse: chatEntry.aiResponse,
                createdAt: new Date(),
            });
            await conversation.save();
            return { success: true };
        }
        catch (error) {
            console.error('Error adding chat message:', error);
            throw error;
        }
    }
    // Progress Management
    async getStudentProgress(telegramId) {
        try {
            const user = await User.findOne({ telegramId });
            if (!user)
                return null;
            const conversation = await Conversation.findOne({ user: user._id });
            return {
                level: user.level,
                totalGrammarMistakes: conversation?.grammarMistakes.length || 0,
                totalLessons: conversation?.lessons.length || 0,
                totalChatMessages: conversation?.chatHistory.length || 0,
                totalQuizzesCompleted: user.totalQuizzesCompleted,
                totalMaterialsAccessed: user.totalMaterialsAccessed,
                totalTimeSpent: user.totalTimeSpent,
                isPremium: user.isMarakiPremium,
                subscriptionTier: user.subscriptionTier,
            };
        }
        catch (error) {
            console.error('Error fetching progress:', error);
            return null;
        }
    }
    // Usage Status
    async getUsageStatus(telegramId) {
        try {
            const user = await User.findOne({ telegramId });
            if (!user)
                return null;
            const now = new Date();
            const lastReset = user.lastTokenReset;
            const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24));
            // Reset daily counter if needed
            if (daysSinceReset >= 1) {
                user.dailyTokensUsed = 0;
                user.lastTokenReset = now;
                await user.save();
            }
            return {
                dailyTokensUsed: user.dailyTokensUsed,
                monthlyTokensUsed: user.monthlyTokensUsed,
                isPremium: user.isMarakiPremium,
                subscriptionTier: user.subscriptionTier,
                subscriptionExpiresAt: user.subscriptionExpiresAt,
            };
        }
        catch (error) {
            console.error('Error fetching usage status:', error);
            return null;
        }
    }
    // Quiz Management
    async saveQuizResult(telegramId, quizData) {
        try {
            const user = await User.findOne({ telegramId });
            if (!user) {
                throw new Error('User not found');
            }
            // Update user quiz statistics
            user.totalQuizzesCompleted += 1;
            await user.save();
            // Save quiz attempt details
            const quizAttempt = {
                quizId: 'general_quiz_' + Date.now(),
                userId: telegramId.toString(),
                status: 'completed',
                completedAt: new Date(),
                totalQuestions: quizData.totalQuestions,
                correctAnswers: quizData.correctAnswers,
                scorePercentage: quizData.score,
                totalPoints: quizData.correctAnswers,
                earnedPoints: quizData.correctAnswers,
                isPassed: quizData.score >= 60,
                questionAttempts: quizData.questions.map((q, index) => ({
                    questionId: `q_${index}`,
                    selectedOptionId: q.userAnswer?.toString(),
                    isCorrect: q.isCorrect,
                    pointsEarned: q.isCorrect ? 1 : 0,
                    maxPoints: 1,
                    answeredAt: new Date(),
                }))
            };
            // For now, we'll store this in the user's conversation or create a simple quiz collection
            // Since we don't have a dedicated QuizAttempt model, we'll add it to conversation
            const conversation = await this.getConversation(telegramId);
            if (conversation) {
                if (!conversation.quizAttempts) {
                    conversation.quizAttempts = [];
                }
                conversation.quizAttempts.push(quizAttempt);
                await conversation.save();
            }
            return { success: true };
        }
        catch (error) {
            console.error('Error saving quiz result:', error);
            throw error;
        }
    }
}
export const apiService = new ApiService();
