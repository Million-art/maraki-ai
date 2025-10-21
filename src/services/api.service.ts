import axios from 'axios';

export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
  }

  // User Management
  async getUserByTelegramId(telegramId: number) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/users/telegram/${telegramId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async createOrUpdateUser(telegramId: number, userData: any) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/users/telegram/${telegramId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  // Premium Management
  async checkPremiumAccess(telegramId: number, feature: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/students/${telegramId}/premium-check?feature=${feature}`);
      return response.data;
    } catch (error) {
      console.error('Error checking premium access:', error);
      return { hasAccess: false, remaining: 0, reason: 'API Error' };
    }
  }

  async incrementUsage(telegramId: number, feature: string) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/students/${telegramId}/usage/increment`, {
        feature
      });
      return response.data;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  }

  async upgradeToPremium(telegramId: number, paymentData?: any) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/users/${telegramId}/upgrade`, paymentData);
      return response.data;
    } catch (error) {
      console.error('Error upgrading to premium:', error);
      throw error;
    }
  }

  // Dynamic Payment Methods
  async createPayment(paymentData: any) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/payments/create`, paymentData);
      return response.data;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  async verifyPayment(provider: string, transactionId: string) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/payments/verify/${provider}`, {
        transactionId
      });
      return response.data;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  // Refund functionality removed as per requirements

  async getPaymentHistory(telegramId: number, limit?: number) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/payments/history/${telegramId}?limit=${limit || 10}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return null;
    }
  }

  async getActiveSubscriptions(telegramId: number) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/payments/subscriptions/${telegramId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching active subscriptions:', error);
      return null;
    }
  }

  async getAvailableProviders() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/payments/providers`);
      return response.data;
    } catch (error) {
      console.error('Error fetching available providers:', error);
      return [];
    }
  }

  async getProviderBalance(telegramId: number, provider: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/payments/balance/${telegramId}/${provider}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching provider balance:', error);
      return { provider, balance: 0 };
    }
  }

  async addProviderFunds(telegramId: number, provider: string, amount: number) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/payments/funds/${telegramId}/${provider}`, {
        amount
      });
      return response.data;
    } catch (error) {
      console.error('Error adding provider funds:', error);
      throw error;
    }
  }

  // Chapa payment methods
  async processChapaPayment(telegramId: number, chapaData: any) {
    return this.createPayment({
      telegramId,
      provider: 'chapa',
      amount: chapaData.amount,
      currency: chapaData.currency || 'ETB',
      subscriptionTier: 'premium',
      subscriptionDuration: 30,
      metadata: chapaData
    });
  }

  // Conversation Management
  async getConversation(telegramId: number) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/students/${telegramId}/conversation`);
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return null;
    }
  }

  async addGrammarMistake(telegramId: number, mistake: any) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/students/${telegramId}/grammar-mistake`, mistake);
      return response.data;
    } catch (error) {
      console.error('Error adding grammar mistake:', error);
      throw error;
    }
  }

  async addLesson(telegramId: number, lesson: any) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/students/${telegramId}/lesson`, lesson);
      return response.data;
    } catch (error) {
      console.error('Error adding lesson:', error);
      throw error;
    }
  }

  async addChatMessage(telegramId: number, chatEntry: any) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/students/${telegramId}/chat-message`, chatEntry);
      return response.data;
    } catch (error) {
      console.error('Error adding chat message:', error);
      throw error;
    }
  }

  // Progress Management
  async getStudentProgress(telegramId: number) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/students/${telegramId}/progress`);
      return response.data;
    } catch (error) {
      console.error('Error fetching progress:', error);
      return null;
    }
  }


  // Usage Status
  async getUsageStatus(telegramId: number) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/users/${telegramId}/usage-status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching usage status:', error);
      return null;
    }
  }
}

export const apiService = new ApiService();
