/**
 * Nettoyage simple des jobs échoués
 */

const Queue = require('bull');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0'),
};

async function cleanQueue() {
  console.log('🧹 Nettoyage de la queue...');
  
  const extractionQueue = new Queue('document-extraction', {
    redis: redisConfig,
  });
  
  try {
    // Nettoyer les jobs échoués et terminés
    await extractionQueue.clean(0, 'failed');
    await extractionQueue.clean(0, 'completed');
    
    console.log('✅ Queue nettoyée !');
    
    // Stats après nettoyage
    const [waiting, active, completed, failed] = await Promise.all([
      extractionQueue.getWaiting(),
      extractionQueue.getActive(),
      extractionQueue.getCompleted(),
      extractionQueue.getFailed(),
    ]);
    
    console.log(`📊 État après nettoyage:`);
    console.log(`   Jobs en attente: ${waiting.length}`);
    console.log(`   Jobs actifs: ${active.length}`);
    console.log(`   Jobs terminés: ${completed.length}`);
    console.log(`   Jobs échoués: ${failed.length}`);
    
    await extractionQueue.close();
    
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error.message);
  }
  
  process.exit(0);
}

cleanQueue();