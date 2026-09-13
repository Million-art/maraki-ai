import dotenv from 'dotenv';
import { Bot } from 'grammy';
import { startCommand } from '../commands/start.command.js';
import { grammarCommand } from '../commands/grammar.command.js';
import { lessonCommand } from '../commands/lesson.comand.js';
import { chatMode, handleChatConversation, startChatConversation } from '../commands/chat.command.js';
import { levelCommand } from '../commands/level.command.js';
import { referralCommand } from '../commands/referral.command.js';
import { helpCommand } from '../commands/help.command.js';
import { translationCommand, handleTranslation, startTranslation } from '../commands/translation.command.js';
import { usageCommand } from '../commands/usage.command.js';
import { quizCommand, handleQuizAnswer } from '../commands/quiz.command.js';
import { adminStatusCommand, adminIntelligenceCommand, handleAdminCallback } from '../commands/admin.command.js';
import { handlePaymentCommand, handleReceiptVerification } from '../commands/payment.command.js';
import { challengeCommand } from '../commands/challenge.command.js';
import { handleSurvey1, handleSurvey2, awaitingSurveyTextUsers } from '../commands/survey.command.js';
import { updateUserLevel } from '../services/user.service.js';
import { setSession, getSession } from '../utils/redis.js';
import { redis } from '../utils/redis.js';
import { notifyAdminOnError, ADMIN_TELEGRAM_ID } from '../utils/admin-notify.util.js';
import { setNotifyPreference } from '../utils/daily-notify.util.js';
import { handlePaymentSelection } from '../commands/payment.command.js';
import { generateAndSendLesson } from '../commands/lesson.comand.js';
import { handleAdminFollowupAction } from '../utils/analytics.util.js';
import { apiService } from '../services/api.service.js';
import { assessmentCommand, startAssessmentSession, handleAssessmentAnswer, handleAssessmentVoiceSubmission, skipAssessmentVoice } from '../commands/assessment.command.js';
import { sendWeeklyPlan, sendCertificate } from '../commands/level.command.js';
import { startPlanLesson, handlePlanLessonAnswer } from '../commands/plan-lesson.command.js';
import { getPlanProgress } from '../utils/plan-progress.util.js';


dotenv.config();

const bot_token = process.env.DEV_BOT_TOKEN || process.env.TOKEN || process.env.TKN || process.env.BOT_TOKEN;
if (!bot_token) {
  throw new Error('TOKEN is not defined in .env (Set DEV_BOT_TOKEN, TOKEN, TKN, or BOT_TOKEN)');
}
export const bot = new Bot(bot_token);


// Global per-user deduplication lock map for single-instance
const userActionLocks = new Set<string>();

// Global middleware for continuous typing indicator & duplicate request suppression
bot.use(async (ctx, next) => {
  if (!ctx.from) {
    return next();
  }

  if (ctx.callbackQuery) {
    console.log(`[Bot Callback Query] User ${ctx.from.id} clicked: ${ctx.callbackQuery.data}`);
  } else if (ctx.message?.text) {
    console.log(`[Bot Text Message] User ${ctx.from.id} sent: ${ctx.message.text}`);
  }

  // Answer callback queries immediately to prevent Telegram from auto-retrying unacknowledged requests
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCallbackQuery();
    } catch (e) { }
  }

  const userId = ctx.from.id;
  const actionName = ctx.callbackQuery?.data
    ? ctx.callbackQuery.data
    : (ctx.message?.text && ctx.message.text.startsWith('/'))
      ? ctx.message.text.split(' ')[0]
      : null;

  const updateKey = actionName ? `action_${userId}_${actionName}` : null;

  // 1. Atomic Redis Distributed Lock (15s cooldown prevents duplicate execution & retries)
  if (actionName) {
    try {
      if (redis.isOpen) {
        const redisLockKey = `lock:user_action:${userId}:${actionName}`;
        const acquired = await redis.set(redisLockKey, 'locked', { NX: true, EX: 60 });
        if (!acquired) {
          return; // Suppress duplicate execution from concurrent processes or retries
        }
      }
    } catch (e) { }
  }

  // 2. In-Memory Fallback Lock
  if (updateKey && userActionLocks.has(updateKey)) {
    if (ctx.callbackQuery) {
      try { await ctx.answerCallbackQuery(); } catch (e) { }
    }
    return;
  }

  if (updateKey) {
    userActionLocks.add(updateKey);
  }

  if (ctx.chat?.id) {
    const chatId = ctx.chat.id;
    try {
      await ctx.api.sendChatAction(chatId, 'typing');
    } catch (e) { }

    const interval = setInterval(async () => {
      try {
        await ctx.api.sendChatAction(chatId, 'typing');
      } catch (e) { }
    }, 4000);

    try {
      await next();
    } finally {
      clearInterval(interval);
      if (updateKey) {
        userActionLocks.delete(updateKey);
      }
    }
  } else {
    try {
      await next();
    } finally {
      if (updateKey) {
        userActionLocks.delete(updateKey);
      }
    }
  }
});

