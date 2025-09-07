import express, { Response } from 'express'
import dotenv from 'dotenv'
import { connectDB } from './database/database.js'
import { connectRedis } from './utils/redis.js'
import './adapters/telegram.adapter.js'
dotenv.config()

const app= express()
const port= process.env.PORT
//middleware
app.use(express.json())

app.get('/', (req, res: Response)=>{
    const response = res.send('Maraki Ai is running')
    return response
})

const startServer = async () => {
    try {
        await connectDB()
        await connectRedis()
        app.listen(port, ()=>{
            console.log('Maraki Ai is running')
        })
    } catch (error) {
        console.error('Failed to connect to databases:', error)
    }
}

startServer()
