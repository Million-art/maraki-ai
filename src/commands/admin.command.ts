import { Context } from 'grammy';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Payment } from '../models/Payment.js';
import mongoose from 'mongoose';
import { redis } from '../utils/redis.js';

// Middleware to check if user is admin
const isAdmin = (userId: number): boolean => {
  const adminId = parseInt(process.env.ADMIN_ID || '386095768');
  return userId === adminId;
};

export const adminStatusCommand = async (ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not identify user.");
  }

  // Check if user is admin
  if (!isAdmin(ctx.from.id)) {
    // Don't reveal that this command exists
    await ctx.reply(
      `❓ Unknown command: "/admin_status"\n\n` 
    );
    return;
  }

  try {
    await ctx.reply("📊 Fetching admin status... Please wait...");

    // Gather statistics
    const stats = await gatherBotStatistics();

    // Format the admin status message
    const message = formatAdminStatus(stats);

    await ctx.reply(message, { parse_mode: 'HTML' });

  } catch (error) {
    console.error('Admin status error:', error);
    await ctx.reply("❌ An error occurred while fetching admin status.");
  }
};

async function gatherBotStatistics() {
  const stats: any = {};

  try {
    // Database connection status
    stats.dbStatus = mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected';
    stats.dbName = mongoose.connection.name || 'N/A';

    // Redis connection status
    try {
      stats.redisStatus = redis.isOpen ? '✅ Connected' : '❌ Disconnected';
    } catch (error) {
      stats.redisStatus = '❌ Error';
    }

    // User statistics
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ isMarakiPremium: true });
    const freeUsers = totalUsers - premiumUsers;
    
    // Users by level
    const beginnerUsers = await User.countDocuments({ level: 'beginner' });
    const intermediateUsers = await User.countDocuments({ level: 'intermediate' });
    const advancedUsers = await User.countDocuments({ level: 'advanced' });

    // Active users (users who interacted in last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsersToday = await User.countDocuments({ updatedAt: { $gte: oneDayAgo } });

    // Active users (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsersWeek = await User.countDocuments({ updatedAt: { $gte: sevenDaysAgo } });

    stats.totalUsers = totalUsers;
    stats.premiumUsers = premiumUsers;
    stats.freeUsers = freeUsers;
    stats.beginnerUsers = beginnerUsers;
    stats.intermediateUsers = intermediateUsers;
    stats.advancedUsers = advancedUsers;
    stats.activeUsersToday = activeUsersToday;
    stats.activeUsersWeek = activeUsersWeek;

    // Conversation statistics
    const totalConversations = await Conversation.countDocuments();
    
    // Aggregate grammar mistakes
    const grammarStats = await Conversation.aggregate([
      { $project: { grammarMistakesCount: { $size: { $ifNull: ['$grammarMistakes', []] } } } },
      { $group: { _id: null, total: { $sum: '$grammarMistakesCount' } } }
    ]);
    const totalGrammarMistakes = grammarStats[0]?.total || 0;

    // Aggregate lessons
    const lessonStats = await Conversation.aggregate([
      { $project: { lessonsCount: { $size: { $ifNull: ['$lessons', []] } } } },
      { $group: { _id: null, total: { $sum: '$lessonsCount' } } }
    ]);
    const totalLessons = lessonStats[0]?.total || 0;

    // Aggregate chat messages
    const chatStats = await Conversation.aggregate([
      { $project: { chatCount: { $size: { $ifNull: ['$chatHistory', []] } } } },
      { $group: { _id: null, total: { $sum: '$chatCount' } } }
    ]);
    const totalChatMessages = chatStats[0]?.total || 0;

    stats.totalConversations = totalConversations;
    stats.totalGrammarMistakes = totalGrammarMistakes;
    stats.totalLessons = totalLessons;
    stats.totalChatMessages = totalChatMessages;

    // Quiz statistics
    const quizStats = await User.aggregate([
      { $group: { _id: null, totalQuizzes: { $sum: '$totalQuizzesCompleted' } } }
    ]);
    stats.totalQuizzes = quizStats[0]?.totalQuizzes || 0;

    // Payment statistics
    const totalPayments = await Payment.countDocuments();
    const completedPayments = await Payment.countDocuments({ status: 'completed' });
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    const failedPayments = await Payment.countDocuments({ status: 'failed' });

    // Total revenue (completed payments only)
    const revenueStats = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueStats[0]?.totalRevenue || 0;

    stats.totalPayments = totalPayments;
    stats.completedPayments = completedPayments;
    stats.pendingPayments = pendingPayments;
    stats.failedPayments = failedPayments;
    stats.totalRevenue = totalRevenue;

    // Referral statistics
    const referralStats = await User.aggregate([
      { $group: { _id: null, totalReferrals: { $sum: '$referral.count' } } }
    ]);
    stats.totalReferrals = referralStats[0]?.totalReferrals || 0;

    // New users today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: todayStart } });
    stats.newUsersToday = newUsersToday;

    // System info
    stats.nodeVersion = process.version;
    stats.uptime = formatUptime(process.uptime());
    stats.memoryUsage = formatMemoryUsage(process.memoryUsage());

  } catch (error) {
    console.error('Error gathering statistics:', error);
    stats.error = 'Some statistics could not be retrieved';
  }

  return stats;
}

