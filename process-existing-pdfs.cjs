/**
 * Script simple pour créer des jobs pour quelques PDFs existants
 * En utilisant des IDs Media probables
 */

const Queue = require('bull');
const fs = require('fs').promises;
const path = require('path');

async function processExistingPDFs() {
  console.log('🚀 Traitement de quelques PDFs existants...');
  
  const extractionQueue = new Queue('document-extraction', 'redis://localhost:6379');
  
  try {
    // Liste des PDFs dans le dossier media
    const mediaDir = '/Users/bensaadmohammed/Documents/Dev/projet-saas/payload-cms/public/media';
    const files = await fs.readdir(mediaDir);
    
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf')).slice(0, 3); // Limiter à 3 PDFs
    
    console.log(`📄 ${pdfFiles.length} PDFs trouvés pour traitement:`);
    pdfFiles.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file}`);
    });
    
    let jobsCreated = 0;
    
    for (const pdfFile of pdfFiles) {
      // Générer un ID probable (les IDs Media Payload sont généralement numériques croissants)
      const mediaId = Math.floor(Math.random() * 100) + 1; // ID entre 1 et 100
      const filePath = path.join(mediaDir, pdfFile);
      
      const jobData = {
        type: 'document-extraction',
        documentId: mediaId.toString(),
        fileType: 'pdf',
        sourceFileId: mediaId.toString(),
        sourceFileUrl: filePath,
        userId: 'batch-processing',
        priority: 'normal'
      };
      
      const job = await extractionQueue.add('extract-document', jobData, {
        priority: 5,
        attempts: 3,
        removeOnComplete: 10,
        removeOnFail: 10,
      });
      
      console.log(`✅ Job créé pour ${pdfFile} avec ID ${mediaId} (Job ID: ${job.id})`);
      jobsCreated++;
    }
    
    console.log(`\n🎯 ${jobsCreated} jobs créés pour l'extraction`);
    console.log('⏳ Le worker va maintenant traiter ces jobs...');
    console.log('📝 Note: La mise à jour Payload échouera pour les IDs inexistants, mais l\'extraction fonctionnera');
    console.log('🔍 Vérifiez avec: node simple-debug-queue.cjs');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
  
  await extractionQueue.close();
  process.exit(0);
}

processExistingPDFs();