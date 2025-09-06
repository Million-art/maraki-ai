import { InlineKeyboard } from "grammy";
import { start_msg } from "../messages/start.message.js";
import { registerOrUpdate } from "../services/userService.js";
import { getSession, setSession } from "../utils/redis.js";
export async function startCommand(ctx) {
    if (!ctx.from)
        return;
    try {
        // Extract referrerId from the start payload
        const referrerId = ctx.match ? Number(ctx.match) : undefined;
        // Check session for user data
        const session = await getSession(ctx.from.id);
        let user;
        console.log('sesion', session);
        if (session && session.user) {
            user = session.user;
        }
        else {
            // Register or update user via service layer
            user = await registerOrUpdate(ctx.from, referrerId);
            // Store user in session
            await setSession(ctx.from.id, { ...session, user });
        }
        // Send welcome message
        const keyboard = new InlineKeyboard()
            .text("🧹 Correct sentence", "grammar")
            .row()
            .text("✨ Learn from your mistake", "lesson")
            .row()
            .text("⚡ Chat Conversation", "chat_conversation")
            .text("🗣️ Speech Conversation", "speech_conversation")
            .row()
            .text("📊 Level", "level")
            .text("🔗 Referral Link", "referral_link");
        await ctx.reply(`👋 Hello ${ctx.from.first_name || "there"}.\n${start_msg}`, { reply_markup: keyboard });
    }
    catch (error) {
        console.error("Error in /start command:", error);
        await ctx.reply("⚠️ Something went wrong while starting the bot.");
    }
}
