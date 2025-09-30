/**
 * Nettoyage agressif de toutes les queues
 */

const Queue = require('bull');

async function cleanAllQueues() {
  console.log('🧹 Nettoyage agressif de toutes les queues...');
  
  const extractionQueue = new Queue('document-extraction', 'redis://localhost:6379');
  
  try {
    // Vider complètement
    await extractionQueue.empty();
    console.log('📋 Queue vidée');
    
    // Supprimer les jobs terminés et échoués
    await extractionQueue.clean(0, 'completed');
    await extractionQueue.clean(0, 'failed');
    await extractionQueue.clean(0, 'active');
    await extractionQueue.clean(0, 'waiting');
    console.log('🗑️  Jobs supprimés');
    
    // Pause/resume pour forcer le refresh
    await extractionQueue.pause();
    await extractionQueue.resume();
    console.log('⏯️  Queue redémarrée');
    
    const stats = await Promise.all([
      extractionQueue.getWaiting(),
      extractionQueue.getActive(),
      extractionQueue.getCompleted(),
      extractionQueue.getFailed(),
    ]);
    
    console.log(`📊 État final: ${stats[0].length} en attente, ${stats[1].length} actifs, ${stats[2].length} terminés, ${stats[3].length} échoués`);
    
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
  }
  
  await extractionQueue.close();
  process.exit(0);
}

cleanAllQueues();