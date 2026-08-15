import { Context, InlineKeyboard } from 'grammy';

export const REQUIRED_CHANNEL = process.env.REQUIRED_CHANNEL || '@marakiai';

/**
 * Checks if the user is a member of the required Telegram channel.
 * Prompts them to join if they are not a member.
 */
export async function checkChannelMembership(ctx: Context): Promise<boolean> {
  if (!ctx.from) return true;
  
  try {
    const member = await ctx.api.getChatMember(REQUIRED_CHANNEL, ctx.from.id);
    
    // Status can be: 'creator', 'administrator', 'member', 'restricted', 'left', 'kicked'
    if (['member', 'administrator', 'creator', 'restricted'].includes(member.status)) {
      return true;
    }
  } catch (error: any) {
    console.error(`[Channel Check] Error checking membership for ${REQUIRED_CHANNEL}:`, error.message);
    // If the bot itself is not an admin in the channel, it will throw "Bad Request: bot is not a member of the channel chat"
    // In this case, we fail open (allow access) to prevent breaking the entire bot for all users
    if (error.message.includes('not found') || error.message.includes('not a member')) {
      return true; 
    }
  }

  // User is NOT a member ('left' or 'kicked') - Prompt them to join
  const channelUrl = REQUIRED_CHANNEL.startsWith('@') 
    ? `https://t.me/${REQUIRED_CHANNEL.replace('@', '')}`
    : `https://t.me/marakiai`; // Fallback

  const keyboard = new InlineKeyboard()
    .url(`📢 Join Channel`, channelUrl)
    .row()
    .text("✅ I have joined", "check_channel_join");

  await ctx.reply(
    `🚀 *Join Our Official Channel!*\n\n` +
    `To use Maraki AI's free lessons, AI voice practice, and quizzes, you must be a member of our official Telegram channel.\n\n` +
    `👉 Please join the channel below and click **"I have joined"**!`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );

  return false;
}
