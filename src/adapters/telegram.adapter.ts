import { Bot } from 'grammy';
import { startCommand } from '../commands/start.command.js';
import { grammarCommand } from '../commands/grammar.command.js';
import { lessonCommand } from '../commands/lesson.comand.js';
import { chatMode } from '../commands/chat.command.js';
import { levelCommand } from '../commands/level.command.js';
import { referralCommand } from '../commands/referral.command.js';

const bot_token= process.env.TOKEN
if (!bot_token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env');
}
const bot = new Bot(bot_token);

////////     COMMANDS /////////////
////////     COMMANDS /////////////

bot.command('start', startCommand);
bot.command('grammar', grammarCommand);
bot.command('lesson', lessonCommand);
bot.command('level',levelCommand)
bot.command('referral_link',referralCommand)
// Catch all other messages
bot.on('message:text', chatMode);
 

bot.start();
console.log('Telegram bot is running...');