// COMMANDS
bot.command('start', startCommand);
bot.command('grammar', grammarCommand);
bot.command('lesson', lessonCommand);
bot.command('level', levelCommand);
bot.command('plan', async (ctx) => {
  if (!ctx.from) return;
  const progress = await getPlanProgress(ctx.from.id);
  await startPlanLesson(ctx, progress.currentDay || 1);
});
bot.command('myplan', async (ctx) => {
  if (!ctx.from) return;
  const progress = await getPlanProgress(ctx.from.id);
  await startPlanLesson(ctx, progress.currentDay || 1);
});
bot.command(['listen', 'listening'], async (ctx) => {
  if (!ctx.from) return;
  await startPlanLesson(ctx, 1, 'Listening');
});
bot.command('referral_link', referralCommand);
bot.command('referral', referralCommand);
bot.command('hack', referralCommand);
bot.command('hack_bot', referralCommand);
bot.command('translation', translationCommand);
bot.command('help', helpCommand);
bot.command('usage', usageCommand);
bot.command('quiz', quizCommand);
bot.command('assessment', assessmentCommand);
bot.command('test', assessmentCommand);
bot.command('certificate', sendCertificate);
bot.command('report', sendCertificate);
bot.command('challenge', challengeCommand);
bot.command('daily_challenge', challengeCommand);
bot.command('pay', handlePaymentCommand);
bot.command('subscribe', handlePaymentCommand);

bot.command('admin_status', adminStatusCommand);
bot.command(['intel', 'digest', 'admin_intel'], adminIntelligenceCommand);

// Handle Spoken Voice Notes & Audio Clips (Diagnostic Speaking Assessment)
bot.on(['message:voice', 'message:audio'], async (ctx) => {
  await handleAssessmentVoiceSubmission(ctx);
});

// Stop daily challenge notifications
bot.command('stop_daily', async (ctx) => {
  if (!ctx.from) return;
  await setNotifyPreference(ctx.from.id, 'no');
  await ctx.reply(
    `🔕 <b>Daily challenge notifications stopped.</b>\n\nYou can always re-enable them by clicking <b>🔥 Daily Challenge</b> and opting in again.`,
    { parse_mode: 'HTML' }
  );
});

// Utility to extract File IDs for media (GIFs, Animations, Videos, Documents, Photos)
bot.on('message:animation', async (ctx) => {
  const fileId = ctx.message.animation.file_id;
  console.log('\n====================================');
  console.log('🎬 ANIMATION / GIF FILE ID RECEIVED:');
  console.log(`User: ${ctx.from?.id} (@${ctx.from?.username || 'no_user'})`);
  console.log(fileId);
  console.log('====================================\n');
  await ctx.reply(`🎬 <b>Here is the file_id for this GIF:</b>\n\n<code>${fileId}</code>`, { parse_mode: 'HTML' });
});

