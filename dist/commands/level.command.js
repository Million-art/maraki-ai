import { Keyboard } from "grammy";
import { getCurrentLevel } from "../services/userService.js";
export const levelCommand = async (ctx) => {
    if (!ctx.from) {
        return ctx.reply("⚠️ Could not get your Telegram ID.");
    }
    const currentLevel = await getCurrentLevel(ctx.from);
    await ctx.reply(`Your current level is: ${currentLevel.level}`);
    const keyboard = new Keyboard([
        ["📚 Lessons", "📝 Grammar"],
        ["⭐️ My Level", "🔙 Back"]
    ]).resized().oneTime();
    await ctx.reply("Choose an option:", { reply_markup: keyboard });
};
