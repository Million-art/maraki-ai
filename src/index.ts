import express, { Response } from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { connectRedis } from './utils/redis.js'
import { bot } from './adapters/telegram.adapter.js'
dotenv.config()

const app = express()
const port = process.env.PORT || 3000

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
            // Connect to MongoDB
            const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/maraki'
            await mongoose.connect(mongoUri)
            console.log('Connected to MongoDB')

            await connectRedis()

            await bot.init()
            console.log('Bot initialized')

            // Only set webhook if in production AND webhook is not already set
            if (process.env.NODE_ENV === 'production') {
                const webhookUrl = process.env.WEBHOOK_URL
                if (webhookUrl) {
                    try {
                        // Check current webhook info to avoid unnecessary calls
                        const webhookInfo = await bot.api.getWebhookInfo()
                        if (webhookInfo.url !== webhookUrl) {
                            await bot.api.setWebhook(webhookUrl)
                            console.log('Webhook set to:', webhookUrl)
                        } else {
                            console.log('Webhook already set to:', webhookUrl)
                        }
                    } catch (error: any) {
                        // If rate limited, just log and continue - webhook is likely already set
                        if (error.error_code === 429) {
                            console.log('Rate limited on setWebhook, webhook likely already configured')
                        } else {
                            throw error
                        }
                    }
                } else {
                    console.error('WEBHOOK_URL not set in production')
                }
            } else {
                // Start polling in development
                bot.start()
                console.log('Bot started with polling')
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
    res.send('Maraki Ai is running')
})

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

// For local development
if (process.env.NODE_ENV !== 'production') {
    const startServer = async () => {
        try {
            await initialize()
            app.listen(port, () => {
                console.log('Maraki is running on port', port)
            })
        } catch (error) {
            console.error('Failed to start server:', error)
        }
    }
    startServer()
}

// Export for Vercel serverless
export default app
