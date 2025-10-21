import { Context } from "grammy";
import { help_msg } from "../messages/help.message.js";

export const helpCommand= async(ctx:Context)=>{
    return ctx.reply(
      help_msg +
      `\n\nAvailable commands:\n` +
      `/start - Main Menu\n` +
      `/grammar - 🧹Correct your sentence\n` +
      `/lesson - ✨Learn from your previous mistakes\n` +
      `/chat_conversation - ⚡Practice chat conversation\n` +
      `/translation - 🌐Amharic to English translation\n` +
      `/referral_link - 🔗 Get your referral link\n` +
      `/level - 📊 Check your level\n` +
      `/usage - 📊 Check your daily usage limits\n` +
      `/speech_conversation - 🗣️ Practice speech conversation (Coming Soon!)\n` +
      `/help - ❓ Get help\n`
    );
}
