/**
 * Utilitaires de traitement de texte partagés
 */

export type Language = 'fr' | 'en'

// Nettoyage générique
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

// Nettoyage spécifique PDF
export function cleanPdfText(text: string): string {
  return text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([a-z])-\n([a-z])/g, '$1$2')
    .replace(/([a-z])\n([a-z])/g, '$1 $2')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

// Nettoyage spécifique DOCX
export function cleanDocxText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()
}

// Nettoyage HTML (EPUB)
export function cleanEpubContent(htmlContent: string): string {
  let text = htmlContent
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<[^>]+>/g, '')

  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")

  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
}

// Détection de langue simple FR/EN
export function detectLanguage(text: string): Language {
  const frenchWords = [
    'le', 'la', 'les', 'de', 'du', 'des', 'et', 'est', 'dans', 'pour', 'avec', 'sur', 'par', 'une', 'que', 'ce',
    'patient', 'maladie', 'traitement', 'diagnostic', 'symptôme', 'médecin', 'hôpital',
    'anatomie', 'physiologie', 'pathologie', 'chirurgie', 'hématologie', 'endocrinologie'
  ]

  const englishWords = [
    'the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with', 'for', 'as', 'was', 'are', 'be',
    'patient', 'disease', 'treatment', 'diagnosis', 'symptom', 'doctor', 'hospital',
    'anatomy', 'physiology', 'pathology', 'surgery', 'hematology', 'endocrinology'
  ]

  const words = text.toLowerCase().split(/\s+/).slice(0, 500)

  const frenchScore = frenchWords.reduce((score, word) => score + words.filter((w) => w.includes(word)).length, 0)
  const englishScore = englishWords.reduce((score, word) => score + words.filter((w) => w.includes(word)).length, 0)

  return frenchScore > englishScore ? 'fr' : 'en'
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 1).length
}

export function extractTitle(text: string): string | undefined {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 10)

  for (const line of lines) {
    if (
      line.length > 8 &&
      line.length < 150 &&
      !/^\d+$/.test(line) &&
      !line.includes('@') &&
      !line.includes('http') &&
      line.split(' ').length >= 2
    ) {
      return line
    }
  }
  return undefined
}

export function extractChapters(text: string): Array<{ title: string; content: string }> {
  const chapters: Array<{ title: string; content: string }> = []

  const chapterPatterns: RegExp[] = [
    /^(CHAPITRE|CHAPTER|Chapitre|Chapter)\s+\d+[^\n]*$/gmi,
    /^\d+\.\s+[A-Z][^\n]{10,100}$/gm,
    /^\d+\.\d+\s+[A-Z][^\n]{10,80}$/gm,
    /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ\s]{12,80}$/gm,
    /^(INTRODUCTION|DÉFINITION|ÉTIOLOGIE|PHYSIOPATHOLOGIE|CLINIQUE|DIAGNOSTIC|TRAITEMENT|CONCLUSION)[^\n]*$/gmi,
    /^(ANATOMY|PHYSIOLOGY|PATHOLOGY|DIAGNOSIS|TREATMENT|PROGNOSIS)[^\n]*$/gmi,
    /^[IVX]+\.\s+[A-Z][^\n]{10,}$/gm,
  ]

  let matches: RegExpMatchArray[] = []
  for (const pattern of chapterPatterns) {
    matches = matches.concat(Array.from(text.matchAll(pattern)))
  }

  // Dédupliquer par proximité d’index
  matches = matches.filter((match, index, arr) => arr.findIndex((m) => Math.abs((m.index || 0) - (match.index || 0)) < 20) === index)

  // Trier par position
  matches.sort((a, b) => (a.index || 0) - (b.index || 0))

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    if (!match || !match[0]) continue

    const title = match[0].trim()
    const startIndex = match.index || 0
    const endIndex = i < matches.length - 1 ? (matches[i + 1].index || text.length) : text.length

    const content = text.substring(startIndex, endIndex).replace(title, '').trim()

    if (content.length > 80 && content.length < 50000) {
      chapters.push({ title, content })
    }
  }

  return chapters
}
