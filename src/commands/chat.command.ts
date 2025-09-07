import { Context } from 'grammy';

export async function chatMode(ctx: Context) {
  const text = ctx.message?.text;

  // If the user sent a command that is not recognized
  if (text?.startsWith('/')) {
    await ctx.reply("⚠️ Unknown command. if you need help send /help");
    return;
  }

  // If the user sent normal text (not a command)
  await ctx.reply(
    `👋 I see you typed: "${text}".\n\n` +
    `To interact with me, use one of the following commands:\n` +
    `/start - Main Menu\n` +
    `/grammar - 🧹Correct your sentence\n` +
    `/lesson - ✨Learn from your previous mistakes\n` +
    `/chat_conversation - ⚡Practice chat conversation\n` +
    `/referral_link - 🔗 Get your referral link\n` +
    `/level - 📊 Check your level\n` +
    `/speech_conversation - 🗣️ Practice speech conversation`

  );
}
