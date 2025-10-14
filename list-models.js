import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyAKHJQpFGMgOGBuQq-qun2xnb5O4wCKHGU';

async function listModels() {
  console.log('🔍 Listing available Gemini models...\n');
  
  const genAI = new GoogleGenerativeAI(API_KEY);
  
  try {
    const models = await genAI.listModels();
    console.log('✅ Available models:');
    models.forEach(model => {
      console.log(`  - ${model.name}`);
      console.log(`    Supported methods: ${model.supportedGenerationMethods?.join(', ')}`);
    });
  } catch (error) {
    console.error('❌ Error listing models:', error.message);
  }
}

listModels();