bot.on('message:document', async (ctx) => {
  const doc = ctx.message.document;
  const fileId = doc.file_id;
  const fileName = doc.file_name || 'file';
  const mimeType = doc.mime_type || '';
  const isGif = fileName.toLowerCase().endsWith('.gif') || mimeType.includes('gif');

  console.log('\n====================================');
  console.log(`📄 DOCUMENT FILE ID RECEIVED (${fileName}, ${mimeType}):`);
  console.log(`User: ${ctx.from?.id} (@${ctx.from?.username || 'no_user'})`);
  console.log(fileId);
  console.log('====================================\n');

  const header = isGif ? '🎬 <b>Here is the file_id for this GIF:</b>' : `📄 <b>Here is the file_id for ${fileName}:</b>`;
  await ctx.reply(`${header}\n\n<code>${fileId}</code>`, { parse_mode: 'HTML' });
});

bot.on('message:video', async (ctx) => {
  const fileId = ctx.message.video.file_id;
  console.log('\n====================================');
  console.log('🎥 VIDEO FILE ID RECEIVED:');
  console.log(`User: ${ctx.from?.id} (@${ctx.from?.username || 'no_user'})`);
  console.log(fileId);
  console.log('====================================\n');
  await ctx.reply(`🎥 <b>Here is the exact VIDEO file_id:</b>\n\n<code>${fileId}</code>`, { parse_mode: 'HTML' });
});

bot.on('message:photo', async (ctx) => {
  const photos = ctx.message.photo;
  const fileId = photos[photos.length - 1]?.file_id;
  if (fileId) {
    console.log('\n====================================');
    console.log('📸 PHOTO FILE ID RECEIVED:');
    console.log(`User: ${ctx.from?.id} (@${ctx.from?.username || 'no_user'})`);
    console.log(fileId);
    console.log('====================================\n');
    await ctx.reply(`📸 <b>Here is the PHOTO file_id:</b>\n\n<code>${fileId}</code>`, { parse_mode: 'HTML' });
  }
});

