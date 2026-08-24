import { Context } from 'grammy';
import { apiService } from '../services/api.service.js';

// Set of Telegram IDs waiting to type a custom text response for survey
export const awaitingSurveyTextUsers = new Set<number>();

export async function handleSurvey1(ctx: Context, action: string) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // Answer callback query immediately to stop Telegram loading spinner
  await ctx.answerCallbackQuery().catch(() => {});

  const primaryChoice = action.replace('survey1_', '');

  // Persist response to backend in background
  apiService.saveSurveyStep1(telegramId, primaryChoice).catch((err: any) => {
    console.error(`[Survey1] Failed to save response for ${telegramId}:`, err?.message);
  });

  let text = '';
  let reply_markup: any = { inline_keyboard: [] };

  if (primaryChoice === 'speak') {
    text = "That's great! 🗣️ Just one last question: What makes speaking English difficult for you?";
    reply_markup.inline_keyboard = [
      [{ text: "🎤 I don't have anyone to practice with", callback_data: 'survey2_speak_nopartner' }],
      [{ text: "😰 I lack confidence", callback_data: 'survey2_speak_noconfidence' }],
      [{ text: "🔊 My pronunciation", callback_data: 'survey2_speak_pronunciation' }],
      [{ text: "🧠 I can't find the right words", callback_data: 'survey2_speak_nowords' }],
      [{ text: "⏱️ I don't have enough time", callback_data: 'survey2_speak_notime' }],
      [{ text: "🤔 Something else", callback_data: 'survey2_speak_other' }],
    ];
  } else if (primaryChoice === 'price') {
    text = "💰 Just one last question: What would feel like a reasonable price for practicing English with Maraki every week?";
    reply_markup.inline_keyboard = [
      [{ text: "50 ETB/week", callback_data: 'survey2_price_50' }],
      [{ text: "75 ETB/week", callback_data: 'survey2_price_75' }],
      [{ text: "I'd rather pay monthly", callback_data: 'survey2_price_monthly' }],
      [{ text: "Not about the price", callback_data: 'survey2_price_notprice' }],
    ];
  } else {
    text = "Got it! Just one last question: What is the main reason stopping you from practicing every day right now?";
    reply_markup.inline_keyboard = [
      [{ text: "⏱️ Not enough time", callback_data: 'survey2_gen_time' }],
      [{ text: "💸 Too expensive", callback_data: 'survey2_gen_expensive' }],
      [{ text: "😩 It feels like hard work", callback_data: 'survey2_gen_hard' }],
      [{ text: "🤔 Something else", callback_data: 'survey2_gen_other' }],
    ];
  }

  try {
    await ctx.editMessageText(text, { reply_markup });
  } catch (error) {
    console.error(`[Survey1] Failed to edit message for ${telegramId}:`, error);
  }
}

export async function handleSurvey2(ctx: Context, action: string) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  // Answer callback query immediately to stop Telegram loading spinner
  await ctx.answerCallbackQuery().catch(() => {});

  const followUpChoice = action.replace('survey2_', '');

  // Persist response to backend in background
  apiService.saveSurveyStep2(telegramId, followUpChoice).catch((err: any) => {
    console.error(`[Survey2] Failed to save response for ${telegramId}:`, err?.message);
  });

  if (followUpChoice.endsWith('_other') || followUpChoice === 'other') {
    awaitingSurveyTextUsers.add(telegramId);
    try {
      await ctx.editMessageText(
        "✍️ <b>Please type a short message below</b> telling us what else we can improve or help you with:",
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error(`[Survey2] Failed to edit message for ${telegramId}:`, error);
    }
    return;
  }

  try {
    await ctx.editMessageText("🎉 Thank you so much for your feedback! This really helps us make Maraki better for you.");
  } catch (error) {
    console.error(`[Survey2] Failed to edit message for ${telegramId}:`, error);
  }
}
