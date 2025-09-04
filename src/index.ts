import express, { Response } from 'express'
import dotenv from 'dotenv'
import { connectDB } from './database/database.js'
import './adapters/telegram.adapter.js'
dotenv.config()
connectDB()

const app= express()
const port= process.env.PORT
//middleware
app.use(express.json())

app.get('/', (res: Response)=>{
    const response = res.send('Maraki Ai is running')
    return response
})

app.listen(port, ()=>{
    console.log('Maraki Ai is running')
})