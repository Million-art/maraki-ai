import dotenv from 'dotenv';
import axios from 'axios';
import { apiService } from '../src/services/api.service.js';

dotenv.config();

async function testDatabaseQuizFetch() {
  console.log('🔍 --- MARAKI AI DATABASE QUIZ FETCH TEST --- 🔍\n');

  const targetUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
  console.log(`📡 Connecting to Backend: ${targetUrl}`);

  try {
    console.log('\n1. Fetching available active quizzes from Database...');
    const { data: quizzes } = await axios.get(`${targetUrl}/api/student/quizzes`, { timeout: 5000 });
    console.log(`✅ Found ${quizzes?.length || 0} active quizzes in Database:`);

    if (quizzes && quizzes.length > 0) {
      quizzes.forEach((q: any, i: number) => {
        console.log(`   [${i + 1}] ID: ${q.id} | Title: "${q.title}" | Level: ${q.level} | Questions Count: ${q._count?.questions || q.questions?.length || 'N/A'}`);
      });

      console.log('\n2. Fetching detailed questions for Quiz ID:', quizzes[0].id);
      const { data: fullQuiz } = await axios.get(`${targetUrl}/api/student/quizzes/${quizzes[0].id}`, { timeout: 5000 });
      console.log(`✅ Quiz "${fullQuiz.title}" loaded with ${fullQuiz.questions?.length || 0} questions:`);
      
      if (fullQuiz.questions && fullQuiz.questions.length > 0) {
        fullQuiz.questions.forEach((q: any, idx: number) => {
          console.log(`\n   Q${idx + 1}: ${q.questionText}`);
          q.options?.forEach((opt: any) => {
            console.log(`      - ${opt.optionText} ${opt.isCorrect ? '✅ (Correct)' : ''}`);
          });
        });
      }

      console.log('\n3. Testing ApiService.getStructuredQuiz(386095768, "beginner")...');
      const structuredResult = await apiService.getStructuredQuiz(386095768, 'beginner');
      console.log('✅ Structured Quiz Result from ApiService:');
      console.log(JSON.stringify(structuredResult, null, 2));

      if (structuredResult && structuredResult.length > 0) {
        console.log('\n🎉 SUCCESS! Database quiz fetch is working 100% correctly from the database!');
      } else {
        console.log('\n⚠️ getStructuredQuiz returned null (User may have completed all quizzes or level filter yielded 0).');
      }
    } else {
      console.log('⚠️ No active quizzes currently stored in DB.');
    }
  } catch (error) {
    console.error('❌ Error during Database Quiz Fetch Test:', (error as Error).message);
  }
}

testDatabaseQuizFetch();
