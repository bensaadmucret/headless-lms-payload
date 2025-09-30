export const uploadDocumentSimpleEndpoint = {
  path: '/knowledge-base/upload-simple',
  method: 'post',
  handler: async (req) => {
    try {
      console.log('📤 Test upload simple...')
      
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({ 
          success: false,
          error: 'Authentification requise' 
        }, { status: 401 })
      }
      
      // 2. Vérifier qu'un fichier a été uploadé et l'extraire du formData
      const formData = await req.formData()
      const uploadedFile = formData.get('document')
      
      if (!uploadedFile || !(uploadedFile instanceof File)) {
        return Response.json({
          success: false,
          error: 'Aucun fichier fourni. Utilisez le champ "document".'
        }, { status: 400 })
      }
      
      console.log(`📄 Fichier reçu: ${uploadedFile.name} (${uploadedFile.size} bytes)`)
      
      // Convertir le File en Buffer pour Payload
      const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer())
      
      // 3. Sauvegarder le fichier dans Media
      const mediaDoc = await req.payload.create({
        collection: 'media',
        data: {
          alt: `Document: ${uploadedFile.name}`,
          user: req.user.id,
        },
        file: {
          data: fileBuffer,
          mimetype: uploadedFile.type,
          name: uploadedFile.name,
          size: uploadedFile.size,
        }
      })
      
      console.log(`✅ Fichier sauvegardé avec l'ID: ${mediaDoc.id}`)
      
      // 4. Créer une entrée simple dans KnowledgeBase
      const knowledgeDoc = await req.payload.create({
        collection: 'knowledge-base',
        data: {
          title: uploadedFile.name.replace(/\.[^/.]+$/, ''),
          originalFileName: uploadedFile.name,
          documentType: uploadedFile.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt',
          sourceFile: mediaDoc.id,
          extractedContent: uploadedFile.name.toLowerCase().endsWith('.txt') 
            ? fileBuffer.toString('utf8') 
            : 'Contenu à extraire...',
          processingStatus: 'processing',
          validationStatus: 'pending',
          isActive: false,
          uploadedBy: req.user.id,
          medicalDomain: 'autre',
          difficulty: 'intermediate',
        }
      })
      
      console.log(`🎉 Document créé avec l'ID: ${knowledgeDoc.id}`)
      
      // 5. Réponse de succès
      return Response.json({
        success: true,
        message: 'Document uploadé avec succès (version simplifiée)',
        data: {
          knowledgeBaseId: knowledgeDoc.id,
          mediaId: mediaDoc.id,
          title: knowledgeDoc.title,
          fileName: uploadedFile.name,
          size: uploadedFile.size,
          processingStatus: 'pending',
          nextSteps: [
            'Le document a été sauvegardé',
            'L\'extraction de contenu sera implémentée prochainement',
            'Un expert doit valider le contenu avant activation'
          ]
        }
      }, { status: 201 })
      
    } catch (error) {
      console.error('💥 Erreur dans uploadDocumentSimple:', error)
      
      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString(),
      }, { status: 500 })
    }
  },
}