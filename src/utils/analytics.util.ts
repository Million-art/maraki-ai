import { Context } from 'grammy';
import { redis } from './redis.js';

export const ADMIN_TELEGRAM_ID = 386095768;

// In-memory counter store fallback
const statsStore = {
  newUsers: 0,
  upgradeClicks: 0,
  paymentFailures: 0,
  paymentSuccesses: 0,
};

// Track and Notify New User Join
export async function trackNewUser(ctx: Context) {
  if (!ctx.from) return;

  // Prevent admin self-notifications
  if (ctx.from.id === ADMIN_TELEGRAM_ID) return;

  statsStore.newUsers++;
  try {
    if (redis.isOpen) {
      await redis.incr('analytics:new_users');
    }
  } catch (e) {}

  const user = ctx.from;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
  const username = user.username ? `@${user.username}` : 'No username';

  const alertMsg =
    `🆕 <b>New User Joined Maraki AI!</b>\n\n` +
    `👤 <b>Name:</b> ${name}\n` +
    `💬 <b>Username:</b> ${username}\n` +
    `🆔 <b>User ID:</b> <code>${user.id}</code>\n` +
    `📅 <b>Joined:</b> ${new Date().toLocaleString()}`;

  try {
    await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, alertMsg, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('Failed to notify admin of new user:', err);
  }
}

// Track and Notify Upgrade/Payment Click
export async function trackUpgradeIntent(ctx: Context) {
  if (!ctx.from) return;

  // Prevent admin self-notifications
  if (ctx.from.id === ADMIN_TELEGRAM_ID) return;

  statsStore.upgradeClicks++;
  try {
    if (redis.isOpen) {
      await redis.incr('analytics:upgrade_clicks');
    }
  } catch (e) {}

  const user = ctx.from;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
  const username = user.username ? `@${user.username}` : 'No username';

  const alertMsg =
    `💳 <b>User Clicked Upgrade / VIP!</b>\n\n` +
    `👤 <b>Name:</b> ${name}\n` +
    `💬 <b>Username:</b> ${username}\n` +
    `🆔 <b>User ID:</b> <code>${user.id}</code>\n` +
    `💡 <i>User is viewing bank details & pricing tiers. Follow up if they don't complete payment!</i>\n\n` +
    `👉 <a href="tg://user?id=${user.id}">Click here to message user directly</a>`;

  try {
    await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, alertMsg, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('Failed to notify admin of upgrade click:', err);
  }
}

// Track and Notify Payment Verification Attempt (Success / Failure)
export async function trackPaymentAttempt(ctx: Context, referenceText: string, result: { success: boolean; message?: string; result?: any }) {
  if (!ctx.from) return;

  const user = ctx.from;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User';
  const username = user.username ? `@${user.username}` : 'No username';

  if (result.success) {
    statsStore.paymentSuccesses++;
    try {
      if (redis.isOpen) {
        await redis.incr('analytics:payment_successes');
      }
    } catch (e) {}

    const alertMsg =
      `🎉 <b>Payment Verified & VIP Activated!</b>\n\n` +
      `👤 <b>Name:</b> ${name} (${username})\n` +
      `🆔 <b>ID:</b> <code>${user.id}</code>\n` +
      `🏦 <b>Bank:</b> ${result.result?.bankName || 'CBE'}\n` +
      `💰 <b>Amount:</b> ${result.result?.amount || 299} ETB\n` +
      `🧾 <b>Reference:</b> <code>${referenceText}</code>`;

    try {
      await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, alertMsg, { parse_mode: 'HTML' });
    } catch (err) {}
  } else {
    statsStore.paymentFailures++;
    try {
      if (redis.isOpen) {
        await redis.incr('analytics:payment_failures');
      }
    } catch (e) {}

    const alertMsg =
      `🚨 <b>Payment Verification Failed (Follow-up Required!)</b>\n\n` +
      `👤 <b>Name:</b> ${name}\n` +
      `💬 <b>Username:</b> ${username}\n` +
      `🆔 <b>User ID:</b> <code>${user.id}</code>\n` +
      `🧾 <b>Input:</b> <code>${referenceText.slice(0, 200)}</code>\n` +
      `❌ <b>Reason:</b> ${result.message || 'Transaction could not be verified'}\n\n` +
      `📲 <b>Follow-up Action:</b> Reach out to user to assist with their transfer!\n` +
      `👉 <a href="tg://user?id=${user.id}">Direct Message User</a>`;

    try {
      await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, alertMsg, { parse_mode: 'HTML' });
    } catch (err) {}
  }
}

// Get Analytics Stats for /admin_status
export async function getAnalyticsStats() {
  let newUsers = statsStore.newUsers;
  let upgradeClicks = statsStore.upgradeClicks;
  let paymentFailures = statsStore.paymentFailures;
  let paymentSuccesses = statsStore.paymentSuccesses;

  try {
    if (redis.isOpen) {
      const nu = await redis.get('analytics:new_users');
      const uc = await redis.get('analytics:upgrade_clicks');
      const pf = await redis.get('analytics:payment_failures');
      const ps = await redis.get('analytics:payment_successes');
      if (nu) newUsers = parseInt(nu, 10);
      if (uc) upgradeClicks = parseInt(uc, 10);
      if (pf) paymentFailures = parseInt(pf, 10);
      if (ps) paymentSuccesses = parseInt(ps, 10);
    }
  } catch (e) {}

  return {
    newUsers,
    upgradeClicks,
    paymentFailures,
    paymentSuccesses,
  };
}
