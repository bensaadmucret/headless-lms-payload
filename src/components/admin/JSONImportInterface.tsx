"use client"
import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'

import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Checkbox } from '@/components/ui/checkbox'
import JSONImportValidationScreen from './JSONImportValidationScreen'
import JSONImportPreviewScreen from './JSONImportPreviewScreen'
import JSONImportProgressScreen from './JSONImportProgressScreen'
import JSONImportHistoryScreen from './JSONImportHistoryScreen'
import JSONImportTemplateDownloader from './JSONImportTemplateDownloader'

interface ImportJob {
  id: string
  fileName: string
  importType: 'questions' | 'quizzes' | 'flashcards' | 'learning-paths' | 'csv'
  status: 'queued' | 'processing' | 'validating' | 'preview' | 'completed' | 'failed'
  progress: {
    total: number
    processed: number
    successful: number
    failed: number
  }
  createdAt: string
  completedAt?: string
  errors?: ImportError[]
  warnings?: string[]
}

interface ImportError {
  type: 'validation' | 'database' | 'mapping' | 'reference' | 'system'
  severity: 'critical' | 'major' | 'minor' | 'warning'
  itemIndex?: number
  field?: string
  message: string
  suggestion?: string
}

interface ValidationResult {
  isValid: boolean
  errors: ImportError[]
  warnings: string[]
  previewData?: any[]
  categoryMappings?: CategoryMapping[]
}

interface CategoryMapping {
  originalName: string
  suggestedCategory: string
  confidence: number
  action: 'map' | 'create' | 'ignore'
}

interface ImportOptions {
  dryRun: boolean
  batchSize: number
  overwriteExisting: boolean
  generateDistractors: boolean
  requireHumanValidation: boolean
}

