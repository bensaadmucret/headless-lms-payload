/**
 * Processor pour les fichiers TXT
 */

import fs from 'fs/promises'
import path from 'path'
import type { ExtractionResult } from '../types'
import { ExtractionError } from '../types'
import { detectLanguage, extractChapters, extractTitle, countWords } from '../../utils/text'

export const txtProcessor = {
  /**
   * Extraire le contenu d'un fichier TXT
   */
  async extract(sourceFileUrl: string): Promise<ExtractionResult> {
    try {
      console.log(`📄 [TXT] Extracting content from: ${sourceFileUrl}`)
      
      // Lire le fichier TXT depuis l'URL/path
      const filePath = sourceFileUrl.startsWith('/api/media') 
        ? path.join(process.cwd(), 'public/media', path.basename(sourceFileUrl))
        : sourceFileUrl
      
      const content = await fs.readFile(filePath, 'utf8')
      
      // Nettoyer le contenu
      const cleanContent = content
        .replace(/\r\n/g, '\n')    // Normaliser les sauts de ligne
        .replace(/\r/g, '\n')     // Normaliser les sauts de ligne Mac
        .trim()
      
      if (!cleanContent) {
        throw new ExtractionError('Fichier TXT vide', 'txt')
      }
      
      // Détecter la langue (basique)
      const language = detectLanguage(cleanContent)
      
      // Analyser la structure (chapitres potentiels)
      const chapters = extractChapters(cleanContent)
      
      // Extraire les métadonnées
      const metadata = {
        wordCount: countWords(cleanContent),
        language,
        title: extractTitle(cleanContent),
      }
      
      console.log(`✅ [TXT] Successfully extracted ${metadata.wordCount} words`)
      
      return {
        success: true,
        extractedText: cleanContent,
        metadata,
        chapters: chapters.length > 0 ? chapters : undefined,
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur extraction TXT'
      console.error(`❌ [TXT] Extraction failed:`, message)
      
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
 * Détecter la langue du texte (basique)
 */

/**
 * Extraire les chapitres du texte
 */

/**
 * Extraire le titre du document
 */

/**
 * Compter les mots dans le texte
 */
