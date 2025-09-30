import Queue from 'bull';

const redisUrl = 'redis://localhost:6379';

async function checkQueueStatus() {
  console.log('📊 Vérification de l\'état des queues...\n');
  
  try {
    const extractionQueue = new Queue('document-extraction', redisUrl);
    const nlpQueue = new Queue('nlp-processing', redisUrl);
    const aiQueue = new Queue('ai-enrichment', redisUrl);
    const validationQueue = new Queue('validation-check', redisUrl);
    
    const queues = [
      { name: 'extraction', queue: extractionQueue },
      { name: 'nlp', queue: nlpQueue },
      { name: 'ai', queue: aiQueue },
      { name: 'validation', queue: validationQueue }
    ];
    
    for (const { name, queue } of queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      
      console.log(`🔹 Queue ${name}:`);
      console.log(`   En attente: ${waiting.length}`);
      console.log(`   Actifs: ${active.length}`);
      console.log(`   Terminés: ${completed.length}`);
      console.log(`   Échoués: ${failed.length}`);
      
      // Afficher les derniers jobs échoués
      if (failed.length > 0) {
        console.log('   ❌ Derniers échecs:');
        failed.slice(-3).forEach(job => {
          console.log(`      Job ${job.id}: ${job.failedReason}`);
        });
      }
      
      // Afficher les derniers jobs terminés
      if (completed.length > 0) {
        console.log('   ✅ Derniers succès:');
        completed.slice(-3).forEach(job => {
          console.log(`      Job ${job.id} terminé à ${new Date(job.finishedOn).toLocaleTimeString()}`);
        });
      }
      
      console.log('');
    }
    
    // Créer un job test
    console.log('🧪 Création d\'un job test...');
    const testJob = await extractionQueue.add('extract-document', {
      type: 'document-extraction',
      documentId: 'test-' + Date.now(),
      fileType: 'pdf',
      sourceFileId: 'test-file',
      sourceFileUrl: '/Users/bensaadmohammed/Documents/Dev/projet-saas/payload-cms/public/media/cvgadDocCd.pdf',
      userId: 'test-user',
      priority: 'high'
    });
    
    console.log(`✅ Job test créé avec ID: ${testJob.id}`);
    console.log('⏳ Attendez quelques secondes pour voir le traitement...\n');
    
    // Attendre et vérifier à nouveau
    setTimeout(async () => {
      console.log('📊 État après le job test:');
      const newWaiting = await extractionQueue.getWaiting();
      const newActive = await extractionQueue.getActive();
      const newCompleted = await extractionQueue.getCompleted();
      const newFailed = await extractionQueue.getFailed();
      
      console.log(`   En attente: ${newWaiting.length}`);
      console.log(`   Actifs: ${newActive.length}`);
      console.log(`   Terminés: ${newCompleted.length}`);
      console.log(`   Échoués: ${newFailed.length}`);
      
      if (newFailed.length > failed.length) {
        const latestFailed = newFailed[newFailed.length - 1];
        console.log(`❌ Dernier échec: ${latestFailed.failedReason}`);
      }
      
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkQueueStatus();