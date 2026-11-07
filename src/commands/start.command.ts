import { Context, InlineKeyboard } from "grammy";
import { getStartMenuMsg } from "../messages/start.message.js";
import { registerOrUpdate } from "../services/user.service.js";
import { setSession, redis } from "../utils/redis.js";
import { handlePaymentCommand } from "./payment.command.js";
import { checkChannelMembership } from '../utils/channel-check.util.js';
import { trackReferralJoin, trackNewUser } from "../utils/analytics.util.js";


export async function startCommand(ctx: Context) {
  if (!ctx.from) return;

  // 1. Immediately track and alert admin if this is a brand new user
  // This runs before the channel membership check so that even if the user
  // hasn't joined the channel yet, the admin is alerted immediately!
  await trackNewUser(ctx).catch((err) => {
    console.error("Error in start trackNewUser:", err);
  });

  // Extract or restore valid numerical referrerId from start payload
  let referrerId: number | undefined = undefined;
  if (ctx.match) {
    const parsed = parseInt(String(ctx.match).trim(), 10);
    if (!isNaN(parsed) && parsed !== ctx.from.id) {
      referrerId = parsed;
      try {
        if (redis.isOpen) {
          await redis.set(`pending_referrer:${ctx.from.id}`, String(referrerId), { EX: 86400 });
        }
      } catch (e) { }
    }
  } else {
    // Check if there was a pending referrer stored prior to channel join
    try {
      if (redis.isOpen) {
        const stored = await redis.get(`pending_referrer:${ctx.from.id}`);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed !== ctx.from.id) {
            referrerId = parsed;
          }
        }
      }
    } catch (e) { }
  }

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
    // Always register or update user via service layer to record referrer
    const user = await registerOrUpdate(ctx.from, referrerId);

    // Track referral join
    if (referrerId) {
      try {
        await trackReferralJoin(referrerId, ctx.from.id);
      } catch (e) { }
    }

    // Clear any active session mode when starting fresh
    await setSession(ctx.from.id, { mode: null, timestamp: Date.now() });

    const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app/';

    const keyboard = new InlineKeyboard();

    // 1. Hero Action: Live Voice Coaching in Mini App
    if (miniAppUrl.includes('t.me/')) {
      keyboard.url("🎙️ Speak with Maraki (Voice App)", miniAppUrl);
    } else {
      keyboard.webApp("🎙️ Speak with Maraki (Voice App)", miniAppUrl);
    }

    keyboard.row().text("🔥 Daily Challenge", "daily_challenge");

    const welcomeMsg = getStartMenuMsg(ctx.from.first_name || "Friend");
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
