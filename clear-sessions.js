import { getPayload } from 'payload';
import config from './src/payload.config.js';

async function clearRecentSessions() {
  console.log('🔍 Clearing recent adaptive quiz sessions...');
  
  const payload = await getPayload({ config });
  
  try {
    // Delete all adaptive quiz sessions from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await payload.delete({
      collection: 'adaptiveQuizResults',
      where: {
        createdAt: {
          greater_than: oneDayAgo.toISOString()
        }
      }
    });
    
    console.log(`✅ Deleted ${result.docs?.length || 0} recent sessions`);
    console.log('🎉 Cooldown reset! You can now generate a new quiz immediately.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearRecentSessions();
