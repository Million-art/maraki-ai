import dotenv from 'dotenv';
import axios from 'axios';
import { apiService } from '../src/services/api.service.js';

dotenv.config();

async function testDatabaseQuizFetch() {
  console.log('🔍 --- SCANNING ALL BEGINNER DB QUIZZES FOR QUESTION OVERLAP --- 🔍\n');

  const targetUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
  
  try {
    const { data: quizzes } = await axios.get(`${targetUrl}/api/student/quizzes?level=beginner`, { timeout: 5000 });
    console.log(`✅ Total Beginner Quizzes in DB: ${quizzes?.length || 0}\n`);

    const questionCounts = new Map<string, number>();

    for (const qMeta of quizzes) {
      try {
        const { data: fullQuiz } = await axios.get(`${targetUrl}/api/student/quizzes/${qMeta.id}`, { timeout: 3000 });
        if (fullQuiz.questions && fullQuiz.questions.length > 0) {
          const q1Text = fullQuiz.questions[0].questionText;
          const count = (questionCounts.get(q1Text) || 0) + 1;
          questionCounts.set(q1Text, count);
          console.log(`Quiz ID: ${qMeta.id} | Title: "${qMeta.title}" -> Q1: "${q1Text}"`);
        }
      } catch (e) {}
    }

    console.log('\n--- SUMMARY OF Q1 OCCURRENCES ACROSS QUIZZES ---');
    questionCounts.forEach((count, text) => {
      console.log(`- "${text}" appears as Q1 in ${count} DIFFERENT Quiz IDs`);
    });

  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

testDatabaseQuizFetch();
