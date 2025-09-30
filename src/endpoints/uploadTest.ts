import { medicalTextToLexical, createEmptyLexicalDocument } from '../utils/lexicalUtils'

export const uploadTestEndpoint = {
  path: '/upload-test',
  method: 'post',
  handler: async (req) => {
    try {
      console.log('📤 Début upload PDF...')
      
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({ 
          success: false,
          error: 'Authentification requise' 
        }, { status: 401 })
      }
      
      // 2. Extraire le fichier du formData
      const formData = await req.formData()
      const uploadedFile = formData.get('document')
      
      if (!uploadedFile || !(uploadedFile instanceof File)) {
        return Response.json({
          success: false,
          error: 'Aucun fichier fourni. Utilisez le champ "document".'
        }, { status: 400 })
      }
      
      console.log(`📄 Fichier reçu: ${uploadedFile.name} (${uploadedFile.size} bytes)`)
      
      // 3. Détecter le type de document
      const fileExtension = uploadedFile.name.toLowerCase().split('.').pop()
      const supportedTypes = ['pdf', 'txt', 'docx', 'epub']
      
      if (!supportedTypes.includes(fileExtension)) {
        return Response.json({
          success: false,
          error: `Type de fichier non supporté: ${fileExtension}. Types acceptés: ${supportedTypes.join(', ')}`
        }, { status: 400 })
      }
      
      // 4. Convertir en Buffer pour Payload
      const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer())
      
      // 5. Sauvegarder dans Media
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
      
      console.log(`✅ Fichier sauvegardé dans Media avec l'ID: ${mediaDoc.id}`)
      
      // 6. Créer l'entrée KnowledgeBase
      const knowledgeDoc = await req.payload.create({
        collection: 'knowledge-base',
        data: {
          title: uploadedFile.name.replace(/\.[^/.]+$/, ''),
          originalFileName: uploadedFile.name,
          documentType: fileExtension,
          sourceFile: mediaDoc.id,
          extractedContent: fileExtension === 'txt' 
            ? medicalTextToLexical(fileBuffer.toString('utf8'))
            : medicalTextToLexical('Contenu à extraire...'),
          processingStatus: 'processing',
          validationStatus: 'pending',
          isActive: false,
          uploadedBy: req.user.id,
          medicalDomain: 'autre',
          difficulty: 'intermediate',
        }
      })
      
      console.log(`🎉 Document créé dans KnowledgeBase avec l'ID: ${knowledgeDoc.id}`)
      
      // 7. Réponse de succès
      return Response.json({
        success: true,
        message: 'Document uploadé avec succès !',
        data: {
          knowledgeBaseId: knowledgeDoc.id,
          mediaId: mediaDoc.id,
          title: knowledgeDoc.title,
          fileName: uploadedFile.name,
          fileType: fileExtension,
          size: uploadedFile.size,
          processingStatus: 'processing',
          nextSteps: [
            'Le document a été sauvegardé',
            'L\'extraction de contenu sera implémentée prochainement',
            'Un expert doit valider le contenu avant activation'
          ]
        }
      }, { status: 201 })
      
    } catch (error) {
      console.error('💥 Erreur upload:', error)
      return Response.json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 })
    }
  },
}
