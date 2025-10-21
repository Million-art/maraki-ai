import { InlineKeyboard } from "grammy";
import { BroadcastService } from "../services/broadcast.service.js";
import { apiService } from "../services/api.service.js";
import { setSession, deleteSession } from '../utils/redis.js';
const ADMIN_ID = Number(process.env.ADMIN_ID);
export async function adminCommand(ctx) {
    if (!ctx.from)
        return;
    // Check if user is admin
    if (ADMIN_ID !== Number(ctx.from.id)) {
        return ctx.reply("❌ You don't have permission to access the admin dashboard.");
    }
    await showAdminDashboard(ctx);
}
export async function showAdminDashboard(ctx) {
    if (!ctx.from || ADMIN_ID !== Number(ctx.from.id))
        return;
    try {
        // Get statistics
        const broadcastStats = await BroadcastService.getBroadcastStats();
        const totalUsers = broadcastStats.totalUsers;
        const dashboardText = `
📊 Admin Dashboard

👥 Total Users: ${totalUsers}
📈 Active Users: ${broadcastStats.totalUsers}

Choose an action:
`;
        const keyboard = new InlineKeyboard()
            .text("📢 Broadcast Message", "broadcast")
            .row()
            .text("📊 View Statistics", "stats")
            .row()
            .text("🔙 Back to Main", "back");
        await ctx.reply(dashboardText, {
            parse_mode: "Markdown",
            reply_markup: keyboard
        });
    }
    catch (error) {
        console.error("Admin dashboard error:", error);
        await ctx.reply("❌ Error loading dashboard. Please try again.");
    }
}
export async function handleAdminCallback(ctx) {
    if (!ctx.from || ADMIN_ID !== Number(ctx.from.id))
        return;
    const data = ctx.callbackQuery?.data;
    if (!data)
        return;
    try {
        switch (data) {
            case 'broadcast':
                await ctx.editMessageText("📢 Broadcast Message\n\nSend me the message you want to broadcast to all users:", { parse_mode: "Markdown" });
                // Set session to expect broadcast message
                await setSession(ctx.from.id, { mode: 'broadcast', timestamp: Date.now(), userId: ctx.from.id });
                await ctx.api.sendMessage(ctx.from.id, "💬 Reply with your broadcast message:");
                break;
            case 'stats':
                await showDetailedStats(ctx);
                break;
            case 'back':
                await ctx.editMessageText("🔙 Returning to main menu...");
                // You might want to call the main menu here
                break;
            default:
                await ctx.answerCallbackQuery("❓ Unknown action");
        }
        await ctx.answerCallbackQuery();
    }
    catch (error) {
        console.error("Admin callback error:", error);
        await ctx.answerCallbackQuery("❌ Error processing request");
    }
}
export async function handleBroadcastMessage(ctx) {
    if (!ctx.from || ADMIN_ID !== Number(ctx.from.id) || !ctx.message?.text)
        return;
    const message = ctx.message.text;
    try {
        await ctx.reply("📤 Sending broadcast message to all users...");
        const result = await BroadcastService.sendBroadcastToAll({
            text: message,
            parseMode: "HTML"
        });
        const summary = `
✅ Broadcast Complete

📊 Results:
• Total Users: ${result.totalUsers}
• Successful: ${result.successful}
• Failed: ${result.failed}

${result.errors.length > 0 ? `❌ Errors: ${result.errors.slice(0, 3).join(', ')}` : ''}
    `;
        await ctx.reply(summary, { parse_mode: "Markdown" });
        // Clear broadcast session after completion
        await deleteSession(ctx.from.id);
    }
    catch (error) {
        console.error("Broadcast error:", error);
        await ctx.reply("❌ Failed to send broadcast message. Please try again.");
        // Clear broadcast session even on error
        await deleteSession(ctx.from.id);
    }
}
async function showDetailedStats(ctx) {
    try {
        const broadcastStats = await BroadcastService.getBroadcastStats();
        const totalUsers = broadcastStats.totalUsers;
        // Get user level breakdown using API
        const levelStats = await getUserLevelStats();
        const statsText = `
📊 Detailed Statistics

👥 Total Users: ${totalUsers}

📈 User Levels:
• Beginner: ${levelStats.beginner}
• Intermediate: ${levelStats.intermediate}
• Advanced: ${levelStats.advanced}

🔄 Last Updated: ${new Date().toLocaleString()}
    `;
        const keyboard = new InlineKeyboard()
            .text("🔄 Refresh", "stats")
            .row()
            .text("🔙 Back to Dashboard", "dashboard");
        await ctx.editMessageText(statsText, {
            parse_mode: "Markdown",
            reply_markup: keyboard
        });
    }
    catch (error) {
        console.error("Stats error:", error);
        await ctx.editMessageText("❌ Error loading statistics. Please try again.");
    }
}
async function getUserLevelStats() {
    try {
        // Get all users from API and count by level
        const allUsers = await apiService.getAllUsers();
        // Initialize counts
        const levelCounts = {
            beginner: 0,
            intermediate: 0,
            advanced: 0
        };
        // Count users by level
        allUsers.forEach(user => {
            const level = user.level?.toLowerCase();
            if (level && level in levelCounts) {
                levelCounts[level]++;
            }
        });
        return levelCounts;
    }
    catch (error) {
        console.error('Error getting user level stats:', error);
        return { beginner: 0, intermediate: 0, advanced: 0 };
    }
}
