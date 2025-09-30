/**
 * Script pour traiter les vrais documents Media de Payload
 */

const Queue = require('bull');

async function processRealMedia() {
  console.log('🚀 Traitement des vrais documents Media...');
  
  const extractionQueue = new Queue('document-extraction', 'redis://localhost:6379');
  
  try {
    // Récupérer la liste des médias depuis l'API Payload
    console.log('📡 Récupération de la liste des médias depuis Payload...');
    
    const response = await fetch('http://localhost:3000/api/media?limit=20', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ ${data.docs.length} médias trouvés dans Payload`);
    
    // Filtrer les PDFs
    const pdfDocs = data.docs.filter(doc => {
      return doc.filename && doc.filename.toLowerCase().endsWith('.pdf');
    });
    
    console.log(`📄 ${pdfDocs.length} PDFs trouvés:`);
    pdfDocs.forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc.filename} (ID: ${doc.id})`);
    });
    
    if (pdfDocs.length === 0) {
      console.log('❌ Aucun PDF trouvé dans Payload');
      return;
    }
    
    // Créer des jobs pour les PDFs qui n'ont pas encore de contenu extrait
    let jobsCreated = 0;
    
    for (const pdfDoc of pdfDocs) {
      // Vérifier si le fichier existe
      const filePath = `/Users/bensaadmohammed/Documents/Dev/projet-saas/payload-cms/public/media/${pdfDoc.filename}`;
      
      try {
        await require('fs').promises.access(filePath);
      } catch (error) {
        console.log(`⚠️ Fichier non trouvé: ${pdfDoc.filename}, skipping`);
        continue;
      }
      
      // Créer le job avec le vrai ID
      const jobData = {
        type: 'document-extraction',
        documentId: pdfDoc.id.toString(),
        fileType: 'pdf',
        sourceFileId: pdfDoc.id.toString(),
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
      
      console.log(`✅ Job créé pour ${pdfDoc.filename} (Job ID: ${job.id})`);
      jobsCreated++;
    }
    
    console.log(`\n🎯 ${jobsCreated} jobs créés pour l'extraction`);
    console.log('⏳ Le worker va maintenant traiter ces jobs...');
    console.log('🔍 Vérifiez avec: node simple-debug-queue.cjs');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
  
  await extractionQueue.close();
  process.exit(0);
}

processRealMedia();