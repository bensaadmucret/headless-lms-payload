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
      
      console.log(`📄 [PDF] Reading file from: ${filePath}`)
      const pdfBuffer = await fs.readFile(filePath)
      const fileSizeMB = pdfBuffer.length / 1024 / 1024
      console.log(`📄 [PDF] File size: ${fileSizeMB.toFixed(2)} MB`)
      
      // Import dynamique de pdfjs-dist (version legacy pour Node.js)
      console.log(`📄 [PDF] Loading pdfjs-dist library...`)
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
      
      // Convertir Buffer en Uint8Array pour pdfjs-dist
      const pdfData = new Uint8Array(pdfBuffer)
      console.log(`📄 [PDF] Converted to Uint8Array, loading PDF document...`)
      
      // Charger le document PDF avec options optimisées pour les gros fichiers
      const loadingTask = pdfjsLib.getDocument({
        data: pdfData,
        // Options pour optimiser la mémoire
        disableFontFace: true, // Désactiver les polices pour économiser la mémoire
        useSystemFonts: true,
        standardFontDataUrl: undefined,
      })
      const pdfDocument = await loadingTask.promise
      console.log(`📄 [PDF] PDF document loaded successfully`)
      
      // Libérer le buffer original
      pdfBuffer.fill(0)
      console.log(`📄 [PDF] Original buffer cleared from memory`)
      
      // Extraire le texte de toutes les pages
      let fullText = ''
      const numPages = pdfDocument.numPages
      
      console.log(`📄 [PDF] Document has ${numPages} pages`)
      
      // Pour les gros PDFs, limiter le nombre de pages à traiter
      const maxPages = numPages > 500 ? 500 : numPages
      if (numPages > 500) {
        console.log(`⚠️ [PDF] Large document detected (${numPages} pages), limiting to first ${maxPages} pages`)
      }
      
      // Traitement par batch pour optimiser la mémoire
      const BATCH_SIZE = 50 // Traiter 50 pages à la fois
      const batches = Math.ceil(maxPages / BATCH_SIZE)
      
      // Compteurs pour les pages avec/sans texte
      let pagesWithText = 0
      let pagesWithoutText = 0
      
      console.log(`📄 [PDF] Processing in ${batches} batches of ${BATCH_SIZE} pages`)
      
      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        const startPage = batchIndex * BATCH_SIZE + 1
        const endPage = Math.min((batchIndex + 1) * BATCH_SIZE, maxPages)
        
        console.log(`📦 [PDF] Processing batch ${batchIndex + 1}/${batches} (pages ${startPage}-${endPage})`)
        
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          try {
            const page = await pdfDocument.getPage(pageNum)
            const textContent = await page.getTextContent()
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ')
            
            // Vérifier si la page contient du texte significatif
            const trimmedText = pageText.trim()
            if (trimmedText.length > 50) { // Au moins 50 caractères
              pagesWithText++
              fullText += pageText + '\n'
            } else {
              pagesWithoutText++
              console.log(`⚠️ [PDF] Page ${pageNum} has no text (likely image or empty page)`)
            }
            
            // Libérer la mémoire de la page immédiatement
            page.cleanup()
          } catch (pageError) {
            console.warn(`⚠️ [PDF] Failed to extract page ${pageNum}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`)
            pagesWithoutText++
            // Continue avec la page suivante
          }
        }
        
        // Log après chaque batch
        console.log(`✅ [PDF] Batch ${batchIndex + 1}/${batches} completed, total text: ${fullText.length} chars, pages with text: ${pagesWithText}/${endPage}`)
        
        // Forcer le garbage collector si disponible (Node avec --expose-gc)
        if (global.gc && batchIndex < batches - 1) {
          global.gc()
          console.log(`🧹 [PDF] Garbage collection triggered after batch ${batchIndex + 1}`)
        }
      }
      
      console.log(`📄 [PDF] Total extracted text length: ${fullText.length} chars`)
      console.log(`📊 [PDF] Pages with text: ${pagesWithText}/${maxPages} (${((pagesWithText / maxPages) * 100).toFixed(1)}%)`)
      console.log(`📊 [PDF] Pages without text: ${pagesWithoutText}/${maxPages} (${((pagesWithoutText / maxPages) * 100).toFixed(1)}%)`)
      
      // Nettoyer le document PDF de la mémoire
      await pdfDocument.cleanup()
      await pdfDocument.destroy()
      console.log(`🧹 [PDF] PDF document cleaned from memory`)
      
      // Vérifier si suffisamment de pages contiennent du texte
      const textPageRatio = pagesWithText / maxPages
      const MIN_TEXT_PAGE_RATIO = 0.2 // Au moins 20% des pages doivent contenir du texte
      
      if (textPageRatio < MIN_TEXT_PAGE_RATIO) {
        console.error(`❌ [PDF] Only ${pagesWithText}/${maxPages} pages contain text (${(textPageRatio * 100).toFixed(1)}%)`)
        console.error(`⚠️ [PDF] This PDF might be:`)
        console.error(`   - A scanned document (images without OCR)`)
        console.error(`   - A protected/encrypted PDF`)
        console.error(`   - A document with mostly images`)
        throw new ExtractionError(`Document majoritairement composé d'images (${pagesWithText}/${maxPages} pages avec texte - minimum ${(MIN_TEXT_PAGE_RATIO * 100)}% requis)`, 'pdf')
      }
      
      if (!fullText || fullText.trim().length === 0) {
        console.error(`❌ [PDF] No text content extracted despite ${pagesWithText} pages marked as having text`)
        throw new ExtractionError('Aucun texte trouvé dans le PDF - Le document est peut-être scanné ou protégé', 'pdf')
      }
      
      console.log(`✅ [PDF] Document accepted: ${pagesWithText}/${maxPages} pages with text (${(textPageRatio * 100).toFixed(1)}%)`)
      
      console.log(`📄 [PDF] Text preview (first 200 chars): ${fullText.substring(0, 200)}`)
      
      // Simuler la structure de pdf-parse pour compatibilité
      const pdfResult = {
        text: fullText,
        numpages: numPages,
        info: {
          Title: null,
          Author: null
        }
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
