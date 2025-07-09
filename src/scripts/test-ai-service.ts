import 'dotenv/config';
import { AIService } from '../services/AIService.js';

async function testAI() {
  console.log('Initializing AIService...');
  const aiService = new AIService();
  console.log('AIService initialized. Sending a test prompt to Google AI...');

  try {
    const response = await aiService.generateResponse([
      { role: 'user', content: 'Quelle est la capitale de la France ?' },
    ]);
    console.log('--- TEST PASSED ---');
    console.log('AI Response:', response);
    console.log('-------------------');
  } catch (error) {
    console.error('--- TEST FAILED ---');
    console.error('An error occurred while testing the AIService:', error);
    console.error('-------------------');
  }
}

testAI();
