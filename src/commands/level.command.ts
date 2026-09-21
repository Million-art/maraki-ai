import { Context, InlineKeyboard, InputFile } from "grammy";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { execFile } from "child_process";
import { promisify } from "util";
import { getDailyStreak } from "../utils/streak.util.js";
import { apiService } from "../services/api.service.js";
import {
  renderBar,
  getLinguisticDiagnosisFallback,
  getCareerTranslationFallback,
  getReportKeyboard,
  sanitizeAmharicDiagnosis,
} from "../utils/report-formatter.util.js";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      `🎯 <b>የእንግሊዝኛ ችሎታዎ</b> 🇪🇹\n\n` +
      `እስካሁን የችሎታ መለያ ፈተና አልወሰዱም!\n\n` +
      `የእንግሊዝኛ ችሎታዎን (A1 – C1) ለማወቅ እና ድክመትዎን የሚቀርፍ ዕለታዊ ልምምድ ለመጀመር አሁኑኑ ፈተናውን ይውሰዱ።\n\n` +
      `⏱️ <b>የሚፈጀው ጊዜ፦</b> 1 ደቂቃ ብቻ (በድምፅ)\n` +
      `🎯 <b>ምን ያገኛሉ?</b> የችሎታ ውጤት፣ ያለብዎት ክፍተት እና ዕለታዊ ቻሌንጅ!`;

    const keyboard = new InlineKeyboard()
      .text("🎙️ የንግግር ችሎታ መለያ ጀምር (1 ደቂቃ)", "start_assessment")
      .row()
      .text("🔥 የዛሬውን ነፃ ቻሌንጅ ሞክር", "daily_challenge");

    return await ctx.reply(unassessedCard, { parse_mode: "HTML", reply_markup: keyboard });
  }

  const levelName = report.cefrLevel || 'B1';
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

  // Always recompute diagnosis from live skill scores — never trust the cached
  // report.diagnosis, which was stored at assessment time and may be stale.
  // getLinguisticDiagnosisFallback now checks the actual lowest score first
  // (e.g. Listening=25 will always beat Speaking=81 via the Silent Trap heuristic).
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
    `📖 ንባብ (Reading):      ${renderBar(skills.reading)} <b>${skills.reading}</b>/100\n` +
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

/**
 * Send the personalized 7-Day Learning Plan
 */
export async function sendWeeklyPlan(ctx: Context) {
  if (!ctx.from) return;
  const userId = ctx.from.id;

  const report = await apiService.getStudentMarakiLevel(userId);
  const plan = report?.recommendedPlan;
  const weakness = report?.primaryWeakness || 'Speaking';

  if (!plan) {
    return ctx.reply('⚠️ Please complete your assessment first with /assessment to generate your 7-Day plan.');
  }

  const planText =
    `📅 <b>YOUR PERSONALIZED 7-DAY LEARNING PLAN</b> 🎯\n` +
    `<i>Tailored specifically to improve your weakness: <b>${weakness}</b></i>\n\n` +
    `<b>Day 1:</b> ${plan.day1?.title} (${plan.day1?.duration})\n` +
    `• <i>Task:</i> ${plan.day1?.task}\n\n` +
    `<b>Day 2:</b> ${plan.day2?.title} (${plan.day2?.duration})\n` +
    `• <i>Task:</i> ${plan.day2?.task}\n\n` +
    `<b>Day 3:</b> ${plan.day3?.title} (${plan.day3?.duration})\n` +
    `• <i>Task:</i> ${plan.day3?.task}\n\n` +
    `<b>Day 4:</b> ${plan.day4?.title} (${plan.day4?.duration})\n` +
    `• <i>Task:</i> ${plan.day4?.task}\n\n` +
    `<b>Day 5:</b> ${plan.day5?.title} (${plan.day5?.duration})\n` +
    `• <i>Task:</i> ${plan.day5?.task}\n\n` +
    `<b>Day 6:</b> ${plan.day6?.title} (${plan.day6?.duration})\n` +
    `• <i>Task:</i> ${plan.day6?.task}\n\n` +
    `<b>Day 7:</b> ${plan.day7?.title} (${plan.day7?.duration})\n` +
    `• <i>Task:</i> ${plan.day7?.task}\n\n` +
    `🚀 <i>5 minutes every day creates measurable fluency. Tap below to begin Day 1!</i>`;

  const keyboard = new InlineKeyboard()
    .text("🔥 Start Da Lesson", "start_plan_lesson_1")
    .text("Assessment Report", "view_certificate")
    .row()
    .text("Maraki Level", "level");

  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(planText, { parse_mode: "HTML", reply_markup: keyboard });
    } catch (e) {
      await ctx.reply(planText, { parse_mode: "HTML", reply_markup: keyboard });
    }
  } else {
    await ctx.reply(planText, { parse_mode: "HTML", reply_markup: keyboard });
  }
}

