import { Context } from 'grammy';
import { apiService } from '../services/api.service.js';

export async function usageCommand(ctx: Context) {
  if (!ctx.from) return;

  try {
    const usageStatus = await apiService.getUsageStatus(ctx.from.id);
    
    if (!usageStatus) {
      await ctx.reply("❌ Could not fetch your usage status. Please try again later.");
      return;
    }

    const { tier, daily, monthly, lastReset } = usageStatus;
    
    // Format the usage status message
    let message = `📊 **Your Token Usage Status**\n\n`;
    message += `🎯 **Plan:** ${tier.toUpperCase()}\n`;
    message += `🔄 **Last Reset:** ${new Date(lastReset).toLocaleDateString()}\n\n`;

    // Daily usage
    message += `📅 **Daily Tokens**\n`;
    const dailyProgressBar = createProgressBar(daily.used, daily.limit);
    const dailyStatusIcon = daily.remaining > 0 ? '✅' : '❌';
    message += `${dailyProgressBar} ${dailyStatusIcon}\n`;
    message += `${daily.used.toLocaleString()}/${daily.limit.toLocaleString()} tokens (${daily.remaining.toLocaleString()} left)\n\n`;

    // Monthly usage
    message += `📆 **Monthly Tokens**\n`;
    const monthlyProgressBar = createProgressBar(monthly.used, monthly.limit);
    const monthlyStatusIcon = monthly.remaining > 0 ? '✅' : '❌';
    message += `${monthlyProgressBar} ${monthlyStatusIcon}\n`;
    message += `${monthly.used.toLocaleString()}/${monthly.limit.toLocaleString()} tokens (${monthly.remaining.toLocaleString()} left)\n\n`;

    // Add upgrade suggestion if on free tier
    if (tier === 'free') {
      message += `💡 **Want more tokens?**\n`;
      message += `• Premium: 10x more daily tokens (10,000/day)\n`;
      message += `• Pro: 50x more daily tokens (50,000/day)\n`;
      message += `Use /premium to see pricing.`;
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Usage command error:', error);
    await ctx.reply("❌ An error occurred while fetching your usage status. Please try again later.");
  }
}

function createProgressBar(current: number, limit: number): string {
  const percentage = Math.min((current / limit) * 100, 100);
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;
  
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage)}%`;
}
