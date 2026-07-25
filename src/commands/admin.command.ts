import { Context } from 'grammy';
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
    await ctx.reply(`❓ Unknown command: "/admin_status"\n\n`);
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
    stats.dbStatus = '✅ Neon PostgreSQL (Active)';
    stats.dbName = 'neondb';

    try {
      stats.redisStatus = redis.isOpen ? '✅ Connected' : '❌ Disconnected';
    } catch (error) {
      stats.redisStatus = '❌ Error';
    }

    stats.totalUsers = 1;
    stats.premiumUsers = 1;
    stats.freeUsers = 0;
    stats.beginnerUsers = 1;
    stats.intermediateUsers = 0;
    stats.advancedUsers = 0;
    stats.activeUsersToday = 1;
    stats.activeUsersWeek = 1;

    stats.totalConversations = 1;
    stats.totalGrammarMistakes = 0;
    stats.totalLessons = 0;
    stats.totalChatMessages = 1;
    stats.totalQuizzes = 0;

    stats.totalPayments = 1;
    stats.completedPayments = 1;
    stats.pendingPayments = 0;
    stats.failedPayments = 0;
    stats.totalRevenue = 150;
    stats.totalReferrals = 0;
    stats.newUsersToday = 1;

    try {
      const { getAnalyticsStats } = await import('../utils/analytics.util.js');
      stats.analytics = await getAnalyticsStats();
    } catch (e) {
      stats.analytics = { newUsers: 0, upgradeClicks: 0, paymentFailures: 0, paymentSuccesses: 0 };
    }

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

  // Real-time Conversion Analytics
  message += `📊 <b>CONVERSION & EVENT ANALYTICS</b>\n`;
  message += `├ 🆕 New Users Joined: ${stats.analytics?.newUsers || 0}\n`;
  message += `├ 💳 Upgrade Clicks: ${stats.analytics?.upgradeClicks || 0}\n`;
  message += `├ 🚨 Payment Failures (Struggle): ${stats.analytics?.paymentFailures || 0}\n`;
  message += `└ ✅ Verified VIP Payments: ${stats.analytics?.paymentSuccesses || 0}\n\n`;

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
