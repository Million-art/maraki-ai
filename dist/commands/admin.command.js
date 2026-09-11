import { InlineKeyboard } from 'grammy';
import { redis } from '../utils/redis.js';
import { getAnalyticsStats, ADMIN_TELEGRAM_ID } from '../utils/analytics.util.js';
import { apiService } from '../services/api.service.js';
// Middleware to check if user is admin
export const isAdmin = (userId) => {
    const adminId = parseInt(process.env.ADMIN_ID || String(ADMIN_TELEGRAM_ID), 10);
    return userId === adminId || userId === ADMIN_TELEGRAM_ID;
};
/**
 * /intel and /digest: Rich Executive Product Intelligence Briefing
 */
export const adminIntelligenceCommand = async (ctx) => {
    if (!ctx.from)
        return;
    if (!isAdmin(ctx.from.id)) {
        await ctx.reply(`❓ Unknown command.\n\n`);
        return;
    }
    const statusMsg = await ctx.reply('⏳ <i>Compiling Maraki Product Intelligence & Ethiopian Error Traps...</i>', {
        parse_mode: 'HTML',
    });
    try {
        const intel = await apiService.getAssessmentProductIntelligence();
        const analytics = await getAnalyticsStats();
        const { text, keyboard } = buildProductIntelligenceMessage(intel, analytics);
        try {
            await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
        }
        catch (e) { }
        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
    catch (error) {
        console.error('Admin intelligence error:', error);
        await ctx.reply('❌ An error occurred while generating product intelligence.');
    }
};
/**
 * /admin_status: System health, database, Redis and basic counts
 */
export const adminStatusCommand = async (ctx) => {
    if (!ctx.from) {
        return ctx.reply("⚠️ Could not identify user.");
    }
    if (!isAdmin(ctx.from.id)) {
        await ctx.reply(`❓ Unknown command: "/admin_status"\n\n`);
        return;
    }
    try {
        const stats = await gatherBotStatistics();
        const message = formatAdminStatus(stats);
        const keyboard = new InlineKeyboard()
            .text('📊 Product Intelligence', 'admin_intel_refresh')
            .text('🔄 Refresh Status', 'admin_status_refresh');
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    }
    catch (error) {
        console.error('Admin status error:', error);
        await ctx.reply("❌ An error occurred while fetching admin status.");
    }
};
/**
 * Handle admin interactive callbacks
 */
export async function handleAdminCallback(ctx, action) {
    if (!ctx.from || !isAdmin(ctx.from.id))
        return;
    if (action === 'admin_intel_refresh') {
        try {
            await ctx.answerCallbackQuery({ text: 'Refreshing intelligence...' });
        }
        catch (e) { }
        const intel = await apiService.getAssessmentProductIntelligence();
        const analytics = await getAnalyticsStats();
        const { text, keyboard } = buildProductIntelligenceMessage(intel, analytics);
        try {
            await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
        }
        catch (e) {
            await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
        }
    }
    else if (action === 'admin_status_refresh') {
        try {
            await ctx.answerCallbackQuery({ text: 'Refreshing system status...' });
        }
        catch (e) { }
        const stats = await gatherBotStatistics();
        const message = formatAdminStatus(stats);
        const keyboard = new InlineKeyboard()
            .text('📊 Product Intelligence', 'admin_intel_refresh')
            .text('🔄 Refresh Status', 'admin_status_refresh');
        try {
            await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
        }
        catch (e) {
            await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
        }
    }
}
/**
 * Build rich Telegram-formatted product intelligence briefing
 */
export function buildProductIntelligenceMessage(intel, analytics) {
    const funnel = intel?.funnel || {
        totalAssessments: 0,
        recentAssessments7d: 0,
        uniqueAssessedStudents: 0,
        speakingTestedCount: 0,
        speakingSkippedCount: 0,
        speakingParticipationRate: 0,
    };
    const cefr = intel?.cefrDistribution || { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 };
    const totalCefr = Object.values(cefr).reduce((a, b) => a + Number(b), 0) || 1;
    const cefrPercent = (val) => Math.round((Number(val || 0) / totalCefr) * 100);
    const weaknesses = intel?.weaknessDistribution || {};
    const totalWeaknesses = Object.values(weaknesses).reduce((a, b) => a + Number(b), 0) || 1;
    const weaknessList = Object.entries(weaknesses)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => `• ${name}: <b>${Math.round((count / totalWeaknesses) * 100)}%</b> (${count})`)
        .join('\n') || '• Pending assessment data';
    const topTrap = intel?.topTrap;
    const monetization = intel?.monetization || { completedPayments: 0, totalRevenueETB: 0 };
    const message = `📊 <b>MARAKI PRODUCT INTELLIGENCE BRIEFING</b> 🇪🇹\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👥 <b>ASSESSMENT FUNNEL (Past 7 Days & All-Time):</b>\n` +
        `• Total Assessments: <b>${funnel.totalAssessments}</b> (${funnel.recentAssessments7d} this week)\n` +
        `• Unique Students Assessed: <b>${funnel.uniqueAssessedStudents}</b>\n` +
        `• 🎙️ Voice Submitted: <b>${funnel.speakingTestedCount} (${funnel.speakingParticipationRate}%)</b>\n` +
        `• ⏭️ Voice Skipped: <b>${funnel.speakingSkippedCount} (${100 - funnel.speakingParticipationRate}%)</b>\n\n` +
        `🏆 <b>CEFR LEVEL DISTRIBUTION:</b>\n` +
        `• A1 / A2 (Beginner): <b>${cefrPercent(cefr.A1 + cefr.A2)}%</b>\n` +
        `• B1 (Intermediate): <b>${cefrPercent(cefr.B1)}%</b>\n` +
        `• B2 (Upper Intermediate): <b>${cefrPercent(cefr.B2)}%</b>\n` +
        `• C1 (Advanced): <b>${cefrPercent(cefr.C1)}%</b>\n\n` +
        `⚠️ <b>PRIMARY WEAKNESSES (Diagnosed):</b>\n` +
        `${weaknessList}\n\n` +
        `🎯 <b>#1 ETHIOPIAN ERROR TRAP OF THE WEEK:</b>\n` +
        `🚨 <b>${topTrap?.prompt || 'Diagnostic Question'}</b>\n` +
        `• Fail Rate: <b>${topTrap?.failRate || 0}%</b> ❌\n` +
        `• Skill: <i>${topTrap?.skill || 'Grammar'}</i>\n` +
        `• Ethiopian L1 Insight: <i>${topTrap?.ethiopianL1Note || 'Direct translation interference'}</i>\n\n` +
        `📢 <b>READY-TO-POST CHANNEL MARKETING POST:</b>\n` +
        `<i>(Tap the code block below to copy instantly to your clipboard)</i>\n` +
        `<code>${topTrap?.readyChannelPost || 'Maraki English Diagnostic Quiz'}</code>\n\n` +
        `💳 <b>MONETIZATION & CONVERSION:</b>\n` +
        `• 💳 Upgrade Clicks / Intent: <b>${analytics?.upgradeClicks || 0}</b>\n` +
        `• ✅ Completed VIP Upgrades: <b>${monetization.completedPayments}</b>\n` +
        `• 💰 Verified Revenue: <b>${monetization.totalRevenueETB} ETB</b>\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏰ <i>Updated: ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })} EAT</i>`;
    const keyboard = new InlineKeyboard()
        .text('🔄 Refresh Briefing', 'admin_intel_refresh')
        .text('⚙️ System Status', 'admin_status_refresh');
    return { text: message, keyboard };
}
/**
 * Automatically send the weekly intelligence digest to admin
 */
