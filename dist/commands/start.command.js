import { InlineKeyboard } from "grammy";
import { getUnassessedStartMsg, getAssessedStartMsg } from "../messages/start.message.js";
import { registerOrUpdate } from "../services/user.service.js";
import { getSession, setSession } from "../utils/redis.js";
import { getDailyStreak } from "../utils/streak.util.js";
import { handlePaymentCommand } from "./payment.command.js";
import { checkChannelMembership } from '../utils/channel-check.util.js';
import { trackReferralJoin } from "../utils/analytics.util.js";
import { trackNewUser } from "../utils/analytics.util.js";
import { apiService } from "../services/api.service.js";
import { getPlanProgress } from "../utils/plan-progress.util.js";
export async function startCommand(ctx) {
    if (!ctx.from)
        return;
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
        let referrerId = undefined;
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
            }
            catch (e) { }
        }
        // Notify Admin ONLY for brand new user registrations
        if (isBrandNewUser) {
            await trackNewUser(ctx);
        }
        // Clear any active session mode when starting fresh
        await setSession(ctx.from.id, { mode: null, timestamp: Date.now() });
        const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app/';
        // Check if user has taken assessment
        let report = null;
        try {
            report = await apiService.getStudentMarakiLevel(ctx.from.id);
        }
        catch (e) { }
        const isAssessed = Boolean(report &&
            report.cefrLevel &&
            report.cefrLevel !== 'UNTESTED' &&
            report.overallScore > 0);
        if (!isAssessed) {
            // ─── STATE 1: UNASSESSED USER (Laser-focused diagnostic onboarding) ──
            const keyboard = new InlineKeyboard()
                .text("🎯 የችሎታ መለያ ፈተና ጀምር (3 ደቂቃ)", "start_assessment")
                .row()
                .text("🔥 የዛሬውን ነፃ ቻሌንጅ ሞክር", "daily_challenge");
            if (miniAppUrl.includes('t.me/')) {
                keyboard.url("🎙️ ከማራኪ ጋር አውራ", miniAppUrl);
            }
            else {
                keyboard.webApp("🎙️ ከማራኪ ጋር አውራ", miniAppUrl);
            }
            const welcomeMsg = getUnassessedStartMsg(ctx.from.first_name || "ተማሪ");
            await ctx.reply(welcomeMsg, { parse_mode: 'HTML', reply_markup: keyboard });
        }
        else {
            // ─── STATE 2: ASSESSED USER (Daily Challenge & Streak retention loop) ─
            let currentDay = 1;
            try {
                const progress = await getPlanProgress(ctx.from.id);
                currentDay = Math.min(7, Math.max(1, progress?.currentDay || 1));
            }
            catch (e) { }
            const plan = report.recommendedPlan;
            const dayPlan = plan ? plan[`day${currentDay}`] : null;
            const challengeTitle = dayPlan?.title || 'ዕለታዊ የ5 ደቂቃ ልምምድ';
            const keyboard = new InlineKeyboard()
                .text(`🚀 የዛሬውን ቻሌንጅ ጀምር`, `start_plan_lesson_${currentDay}`)
                .row()
                .text("📊 ውጤቴን እይ", "level");
            if (miniAppUrl.includes('t.me/')) {
                keyboard.url("🎙️ ከማራኪ ጋር አውራ", miniAppUrl);
            }
            else {
                keyboard.webApp("🎙️ ከማራኪ ጋር አውራ", miniAppUrl);
            }
            keyboard.row().text("🎁 ጓደኛ ጋብዝ", "referral_link");
            const welcomeMsg = getAssessedStartMsg(ctx.from.first_name || "ተማሪ", report, streak, challengeTitle);
            await ctx.reply(welcomeMsg, { parse_mode: 'HTML', reply_markup: keyboard });
        }
    }
    catch (error) {
        console.error("Error in /start command:", error);
        if (error?.error_code !== 403 && !String(error).includes('blocked by the user')) {
            try {
                await ctx.reply("⚠️ Something went wrong while starting the bot.");
            }
            catch (ignored) { }
        }
    }
}
