/**
 * Processor pour les fichiers EPUB
 */

import fs from 'fs/promises'
import path from 'path'
import type { ExtractionResult } from '../types'
import { ExtractionError } from '../types'
import { cleanEpubContent, detectLanguage, countWords } from '../../utils/text'

export const epubProcessor = {
  /**
   * Extraire le contenu d'un fichier EPUB
   */
  async extract(sourceFileUrl: string): Promise<ExtractionResult> {
    try {
      console.log(`📄 [EPUB] Extracting content from: ${sourceFileUrl}`)
      
      // Lire le fichier EPUB depuis l'URL/path
      const filePath = sourceFileUrl.startsWith('/api/media') 
        ? path.join(process.cwd(), 'public/media', path.basename(sourceFileUrl))
        : sourceFileUrl
      
      const epubBuffer = await fs.readFile(filePath)
      
      // Import dynamique pour éviter les problèmes au démarrage
      const EPub = (await import('epub-parser')).default
      
      // Parser l'EPUB
      const epub = new EPub(epubBuffer)
      await epub.parse()
      
      // Extraire le texte de tous les chapitres
      let fullText = ''
      const chapters: Array<{ title: string; content: string }> = []
      
      // Récupérer tous les chapitres
      const spine = epub.manifest.spine
      
      for (const item of spine) {
        const chapter = epub.manifest.items[item.idref]
        if (chapter && chapter.mediaType === 'application/xhtml+xml') {
          
          const chapterContent = await epub.getChapter(chapter.id)
          const cleanChapterText = cleanEpubContent(chapterContent)
          
          if (cleanChapterText.length > 50) { // Ignorer les chapitres trop courts
            const chapterTitle = extractChapterTitle(chapterContent) || `Chapitre ${chapters.length + 1}`
            
            chapters.push({
              title: chapterTitle,
              content: cleanChapterText,
            })
            
            fullText += cleanChapterText + '\n\n'
          }
        }
      }
      
      if (!fullText || fullText.trim().length === 0) {
        throw new ExtractionError('Aucun contenu trouvé dans l\'EPUB', 'epub')
      }
      
      const cleanContent = fullText.trim()
      
      // Détecter la langue
      const language = detectLanguage(cleanContent)
      
      // Extraire les métadonnées de l'EPUB
      const metadata = {
        wordCount: countWords(cleanContent),
        language,
        title: epub.metadata.title,
        author: epub.metadata.creator,
      }
      
      console.log(`✅ [EPUB] Successfully extracted ${metadata.wordCount} words from ${chapters.length} chapters`)
      
      return {
        success: true,
        extractedText: cleanContent,
        metadata,
        chapters: chapters.length > 0 ? chapters : undefined,
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur extraction EPUB'
      console.error(`❌ [EPUB] Extraction failed:`, message)
      
      return {
        success: false,
        extractedText: '',
        metadata: { wordCount: 0 },
        error: message,
      }
    }
  }
}

/**
 * Nettoyer le contenu HTML d'un chapitre EPUB
 */

/**
 * Extraire le titre d'un chapitre depuis son contenu HTML
 */
function extractChapterTitle(htmlContent: string): string | null {
  // Chercher les balises de titre
  const titlePatterns = [
    /<h1[^>]*>(.*?)<\/h1>/i,
    /<h2[^>]*>(.*?)<\/h2>/i,
    /<h3[^>]*>(.*?)<\/h3>/i,
    /<title[^>]*>(.*?)<\/title>/i,
  ]
  
  for (const pattern of titlePatterns) {
    const match = htmlContent.match(pattern)
    if (match && match[1]) {
      const title = cleanEpubContent(match[1]).trim()
      if (title.length > 0 && title.length < 200) {
        return title
      }
    }
  }
  
  // Si pas de titre trouvé, essayer le premier paragraphe court
  const firstParagraph = htmlContent.match(/<p[^>]*>(.*?)<\/p>/i)
  if (firstParagraph && firstParagraph[1]) {
    const text = cleanEpubContent(firstParagraph[1]).trim()
    if (text.length > 5 && text.length < 100 && !text.includes('.')) {
      return text
    }
  }
  
  return null
}

/**
 * Détecter la langue du texte
 */

/**
 * Compter les mots dans le texte
 */