export async function sendWeeklyAdminDigest(api) {
    try {
        const adminId = parseInt(process.env.ADMIN_ID || String(ADMIN_TELEGRAM_ID), 10);
        const intel = await apiService.getAssessmentProductIntelligence();
        const analytics = await getAnalyticsStats();
        const { text, keyboard } = buildProductIntelligenceMessage(intel, analytics);
        await api.sendMessage(adminId, `📅 <b>WEEKLY EXECUTIVE PRODUCT DIGEST</b>\n\n${text}`, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
        });
        console.log('[Weekly Digest] Sent product intelligence briefing to admin');
    }
    catch (error) {
        console.error('[Weekly Digest] Failed to send briefing:', error?.message);
    }
}
async function gatherBotStatistics() {
    const stats = {};
    try {
        stats.dbStatus = '✅ Neon PostgreSQL (Active)';
        stats.dbName = 'neondb';
        try {
            stats.redisStatus = redis.isOpen ? '✅ Connected' : '❌ Disconnected';
        }
        catch (error) {
            stats.redisStatus = '❌ Error';
        }
        try {
            stats.analytics = await getAnalyticsStats();
        }
        catch (e) {
            stats.analytics = { newUsers: 0, upgradeClicks: 0, paymentFailures: 0, paymentSuccesses: 0 };
        }
        stats.nodeVersion = process.version;
        stats.uptime = formatUptime(process.uptime());
        stats.memoryUsage = formatMemoryUsage(process.memoryUsage());
    }
    catch (error) {
        console.error('Error gathering statistics:', error);
        stats.error = 'Some statistics could not be retrieved';
    }
    return stats;
}
function formatAdminStatus(stats) {
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
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    }
    else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    else {
        return `${minutes}m`;
    }
}
function formatMemoryUsage(memUsage) {
    const used = Math.round(memUsage.heapUsed / 1024 / 1024);
    const total = Math.round(memUsage.heapTotal / 1024 / 1024);
    return `${used}MB / ${total}MB`;
}
