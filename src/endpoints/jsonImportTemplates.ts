import type { PayloadHandler } from 'payload'
import path from 'path'
import fs from 'fs'

// Endpoint pour télécharger les templates JSON/CSV
export const downloadTemplate: PayloadHandler = async (req, res) => {
  try {
    const { filename } = req.params
    
    // Sécurité : vérifier que le fichier est autorisé
    const allowedFiles = [
      'questions-simple.json',
      'flashcards-simple.json', 
      'learning-path-simple.json',
      'questions-template.csv',
      'README.md'
    ]
    
    if (!allowedFiles.includes(filename)) {
      return res.status(404).json({ error: 'Template non trouvé' })
    }
    
    const templatesDir = path.join(process.cwd(), 'src/templates/json-import-templates')
    const filePath = path.join(templatesDir, filename)
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Template non trouvé' })
    }
    
    // Définir le type MIME approprié
    let contentType = 'application/octet-stream'
    if (filename.endsWith('.json')) {
      contentType = 'application/json'
    } else if (filename.endsWith('.csv')) {
      contentType = 'text/csv'
    } else if (filename.endsWith('.md')) {
      contentType = 'text/markdown'
    }
    
    // Lire et envoyer le fichier
    const fileContent = fs.readFileSync(filePath)
    
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(fileContent)
    
  } catch (error) {
    console.error('Erreur téléchargement template:', error)
    res.status(500).json({ error: 'Erreur serveur lors du téléchargement' })
  }
}

// Endpoint pour lister tous les templates disponibles
export const listTemplates: PayloadHandler = async (req, res) => {
  try {
    const templates = [
      {
        id: 'questions-json',
        name: 'Questions QCM (JSON)',
        description: 'Template pour importer des questions à choix multiples avec explications',
        type: 'json',
        filename: 'questions-simple.json',
        size: '2.1 KB'
      },
      {
        id: 'questions-csv',
        name: 'Questions QCM (CSV)',
        description: 'Format CSV simplifié pour import depuis Excel/LibreOffice',
        type: 'csv',
        filename: 'questions-template.csv',
        size: '1.2 KB'
      },
      {
        id: 'flashcards-json',
        name: 'Flashcards (JSON)',
        description: 'Template pour cartes de révision recto/verso',
        type: 'json',
        filename: 'flashcards-simple.json',
        size: '1.8 KB'
      },
      {
        id: 'learning-path-json',
        name: 'Parcours d\'apprentissage (JSON)',
        description: 'Template pour créer des séquences pédagogiques progressives',
        type: 'json',
        filename: 'learning-path-simple.json',
        size: '3.2 KB'
      },
      {
        id: 'documentation',
        name: 'Guide complet (Markdown)',
        description: 'Documentation complète avec exemples et workflow',
        type: 'md',
        filename: 'README.md',
        size: '15.2 KB'
      }
    ]
    
    res.json({ templates })
    
  } catch (error) {
    console.error('Erreur listage templates:', error)
    res.status(500).json({ error: 'Erreur serveur lors du listage' })
  }
}