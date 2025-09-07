import express, { Response } from 'express'
import dotenv from 'dotenv'
import { connectDB } from './database/database.js'
import { connectRedis } from './utils/redis.js'
import { bot } from './adapters/telegram.adapter.js'
dotenv.config()

const app= express()
const port= process.env.PORT
//middleware
app.use(express.json())

app.get('/', (req, res: Response)=>{
    const response = res.send('Maraki Ai is running')
    return response
})

// Webhook endpoint for Telegram
app.post('/webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

const startServer = async () => {
    try {
        await connectDB()
        await connectRedis()

        // Initialize the bot
        await bot.init()
        console.log('Bot initialized')

        // Set webhook if in production
        if (process.env.NODE_ENV === 'production') {
            const webhookUrl = process.env.WEBHOOK_URL
            if (webhookUrl) {
                await bot.api.setWebhook(webhookUrl)
                console.log('Webhook set to:', webhookUrl)
            } else {
                console.error('WEBHOOK_URL not set in production')
            }
        } else {
            // Start polling in development
            bot.start()
            console.log('Bot started with polling')
        }

        app.listen(port, ()=>{
            console.log('Maraki Ai is running on port', port)
        })
    } catch (error) {
        console.error('Failed to connect to databases:', error)
    }
}

startServer()
