import { InlineKeyboard } from "grammy";
export const grammarCommand = async (ctx) => {
    if (!ctx.from) {
        return ctx.reply("⚠️ Could not get your Telegram ID.");
    }
    const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app/';
    const keyboard = new InlineKeyboard();
    if (miniAppUrl.includes('t.me/')) {
        keyboard.url("🎙️ Talk with Maraki", miniAppUrl);
    }
    else {
        keyboard.webApp("🎙️ Talk with Maraki", miniAppUrl);
    }
    await ctx.reply("✨ <b>Voice Practice & Grammar Correction</b> is active in the Maraki Mini App!\n\n" +
        "Practice speaking or typing sentences to receive real-time strikethrough grammar cards, audio pronunciation, and interactive feedback. 👇", { parse_mode: 'HTML', reply_markup: keyboard });
};
