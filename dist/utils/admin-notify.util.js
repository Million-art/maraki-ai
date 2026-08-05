export const ADMIN_TELEGRAM_ID = 386095768;
/**
 * Sends a real-time error alert to the Admin on Telegram whenever any user encounters an error.
 */
export async function notifyAdminOnError(ctx, error, contextDescription) {
    try {
        const user = ctx?.from;
        const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Unknown User';
        const username = user?.username ? `@${user.username}` : 'No username';
        const userId = user?.id || 'N/A';
        const errorMessage = error?.stack || error?.message || String(error);
        const contextTag = contextDescription ? `\n📍 <b>Location/Action:</b> ${contextDescription}` : '';
        const alertMessage = `🚨 <b>BOT USER ERROR ALERT!</b> 🚨\n\n` +
            `👤 <b>User:</b> ${name} (${username})\n` +
            `🆔 <b>User ID:</b> <code>${userId}</code>` +
            `${contextTag}\n` +
            `❌ <b>Error Details:</b>\n` +
            `<code>${errorMessage.slice(0, 1000)}</code>\n\n` +
            `👉 <a href="tg://user?id=${userId}">Click to message user</a>`;
        if (ctx?.api) {
            await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, alertMessage, { parse_mode: 'HTML' });
        }
    }
    catch (notifyErr) {
        console.error('Failed to send error notification to admin:', notifyErr);
    }
}
