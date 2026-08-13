import express, { Response } from 'express'
import dotenv from 'dotenv'
import { connectRedis } from './utils/redis.js'
import { bot } from './adapters/telegram.adapter.js'
dotenv.config()

const app = express()
const port = process.env.PORT || 1000

// Middleware
app.use(express.json({ limit: '5mb' }))

// Track initialization state
let isInitialized = false
let initializationPromise: Promise<void> | null = null

// Initialize connections once
const initialize = async () => {
    if (isInitialized) {
        return
    }

    if (initializationPromise) {
        return initializationPromise
    }

    initializationPromise = (async () => {
        try {
            await connectRedis()

            await bot.init()
            console.log('Bot initialized')

            // If WEBHOOK_URL is provided, use Webhook; otherwise use Long Polling (ideal for EC2)
            const webhookUrl = process.env.WEBHOOK_URL
            if (webhookUrl) {
                try {
                    const webhookInfo = await bot.api.getWebhookInfo()
                    if (webhookInfo.url !== webhookUrl) {
                        await bot.api.setWebhook(webhookUrl)
                        console.log('Webhook set to:', webhookUrl)
                    } else {
                        console.log('Webhook already set to:', webhookUrl)
                    }
                } catch (error: any) {
                    if (error.error_code === 429) {
                        console.log('Rate limited on setWebhook, webhook likely already configured')
                    } else {
                        throw error
                    }
                }
            } else {
                // Remove old Vercel webhook if any and switch to EC2 Long Polling
                try {
                    await bot.api.deleteWebhook()
                    console.log('Cleared legacy Telegram webhook')
                } catch (e) {
                    // Ignore if no webhook was set
                }
                bot.start()
                console.log('Bot started with Long Polling (EC2 continuous listener)')
            }

            isInitialized = true
        } catch (error) {
            console.error('Failed to initialize:', error)
            initializationPromise = null
            throw error
        }
    })()

    return initializationPromise
}

// Health check endpoint
app.get('/', (req, res: Response) => {
    res.send('Practice English is running')
})

// Secured daily challenge broadcast endpoint — triggered by GitHub Actions cron
app.post('/cron/daily-challenge', async (req, res: Response) => {
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
        const { getOptedInUserIds } = await import('./utils/daily-notify.util.js');
        const { challengeCommand } = await import('./commands/challenge.command.js');

        const userIds = await getOptedInUserIds();
        console.log(`[Daily Broadcast] Sending to ${userIds.length} opted-in users`);

        let sent = 0;
        let failed = 0;

        for (const userId of userIds) {
            try {
                // Simulate a minimal context to reuse challengeCommand
                const chat = await bot.api.getChat(userId).catch(() => null);
                if (!chat) { failed++; continue; }

                // Rate-limit: Telegram allows ~30 msgs/sec. 50ms gap = safe.
                await new Promise(r => setTimeout(r, 50));

                // Build a minimal fake context to call existing challenge logic
                await bot.api.sendChatAction(userId, 'typing').catch(() => {});

                // Import builder to generate fresh challenge for this user
                const { buildDailyChallengeMessage } = await import('./commands/challenge.command.js');
                const { text, keyboard } = await buildDailyChallengeMessage(userId);
                await bot.api.sendMessage(userId, text, { parse_mode: 'HTML', reply_markup: keyboard });
                sent++;
            } catch (e: any) {
                console.error(`[Daily Broadcast] Error sending to user ${userId}:`, e.message || e);
                // User blocked the bot or account deleted — silently skip
                failed++;
            }
        }

        console.log(`[Daily Broadcast] Done. Sent: ${sent}, Failed/Skipped: ${failed}`);
        res.json({ success: true, sent, failed });
    } catch (error) {
        console.error('[Daily Broadcast] Error:', error);
        res.status(500).json({ error: 'Broadcast failed' });
    }
})

