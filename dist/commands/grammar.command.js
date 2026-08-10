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
    await ctx.reply("✨ <b>Welcome to the Maraki AI Voice Coach!</b>\n\n" +
        "Ready to speak English more confidently? Our interactive Mini App acts as your personal AI tutor.\n\n" +
        "🎯 <b>How it works:</b>\n" +
        "1️⃣ Tap the button below to open the Voice Coach.\n" +
        "2️⃣ Press the microphone and speak naturally to Maraki in English.\n" +
        "3️⃣ Get <i>instant</i> feedback! Maraki will catch your grammar mistakes, show you exactly how to fix them, and teach you how a native speaker would say it.\n\n" +
        "Don't worry about making mistakes—that's exactly how you learn! Tap below to start your first session. 👇", { parse_mode: 'HTML', reply_markup: keyboard });
};
