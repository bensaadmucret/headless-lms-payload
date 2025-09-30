/**
 * Script pour trouver les vrais IDs Media en testant l'API
 */

const fs = require('fs').promises;

async function findRealMediaIds() {
  console.log('🔍 Recherche des vrais IDs Media...');
  
  // Test de quelques IDs probables (Payload commence généralement à 1)
  const testIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const realIds = [];
  
  for (const id of testIds) {
    try {
      console.log(`  Teste ID ${id}...`);
      
      const response = await fetch(`http://localhost:3000/api/media/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ID ${id} existe: ${data.filename || data.name || 'Fichier sans nom'}`);
        realIds.push({
          id: id,
          filename: data.filename,
          extractedContent: data.extractedContent || null
        });
      } else if (response.status === 404) {
        console.log(`❌ ID ${id} n'existe pas`);
      } else {
        console.log(`⚠️ ID ${id}: Erreur ${response.status}`);
      }
      
    } catch (error) {
      console.log(`💥 ID ${id}: Erreur de connexion`);
    }
    
    // Petite pause pour éviter de surcharger l'API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n📊 Résultats:`);
  console.log(`✅ ${realIds.length} documents Media trouvés:`);
  
  realIds.forEach(doc => {
    const hasContent = doc.extractedContent && doc.extractedContent.trim().length > 0;
    console.log(`   ID ${doc.id}: ${doc.filename} ${hasContent ? '✅ (contenu extrait)' : '❌ (pas de contenu)'}`);
  });
  
  // Trouve les PDFs sans contenu extrait
  const pdfWithoutContent = realIds.filter(doc => 
    doc.filename && 
    doc.filename.toLowerCase().endsWith('.pdf') && 
    (!doc.extractedContent || doc.extractedContent.trim() === '')
  );
  
  console.log(`\n🎯 PDFs sans contenu extrait à traiter: ${pdfWithoutContent.length}`);
  pdfWithoutContent.forEach(doc => {
    console.log(`   ID ${doc.id}: ${doc.filename}`);
  });
  
  return { realIds, pdfWithoutContent };
}

findRealMediaIds().catch(console.error);