// Internal Webhook: Direct Message Dispatch from Dashboard-Backend
app.post('/internal/send-message', async (req: express.Request, res: express.Response) => {
    const { telegramId, text } = req.body;
    
    if (!telegramId || !text) {
        res.status(400).json({ error: 'Invalid payload' });
        return;
    }

    try {
        await bot.api.sendMessage(telegramId, text, { parse_mode: 'Markdown' });
        console.log(`[Send Message Webhook] Sent message to ${telegramId}`);
        res.status(200).json({ success: true });
    } catch (e: any) {
        console.error(`[Send Message Webhook] Failed to send message to ${telegramId}:`, e.message);
        res.status(500).json({ error: e.message });
    }
});

// Internal Webhook: Batch Broadcast Dispatch from Dashboard-Backend
app.post('/internal/broadcast-message', async (req: express.Request, res: express.Response) => {
    const { targetTelegramIds, text, parseMode = 'HTML', buttonText, buttonUrl } = req.body;

    if (!Array.isArray(targetTelegramIds) || targetTelegramIds.length === 0 || !text) {
        res.status(400).json({ error: 'Invalid broadcast payload. targetTelegramIds (array) and text required.' });
        return;
    }

    console.log(`[Broadcast Webhook] Starting batch broadcast to ${targetTelegramIds.length} users...`);

    // Auto-sanitize HTML for Telegram (convert <br>, <br/>, </br> to real newlines)
    const sanitizedText = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/br>/gi, '\n');

    let reply_markup: any = undefined;
    if (buttonText && buttonUrl) {
        // If buttonUrl is a Web App link (e.g. vercel.app or web url), use Telegram web_app property for direct app popup
        const isWebApp = buttonUrl.includes('.vercel.app') || 
                         buttonUrl.includes('maraki-mini-app') || 
                         (!buttonUrl.includes('t.me/') && buttonUrl.startsWith('http'));

        if (isWebApp) {
            reply_markup = { inline_keyboard: [[{ text: buttonText, web_app: { url: buttonUrl } }]] };
        } else {
            reply_markup = { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] };
        }
    }

    let sent = 0;
    let failed = 0;

    for (const telegramId of targetTelegramIds) {
        try {
            await bot.api.sendMessage(telegramId, sanitizedText, {
                parse_mode: parseMode === 'Markdown' ? 'Markdown' : 'HTML',
                reply_markup,
            });
            sent++;
            // Throttling gap (40ms) to respect Telegram API rate limits (max ~25-30 msg/sec)
            await new Promise(r => setTimeout(r, 40));
        } catch (e: any) {
            console.error(`[Broadcast Webhook] Parse mode failed for ${telegramId}: ${e.message}. Retrying plain text fallback...`);
            try {
                // Remove HTML tags for fallback delivery
                const cleanText = text.replace(/<[^>]*>?/gm, '');
                await bot.api.sendMessage(telegramId, cleanText, { reply_markup });
                sent++;
                await new Promise(r => setTimeout(r, 40));
            } catch (fallbackErr: any) {
                console.error(`[Broadcast Webhook] Delivery failed for ${telegramId}:`, fallbackErr.message);
                failed++;
            }
        }
    }

    console.log(`[Broadcast Webhook] Completed. Sent: ${sent}, Failed: ${failed}`);
    res.status(200).json({ success: true, sent, failed, total: targetTelegramIds.length });
});

// Webhook endpoint for Telegram
app.post('/webhook', async (req, res) => {
    try {
        // Ensure initialization is complete before handling updates
        await initialize()
        await bot.handleUpdate(req.body)
        res.sendStatus(200)
    } catch (error) {
        console.error('Webhook error:', error)
        res.sendStatus(500)
    }
})

// Start HTTP server on Port 1000 (required for EC2 Webhook listener)
if (!process.env.VERCEL) {
    const startServer = async () => {
        try {
            await initialize()
            app.listen(port, () => {
                console.log('Compliance backend web service listening on port', port)
            })
        } catch (error) {
            console.error('Failed to start server:', error)
        }
    }
    startServer()
}

// Export for Vercel serverless
export default app