/**
 * Send the official Maraki Milestone Certificate sample / preview
 */
export async function sendCertificate(ctx: Context) {
  if (!ctx.from) return;
  const userId = ctx.from.id;
  const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Learner';

  const report = await apiService.getStudentMarakiLevel(userId);
  const levelName = report?.cefrLevel && report.cefrLevel !== 'UNTESTED' ? report.cefrLevel : 'B1';
  const score = report?.overallScore && report.overallScore > 0 ? report.overallScore : 55;
  const credId = `MRK-2026-${userId.toString().slice(-4)}`;
  const skills = report?.skills || { vocabulary: 55, grammar: 55, reading: 55, listening: 55, speaking: 55 };

  // Dynamically generate personalized certificate image with user's name & Maraki brand colors
  const userCertPath = path.resolve('/tmp', `cert_${userId}.png`);
  try {
    const candidateScriptPaths = [
      path.resolve(process.cwd(), 'scripts/generate_certificate.py'),
      path.resolve(__dirname, '../../scripts/generate_certificate.py'),
      '/home/million/Documents/testing/bot/scripts/generate_certificate.py',
    ];
    const script = candidateScriptPaths.find((p) => fs.existsSync(p));

    if (script) {
      await execFileAsync('python3', [
        script,
        '--name', fullName,
        '--level', levelName,
        '--score', score.toString(),
        '--vocab', (skills.vocabulary || 55).toString(),
        '--grammar', (skills.grammar || 55).toString(),
        '--reading', (skills.reading || 55).toString(),
        '--listening', (skills.listening || 55).toString(),
        '--speaking', (skills.speaking || 55).toString(),
        '--cred_id', credId,
        '--output', userCertPath,
      ]);
    }
  } catch (err) {
    console.error('Dynamic cert generation error:', err);
  }

  const caption =
    `📊 <b>MARAKI ENGLISH ASSESSMENT REPORT</b> 🇪🇹\n\n` +
    `👤 <b>Student:</b> ${fullName}\n` +
    `🏆 <b>Diagnostic Benchmark:</b> Level ${levelName} (CEFR)\n` +
    `⭐ <b>Overall Score:</b> ${score}/100\n` +
    `🛡️ <b>Report ID:</b> <code>${credId}</code>\n\n` +
    `✨ <i>Official English proficiency evaluation report from Maraki AI, evaluating real spoken fluency, grammatical accuracy, reading comprehension, and vocabulary mastery for Ethiopian learners.</i>\n\n` 

  const keyboard = new InlineKeyboard()
    .row()
    .text("📅 View 7-Day Plan", "view_weekly_plan")
    .row()
    .text("Maraki Level", "level");

  try {
    const candidatePaths = [
      userCertPath,
      path.resolve(process.cwd(), 'assets/images/sample_certificate.jpg'),
      path.resolve(__dirname, '../../assets/images/sample_certificate.jpg'),
      '/home/million/Documents/testing/bot/assets/images/sample_certificate.jpg',
    ];
    const imagePath = candidatePaths.find((p) => fs.existsSync(p));

    if (imagePath) {
      await ctx.replyWithPhoto(new InputFile(imagePath), {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
      return;
    }
  } catch (err) {
    console.error('Failed to send certificate photo:', err);
  }

  await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: keyboard });
}
