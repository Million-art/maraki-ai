import { InlineKeyboard } from 'grammy';
export const REQUIRED_CHANNEL = process.env.REQUIRED_CHANNEL || '@marakiai';
/**
 * Checks if the user is a member of the required Telegram channel.
 * Prompts them to join if they are not a member.
 */
export async function checkChannelMembership(ctx) {
    if (!ctx.from || !ctx.api?.getChatMember || process.env.NODE_ENV === 'test')
        return true;
    try {
        const member = await ctx.api.getChatMember(REQUIRED_CHANNEL, ctx.from.id);
        // Status can be: 'creator', 'administrator', 'member', 'restricted', 'left', 'kicked'
        if (['member', 'administrator', 'creator', 'restricted'].includes(member.status)) {
            return true;
        }
    }
    catch (error) {
        console.error(`[Channel Check] Error checking membership for ${REQUIRED_CHANNEL}:`, error.message);
        // If the bot itself is not an admin in the channel or fails, fail open
        return true;
    }
    // User is NOT a member ('left' or 'kicked') - Prompt them to join
    const channelUrl = REQUIRED_CHANNEL.startsWith('@')
        ? `https://t.me/${REQUIRED_CHANNEL.replace('@', '')}`
        : `https://t.me/marakiai`; // Fallback
    const keyboard = new InlineKeyboard()
        .url(`📢 ቻናሉን ተቀላቀሉ`, channelUrl)
        .row()
        .text("✅ ተቀላቅያለሁ", "check_channel_join");
    await ctx.reply(`🚀 *የቴሌግራም ቻናላችንን ይቀላቀሉ!*\n\n` +
        `የMaraki AI ነጻ ትምህርቶችን፣ የድምጽ ልምምዶችን እና ፈተናዎችን ለመጠቀም የቴሌግራም ቻናላችንን መቀላቀል ግዴታ ነው።\n\n` +
        `👉 እባክዎን ከታች ያለውን ቻናል ይቀላቀሉ እና **"✅ ተቀላቅያለሁ"** የሚለውን ቁልፍ ይጫኑ!`, { parse_mode: 'Markdown', reply_markup: keyboard });
    return false;
}
