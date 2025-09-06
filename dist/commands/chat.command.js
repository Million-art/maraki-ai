export async function chatMode(ctx) {
    const text = ctx.message?.text;
    // If the user sent a command that is not recognized
    if (text?.startsWith('/')) {
        await ctx.reply("⚠️ Unknown command. Available commands:\n/start\n/grammar\n/lesson\n/chat_conversation");
        return;
    }
    // If the user sent normal text (not a command)
    await ctx.reply(`👋 I see you typed: "${text}".\n\n` +
        `To interact with me, use one of the following commands:\n` +
        `/start - 👋Welcome message\n` +
        `/grammar - 🧹Correct your sentence\n` +
        `/lesson - ✨Learn from your previous mistakes\n` +
        `/chat_conversation - ⚡Practice chat conversation` +
        `/referral_link - 🔗 Get your referral link`);
}
