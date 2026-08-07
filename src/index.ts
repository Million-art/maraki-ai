import express, { Response } from 'express'
import dotenv from 'dotenv'
import { connectRedis } from './utils/redis.js'
import { bot } from './adapters/telegram.adapter.js'
dotenv.config()

const app = express()
const port = process.env.PORT || 1000

// Middleware
app.use(express.json())

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
        res.status(401).json({ error: 'Unauthorized' });
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

// Internal Webhook: Voice Session Summary from Dashboard-Backend
app.post('/internal/voice-summary', async (req: express.Request, res: express.Response) => {
    const { telegramId, messages } = req.body;
    
    if (!telegramId || !messages || messages.length === 0) {
        res.status(400).json({ error: 'Invalid payload' });
        return;
    }

    // Acknowledge quickly so dashboard-backend isn't waiting
    res.status(202).json({ status: 'Processing summary' });

    try {
        const { callGeminiGenerateContent } = await import('./api/gemini/callGeminiGenerateContents.js');
        
        const systemInstruction = `You are an expert English language evaluator.
Analyze the provided conversation transcript between the 'user' (student) and 'model' (AI tutor).
Evaluate the user's English proficiency based on their messages and provide a summary.
Since this was a spoken conversation transcribed by an ASR, evaluate their pronunciation and fluency based on how the ASR interpreted their words (e.g., if there are lots of weird fragments or confused homophones, the score drops).
You must return ONLY a raw JSON object (without markdown code blocks) matching this exact schema:
{
  "scores": {
    "grammar": number (0-10),
    "pronunciation": number (0-10),
    "vocabulary": number (0-10),
    "fluency": number (0-10),
    "confidence": number (0-10)
  },
  "wordsToPractice": ["word1", "word2", "word3", "word4"]
}`;

        const transcript = messages.map((m: any) => `${m.sender === 'user' ? 'Student' : 'AI'}: ${m.originalText || m.text}`).join('\n');
        const prompt = `${systemInstruction}\n\nHere is the conversation transcript:\n\n${transcript}`;

        const responseText = await callGeminiGenerateContent(prompt, 'complex');
        
        if (responseText) {
            // Strip markdown JSON block if present
            const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const summary = JSON.parse(cleanJsonStr);

            if (summary && summary.scores && summary.wordsToPractice) {
                const text = `📊 *Conversation Score*\n\n` +
                  `📝 Grammar: ${summary.scores.grammar}/10\n` +
                  `🗣 Pronunciation: ${summary.scores.pronunciation}/10\n` +
                  `📚 Vocabulary: ${summary.scores.vocabulary}/10\n` +
                  `🌊 Fluency: ${summary.scores.fluency}/10\n` +
                  `💪 Confidence: ${summary.scores.confidence}/10\n\n` +
                  `🎯 *Words to practice today:*\n\n` +
                  summary.wordsToPractice.map((w: string) => `• \`${w}\``).join('\n');

                await bot.api.sendMessage(telegramId, text, { parse_mode: 'Markdown' });
                console.log(`[Voice Summary] Sent summary to ${telegramId}`);
            }
        }
    } catch (e: any) {
        console.error(`[Voice Summary] Failed to generate or send summary for ${telegramId}:`, e.message);
    }
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