// Catch all text messages
bot.on('message:text', async (ctx) => {
  if (!ctx.from) return;

  const text = ctx.message.text;

  // 1. Admin 2-Way Live Relay: Handle Admin replying to user support messages
  if (ctx.from.id === ADMIN_TELEGRAM_ID) {
    if (text.startsWith('/reply ')) {
      const parts = text.split(' ');
      const targetId = parseInt(parts[1], 10);
      const replyContent = parts.slice(2).join(' ');
      if (targetId && replyContent) {
        try {
          await bot.api.sendMessage(targetId, `💬 *Maraki Support Team:*\n\n${replyContent}`, { parse_mode: 'Markdown' });
          await ctx.reply(`✅ Reply delivered to user \`${targetId}\`!`, { parse_mode: 'Markdown' });
          return;
        } catch (err: any) {
          await ctx.reply(`❌ Failed to send: ${err.message}`);
          return;
        }
      }
    }

    if (ctx.message.reply_to_message?.text || ctx.message.reply_to_message?.caption) {
      const parentText = ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption || '';
      const match = parentText.match(/(?:User ID|ID):\s*`?(\d+)`?/i) || parentText.match(/id=(\d+)/i);
      if (match && match[1]) {
        const targetId = parseInt(match[1], 10);
        try {
          await bot.api.sendMessage(targetId, `💬 *Maraki Support Team:*\n\n${text}`, { parse_mode: 'Markdown' });
          await ctx.reply(`✅ Reply delivered to user \`${targetId}\`!`, { parse_mode: 'Markdown' });
          return;
        } catch (err: any) {
          await ctx.reply(`❌ Delivery failed: ${err.message}`);
          return;
        }
      }
    }
  }

  // Handle custom text feedback from survey "Something else" selection
  if (awaitingSurveyTextUsers.has(ctx.from.id)) {
    awaitingSurveyTextUsers.delete(ctx.from.id);
    const customReason = text.trim();
    
    console.log(`\n======================================================`);
    console.log(`💬 [USER CUSTOM SURVEY FEEDBACK RECEIVED]`);
    console.log(`👤 Telegram ID: ${ctx.from.id}`);
    console.log(`✍️ Feedback Text: "${customReason}"`);
    console.log(`======================================================\n`);

    // Save custom feedback to backend
    apiService.saveSurveyStep2(ctx.from.id, `other: ${customReason}`).catch((err: any) => {
      console.error('[Survey Custom Text Save ERROR]:', err?.message);
    });

    await ctx.reply("🎉 Thank you so much for sharing your detailed feedback! We've saved your response.");
    return;
  }

  // Auto-detect bank receipt links or tokens (e.g. mbreciept.cbe.com.et, receipts.dashenbanksc.com, or receipt.dashensuperapp.com)
  if (
    text.includes('cbe.com.et') ||
    text.includes('dashenbanksc.com') ||
    text.includes('dashensuperapp.com') ||
    text.includes('transactioninfo.ethiotelecom.et') ||
    text.includes('ethiotelecom.et') ||
    text.toLowerCase().includes('telebirr') ||
    text.toLowerCase().includes('dashen') ||
    (text.startsWith('v2-') && text.length > 8)
  ) {
    await handleReceiptVerification(ctx, text);
    return;
  }

  const session = await getSession(ctx.from.id);

  // Handle session modes
  if (session?.mode === 'support_chat') {
    await setSession(ctx.from.id, { ...session, mode: undefined });
    const user = ctx.from;
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
    const username = user.username ? `@${user.username}` : 'No username';

    await bot.api.sendMessage(
      ADMIN_TELEGRAM_ID,
      `📩 *New In-Bot Support Message*\n\n` +
      `👤 *From:* ${name} (${username})\n` +
      `🆔 *User ID:* \`${user.id}\`\n\n` +
      `💬 *Message:*\n${text}\n\n` +
      `👇 *To reply, simply use Telegram's Reply feature on this message!*`,
      { parse_mode: 'Markdown' }
    );

    await ctx.reply(`✅ *Support message sent!* Our team will reply to you directly inside this bot chat.`, { parse_mode: 'Markdown' });
    return;
  } else if (session?.mode === 'awaiting_receipt') {
    await setSession(ctx.from.id, { ...session, mode: undefined });
    await handleReceiptVerification(ctx, text);
    return;
  } else if (session?.mode === 'lesson' || session?.mode === 'lesson_awaiting_topic') {
    const { handleLessonResponse } = await import('../commands/lesson.comand.js');
    await handleLessonResponse(ctx);
  } else if (session?.mode === 'lesson_followup') {
    const { handleLessonFollowup } = await import('../commands/lesson.comand.js');
    await handleLessonFollowup(ctx);
  } else if (session?.mode === 'in_assessment') {
    const rawText = text.trim();
    const lowerText = rawText.toLowerCase();

    // Check for cancel
    if (
      lowerText === '❌ cancel assessment' ||
      lowerText === 'cancel' ||
      lowerText === '/cancel' ||
      lowerText === 'ሰርዝ' ||
      lowerText === 'stop' ||
      lowerText === 'exit'
    ) {
      await setSession(ctx.from.id, { mode: null, timestamp: Date.now() });
      await ctx.reply('❌ <b>Assessment cancelled.</b> You can restart anytime with /assessment.', {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    // Map A, B, C, D (or 1, 2, 3, 4) to option index
    let optionIndex = -1;
    if (lowerText === 'a' || lowerText === '1' || lowerText.startsWith('a.') || lowerText.startsWith('a)')) {
      optionIndex = 0;
    } else if (lowerText === 'b' || lowerText === '2' || lowerText.startsWith('b.') || lowerText.startsWith('b)')) {
      optionIndex = 1;
    } else if (lowerText === 'c' || lowerText === '3' || lowerText.startsWith('c.') || lowerText.startsWith('c)')) {
      optionIndex = 2;
    } else if (lowerText === 'd' || lowerText === '4' || lowerText.startsWith('d.') || lowerText.startsWith('d)')) {
      optionIndex = 3;
    }

    if (optionIndex !== -1) {
      const qIndex = session.questionIndex ?? 0;
      await handleAssessmentAnswer(ctx, qIndex, optionIndex);
      return;
    }

    await ctx.reply('⚠️ Please reply by tapping <b>A</b>, <b>B</b>, <b>C</b>, or <b>D</b> (or tap ❌ Cancel Assessment).', {
      parse_mode: 'HTML',
    });
    return;
  } else if (session?.mode === 'assessment_awaiting_voice') {
    const rawText = text.trim().toLowerCase();
    if (
      rawText === 'skip' ||
      rawText === '/skip' ||
      rawText.includes('skip') ||
      rawText === 'ዝለል'
    ) {
      await skipAssessmentVoice(ctx);
      return;
    }
    if (rawText === 'cancel' || rawText === '/cancel' || rawText === 'stop' || rawText === 'ሰርዝ') {
      await setSession(ctx.from.id, { mode: null, timestamp: Date.now() });
      await ctx.reply('❌ <b>Assessment cancelled.</b> You can restart anytime with /assessment.', {
        parse_mode: 'HTML',
        reply_markup: { remove_keyboard: true },
      });
      return;
    }
    await ctx.reply(
      '🎙️ <b>Speaking Diagnostic in Progress:</b>\n\n' +
      '💪 <i>አይጨነቁ   ፍጹም እንግሊዝኛ መናገር አይጠበቅብዎትም! ጥቂት አረፍተ-ነገሮች ብቻ በቂ ናቸው።</i>\n\n' +
      'Please hold down your Telegram microphone button to send a short <b>15–30 second voice note</b> in English, or type /skip to complete without speaking.',
      {
        parse_mode: 'HTML',
      }
    );
    return;
  } else if (session?.mode === 'chat_conversation') {
    await handleChatConversation(ctx);
  } else if (session?.mode === 'translation') {
    await handleTranslation(ctx);
  } else {
    if (text?.startsWith('/')) {
      await ctx.reply(
        `❓ Unknown command: "${text}"\n\n` +
        `Here are the available commands:\n` +
        `/start - Main Menu\n` +
        `/pay - 💳 Subscription & Bank Transfer\n` +
        `/grammar - 🧹 Correct your sentence\n` +
        `/lesson - ✨ Learn English\n` +
        `/quiz - 🧠 Take a quiz\n` +
        `/translation - 🌐 Amharic to English translation\n` +
        `/referral_link - 🔗 Get your referral link\n` +
        `/level - 📊 Check your level\n` +
        `/usage - 📊 Check usage limits\n` +
        `/help - ❓ Get help\n\n` +
        `Or paste your CBE/Dashen receipt link here to activate Maraki VIP! 🚀`
      );
    } else {
      await chatMode(ctx);
    }
  }
});

// Callback query handler for buttons
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!ctx.from) {
    return ctx.answerCallbackQuery('⚠️ Could not get your Telegram ID.');
  }

  try {
    await ctx.answerCallbackQuery();
  } catch (e) { }

  if (['beginner', 'intermediate', 'advanced'].includes(data)) {
    let newLevel = 'beginner';
    switch (data) {
      case 'beginner':
        newLevel = 'beginner';
        break;
      case 'intermediate':
        newLevel = 'intermediate';
        break;
      case 'advanced':
        newLevel = 'advanced';
        break;
    }
    try {
      await updateUserLevel(ctx.from.id, newLevel);
      const formattedLevel = newLevel.toUpperCase();
      await ctx.reply(
        `🎯 <b>English Level Updated!</b>\n\n` +
        `Your level is now set to <b>${formattedLevel}</b>. All future AI quizzes, lessons, and daily challenges will adapt to your new difficulty! 🚀`,
        { parse_mode: 'HTML' }
      );
      // Re-render level progress dashboard to visually reflect the change
      await levelCommand(ctx);
    } catch (error) {
      await ctx.reply('❌ Failed to update level. Please try again.');
    }
  } else {
    switch (data) {
      case 'check_channel_join':
        const { checkChannelMembership } = await import('../utils/channel-check.util.js');
        const isMember = await checkChannelMembership(ctx);
        if (isMember) {
          try { await ctx.deleteMessage(); } catch (e) { }
          await ctx.reply("✅ *ስለተቀላቀሉን እናመሰግናለን!* አሁን Maraki AIን ሙሉ በሙሉ መጠቀም ይችላሉ።", { parse_mode: 'Markdown' });
          const { startCommand } = await import('../commands/start.command.js');
          await startCommand(ctx);
        }
        break;
      case 'subscribe':
      case 'pay':
        await handlePaymentCommand(ctx);
        break;
      case 'pay_weekly':
      case 'pay_monthly':
      case 'pay_quarterly':
      case 'pay_yearly':
        await handlePaymentSelection(ctx, data);
        break;
      case 'submit_receipt_prompt':
        await setSession(ctx.from.id, { mode: 'awaiting_receipt', timestamp: Date.now(), userId: ctx.from.id });
        await ctx.reply(
          `🧾 *Submit Your Payment Receipt*\n\n` +
          `Please paste your **CBE, Dashen, or Telebirr receipt link** (or transaction reference number) directly in this chat below:\n\n` +
          `*Supported Link Examples:*\n` +
          `• \`https://receipts.dashenbanksc.com/receipt/XXXXX\`\n` +
          `• \`https://mbreciept.cbe.com.et/v2-XXXXXX\`\n` +
          `• \`https://transactioninfo.ethiotelecom.et/receipt/XXXXX\`\n` +
          `• Transaction Reference: \`XXXXX\`\n\n` +
          `⚡ Our automated system will verify your receipt with the bank network instantly!`,
          { parse_mode: 'Markdown' }
        );
        break;
      case 'contact_support':
        await setSession(ctx.from.id, { mode: 'support_chat', timestamp: Date.now(), userId: ctx.from.id });
        await ctx.reply(
          `💬 *Maraki Customer Support*\n\n` +
          `Please type your question or support request below.\n` +
          `Our support team will reply directly to you inside this bot chat! 🚀`,
          { parse_mode: 'Markdown' }
        );
        break;
      case 'grammar':
        await setSession(ctx.from.id, { menu: data, timestamp: Date.now(), userId: ctx.from.id });
        await grammarCommand(ctx);
        break;
      case 'lesson':
      case 'lesson_back_to_parts':
        await setSession(ctx.from.id, { mode: 'lesson', timestamp: Date.now(), userId: ctx.from.id });
        await lessonCommand(ctx);
        break;
      case 'lesson_start_rec': {
        const session = await getSession(ctx.from.id);
        const topic = session?.recommendedTopic || 'General English Grammar';
        await generateAndSendLesson(ctx, topic);
        break;
      }
      case 'lesson_custom_input': {
        const existingSession = await getSession(ctx.from.id) || {};
        await setSession(ctx.from.id, { ...existingSession, mode: 'lesson_awaiting_topic', timestamp: Date.now(), userId: ctx.from.id });
        await ctx.reply('✏️ *Type Your Preferred Lesson Topic*\n\nPlease type any topic you would like to learn about today (e.g., *"Past Continuous Tense"*, *"Business Emails"*, *"Phrasal Verbs"*):', { parse_mode: 'Markdown' });
        break;
      }
      case 'lesson_followup_ask': {
        const existingSession = await getSession(ctx.from.id) || {};
        await setSession(ctx.from.id, { ...existingSession, mode: 'lesson_followup', timestamp: Date.now(), userId: ctx.from.id });
        await ctx.reply('❓ *Ask a Question about this Lesson*\n\nPlease type your question below and I will explain it for you! 😊', { parse_mode: 'Markdown' });
        break;
      }
      case 'chat_conversation':
        await setSession(ctx.from.id, { mode: data, timestamp: Date.now(), userId: ctx.from.id });
        await startChatConversation(ctx);
        break;
      case 'translation':
        await setSession(ctx.from.id, { mode: data, timestamp: Date.now(), userId: ctx.from.id });
        await startTranslation(ctx);
        break;
      case 'quiz':
        await quizCommand(ctx);
        break;
      case 'level':
        await levelCommand(ctx);
        break;
      case 'assessment':
      case 'start_assessment':
        await startAssessmentSession(ctx);
        break;
      case 'assess_skip_voice':
        await skipAssessmentVoice(ctx);
        break;
      case 'view_weekly_plan':
        await sendWeeklyPlan(ctx);
        break;
      case 'view_certificate':
      case 'view_report':
      case 'certificate':
      case 'report':
        await sendCertificate(ctx);
        break;
      case 'close_assessment':
        await setSession(ctx.from.id, { mode: null, timestamp: Date.now() });
        try {
          await ctx.reply('❌ Assessment closed.', { reply_markup: { remove_keyboard: true } });
        } catch (e) {}
        return ctx.deleteMessage();
      case 'referral':
      case 'referral_link':
        await referralCommand(ctx);
        break;
      case 'start_plan_lesson_1':
      case 'start_plan_lesson':
        await startPlanLesson(ctx, 1);
        break;
      case 'daily_challenge':
      case 'challenge':
        await challengeCommand(ctx);
        break;
      case 'close':
        return ctx.deleteMessage();
      case 'admin_intel_refresh':
      case 'admin_status_refresh':
        await handleAdminCallback(ctx, data);
        return;
      default:
        if (data.startsWith('start_plan_lesson_')) {
          const dayNum = parseInt(data.replace('start_plan_lesson_', ''), 10);
          await startPlanLesson(ctx, isNaN(dayNum) ? 1 : dayNum);
          return;
        }
        if (data.startsWith('plan_ans_')) {
          const parts = data.replace('plan_ans_', '').split('_');
          const weakness = parts[0];
          const day = parseInt(parts[1], 10);
          const opt = parseInt(parts[2], 10);
          if (!isNaN(day) && !isNaN(opt)) {
            await handlePlanLessonAnswer(ctx, weakness, day, opt);
            return;
          }
        }
        if (data.startsWith('assess_ans_')) {
          const parts = data.replace('assess_ans_', '').split('_');
          const qIndex = parseInt(parts[0], 10);
          const optIndex = parseInt(parts[1], 10);
          if (!isNaN(qIndex) && !isNaN(optIndex)) {
            await handleAssessmentAnswer(ctx, qIndex, optIndex);
            return;
          }
        }
        if (data.startsWith('admin_followup_') || data.startsWith('admin_discount_') || data.startsWith('admin_approve_')) {
          await handleAdminFollowupAction(ctx, data);
          return;
        }
        if (data.startsWith('quiz_answer_')) {
          const answerIndex = parseInt(data.replace('quiz_answer_', ''), 10);
          if (!isNaN(answerIndex)) {
            await handleQuizAnswer(ctx, answerIndex);
            return;
          }
        }
        if (data.startsWith('survey1_')) {
          await handleSurvey1(ctx, data);
          return;
        }
        if (data.startsWith('survey2_')) {
          await handleSurvey2(ctx, data);
          return;
        }
        if (data.startsWith('challenge_ans_')) {
          const isCorrect = data.startsWith('challenge_ans_correct_');
          await ctx.reply(isCorrect ? "✅ Correct! Great job! 🎉" : "❌ Incorrect! Keep trying!");
          return;
        }
        if (data === 'daily_notify_yes') {
          await setNotifyPreference(ctx.from.id, 'yes');
          await ctx.reply(
            `✅ <b>You're all set!</b> Your Daily Challenge will be delivered every morning.\n\nTo stop anytime, use /stop_daily.`,
            { parse_mode: 'HTML' }
          );
          return;
        }
        if (data === 'daily_notify_no') {
          await setNotifyPreference(ctx.from.id, 'no');
          await ctx.reply(
            `No problem! You can always come back and tap <b>🔥 Daily Challenge</b> anytime. 😊`,
            { parse_mode: 'HTML' }
          );
          return;
        }
        return ctx.answerCallbackQuery('❓ Unknown action.');
    }
    await ctx.answerCallbackQuery();
  }
});

export { notifyAdminOnError, ADMIN_TELEGRAM_ID };

// Global error handler for all bot operations
bot.catch(async (err) => {
  const errAny = err as any;
  const errorMsg = String(errAny?.error?.message || errAny?.error || err || '');
  const isBenign =
    errorMsg.includes('bot was blocked by the user') ||
    errorMsg.includes('query is too old') ||
    errorMsg.includes('message to edit not found') ||
    errorMsg.includes('message is not modified');

  if (isBenign) {
    console.warn(`[Benign Telegram Error Ignored]: ${errorMsg}`);
    return;
  }

  console.error(`Error while handling update ${err.ctx.update?.update_id}:`, err.error);
  await notifyAdminOnError(err.ctx, err.error, `Global Handler (Update ${err.ctx.update?.update_id})`);
});
