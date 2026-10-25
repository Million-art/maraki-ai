import { InlineKeyboard } from "grammy";
import { help_msg } from "../messages/help.message.js";
export const helpCommand = async (ctx) => {
    const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app/';
    const keyboard = new InlineKeyboard();
    if (miniAppUrl.includes('t.me/')) {
        keyboard.url("🎙️ Speak with Maraki (Voice App)", miniAppUrl);
    }
    else {
        keyboard.webApp("🎙️ Speak with Maraki (Voice App)", miniAppUrl);
    }
    keyboard.row().text("🔥 Daily Challenge", "daily_challenge");
    return ctx.reply(help_msg, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
    });
};
