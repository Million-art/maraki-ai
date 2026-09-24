import { Context, InlineKeyboard } from "grammy";
import { getStartMenuMsg } from "../messages/start.message.js";
import { registerOrUpdate } from "../services/user.service.js";
import { setSession } from "../utils/redis.js";
import { handlePaymentCommand } from "./payment.command.js";
import { checkChannelMembership } from '../utils/channel-check.util.js';
import { trackReferralJoin, trackNewUser } from "../utils/analytics.util.js";


export async function startCommand(ctx: Context) {
  if (!ctx.from) return;

  // Deep-link: /start pay or /start=pay   triggered from Mini App upgrade popup
  const matchStr = String(ctx.match || '').trim().toLowerCase();
  if (matchStr === 'pay' || matchStr.includes('pay')) {
    await registerOrUpdate(ctx.from); // ensure user exists
    return handlePaymentCommand(ctx);
  }

  // Channel Membership Validation
  const isMember = await checkChannelMembership(ctx);
  if (!isMember) {
    return; // Access denied until they join
  }

  try {
    // Extract valid numerical referrerId from start payload (ignoring self-referrals)
    let referrerId: number | undefined = undefined;
    if (ctx.match) {
      const parsed = parseInt(String(ctx.match).trim(), 10);
      if (!isNaN(parsed) && parsed !== ctx.from.id) {
        referrerId = parsed;
      }
    }

    // Always register or update user via service layer to record referrer
    const user = await registerOrUpdate(ctx.from, referrerId);

    const isBrandNewUser = user.isNewUser === true;

    // Track referral join ONLY if user is brand new (ignore existing users clicking referral links)
    if (referrerId && isBrandNewUser) {
      try {
        await trackReferralJoin(referrerId, ctx.from.id);
      } catch (e) { }
    }

    // Notify Admin ONLY for brand new user registrations
    if (isBrandNewUser) {
      await trackNewUser(ctx);
    }

    // Clear any active session mode when starting fresh
    await setSession(ctx.from.id, { mode: null, timestamp: Date.now() });

    const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app/';

    const keyboard = new InlineKeyboard();

    // 1. Hero Action: Live Voice Coaching in Mini App
    if (miniAppUrl.includes('t.me/')) {
      keyboard.url("🎙️ ከማራኪ ጋር አውራ (Voice App)", miniAppUrl);
    } else {
      keyboard.webApp("🎙️ ከማራኪ ጋር አውራ (Voice App)", miniAppUrl);
    }

    keyboard.row()
      .text("🔥 ዕለታዊ ልምምድ", "daily_challenge")
      .text("📚 ትምህርቶች", "lesson")
      .row()
      .text("🧠 ጥያቄዎች", "quiz")
      .text("🌐 ትርጉም", "translation")
      .row()
      .text("🎁 ጓደኛ ጋብዝ", "referral_link");

    const welcomeMsg = getStartMenuMsg(ctx.from.first_name || "ተማሪ");
    await ctx.reply(welcomeMsg, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (error: any) {
    console.error("Error in /start command:", error);
    if (error?.error_code !== 403 && !String(error).includes('blocked by the user')) {
      try {
        await ctx.reply("⚠️ Something went wrong while starting the bot.");
      } catch (ignored) { }
    }
  }
}
