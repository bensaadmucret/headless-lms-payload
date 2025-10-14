import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function testGemini() {
  console.log('🔍 Testing Gemini API connection...');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in environment');
    return;
  }
  
  console.log('✅ API Key found');
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Test with gemini-2.0-flash
  try {
    console.log('\n📝 Testing gemini-2.0-flash model...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent('Réponds juste "OK" si tu me reçois.');
    const response = result.response;
    const text = response.text();
    console.log('✅ gemini-2.0-flash works!');
    console.log('Response:', text);
  } catch (error) {
    console.error('❌ gemini-2.0-flash failed:', error.message);
  }
}

testGemini();