function formatAdminStatus(stats: any): string {
  let message = `🔐 <b>ADMIN STATUS DASHBOARD</b>\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // System Status
  message += `⚙️ <b>SYSTEM STATUS</b>\n`;
  message += `├ Database: ${stats.dbStatus}\n`;
  message += `├ DB Name: ${stats.dbName}\n`;
  message += `├ Redis: ${stats.redisStatus}\n`;
  message += `├ Node: ${stats.nodeVersion}\n`;
  message += `├ Uptime: ${stats.uptime}\n`;
  message += `└ Memory: ${stats.memoryUsage}\n\n`;

  // User Statistics
  message += `👥 <b>USER STATISTICS</b>\n`;
  message += `├ Total Users: ${stats.totalUsers.toLocaleString()}\n`;
  message += `├ Premium: ${stats.premiumUsers.toLocaleString()} (${((stats.premiumUsers / stats.totalUsers) * 100).toFixed(1)}%)\n`;
  message += `├ Free: ${stats.freeUsers.toLocaleString()} (${((stats.freeUsers / stats.totalUsers) * 100).toFixed(1)}%)\n`;
  message += `├ New Today: ${stats.newUsersToday.toLocaleString()}\n`;
  message += `├ Active (24h): ${stats.activeUsersToday.toLocaleString()}\n`;
  message += `└ Active (7d): ${stats.activeUsersWeek.toLocaleString()}\n\n`;

  // User Levels
  message += `📊 <b>USER LEVELS</b>\n`;
  message += `├ Beginner: ${stats.beginnerUsers.toLocaleString()}\n`;
  message += `├ Intermediate: ${stats.intermediateUsers.toLocaleString()}\n`;
  message += `└ Advanced: ${stats.advancedUsers.toLocaleString()}\n\n`;

  // Learning Activity
  message += `📚 <b>LEARNING ACTIVITY</b>\n`;
  message += `├ Conversations: ${stats.totalConversations.toLocaleString()}\n`;
  message += `├ Grammar Corrections: ${stats.totalGrammarMistakes.toLocaleString()}\n`;
  message += `├ Lessons Completed: ${stats.totalLessons.toLocaleString()}\n`;
  message += `├ Chat Messages: ${stats.totalChatMessages.toLocaleString()}\n`;
  message += `└ Quizzes Completed: ${stats.totalQuizzes.toLocaleString()}\n\n`;

  // Payment Statistics
  message += `💰 <b>PAYMENT STATISTICS</b>\n`;
  message += `├ Total Payments: ${stats.totalPayments.toLocaleString()}\n`;
  message += `├ Completed: ${stats.completedPayments.toLocaleString()}\n`;
  message += `├ Pending: ${stats.pendingPayments.toLocaleString()}\n`;
  message += `├ Failed: ${stats.failedPayments.toLocaleString()}\n`;
  message += `└ Revenue: ${stats.totalRevenue.toLocaleString()} ETB\n\n`;

  // Referral Statistics
  message += `🔗 <b>REFERRAL STATISTICS</b>\n`;
  message += `└ Total Referrals: ${stats.totalReferrals.toLocaleString()}\n\n`;

  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `⏰ Generated: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })} EAT`;

  return message;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function formatMemoryUsage(memUsage: NodeJS.MemoryUsage): string {
  const used = Math.round(memUsage.heapUsed / 1024 / 1024);
  const total = Math.round(memUsage.heapTotal / 1024 / 1024);
  return `${used}MB / ${total}MB`;
}
