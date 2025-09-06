import { start_msg } from "../messages/start.message.js";
import { registerOrUpdate } from "../services/userService.js";
export async function startCommand(ctx) {
    if (!ctx.from)
        return;
    try {
        // Extract referrerId from the start payload
        const referrerId = ctx.match ? Number(ctx.match) : undefined;
        // Register or update user via service layer
        await registerOrUpdate(ctx.from, referrerId);
        // Send welcome message
        await ctx.reply(`👋 Hello ${ctx.from.first_name || "there"}.\n${start_msg}`);
    }
    catch (error) {
        console.error("Error in /start command:", error);
        await ctx.reply("⚠️ Something went wrong while starting the bot.");
    }
}
