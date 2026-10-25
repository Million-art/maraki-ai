import { Context, InlineKeyboard } from "grammy";
import { getDailyStreak } from "../utils/streak.util.js";
import { apiService } from "../services/api.service.js";
import {
  renderBar,
  getLinguisticDiagnosisFallback,
  getCareerTranslationFallback,
  getReportKeyboard,
  sanitizeAmharicDiagnosis,
} from "../utils/report-formatter.util.js";

export const levelCommand = async (ctx: Context) => {
  if (!ctx.from) {
    return ctx.reply("⚠️ Could not get your Telegram ID.");
  }

  const userId = ctx.from.id;
  const streak = await getDailyStreak(userId);

  const report = await apiService.getStudentMarakiLevel(userId);
  const isAssessed = report && report.isAssessed && !report.needsAssessment && report.cefrLevel !== 'UNTESTED' && report.overallScore > 0;

  if (!isAssessed) {
    const unassessedCard =
      `🎯 <b>Your English Proficiency</b> 🌟\n\n` +
      `You haven't completed your assessment yet!\n\n` +
      `Discover your CEFR English level (A1 – C1) and start personalized practice with Maraki AI.\n\n` +
      `⏱️ <b>Duration:</b> Only 1 minute (voice)\n` +
      `🎯 <b>What you get:</b> CEFR level scorecard, detailed feedback, and daily challenges!`;

    const miniAppUrl = process.env.MINI_APP_URL || 'https://maraki-mini-app.vercel.app/';
    const keyboard = new InlineKeyboard();
    if (miniAppUrl.includes('t.me/')) {
      keyboard.url("🎙️ Speak with Maraki (Voice App)", miniAppUrl);
    } else {
      keyboard.webApp("🎙️ Speak with Maraki (Voice App)", miniAppUrl);
    }
    keyboard.row().text("🔥 Daily Challenge", "daily_challenge");

    return await ctx.reply(unassessedCard, { parse_mode: "HTML", reply_markup: keyboard });
  }

  const levelName = report.cefrLevel || 'A1';
  const score = report.overallScore || 55;
  const skills = report.skills || { vocabulary: 55, grammar: 55, reading: 55, listening: 55, speaking: null };
  const weakness = report.primaryWeakness || 'Speaking';

  const speakingScoreNum = typeof skills?.speaking === 'number' ? skills.speaking : Number(skills?.speaking);
  const isSpeakingTested = Boolean(
    report.speakingTested !== false &&
    skills?.speaking !== null &&
    skills?.speaking !== undefined &&
    !isNaN(speakingScoreNum)
  );

  const speakingLine = isSpeakingTested
    ? `🗣️ ንግግር (Speaking):  ${renderBar(speakingScoreNum)} <b>${speakingScoreNum}</b>/100\n`
    : `🗣️ ንግግር (Speaking):  ⏭️ <i>አልተፈተነም</i>\n`;

  const diagnosis = getLinguisticDiagnosisFallback(skills, weakness, isSpeakingTested);
  const career = report.careerTranslation || getCareerTranslationFallback(levelName);
  const plan = report.recommendedPlan;
  const day1Title = plan?.day1?.title || 'የመጀመሪያ ቀን ልምምድ';

  const progressCard =
    `🎯 <b>የእንግሊዝኛ ችሎታዎ</b> 🇪🇹\n\n` +
    `🏆 <b>ችሎታዎ፦</b> Level ${levelName} (${score}/100)\n` +
    `🔥 <b>ቀጣይነት (Streak)፦</b> ${streak} ${streak === 1 ? 'ቀን' : 'ቀናት'}\n\n` +
    `<b>የውጤትዎ ዝርዝር፦</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📚 ቃላት (Vocabulary):   ${renderBar(skills.vocabulary)} <b>${skills.vocabulary}</b>/100\n` +
    `📝 ሰዋሰው (Grammar):     ${renderBar(skills.grammar)} <b>${skills.grammar}</b>/100\n` +
    `🎧 ማዳመጥ (Listening):   ${renderBar(skills.listening)} <b>${skills.listening}</b>/100\n` +
    speakingLine +
    `━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `🔍 <b>ያለብዎት ክፍተት፦</b> <b>${sanitizeAmharicDiagnosis(diagnosis.headlineAmharic || diagnosis.tag)}</b>\n` +
    `${sanitizeAmharicDiagnosis(diagnosis.summary)}\n\n` +
    `💼 <b>ይህ ችሎታ ለስራዎ ምን ይጠቅማል?</b>\n` +
    `• <b>አሁን (${levelName})፦</b> ${career.currentLevelReality}\n` +
    `• <b>ቀጣዩ ችሎታ (${career.targetLevel})፦</b> ${career.targetUnlock}\n\n` +
    `💡 <b>የመፍትሔው መንገድ፦</b>\n` +
    `• <b>ምን ማድረግ አለብዎት?</b> በቀን 5 ደቂቃ አጭር ልምምድ።\n` +
    `• <b>የዛሬው ልምምድዎ፦</b> ${day1Title}`;

  const keyboard = getReportKeyboard({ isAssessed: true, speakingTested: isSpeakingTested });

  await ctx.reply(progressCard, { parse_mode: "HTML", reply_markup: keyboard });
};
