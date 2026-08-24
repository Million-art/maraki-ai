import express from 'express';
import dotenv from 'dotenv';
import { connectRedis } from './utils/redis.js';
import { bot } from './adapters/telegram.adapter.js';
import { getOptedInUserIds } from './utils/daily-notify.util.js';
import { buildDailyChallengeMessage } from './commands/challenge.command.js';
dotenv.config();
const app = express();
const port = process.env.PORT || 1000;
// Middleware
app.use(express.json({ limit: '5mb' }));
// Track initialization state
let isInitialized = false;
let initializationPromise = null;
// Initialize connections once
const initialize = async () => {
    if (isInitialized) {
        return;
    }
    if (initializationPromise) {
        return initializationPromise;
    }
    initializationPromise = (async () => {
        try {
            await connectRedis();
            await bot.init();
            console.log('Bot initialized');
            // Enable Long Polling if USE_POLLING=true OR DEV_BOT_TOKEN is set for local dev
            const isDevBot = !!process.env.DEV_BOT_TOKEN;
            const usePolling = process.env.USE_POLLING === 'true' || isDevBot;
            let webhookUrl = usePolling ? null : process.env.WEBHOOK_URL;
            if (webhookUrl && webhookUrl.includes('alertmanager.ptgr.io')) {
                webhookUrl = 'https://alert.carramarket.com/webhook';
            }
            if (webhookUrl) {
                try {
                    const webhookInfo = await bot.api.getWebhookInfo();
                    if (webhookInfo.url !== webhookUrl) {
                        await bot.api.setWebhook(webhookUrl);
                        console.log('Webhook set to:', webhookUrl);
                    }
                    else {
                        console.log('Webhook already set to:', webhookUrl);
                    }
                }
                catch (error) {
                    if (error.error_code === 429) {
                        console.log('Rate limited on setWebhook, webhook likely already configured');
                    }
                    else {
                        throw error;
                    }
                }
            }
            else {
                // Clear any existing Webhook and start Long Polling
                try {
                    await bot.api.deleteWebhook();
                    console.log('Cleared Telegram webhook');
                }
                catch (e) {
                    // Ignore if no webhook was set
                }
                bot.start();
                console.log('🤖 Bot started in Long Polling mode (Development / Continuous Listener)');
            }
            isInitialized = true;
        }
        catch (error) {
            console.error('Failed to initialize:', error);
            initializationPromise = null;
            throw error;
        }
    })();
    return initializationPromise;
};
// Health check endpoint
app.get('/', (req, res) => {
    res.send('Practice English is running');
});
// Secured daily challenge broadcast endpoint — triggered by GitHub Actions cron
app.post('/cron/daily-challenge', async (req, res) => {
    const secret = process.env.CRON_SECRET;
    const authHeader = req.headers['authorization'];
    if (!secret || authHeader !== `Bearer ${secret}`) {
        res.status(401).json({
            error: 'Unauthorized',
            debug: {
                serverHasSecret: !!secret,
                serverSecretLength: secret ? secret.length : 0,
                receivedHeader: authHeader ? authHeader.substring(0, 10) + '...' : 'none'
            }
        });
        return;
    }
    try {
        const userIds = await getOptedInUserIds();
        console.log(`[Daily Broadcast] Sending to ${userIds.length} opted-in users`);
        let sent = 0;
        let failed = 0;
        for (const userId of userIds) {
            try {
                // Simulate a minimal context to reuse challengeCommand
                const chat = await bot.api.getChat(userId).catch(() => null);
                if (!chat) {
                    failed++;
                    continue;
                }
                // Rate-limit: Telegram allows ~30 msgs/sec. 50ms gap = safe.
                await new Promise(r => setTimeout(r, 50));
                // Build a minimal fake context to call existing challenge logic
                await bot.api.sendChatAction(userId, 'typing').catch(() => { });
                // Import builder to generate fresh challenge for this user
                const { text, keyboard } = await buildDailyChallengeMessage(userId);
                await bot.api.sendMessage(userId, text, { parse_mode: 'HTML', reply_markup: keyboard });
                sent++;
            }
            catch (e) {
                console.error(`[Daily Broadcast] Error sending to user ${userId}:`, e.message || e);
                // User blocked the bot or account deleted — silently skip
                failed++;
            }
        }
        console.log(`[Daily Broadcast] Done. Sent: ${sent}, Failed/Skipped: ${failed}`);
        res.json({ success: true, sent, failed });
    }
    catch (error) {
        console.error('[Daily Broadcast] Error:', error);
        res.status(500).json({ error: 'Broadcast failed' });
    }
});
// Internal Webhook: Direct Message Dispatch from Dashboard-Backend
app.post('/internal/send-message', async (req, res) => {
    const { telegramId, text } = req.body;
    if (!telegramId || !text) {
        res.status(400).json({ error: 'Invalid payload' });
        return;
    }
    try {
        await bot.api.sendMessage(telegramId, text, { parse_mode: 'Markdown' });
        console.log(`[Send Message Webhook] Sent message to ${telegramId}`);
        res.status(200).json({ success: true });
    }
    catch (e) {
        console.error(`[Send Message Webhook] Failed to send message to ${telegramId}:`, e.message);
        res.status(500).json({ error: e.message });
    }
});
const broadcastJobs = new Map();
// Internal Webhook: Batch Broadcast Dispatch (Non-Blocking for 10k+ users)
app.post('/internal/broadcast-message', async (req, res) => {
    const { targetTelegramIds, text, parseMode = 'HTML', buttonText, buttonUrl, broadcastId: customId, stickerFileId, animationFileId, videoFileId, photoFileId, imageUrl } = req.body;
    if (!Array.isArray(targetTelegramIds) || targetTelegramIds.length === 0 || !text) {
        res.status(400).json({ error: 'Invalid broadcast payload. targetTelegramIds (array) and text required.' });
        return;
    }
    const broadcastId = customId || `bcast_${Date.now()}`;
    console.log(`[Broadcast Webhook] Queuing background broadcast (${broadcastId}) for ${targetTelegramIds.length} users...`);
    // Auto-sanitize HTML for Telegram (convert <br>, <br/>, </br> to real newlines)
    const sanitizedText = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/br>/gi, '\n');
    let reply_markup = undefined;
    if (buttonText && buttonUrl) {
        const cleanUrl = buttonUrl.trim();
        const isCommandCallback = !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://');
        if (isCommandCallback) {
            const callbackData = cleanUrl.replace(/^\//, '').replace(/^cmd:/i, '').replace(/^callback:/i, '').trim();
            reply_markup = { inline_keyboard: [[{ text: buttonText, callback_data: callbackData || 'quiz' }]] };
        }
        else {
            const isWebApp = cleanUrl.includes('.vercel.app') ||
                cleanUrl.includes('maraki-mini-app');
            if (isWebApp) {
                reply_markup = { inline_keyboard: [[{ text: buttonText, web_app: { url: cleanUrl } }]] };
            }
            else {
                reply_markup = { inline_keyboard: [[{ text: buttonText, url: cleanUrl }]] };
            }
        }
    }
    const job = {
        id: broadcastId,
        status: 'PROCESSING',
        sent: 0,
        failed: 0,
        total: targetTelegramIds.length,
        details: [],
        createdAt: Date.now(),
    };
    broadcastJobs.set(broadcastId, job);
    // Immediately respond to caller (Prevents Vercel/HTTP 504 Timeouts for 10k+ scale)
    res.status(200).json({
        success: true,
        broadcastId,
        total: job.total,
        status: 'PROCESSING',
        message: `Broadcast queued for ${job.total} users.`,
    });
    // Run batch delivery in non-blocking background loop
    (async () => {
        for (const telegramId of targetTelegramIds) {
            try {
                if (photoFileId || imageUrl) {
                    await bot.api.sendPhoto(telegramId, photoFileId || imageUrl, {
                        caption: sanitizedText,
                        parse_mode: parseMode === 'Markdown' ? 'Markdown' : 'HTML',
                        reply_markup,
                    });
                }
                else if (videoFileId) {
                    await bot.api.sendVideo(telegramId, videoFileId, {
                        caption: sanitizedText,
                        parse_mode: parseMode === 'Markdown' ? 'Markdown' : 'HTML',
                        reply_markup,
                    });
                }
                else {
                    if (stickerFileId) {
                        await bot.api.sendSticker(telegramId, stickerFileId).catch((stkErr) => {
                            console.warn(`[Broadcast Webhook] Sticker send failed for ${telegramId}: ${stkErr.message}`);
                        });
                    }
                    else if (animationFileId) {
                        await bot.api.sendAnimation(telegramId, animationFileId).catch((animErr) => {
                            console.warn(`[Broadcast Webhook] Animation GIF send failed for ${telegramId}: ${animErr.message}`);
                        });
                    }
                    await bot.api.sendMessage(telegramId, sanitizedText, {
                        parse_mode: parseMode === 'Markdown' ? 'Markdown' : 'HTML',
                        reply_markup,
                    });
                }
                job.sent++;
                job.details.push({ telegramId: Number(telegramId), status: 'SUCCESS' });
                // Throttling gap (40ms) to respect Telegram API rate limits (~25 msg/sec)
                await new Promise(r => setTimeout(r, 40));
            }
            catch (e) {
                console.error(`[Broadcast Webhook] Parse mode failed for ${telegramId}: ${e.message}. Retrying fallback...`);
                try {
                    const cleanText = text.replace(/<[^>]*>?/gm, '');
                    await bot.api.sendMessage(telegramId, cleanText, { reply_markup });
                    job.sent++;
                    job.details.push({ telegramId: Number(telegramId), status: 'SUCCESS' });
                    await new Promise(r => setTimeout(r, 40));
                }
                catch (fallbackErr) {
                    console.error(`[Broadcast Webhook] Delivery failed for ${telegramId}:`, fallbackErr.message);
                    job.failed++;
                    job.details.push({ telegramId: Number(telegramId), status: 'FAILED', error: fallbackErr.message || e.message });
                }
            }
        }
        job.status = 'COMPLETED';
        console.log(`[Broadcast Webhook] Background job ${broadcastId} completed. Sent: ${job.sent}, Failed: ${job.failed}`);
    })();
});
// Internal Webhook: Targeted Survey Broadcast
app.post('/internal/survey-broadcast', async (req, res) => {
    const token = req.headers['x-internal-token'];
    const expectedToken = process.env.INTERNAL_API_TOKEN || 'dev-internal-token-123';
    if (token && token !== expectedToken) {
        res.status(401).json({ error: 'Unauthorized internal request' });
        return;
    }
    const { targetTelegramIds } = req.body;
    if (!Array.isArray(targetTelegramIds) || targetTelegramIds.length === 0) {
        res.status(400).json({ error: 'Invalid payload. targetTelegramIds required.' });
        return;
    }
    console.log(`[Survey Webhook] Queuing survey for ${targetTelegramIds.length} users...`);
    const text = `🗣️ We want to make Maraki better for you!

If Maraki could help you with one thing every day, what would you choose?

Choose what would make you want to come back and practice every day 👇`;
    const reply_markup = {
        inline_keyboard: [
            [{ text: '🗣️ Better speaking practice', callback_data: 'survey1_speak' }],
            [{ text: '🇬🇧 Grammar correction', callback_data: 'survey1_grammar' }],
            [{ text: '💼 Interview preparation', callback_data: 'survey1_interview' }],
            [{ text: '📚 English lessons', callback_data: 'survey1_lessons' }],
            [{ text: '🎯 Personalized learning plan', callback_data: 'survey1_plan' }],
            [{ text: '💰 Lower price', callback_data: 'survey1_price' }],
            [{ text: '🤔 Something else', callback_data: 'survey1_other' }],
        ]
    };
    res.status(200).json({ success: true, message: `Survey queued for ${targetTelegramIds.length} users.` });
    (async () => {
        try {
            await initialize();
        }
        catch (err) {
            console.error('[Survey Webhook] Initialization warning:', err?.message);
        }
        for (const telegramId of targetTelegramIds) {
            try {
                await bot.api.sendMessage(telegramId, text, { reply_markup });
                await new Promise(r => setTimeout(r, 40));
            }
            catch (e) {
                console.error(`[Survey Webhook] Failed for ${telegramId}:`, e.message);
            }
        }
        console.log(`[Survey Webhook] Completed survey broadcast.`);
    })();
});
// GET Endpoint to poll status of background broadcast
app.get('/internal/broadcast-status/:id', (req, res) => {
    const job = broadcastJobs.get(req.params.id);
    if (!job) {
        res.status(404).json({ success: false, error: 'Broadcast job not found' });
        return;
    }
    res.status(200).json({ success: true, ...job });
});
// Webhook endpoint for Telegram
app.post('/webhook', async (req, res) => {
    try {
        // Ensure initialization is complete before handling updates
        await initialize();
        await bot.handleUpdate(req.body);
        res.sendStatus(200);
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(500);
    }
});
// Start HTTP server on Port 1000 immediately so internal webhooks are reachable
// regardless of Redis/bot initialization state.
if (!process.env.VERCEL) {
    const listenPort = Number(port) || 1000;
    app.listen(listenPort, '0.0.0.0', () => {
        console.log(`Compliance backend web service listening on 0.0.0.0:${listenPort}`);
    });
    // Initialize bot and Redis in the background after server is up
    initialize().catch((error) => {
        console.error('Failed to initialize bot:', error);
    });
}
// Export for Vercel serverless
export default app;
