import { Context, InlineKeyboard } from "grammy";
import { getPersonalizedStartMsg } from "../messages/start.message.js";
import { registerOrUpdate } from "../services/user.service.js";
import { getSession, setSession } from "../utils/redis.js";
import { getDailyStreak } from "../utils/streak.util.js";
import { handlePaymentCommand } from "./payment.command.js";
import { checkChannelMembership } from '../utils/channel-check.util.js';
import { trackReferralJoin } from "../utils/analytics.util.js";
import { trackNewUser } from "../utils/analytics.util.js";


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

    // Check session for user data
    const session = await getSession(ctx.from.id);

    // Always register or update user via service layer to record referrer
    const user = await registerOrUpdate(ctx.from, referrerId);
    const streak = await getDailyStreak(ctx.from.id);

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

    // Send welcome message with optimized button arrangement & Daily Challenge
    const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app/';

    const keyboard = new InlineKeyboard()
      .text("🎯 Find My English Level", "start_assessment")
      .row();

    if (miniAppUrl.includes('t.me/')) {
      keyboard.url("🎙️ Talk with Maraki", miniAppUrl);
    } else {
      keyboard.webApp("🎙️ Talk with Maraki", miniAppUrl);
    }

    keyboard
      .text("🔥 Daily Challenge", "daily_challenge")
      .row()
      .text("📚 Lessons", "lesson")
      .text("🧠 Quiz", "quiz")
      .row()
      .text("🌐 Amharic-English", "translation")
      .text("📊 Maraki Level", "level")
      .row()
      .text("🎁 Premium Challenge", "referral_link");

    const welcomeMsg = getPersonalizedStartMsg(ctx.from.first_name || "there");

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
