import type { Endpoint } from 'payload'
import { pdfProcessor } from '../jobs/processors/pdfProcessor'
import { epubProcessor } from '../jobs/processors/epubProcessor'
import { docxProcessor } from '../jobs/processors/docxProcessor'
import { txtProcessor } from '../jobs/processors/txtProcessor'
import { textToLexical } from '../utils/lexicalUtils'

export const extractNowEndpoint: Endpoint = {
  path: '/knowledge-base/:id/extract-now',
  method: 'post',
  handler: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentification requise' })
      }

      const { id } = req.params
      const kb = await req.payload.findByID({ collection: 'knowledge-base', id, depth: 0 })
      if (!kb) {
        return res.status(404).json({ success: false, error: 'Document non trouvé' })
      }

      if (!kb.sourceFile) {
        return res.status(400).json({ success: false, error: 'Aucun fichier source associé' })
      }

      // Récupérer le média associé
      const media = await req.payload.findByID({ collection: 'media', id: kb.sourceFile as string, depth: 0 })
      if (!media) {
        return res.status(404).json({ success: false, error: 'Fichier media non trouvé' })
      }

      // Déterminer le type de document
      const documentType = (kb.documentType || (media.filename?.split('.').pop() || '')).toString().toLowerCase()
      const fileUrl = media.filename ? `/api/media/file/${media.filename}` : (media.url as string)
      if (!fileUrl) {
        return res.status(400).json({ success: false, error: 'URL du fichier media introuvable' })
      }

      // Lancer l'extraction synchrone
      let result
      switch (documentType) {
        case 'pdf':
          result = await pdfProcessor.extract(fileUrl)
          break
        case 'epub':
          result = await epubProcessor.extract(fileUrl)
          break
        case 'docx':
          result = await docxProcessor.extract(fileUrl)
          break
        case 'txt':
          result = await txtProcessor.extract(fileUrl)
          break
        default:
          return res.status(400).json({ success: false, error: `Type de document non supporté: ${documentType}` })
      }

      if (!result.success || !result.extractedText?.trim()) {
        await req.payload.update({
          collection: 'knowledge-base',
          id,
          data: {
            processingStatus: 'failed',
            processingLogs: `${(kb as any).processingLogs || ''}\n[${new Date().toISOString()}] failed 0% - Aucune donnée extraite`
          },
          overrideAccess: true,
        })
        return res.status(422).json({ success: false, error: result.error || 'Extraction vide' })
      }

      const extractedContent = textToLexical(result.extractedText)
      const chapters = (result.chapters || []).map((ch, idx) => ({
        chapterTitle: ch.title,
        chapterNumber: idx + 1,
        content: textToLexical(ch.content),
        pageNumbers: (ch as any).pageNumbers,
      }))

      await req.payload.update({
        collection: 'knowledge-base',
        id,
        data: {
          extractedContent,
          searchableContent: result.extractedText.slice(0, 50000),
          ...(chapters.length ? { chapters } : {}),
          lastProcessed: new Date().toISOString(),
          processingStatus: 'completed',
          processingLogs: `${(kb as any).processingLogs || ''}\n[${new Date().toISOString()}] completed 100% - Extraction synchrone effectuée`,
        },
        overrideAccess: true,
      })

      return res.status(200).json({
        success: true,
        message: 'Extraction terminée',
        data: {
          wordCount: result.metadata.wordCount,
          language: result.metadata.language,
          chapters: chapters.length,
        }
      })
    } catch (error) {
      console.error('❌ extract-now error:', error)
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' })
    }
  }
}