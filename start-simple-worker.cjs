/**
 * Worker simplifié pour l'extraction de contenu
 * À utiliser en parallèle du serveur Next.js
 */

const Queue = require('bull');
const IORedis = require('ioredis');
const fs = require('fs').promises;
const path = require('path');

// Polyfill fetch pour Node.js < 18
global.fetch = global.fetch || require('node-fetch');

// Configuration Redis simplifiée (fix pour Bull 4.x)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Queue d'extraction
const extractionQueue = new Queue('document-extraction', redisUrl, {
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: 100,
    removeOnFail: 50,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    timeout: 10 * 60 * 1000, // 10 minutes
  },
});

/**
 * Extraction PDF simple
 */
async function extractPdf(filePath) {
  try {
    console.log(`📄 [Worker] Starting PDF extraction: ${filePath}`);
    
    // Attendre que le fichier soit disponible (Payload peut être en train de l'écrire)
    let fileExists = false;
    let retries = 0;
    const maxRetries = 10; // Plus de tentatives pour le worker
    
    while (!fileExists && retries < maxRetries) {
      try {
        await require('fs').promises.access(filePath);
        fileExists = true;
        console.log(`✅ [Worker] Fichier trouvé après ${retries} tentatives`);
      } catch {
        retries++;
        console.log(`⏳ [Worker] Fichier pas disponible, tentative ${retries}/${maxRetries}...`);
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2 secondes
        }
      }
    }
    
    if (!fileExists) {
      throw new Error(`Fichier ${filePath} non trouvé après ${maxRetries * 2} secondes d'attente`);
    }
    
    // Import dynamique pour éviter les problèmes
    const pdfParse = require('pdf-parse');
    
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No text found in PDF');
    }
    
    // Nettoyage basique
    const cleanText = data.text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    // Stats basiques
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 1).length;
    
    // Détection de langue basique
    const frenchWords = ['le', 'la', 'les', 'de', 'du', 'des', 'et', 'dans'];
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that'];
    const words = cleanText.toLowerCase().split(/\s+/).slice(0, 200);
    
    const frenchScore = frenchWords.reduce((score, word) => 
      score + words.filter(w => w.includes(word)).length, 0
    );
    const englishScore = englishWords.reduce((score, word) => 
      score + words.filter(w => w.includes(word)).length, 0
    );
    const language = frenchScore > englishScore ? 'fr' : 'en';
    
    console.log(`✅ [Worker] PDF extraction completed: ${wordCount} words, ${data.numpages} pages`);
    
    return {
      success: true,
      extractedText: cleanText.substring(0, 10000), // Limiter pour la DB
      metadata: {
        wordCount,
        pageCount: data.numpages,
        language,
        extractedAt: new Date().toISOString(),
        success: true,
      }
    };
    
  } catch (error) {
    console.error(`❌ [Worker] PDF extraction failed:`, error.message);
    throw error;
  }
}

/**
 * Mise à jour du document media avec le contenu extrait
 */
async function updateMediaDocument(documentId, extractionResult) {
  console.log(`📝 [Worker] Would update media ${documentId} with extracted content`);
  console.log(`   - Content length: ${extractionResult.extractedText.length} chars`);
  console.log(`   - Word count: ${extractionResult.metadata.wordCount}`);
  console.log(`   - Pages: ${extractionResult.metadata.pageCount}`);
  console.log(`   - Language: ${extractionResult.metadata.language}`);
  
  // Pour l'instant, on simule juste la mise à jour
  // Le vrai travail sera fait par le hook Payload automatique
  console.log(`✅ [Worker] Extraction completed for media ${documentId}`);
  
  return true;
}

/**
 * Processeur de job d'extraction
 */
async function processExtractionJob(job) {
  const { documentId, fileType, sourceFileUrl, userId } = job.data;
  
  console.log(`🚀 [Worker] Processing extraction job ${job.id}`);
  console.log(`   - Document: ${documentId}`);
  console.log(`   - Type: ${fileType}`);
  console.log(`   - File: ${sourceFileUrl}`);
  console.log(`   - User: ${userId}`);
  
  try {
    let result;
    
    // Traiter selon le type de fichier
    switch (fileType) {
      case 'pdf':
        result = await extractPdf(sourceFileUrl);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    if (!result.success) {
      throw new Error(result.error || 'Extraction failed');
    }
    
    // Mettre à jour le document (simulation pour l'instant)
    await updateMediaDocument(documentId, result);
    
    console.log(`✅ [Worker] Job ${job.id} completed successfully`);
    return result;
    
  } catch (error) {
    console.error(`❌ [Worker] Job ${job.id} failed:`, error.message);
    throw error;
  }
}

/**
 * Démarrage du worker
 */
async function startWorker() {
  console.log('🚀 Starting extraction worker...');
  console.log(`📋 Redis: ${redisUrl}`);
  
  // Test de connexion Redis d'abord
  try {
    await extractionQueue.isReady();
    console.log('✅ Redis connection test successful')
  } catch (error) {
    console.error('❌ Redis connection test failed:', error.message)
    process.exit(1)
  }
  
  // Configuration du worker avec logs détaillés
  console.log('🔧 Configuring worker to process "extract-document" jobs...')
  
  // Vérifier l'état de la queue avant de commencer
  const waitingJobs = await extractionQueue.getWaiting();
  console.log(`📊 Found ${waitingJobs.length} jobs waiting in queue`);
  if (waitingJobs.length > 0) {
    console.log('📋 First waiting job:', waitingJobs[0].name, waitingJobs[0].id);
  }
  
  extractionQueue.process('extract-document', 3, async (job) => {
    console.log(`🎯 Worker received job ${job.id}:`, job.data)
    return processExtractionJob(job)
  });
  
  // Event handlers
  extractionQueue.on('completed', (job) => {
    console.log(`✅ [Queue] Job ${job.id} completed`);
  });
  
  extractionQueue.on('failed', (job, err) => {
    console.error(`❌ [Queue] Job ${job?.id} failed:`, err.message);
  });
  
  extractionQueue.on('stalled', (job) => {
    console.warn(`⚠️ [Queue] Job ${job.id} stalled`);
  });
  
  extractionQueue.on('error', (err) => {
    console.error(`💥 [Queue] Queue error:`, err);
  });
  
  console.log('✅ Extraction worker started and ready!');
  console.log('📊 Waiting for jobs...');
  console.log('🛑 Press Ctrl+C to stop');
  
  // Statistiques périodiques
  setInterval(async () => {
    try {
      const [waiting, active] = await Promise.all([
        extractionQueue.getWaiting(),
        extractionQueue.getActive(),
      ]);
      
      if (waiting.length > 0 || active.length > 0) {
        console.log(`📈 Queue stats: ${waiting.length} waiting, ${active.length} active`);
      }
    } catch (error) {
      // Ignore stats errors
    }
  }, 30000);
}

// Gestion propre de l'arrêt
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...');
  await extractionQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down worker...');
  await extractionQueue.close();
  process.exit(0);
});

// Démarrer le worker
if (require.main === module) {
  startWorker().catch((error) => {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  });
}