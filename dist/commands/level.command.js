import { InlineKeyboard } from "grammy";
import { getCurrentLevel } from "../services/user.service.js";
export const levelCommand = async (ctx) => {
    if (!ctx.from) {
        return ctx.reply("⚠️ Could not get your Telegram ID.");
    }
    const currentLevel = await getCurrentLevel(ctx.from);
    // Build the inline keyboard
    const keyboard = new InlineKeyboard()
        .text("🟢 Beginner", "beginner")
        .text("🟡 Intermediate", "intermediate")
        .row()
        .text("🔴 Advanced", "advanced")
        .text(" Close", "close");
    // Send message with both current level and options
    await ctx.reply(`🎯 Your current learning level is: ${currentLevel.level}\n\nPlease choose your preferred English difficulty level:`, { parse_mode: "Markdown", reply_markup: keyboard });
};
