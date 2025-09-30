// File removed: unused content extraction service

export interface ExtractedContent {
  fullText: string
  pageCount?: number
  metadata?: {
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
  }
  chapters?: Chapter[]
}

export interface Chapter {
  chapterTitle: string
  chapterNumber: number
  content: string
  pageNumbers?: string
  wordCount: number
}

export class ContentExtractionService {
  
  /**
   * Extrait le contenu d'un fichier PDF
   */
  async extractFromPDF(buffer: Buffer): Promise<ExtractedContent> {
    try {
      console.log('📄 Début extraction PDF...')
      
      // Import dynamique pour éviter les problèmes de debug du package
      const pdfParse = await import('pdf-parse')
      const pdfParser = pdfParse.default || pdfParse
      
      const pdfData = await pdfParser(buffer, {
        // Options pour optimiser l'extraction
        max: 0, // Pas de limite de pages
        version: 'v1.10.100', // Version stable
      })
      
      console.log(`✅ PDF extrait: ${pdfData.numpages} pages, ${pdfData.text.length} caractères`)
      
      // Nettoyage du texte extrait
      const cleanedText = this.cleanExtractedText(pdfData.text)
      
      // Tentative de structuration en chapitres
      const chapters = await this.chunkContent(cleanedText, 'pdf')
      
      return {
        fullText: cleanedText,
        pageCount: pdfData.numpages,
        metadata: {
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          subject: pdfData.info?.Subject,
          creator: pdfData.info?.Creator,
          producer: pdfData.info?.Producer,
          creationDate: pdfData.info?.CreationDate ? new Date(pdfData.info.CreationDate) : undefined,
          modificationDate: pdfData.info?.ModDate ? new Date(pdfData.info.ModDate) : undefined,
        },
        chapters,
      }
    } catch (error) {
      console.error('❌ Erreur extraction PDF:', error)
      throw new Error(`Échec de l'extraction PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }
  
  /**
   * Extrait le contenu d'un fichier EPUB
   */
  async extractFromEPUB(buffer: Buffer): Promise<ExtractedContent> {
    try {
      console.log('📚 Début extraction EPUB...')
      
      // Import dynamique pour éviter les problèmes SSR
      const epubParser = await import('epub-parser')
      const parser = epubParser.default || epubParser
      
      const epubData = await parser.parse(buffer)
      
      let fullText = ''
      const chapters: Chapter[] = []
      let chapterNumber = 1
      
      // Parcourir tous les chapitres de l'EPUB
      for (const section of epubData.sections || []) {
        if (section.htmlContent) {
          // Nettoyer le HTML pour obtenir le texte brut
          const cleanText = this.stripHtml(section.htmlContent)
          fullText += cleanText + '\n\n'
          
          chapters.push({
            chapterTitle: section.title || `Chapitre ${chapterNumber}`,
            chapterNumber: chapterNumber++,
            content: cleanText,
            wordCount: this.countWords(cleanText),
          })
        }
      }
      
      console.log(`✅ EPUB extrait: ${chapters.length} chapitres, ${fullText.length} caractères`)
      
      return {
        fullText: this.cleanExtractedText(fullText),
        metadata: {
          title: epubData.title,
          author: epubData.author,
        },
        chapters,
      }
    } catch (error) {
      console.error('❌ Erreur extraction EPUB:', error)
      throw new Error(`Échec de l'extraction EPUB: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }
  
  /**
   * Extrait le contenu d'un fichier DOCX
   */
  async extractFromDOCX(buffer: Buffer): Promise<ExtractedContent> {
    try {
      console.log('📝 Début extraction DOCX...')
      
      // Import dynamique pour éviter les problèmes SSR
      const mammoth = await import('mammoth')
      const mammothLib = mammoth.default || mammoth
      
      const result = await mammothLib.extractRawText({ buffer })
      const cleanedText = this.cleanExtractedText(result.value)
      
      // Structuration en chapitres pour DOCX
      const chapters = await this.chunkContent(cleanedText, 'docx')
      
      console.log(`✅ DOCX extrait: ${cleanedText.length} caractères, ${chapters.length} sections`)
      
      return {
        fullText: cleanedText,
        chapters,
      }
    } catch (error) {
      console.error('❌ Erreur extraction DOCX:', error)
      throw new Error(`Échec de l'extraction DOCX: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    }
  }
  
  /**
   * Divise le contenu en chapitres logiques
   */
  async chunkContent(content: string, _documentType: 'pdf' | 'epub' | 'docx'): Promise<Chapter[]> {
    try {
      console.log('🔪 Début découpage en chapitres...')
      
      const chapters: Chapter[] = []
      
      // Patterns de détection de chapitres (en français et anglais)
      const chapterPatterns = [
        /^CHAPITRE\s+(\d+|[IVXLCDM]+)[\s\.:]\s*(.+)$/gim,
        /^CHAPTER\s+(\d+|[IVXLCDM]+)[\s\.:]\s*(.+)$/gim,
        /^(\d+)\.\s+(.+)$/gm, // Format "1. Titre"
        /^([IVXLCDM]+)\.\s+(.+)$/gm, // Format romain "I. Titre"
        /^#{1,3}\s+(.+)$/gm, // Format Markdown
      ]
      
      let bestMatch: { pattern: RegExp; matches: RegExpMatchArray[] } | null = null
      let maxMatches = 0
      
      // Trouver le pattern qui donne le plus de résultats cohérents
      for (const pattern of chapterPatterns) {
        const matches = Array.from(content.matchAll(pattern))
        if (matches.length > maxMatches && matches.length > 1) {
          maxMatches = matches.length
          bestMatch = { pattern, matches }
        }
      }
      
      if (bestMatch && bestMatch.matches.length > 1) {
        console.log(`🎯 Pattern détecté: ${bestMatch.matches.length} chapitres trouvés`)
        
        // Diviser le contenu selon les chapitres détectés
        for (let i = 0; i < bestMatch.matches.length; i++) {
          const match = bestMatch.matches[i]
          const nextMatch = bestMatch.matches[i + 1]
          
          const startIndex = match.index || 0
          const endIndex = nextMatch ? (nextMatch.index || content.length) : content.length
          
          const chapterContent = content.substring(startIndex, endIndex).trim()
          const chapterTitle = match[2] || match[1] || `Chapitre ${i + 1}`
          
          chapters.push({
            chapterTitle: chapterTitle.trim(),
            chapterNumber: i + 1,
            content: chapterContent,
            wordCount: this.countWords(chapterContent),
          })
        }
      } else {
        console.log('📄 Aucune structure de chapitres détectée, division par taille')
        
        // Division par taille si aucune structure n'est détectée
        const chunkSize = 5000 // ~5000 caractères par chunk
        const chunks = this.splitBySize(content, chunkSize)
        
        chunks.forEach((chunk, index) => {
          chapters.push({
            chapterTitle: `Section ${index + 1}`,
            chapterNumber: index + 1,
            content: chunk.trim(),
            wordCount: this.countWords(chunk),
          })
        })
      }
      
      console.log(`✅ Découpage terminé: ${chapters.length} sections créées`)
      return chapters
      
    } catch (error) {
      console.error('❌ Erreur découpage:', error)
      
      // Fallback: une seule section avec tout le contenu
      return [{
        chapterTitle: 'Document Complet',
        chapterNumber: 1,
        content: content,
        wordCount: this.countWords(content),
      }]
    }
  }
  
  /**
   * Nettoie le texte extrait des artefacts d'extraction
   */
  private cleanExtractedText(text: string): string {
    return text
      // Supprimer les espaces multiples
      .replace(/\s+/g, ' ')
      // Supprimer les sauts de ligne multiples
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Supprimer les caractères de contrôle
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim
      .trim()
  }
  
  /**
   * Supprime les balises HTML et garde le texte
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }
  
  /**
   * Divise un texte en chunks de taille donnée
   */
  private splitBySize(text: string, chunkSize: number): string[] {
    const chunks: string[] = []
    const sentences = text.split(/[.!?]+\s+/)
    
    let currentChunk = ''
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim())
    }
    
    return chunks
  }
  
  /**
   * Compte le nombre de mots dans un texte
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }
  
  /**
   * Détecte le type de document depuis le buffer
   */
  static detectDocumentType(buffer: Buffer, filename?: string): string {
    // Vérification par signature de fichier (magic numbers)
    const signature = buffer.subarray(0, 4)
    
    // PDF signature: %PDF
    if (signature.toString('ascii').startsWith('%PDF')) {
      return 'pdf'
    }
    
    // ZIP-based formats (DOCX, EPUB)
    if (signature[0] === 0x50 && signature[1] === 0x4B) {
      // C'est un ZIP, vérifions le contenu
      if (filename) {
        const ext = filename.toLowerCase().split('.').pop()
        if (ext === 'docx') return 'docx'
        if (ext === 'epub') return 'epub'
      }
      return 'zip'
    }
    
    // Fallback sur l'extension de fichier
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop()
      switch (ext) {
        case 'pdf': return 'pdf'
        case 'epub': return 'epub'
        case 'docx': return 'docx'
        case 'txt': return 'txt'
        default: return 'unknown'
      }
    }
    
    return 'unknown'
  }
}