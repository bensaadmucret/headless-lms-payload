"use client"
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Template {
  id: string
  name: string
  description: string
  type: 'json' | 'csv'
  icon: string
  filename: string
  size: string
}

const templates: Template[] = [
  {
    id: 'questions-json',
    name: 'Questions QCM (JSON)',
    description: 'Template pour importer des questions à choix multiples avec explications',
    type: 'json',
    icon: '❓',
    filename: 'questions-simple.json',
    size: '2.1 KB'
  },
  {
    id: 'questions-csv',
    name: 'Questions QCM (CSV)',
    description: 'Format CSV simplifié pour import depuis Excel/LibreOffice',
    type: 'csv',
    icon: '📊',
    filename: 'questions-template.csv',
    size: '1.2 KB'
  },
  {
    id: 'flashcards-json',
    name: 'Flashcards (JSON)',
    description: 'Template pour cartes de révision recto/verso',
    type: 'json',
    icon: '🃏',
    filename: 'flashcards-simple.json',
    size: '1.8 KB'
  },
  {
    id: 'learning-path-json',
    name: 'Parcours d\'apprentissage (JSON)',
    description: 'Template pour créer des séquences pédagogiques progressives',
    type: 'json',
    icon: '🛤️',
    filename: 'learning-path-simple.json',
    size: '3.2 KB'
  }
]

export const JSONImportTemplateDownloader: React.FC = () => {
  const downloadTemplate = async (template: Template) => {
    try {
      const response = await fetch(`/api/json-import/templates/${template.filename}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = template.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      // In a real implementation, show a toast notification
      alert('Erreur lors du téléchargement du template')
    }
  }

  const downloadDocumentation = async () => {
    try {
      const response = await fetch('/api/json-import/templates/README.md', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Guide-Import-JSON-CSV-MedCoach.md'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Documentation download error:', error)
      alert('Erreur lors du téléchargement de la documentation')
    }
  }

  const downloadAllTemplates = async () => {
    // Download all templates one by one
    for (const template of templates) {
      await downloadTemplate(template)
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Also download documentation
    await downloadDocumentation()
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          color: 'var(--theme-text, #e5e5e5)',
          marginBottom: '8px'
        }}>
          📁 Templates d'Import
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280',
          marginBottom: '24px'
        }}>
          Téléchargez les templates pour structurer vos données avant l'import
        </p>
        
        <Button
          onClick={downloadAllTemplates}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          📦 Télécharger tout (Templates + Guide)
        </Button>
      </div>

      {/* Templates Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px',
        marginBottom: '32px'
      }}>
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>{template.icon}</span>
                <div>
                  <CardTitle style={{ fontSize: '18px', marginBottom: '4px' }}>
                    {template.name}
                  </CardTitle>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '12px',
                      color: '#6b7280',
                      backgroundColor: template.type === 'json' ? '#8b5cf6' : '#f59e0b',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      color: 'white',
                      fontWeight: '600'
                    }}>
                      {template.type.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {template.size}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p style={{ 
                color: '#6b7280', 
                fontSize: '14px',
                marginBottom: '16px',
                lineHeight: '1.5'
              }}>
                {template.description}
              </p>
              
              <Button
                onClick={() => downloadTemplate(template)}
                style={{
                  backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
                  color: 'var(--theme-text, #e5e5e5)',
                  border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                  width: '100%',
                  padding: '8px 16px'
                }}
              >
                📥 Télécharger {template.filename}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documentation Section */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>📖</span>
            Documentation Complète
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: 'var(--theme-text, #e5e5e5)',
              marginBottom: '8px'
            }}>
              Guide d'Import JSON/CSV - MedCoach
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
              Guide complet avec exemples, workflow détaillé et résolution des problèmes courants
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '12px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              <div style={{ color: '#10b981' }}>
                ✅ Templates JSON et CSV
              </div>
              <div style={{ color: '#10b981' }}>
                ✅ Workflow de validation
              </div>
              <div style={{ color: '#10b981' }}>
                ✅ Guide Anki → CSV → MedCoach
              </div>
              <div style={{ color: '#10b981' }}>
                ✅ Résolution des problèmes
              </div>
              <div style={{ color: '#10b981' }}>
                ✅ Bonnes pratiques
              </div>
              <div style={{ color: '#10b981' }}>
                ✅ Cas d'usage typiques
              </div>
            </div>
          </div>
          
          <Button
            onClick={downloadDocumentation}
            style={{
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              padding: '10px 20px'
            }}
          >
            📖 Télécharger le guide complet
          </Button>
        </CardContent>
      </Card>

      {/* Quick Start Section */}
      <Card style={{ marginTop: '24px' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>🚀</span>
            Démarrage Rapide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: 'var(--theme-elevation-50, #252525)',
              borderRadius: '8px',
              border: '1px solid var(--theme-elevation-150, #3a3a3a)'
            }}>
              <h4 style={{ 
                color: 'var(--theme-text, #e5e5e5)', 
                fontSize: '16px', 
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                1️⃣ Nouveau sur l'import ?
              </h4>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
                Commencez par le template Questions CSV
              </p>
              <Button
                onClick={() => downloadTemplate(templates[1])}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  fontSize: '12px',
                  padding: '6px 12px'
                }}
              >
                📊 Template CSV
              </Button>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: 'var(--theme-elevation-50, #252525)',
              borderRadius: '8px',
              border: '1px solid var(--theme-elevation-150, #3a3a3a)'
            }}>
              <h4 style={{ 
                color: 'var(--theme-text, #e5e5e5)', 
                fontSize: '16px', 
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                2️⃣ Migration depuis Anki ?
              </h4>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
                Suivez le guide Anki → CSV → MedCoach
              </p>
              <Button
                onClick={downloadDocumentation}
                style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  fontSize: '12px',
                  padding: '6px 12px'
                }}
              >
                📖 Guide Anki
              </Button>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: 'var(--theme-elevation-50, #252525)',
              borderRadius: '8px',
              border: '1px solid var(--theme-elevation-150, #3a3a3a)'
            }}>
              <h4 style={{ 
                color: 'var(--theme-text, #e5e5e5)', 
                fontSize: '16px', 
                fontWeight: '600',
                marginBottom: '8px'
              }}>
              3️⃣ Contenu avancé ?
              </h4>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
                Utilisez les templates JSON complets
              </p>
              <Button
                onClick={() => downloadTemplate(templates[0])}
                style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  fontSize: '12px',
                  padding: '6px 12px'
                }}
              >
                📄 Template JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default JSONImportTemplateDownloader