export const JSONImportInterface: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'validation' | 'preview' | 'progress' | 'history' | 'templates'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<string>('')
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    dryRun: false,
    batchSize: 100,
    overwriteExisting: false,
    generateDistractors: true,
    requireHumanValidation: true
  })
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (isValidFileType(file)) {
        setSelectedFile(file)
        detectImportType(file)
      }
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (isValidFileType(file)) {
        setSelectedFile(file)
        detectImportType(file)
      }
    }
  }

  const isValidFileType = (file: File): boolean => {
    const validTypes = ['.json', '.csv']
    return validTypes.some(type => file.name.toLowerCase().endsWith(type))
  }

  const detectImportType = (file: File) => {
    if (file.name.toLowerCase().endsWith('.csv')) {
      setImportType('csv')
    } else if (file.name.toLowerCase().endsWith('.json')) {
      // Try to detect JSON type from filename or content
      const fileName = file.name.toLowerCase()
      if (fileName.includes('question')) {
        setImportType('questions')
      } else if (fileName.includes('flashcard')) {
        setImportType('flashcards')
      } else if (fileName.includes('path') || fileName.includes('parcours')) {
        setImportType('learning-paths')
      } else {
        setImportType('questions') // Default
      }
    }
  }

  const handleValidation = async () => {
    if (!selectedFile || !importType) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('importType', importType)
      formData.append('options', JSON.stringify({ ...importOptions, dryRun: true }))

      const response = await fetch('/api/json-import/validate', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const result = await response.json()
      setValidationResult(result)
      
      if (result.isValid || result.errors.filter((e: ImportError) => e.severity === 'critical').length === 0) {
        setCurrentStep('preview')
      } else {
        setCurrentStep('validation')
      }
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile || !importType || !validationResult) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('importType', importType)
      formData.append('options', JSON.stringify(importOptions))

      const response = await fetch('/api/json-import/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Upload response:', result) // Debug log
      
      // Vérifier si la réponse contient un job
      if (result.job && result.job.id) {
        setCurrentJob(result.job)
        setCurrentStep('progress')
        // Start polling for progress
        pollJobProgress(result.job.id)
      } else {
        // Si pas de job, traiter comme un import direct
        console.log('Import result:', result)
        if (result.success) {
          setCurrentStep('history')
          loadImportHistory()
        } else {
          console.error('Import failed:', result.error || 'Unknown error')
          alert(`Erreur d'import: ${result.error || 'Erreur inconnue'}`)
        }
      }
    } catch (error) {
      console.error('Import error:', error)
    } finally {
      setLoading(false)
    }
  }

  const pollJobProgress = async (jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/json-import/status/${jobId}`, {
          credentials: 'include'
        })
        const job = await response.json()
        setCurrentJob(job)
        
        if (job.status === 'completed' || job.status === 'failed') {
          loadImportHistory()
          return
        }
        
        setTimeout(poll, 2000)
      } catch (error) {
        console.error('Polling error:', error)
      }
    }
    
    poll()
  }

  const loadImportHistory = async () => {
    try {
      const response = await fetch('/api/json-import/history', {
        credentials: 'include'
      })
      const history = await response.json()
      // History will be handled by the history screen component
      console.log('History loaded:', history)
    } catch (error) {
      console.error('History loading error:', error)
    }
  }

  const resetImport = () => {
    setCurrentStep('upload')
    setSelectedFile(null)
    setImportType('')
    setValidationResult(null)
    setCurrentJob(null)
  }



  // Load history on component mount
  useEffect(() => {
    loadImportHistory()
  }, [])

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          color: 'var(--theme-text, #e5e5e5)',
          marginBottom: '8px'
        }}>
          📥 Import de Contenu JSON/CSV
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280',
          marginBottom: '24px'
        }}>
          Importez vos questions, flashcards et parcours d'apprentissage en masse
        </p>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[
            { key: 'upload', label: '📤 Upload' },
            { key: 'validation', label: '✅ Validation' },
            { key: 'preview', label: '👁️ Aperçu' },
            { key: 'progress', label: '⏳ Progression' },
            { key: 'history', label: '📋 Historique' },
            { key: 'templates', label: '📁 Templates' }
          ].map(tab => (
            <Button
              key={tab.key}
              onClick={() => setCurrentStep(tab.key as any)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: currentStep === tab.key 
                  ? 'var(--theme-elevation-200, #3a3a3a)' 
                  : 'var(--theme-elevation-50, #252525)',
                color: currentStep === tab.key 
                  ? 'var(--theme-text, #e5e5e5)' 
                  : '#6b7280',
                border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                borderRadius: '8px'
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Upload Screen */}
      {currentStep === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>📤 Sélection du Fichier</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? '#667eea' : 'var(--theme-elevation-150, #3a3a3a)'}`,
                borderRadius: '12px',
                padding: '48px 24px',
                textAlign: 'center',
                backgroundColor: dragActive 
                  ? 'rgba(102, 126, 234, 0.1)' 
                  : 'var(--theme-elevation-50, #252525)',
                transition: 'all 0.3s ease',
                marginBottom: '24px'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {dragActive ? '📥' : '📁'}
              </div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: 'var(--theme-text, #e5e5e5)',
                marginBottom: '8px'
              }}>
                {dragActive ? 'Déposez votre fichier ici' : 'Glissez-déposez votre fichier'}
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                Formats supportés: JSON, CSV (max 10MB)
              </p>
              
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-input"
              />
              <label 
                htmlFor="file-input"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  textAlign: 'center',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#5a67d8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#667eea'
                }}
              >
                📂 Parcourir les fichiers
              </label>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <h4 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: 'var(--theme-text, #e5e5e5)',
                  marginBottom: '8px'
                }}>
                  📄 Fichier sélectionné
                </h4>
                <p style={{ color: '#6b7280', marginBottom: '4px' }}>
                  <strong>Nom:</strong> {selectedFile.name}
                </p>
                <p style={{ color: '#6b7280', marginBottom: '4px' }}>
                  <strong>Taille:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <p style={{ color: '#6b7280' }}>
                  <strong>Type détecté:</strong> {importType || 'Non détecté'}
                </p>
              </div>
            )}

            {/* Import Type Selection */}
            {selectedFile && (
              <div style={{ marginBottom: '24px' }}>
                <Label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: 'var(--theme-text, #e5e5e5)',
                  display: 'block',
                  marginBottom: '8px'
                }}>
                  🎯 Type d'import
                </Label>
                <Select value={importType} onValueChange={setImportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type d'import" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="questions">❓ Questions (QCM)</SelectItem>
                    <SelectItem value="flashcards">🃏 Flashcards</SelectItem>
                    <SelectItem value="learning-paths">🛤️ Parcours d'apprentissage</SelectItem>
                    <SelectItem value="csv">📊 Fichier CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Import Options */}
            {selectedFile && importType && (
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--theme-elevation-50, #252525)',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <h4 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: 'var(--theme-text, #e5e5e5)',
                  marginBottom: '16px'
                }}>
                  ⚙️ Options d'import
                </h4>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Checkbox
                      id="dryRun"
                      checked={importOptions.dryRun}
                      onCheckedChange={(checked) => 
                        setImportOptions(prev => ({ ...prev, dryRun: !!checked }))
                      }
                    />
                    <Label htmlFor="dryRun" style={{ color: 'var(--theme-text, #e5e5e5)' }}>
                      🧪 Mode test (aperçu sans import)
                    </Label>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Checkbox
                      id="requireValidation"
                      checked={importOptions.requireHumanValidation}
                      onCheckedChange={(checked) => 
                        setImportOptions(prev => ({ ...prev, requireHumanValidation: !!checked }))
                      }
                    />
                    <Label htmlFor="requireValidation" style={{ color: 'var(--theme-text, #e5e5e5)' }}>
                      👤 Validation humaine obligatoire
                    </Label>
                  </div>
                  
                  {importType === 'flashcards' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Checkbox
                        id="generateDistractors"
                        checked={importOptions.generateDistractors}
                        onCheckedChange={(checked) => 
                          setImportOptions(prev => ({ ...prev, generateDistractors: !!checked }))
                        }
                      />
                      <Label htmlFor="generateDistractors" style={{ color: 'var(--theme-text, #e5e5e5)' }}>
                        🤖 Générer des distracteurs automatiquement
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {selectedFile && importType && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button
                  onClick={resetImport}
                  style={{
                    backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
                    color: 'var(--theme-text, #e5e5e5)',
                    border: '1px solid var(--theme-elevation-150, #3a3a3a)'
                  }}
                >
                  🔄 Recommencer
                </Button>
                <Button
                  onClick={handleValidation}
                  disabled={loading}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  {loading ? '⏳ Validation...' : '✅ Valider le fichier'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Screen */}
      {currentStep === 'validation' && validationResult && (
        <JSONImportValidationScreen
          validationResult={validationResult}
          onRetry={handleValidation}
          onProceed={() => setCurrentStep('preview')}
          onBack={() => setCurrentStep('upload')}
        />
      )}
      
      {/* Preview Screen */}
      {currentStep === 'preview' && validationResult && (
        <JSONImportPreviewScreen
          previewData={validationResult.previewData || []}
          categoryMappings={validationResult.categoryMappings}
          onBack={() => setCurrentStep('validation')}
          onImport={handleImport}
          onEditItem={(itemId, newData) => {
            // Handle item editing
            console.log('Edit item:', itemId, newData)
          }}
          onUpdateCategoryMapping={(originalName, action, targetCategory) => {
            // Handle category mapping updates
            console.log('Update category mapping:', originalName, action, targetCategory)
          }}
        />
      )}
      
      {/* Progress Screen */}
      {currentStep === 'progress' && currentJob && (
        <JSONImportProgressScreen
          job={currentJob}
          onBack={() => setCurrentStep('history')}
          onRetry={() => {
            // Handle retry
            console.log('Retry import')
          }}
          onPause={() => {
            // Handle pause
            console.log('Pause import')
          }}
          onResume={() => {
            // Handle resume
            console.log('Resume import')
          }}
          onCancel={() => {
            // Handle cancel
            console.log('Cancel import')
          }}
        />
      )}
      
      {/* History Screen */}
      {currentStep === 'history' && (
        <JSONImportHistoryScreen
          onBack={() => setCurrentStep('upload')}
          onViewJob={(jobId) => {
            // Handle view job
            console.log('View job:', jobId)
          }}
          onRetryJob={(jobId) => {
            // Handle retry job
            console.log('Retry job:', jobId)
          }}
          onDeleteJob={(jobId) => {
            // Handle delete job
            console.log('Delete job:', jobId)
          }}
        />
      )}
      
      {/* Templates Screen */}
      {currentStep === 'templates' && (
        <JSONImportTemplateDownloader />
      )}
    </div>
  )
}

export default JSONImportInterface