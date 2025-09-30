/**
 * Utilitaires pour convertir du texte en format Lexical Editor
 */

export interface LexicalNode {
  type: string
  children?: LexicalNode[]
  text?: string
  format?: number
}

export interface LexicalDocument {
  root: {
    type: 'root'
    children: LexicalNode[]
  }
}

/**
 * Convertit du texte brut en objet Lexical
 * Gère les paragraphes, les sauts de ligne, et la mise en forme de base
 */
export function textToLexical(text: string): LexicalDocument {
  if (!text || typeof text !== 'string') {
    return createEmptyLexicalDocument()
  }

  // Diviser le texte en paragraphes (séparés par double saut de ligne)
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0)
  
  const children: LexicalNode[] = paragraphs.map(paragraph => {
    // Pour chaque paragraphe, gérer les sauts de ligne simples
    const lines = paragraph.split('\n').filter(line => line.trim().length > 0)
    
    if (lines.length === 1) {
      // Paragraphe simple
      return {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: lines[0].trim()
          }
        ]
      }
    } else {
      // Paragraphe multi-lignes - créer des éléments text avec linebreak
      const lineElements: LexicalNode[] = []
      
      lines.forEach((line, index) => {
        lineElements.push({
          type: 'text',
          text: line.trim()
        })
        
        // Ajouter un saut de ligne sauf pour la dernière ligne
        if (index < lines.length - 1) {
          lineElements.push({
            type: 'linebreak'
          })
        }
      })
      
      return {
        type: 'paragraph',
        children: lineElements
      }
    }
  })

  return {
    root: {
      type: 'root',
      children: children
    }
  }
}

/**
 * Crée un document Lexical vide
 */
export function createEmptyLexicalDocument(): LexicalDocument {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: ''
            }
          ]
        }
      ]
    }
  }
}

/**
 * Convertit un texte avec structure médicale (chapitres, sections)
 * en format Lexical avec formatage simple
 */
export function medicalTextToLexical(text: string): LexicalDocument {
  if (!text || typeof text !== 'string') {
    return createEmptyLexicalDocument()
  }

  const lines = text.split('\n').filter(line => line.trim().length > 0)
  const children: LexicalNode[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Tous les types de contenu sont des paragraphes simples
    children.push({
      type: 'paragraph',
      children: [
        {
          type: 'text',
          text: line
        }
      ]
    })
  }

  return {
    root: {
      type: 'root',
      children: children
    }
  }
}

/**
 * Convertit un document Lexical vers du texte brut
 */
export function lexicalToText(lexicalDoc: LexicalDocument): string {
  if (!lexicalDoc?.root?.children) {
    return ''
  }

  const extractText = (node: LexicalNode): string => {
    if (node.text) {
      return node.text
    }
    
    if (node.children) {
      return node.children.map(extractText).join('')
    }
    
    if (node.type === 'linebreak') {
      return '\n'
    }
    
    return ''
  }

  return lexicalDoc.root.children.map(child => {
    const text = extractText(child)
    
    // Ajouter des sauts de ligne après les paragraphes
    if (child.type === 'paragraph') {
      return text + '\n'
    }
    
    return text
  }).join('').trim()
}