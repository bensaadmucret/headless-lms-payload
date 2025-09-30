/**
 * Processor pour les fichiers PDF
 */

import fs from 'fs/promises'
import path from 'path'
import type { ExtractionResult } from '../types'
import { ExtractionError } from '../types'
import { cleanPdfText, detectLanguage, extractChapters as extractChaptersGeneric, extractTitle, countWords } from '../../utils/text'

// Protection globale contre la pollution d'Array.prototype
function cleanArrayPrototype() {
  // Propriétés standard d'Array.prototype qu'il faut préserver
  const standardProps = new Set([
    'at', 'concat', 'copyWithin', 'entries', 'every', 'fill', 'filter',
    'find', 'findIndex', 'findLast', 'findLastIndex', 'flat', 'flatMap',
    'forEach', 'includes', 'indexOf', 'join', 'keys', 'lastIndexOf',
    'length', 'map', 'pop', 'push', 'reduce', 'reduceRight', 'reverse',
    'shift', 'slice', 'some', 'sort', 'splice', 'toLocaleString',
    'toString', 'unshift', 'values', 'constructor', 'toReversed',
    'toSorted', 'toSpliced', 'with'
  ])
  
  // Nettoyer toutes les propriétés ajoutées
  const currentProps = Object.getOwnPropertyNames(Array.prototype)
  for (const prop of currentProps) {
    if (!standardProps.has(prop) && prop !== 'random') {
      try {
        delete (Array.prototype as any)[prop]
        console.log(`🧹 [PDF] Supprimé propriété ${prop} de Array.prototype`)
      } catch {}
    }
  }
  
  // Supprimer spécifiquement 'random' qui cause le problème
  if ('random' in Array.prototype) {
    try {
      delete (Array.prototype as any).random
      console.log(`🧹 [PDF] Supprimé Array.prototype.random`)
    } catch {}
  }
  
  // Vérifier qu'Array.prototype est propre
  const remainingEnumerable = []
  for (const prop in Array.prototype) {
    if (!standardProps.has(prop)) {
      remainingEnumerable.push(prop)
    }
  }
  
  if (remainingEnumerable.length > 0) {
    console.warn(`⚠️ [PDF] Propriétés énumérables restantes: ${remainingEnumerable.join(', ')}`)
  } else {
    console.log(`✅ [PDF] Array.prototype nettoyé avec succès`)
  }
}

export const pdfProcessor = {
  /**
   * Extraire le contenu d'un fichier PDF
   */
  async extract(sourceFileUrl: string): Promise<ExtractionResult> {
    try {
      console.log(`📄 [PDF] Extracting content from: ${sourceFileUrl}`)
      
      // Nettoyer Array.prototype AVANT l'import de pdfjs-dist
      cleanArrayPrototype()
      
      // Lire le fichier PDF depuis l'URL/path
      const filePath = sourceFileUrl.startsWith('/api/media') 
        ? path.join(process.cwd(), 'public/media', path.basename(sourceFileUrl))
        : sourceFileUrl
      
      const pdfBuffer = await fs.readFile(filePath)
      
      // Import dynamique de pdfjs-dist (version legacy pour Node.js)
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      
      // Convertir Buffer en Uint8Array pour pdfjs-dist
      const pdfData = new Uint8Array(pdfBuffer)
      
      // Charger le document PDF
      const loadingTask = pdfjsLib.getDocument({ data: pdfData })
      const pdfDocument = await loadingTask.promise
      
      // Extraire le texte de toutes les pages
      let fullText = ''
      const numPages = pdfDocument.numPages
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
        fullText += pageText + '\n'
      }
      
      // Simuler la structure de pdf-parse pour compatibilité
      const pdfResult = {
        text: fullText,
        numpages: numPages,
        info: {
          Title: null,
          Author: null
        }
      }
      
      if (!pdfResult.text || pdfResult.text.trim().length === 0) {
        throw new ExtractionError('Aucun texte trouvé dans le PDF', 'pdf')
      }
      
      // Nettoyer le texte extrait
      const cleanContent = cleanPdfText(pdfResult.text)
      
      // Détecter la langue
      const language = detectLanguage(cleanContent)
      
      // Analyser la structure (chapitres)
const chapters = extractChaptersWithPages(cleanContent)
      
      // Extraire les métadonnées
      const metadata = {
        pageCount: pdfResult.numpages,
        wordCount: countWords(cleanContent),
        language,
        title: pdfResult.info?.Title || extractTitle(cleanContent),
        author: pdfResult.info?.Author || undefined,
      }
      
      console.log(`✅ [PDF] Successfully extracted ${metadata.wordCount} words from ${metadata.pageCount} pages`)
      
      return {
        success: true,
        extractedText: cleanContent,
        metadata,
        chapters: chapters.length > 0 ? chapters : undefined,
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur extraction PDF'
      console.error(`❌ [PDF] Extraction failed:`, message)
      
      return {
        success: false,
        extractedText: '',
        metadata: { wordCount: 0, pageCount: 0 },
        error: message,
      }
    }
  }
}

/**
}

/**
}

/**
 * Extraire les chapitres du PDF
 */
function extractChaptersWithPages(text: string) {
  const base = extractChaptersGeneric(text)
  return base.map((ch) => {
    const pageNumbers = extractPageNumbers(ch.content)
    return pageNumbers ? { ...ch, pageNumbers } : ch
  })
}

/**
 * Extraire les numéros de pages d'une section
 */
function extractPageNumbers(content: string): string | null {
  // Chercher les patterns de pages (p. 123, page 45, etc.)
  const pageMatches = content.match(/(?:p\.|page|pp\.)\s*(\d+)(?:-(\d+))?/gi)
  
  if (!pageMatches) return null
  
  const pages = pageMatches.map(match => {
    const nums = match.match(/\d+/g)
    return nums ? (nums.length > 1 ? `${nums[0]}-${nums[1]}` : nums[0]) : ''
  }).filter(Boolean)
  
  return pages.length > 0 ? pages.join(', ') : null
}

/**
 * Extraire le titre du document PDF
 */

/**
 * Compter les mots dans le texte
 */
