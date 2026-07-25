import express from 'express';
import dotenv from 'dotenv';
import { connectRedis } from './utils/redis.js';
import { bot } from './adapters/telegram.adapter.js';
dotenv.config();
const app = express();
const port = process.env.PORT || 1000;
// Middleware
app.use(express.json());
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
            // If WEBHOOK_URL is provided, use Webhook; otherwise use Long Polling (ideal for EC2)
            const webhookUrl = process.env.WEBHOOK_URL;
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
                // Remove old Vercel webhook if any and switch to EC2 Long Polling
                try {
                    await bot.api.deleteWebhook();
                    console.log('Cleared legacy Telegram webhook');
                }
                catch (e) {
                    // Ignore if no webhook was set
                }
                bot.start();
                console.log('Bot started with Long Polling (EC2 continuous listener)');
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
// Start HTTP server on Port 1000 (required for EC2 Webhook listener)
if (!process.env.VERCEL) {
    const startServer = async () => {
        try {
            await initialize();
            app.listen(port, () => {
                console.log('Compliance backend web service listening on port', port);
            });
        }
        catch (error) {
            console.error('Failed to start server:', error);
        }
    };
    startServer();
}
// Export for Vercel serverless
export default app;
