/**
 * Processor pour les fichiers DOCX
 */

import fs from 'fs/promises'
import path from 'path'
import mammoth from 'mammoth'
import type { ExtractionResult } from '../types'
import { ExtractionError } from '../types'
import { cleanDocxText, detectLanguage, extractChapters, countWords, extractTitle } from '../../utils/text'

export const docxProcessor = {
  /**
   * Extraire le contenu d'un fichier DOCX
   */
  async extract(sourceFileUrl: string): Promise<ExtractionResult> {
    try {
      console.log(`📄 [DOCX] Extracting content from: ${sourceFileUrl}`)
      
      // Lire le fichier DOCX depuis l'URL/path
      const filePath = sourceFileUrl.startsWith('/api/media') 
        ? path.join(process.cwd(), 'public/media', path.basename(sourceFileUrl))
        : sourceFileUrl
      
      const docxBuffer = await fs.readFile(filePath)
      
      // Extraire le texte avec Mammoth
      const result = await mammoth.extractRawText({
        buffer: docxBuffer
      })
      
      if (!result.value || result.value.trim().length === 0) {
        throw new ExtractionError('Aucun texte trouvé dans le document DOCX', 'docx')
      }
      
      // Nettoyer le texte extrait
      const cleanContent = cleanDocxText(result.value)
      
      // Log des messages d'avertissement de Mammoth
      if (result.messages.length > 0) {
        console.warn(`⚠️ [DOCX] Mammoth warnings:`, result.messages.map(m => m.message).join(', '))
      }
      
      // Détecter la langue
      const language = detectLanguage(cleanContent)
      
      // Analyser la structure
      const chapters = extractChapters(cleanContent)
      
      // Extraire les métadonnées
      const metadata = {
        wordCount: countWords(cleanContent),
        language,
        title: extractTitle(cleanContent),
      }
      
      console.log(`✅ [DOCX] Successfully extracted ${metadata.wordCount} words`)
      
      return {
        success: true,
        extractedText: cleanContent,
        metadata,
        chapters: chapters.length > 0 ? chapters : undefined,
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur extraction DOCX'
      console.error(`❌ [DOCX] Extraction failed:`, message)
      
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
 * Nettoyer le texte extrait du DOCX
 */

/**
 * Détecter la langue du texte
 */

/**
 * Extraire les chapitres du DOCX
 */

/**
 * Extraire le titre du document
 */

/**
 * Compter les mots dans le texte
 */
