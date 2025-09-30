import Queue from 'bull';

const redisUrl = 'redis://localhost:6379';

async function checkFinalResults() {
  console.log('🔍 Vérification des résultats finaux...\n');
  
  try {
    const extractionQueue = new Queue('document-extraction', redisUrl);
    
    const waiting = await extractionQueue.getWaiting();
    const active = await extractionQueue.getActive();
    const completed = await extractionQueue.getCompleted();
    const failed = await extractionQueue.getFailed();
    
    console.log('📊 État final de la queue:');
    console.log(`   En attente: ${waiting.length}`);
    console.log(`   Actifs: ${active.length}`);
    console.log(`   Terminés: ${completed.length}`);
    console.log(`   Échoués: ${failed.length}`);
    
    // Détails des jobs actifs
    if (active.length > 0) {
      console.log('\n🔄 Jobs actifs:');
      active.forEach(job => {
        console.log(`   Job ${job.id}: ${job.data.type} (${job.data.collectionType})`);
      });
    }
    
    // Détails des derniers jobs terminés
    if (completed.length > 0) {
      console.log('\n✅ Derniers jobs terminés:');
      completed.slice(-3).forEach(job => {
        console.log(`   Job ${job.id}: terminé à ${new Date(job.finishedOn).toLocaleTimeString()}`);
      });
    }
    
    // Détails des derniers échecs
    if (failed.length > 0) {
      console.log('\n❌ Derniers échecs:');
      failed.slice(-2).forEach(job => {
        console.log(`   Job ${job.id}: ${job.failedReason}`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkFinalResults();