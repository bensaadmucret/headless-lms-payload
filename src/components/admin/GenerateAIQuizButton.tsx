"use client"
import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import QuizPreview from './QuizPreview'
import './GenerateAIQuizButton.css'

interface GenerationConfig {
  subject: string
  categoryId: string
  studentLevel: 'PASS' | 'LAS' | 'both'
  questionCount: number
  difficulty: 'easy' | 'medium' | 'hard'
  includeExplanations: boolean
  quizType: 'standard' | 'placement'
  customInstructions?: string
}

interface GenerationProgress {
  step: 'configuring' | 'generating' | 'creating' | 'completed' | 'error'
  progress: number
  message: string
  error?: string
}

interface Category {
  id: string
  title: string
  level: string
}

export const GenerateAIQuizButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null)
  const [progress, setProgress] = useState<GenerationProgress>({
    step: 'configuring',
    progress: 0,
    message: 'Configuration en cours...'
  })

  const [config, setConfig] = useState<GenerationConfig>({
    subject: '',
    categoryId: '',
    studentLevel: 'PASS',
    questionCount: 10,
    difficulty: 'medium',
    includeExplanations: true,
    quizType: 'standard',
    customInstructions: ''
  })

  // Charger les catégories disponibles
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true)
      try {
        const response = await fetch('/api/categories?limit=100', {
          credentials: 'include'
        })
        const data = await response.json()
        console.log('📁 Catégories chargées:', data.docs)
        if (data.docs) {
          setCategories(data.docs)
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des catégories:', error)
      } finally {
        setLoadingCategories(false)
      }
    }

    if (isModalOpen) {
      fetchCategories()
    }
  }, [isModalOpen])

  const handleGenerate = async () => {
    console.log('🚀 Début de la génération du quiz')
    console.log('📋 Configuration:', config)

    setLoading(true)
    setProgress({
      step: 'generating',
      progress: 20,
      message: 'Génération du contenu avec l\'IA...'
    })

    try {
      console.log('📡 Envoi de la requête à /api/ai-quiz/generate')
      const response = await fetch('/api/ai-quiz/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(config)
      })

      console.log('📥 Réponse reçue:', response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Données reçues:', data)

      setProgress({
        step: 'creating',
        progress: 70,
        message: 'Création du quiz et des questions...'
      })

      // Finaliser rapidement
      setTimeout(() => {
        setProgress({
          step: 'completed',
          progress: 100,
          message: `Quiz "${data.quiz.title}" créé avec succès!`
        })

        // Afficher la prévisualisation après 1 seconde
        setTimeout(() => {
          console.log('🎉 Quiz créé avec ID:', data.quiz.id)
          setGeneratedQuizId(data.quiz.id)
          setShowPreview(true)
          setIsModalOpen(false)
        }, 1000)
      }, 2000)

    } catch (error: any) {
      console.error('❌ Erreur lors de la génération:', error)
      setProgress({
        step: 'error',
        progress: 0,
        message: 'Erreur lors de la génération',
        error: error.message
      })
    } finally {
      setTimeout(() => {
        setLoading(false)
      }, 3000)
    }
  }

  const updateConfig = (field: keyof GenerationConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const isConfigValid = () => {
    return config.subject.length >= 10 &&
      config.subject.length <= 200 &&
      config.categoryId &&
      config.questionCount >= 5 &&
      config.questionCount <= 20
  }

  const resetModal = () => {
    setIsModalOpen(false)
    setLoading(false)
    setShowPreview(false)
    setGeneratedQuizId(null)
    setProgress({
      step: 'configuring',
      progress: 0,
      message: 'Configuration en cours...'
    })
  }

  const handlePreviewClose = () => {
    setShowPreview(false)
    setGeneratedQuizId(null)
  }

  const handleQuizPublish = (quizId: string) => {
    setShowPreview(false)
    // Après publication, rediriger vers la liste des quizzes
    window.location.href = '/admin/collections/quizzes'
  }

  const handleQuizEdit = (quizId: string) => {
    setShowPreview(false)
    // Rediriger vers l'édition du quiz
    window.location.href = `/admin/collections/quizzes/${quizId}`
  }

  return (
    <>
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          style={{
            backgroundColor: '#6366f1',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4f46e5'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(99, 102, 241, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6366f1'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(99, 102, 241, 0.3)'
          }}
        >
          🤖 Générer avec IA
        </Button>
      </div>

      {isModalOpen && createPortal(
        <div
          className="ai-quiz-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999999,
            backdropFilter: 'blur(4px)',
            padding: '20px',
            overflowY: 'auto'
          }}
        >
          <div style={{
            backgroundColor: 'var(--theme-elevation-0, #1a1a1a)',
            borderRadius: '12px',
            padding: '0',
            maxWidth: '700px',
            width: '100%',
            maxHeight: 'calc(100vh - 40px)',
            overflow: 'auto',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--theme-elevation-150, #2a2a2a)',
            margin: 'auto'
          }}>
            <Card style={{ border: 'none', boxShadow: 'none', backgroundColor: 'transparent' }}>
              <CardHeader style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24px'
              }}>
                <div>
                  <CardTitle style={{ color: '#ffffff', fontSize: '22px', fontWeight: '700', margin: 0 }}>
                    🤖 Génération de Quiz IA
                  </CardTitle>
                  <p style={{ color: '#ffffff', fontSize: '14px', opacity: 0.95, margin: '4px 0 0 0' }}>
                    Créez un quiz personnalisé en quelques clics
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={resetModal}
                  disabled={loading}
                  style={{
                    padding: '8px 12px',
                    fontSize: '20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    lineHeight: '1'
                  }}
                >
                  ✕
                </Button>
              </CardHeader>

              <CardContent style={{ padding: '32px', backgroundColor: 'transparent' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      margin: '0 auto 24px',
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #667eea',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />

                    <div style={{
                      width: '100%',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      overflow: 'hidden',
                      height: '12px'
                    }}>
                      <div style={{
                        width: `${progress.progress}%`,
                        background: progress.step === 'error'
                          ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                          : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                        height: '100%',
                        borderRadius: '8px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>

                    <p style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: progress.step === 'error' ? '#ef4444' : 'var(--theme-text, #e5e5e5)',
                      marginBottom: '8px'
                    }}>
                      {progress.message}
                    </p>

                    <p style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginBottom: '0'
                    }}>
                      {progress.progress}% complété
                    </p>

                    {progress.error && (
                      <p style={{ fontSize: '12px', color: '#ef4444' }}>
                        {progress.error}
                      </p>
                    )}

                    {progress.step === 'error' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setLoading(false)
                          setProgress({
                            step: 'configuring',
                            progress: 0,
                            message: 'Configuration en cours...'
                          })
                        }}
                        style={{ marginTop: '16px' }}
                      >
                        Réessayer
                      </Button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '24px' }}>
                    {/* Sujet */}
                    <div>
                      <Label htmlFor="subject" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text, #e5e5e5)', display: 'block', marginBottom: '8px' }}>
                        Sujet du quiz *
                      </Label>
                      <Input
                        id="subject"
                        placeholder="Ex: Anatomie cardiovasculaire - Physiologie cardiaque"
                        value={config.subject}
                        onChange={(e) => updateConfig('subject', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '14px',
                          color: 'var(--theme-text, #e5e5e5)',
                          backgroundColor: 'var(--theme-elevation-50, #252525)',
                          border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                          borderRadius: '8px'
                        }}
                      />
                      <p style={{
                        fontSize: '12px',
                        color: config.subject.length < 10 || config.subject.length > 200 ? '#ef4444' : '#10b981',
                        marginTop: '6px',
                        fontWeight: '500'
                      }}>
                        {config.subject.length < 10
                          ? `⚠️ Minimum 10 caractères (${config.subject.length}/200)`
                          : `✓ ${config.subject.length}/200 caractères`
                        }
                      </p>
                    </div>

                    {/* Catégorie et Niveau */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <Label htmlFor="category" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text, #e5e5e5)', display: 'block', marginBottom: '8px' }}>
                          🏷️ Catégorie *
                        </Label>
                        <Select
                          value={config.categoryId}
                          onValueChange={(value) => {
                            console.log('🏷️ Catégorie sélectionnée:', value)
                            updateConfig('categoryId', value)
                          }}
                          disabled={loadingCategories}
                        >
                          <SelectTrigger style={{
                            marginTop: '4px',
                            backgroundColor: 'var(--theme-elevation-50, #252525)',
                            border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                            color: 'var(--theme-text, #e5e5e5)'
                          }}>
                            <SelectValue placeholder={
                              loadingCategories
                                ? "Chargement des catégories..."
                                : categories.length === 0
                                  ? "Aucune catégorie disponible"
                                  : "Sélectionner une catégorie"
                            } />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            sideOffset={5}
                            style={{
                              backgroundColor: 'var(--theme-elevation-50, #252525)',
                              border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                              color: 'var(--theme-text, #e5e5e5)',
                              zIndex: 99999999,
                              maxHeight: '300px',
                              overflowY: 'auto'
                            }}
                          >
                            {categories.length === 0 ? (
                              <div style={{ padding: '12px', color: '#6b7280', textAlign: 'center' }}>
                                Aucune catégorie disponible
                              </div>
                            ) : (
                              categories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={String(category.id)}
                                  style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {category.title} ({category.level})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {loadingCategories && (
                          <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            ⏳ Chargement des catégories...
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="studentLevel" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text, #e5e5e5)', display: 'block', marginBottom: '8px' }}>
                          🎓 Niveau d'études *
                        </Label>
                        <Select
                          value={config.studentLevel}
                          onValueChange={(value: 'PASS' | 'LAS' | 'both') => updateConfig('studentLevel', value)}
                        >
                          <SelectTrigger style={{
                            marginTop: '4px',
                            backgroundColor: 'var(--theme-elevation-50, #252525)',
                            border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                            color: 'var(--theme-text, #e5e5e5)'
                          }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            sideOffset={5}
                            style={{
                              backgroundColor: 'var(--theme-elevation-50, #252525)',
                              border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                              color: 'var(--theme-text, #e5e5e5)',
                              zIndex: 99999999
                            }}
                          >
                            <SelectItem value="PASS">PASS (1ère année)</SelectItem>
                            <SelectItem value="LAS">LAS (Licence Accès Santé)</SelectItem>
                            <SelectItem value="both">PASS et LAS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Type de Quiz */}
                    <div>
                      <Label htmlFor="quizType" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text, #e5e5e5)', display: 'block', marginBottom: '8px' }}>
                        📋 Type de Quiz *
                      </Label>
                      <Select
                        value={config.quizType}
                        onValueChange={(value: 'standard' | 'placement') => updateConfig('quizType', value)}
                      >
                        <SelectTrigger style={{
                          marginTop: '4px',
                          backgroundColor: 'var(--theme-elevation-50, #252525)',
                          border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                          color: 'var(--theme-text, #e5e5e5)'
                        }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          sideOffset={5}
                          style={{
                            backgroundColor: 'var(--theme-elevation-50, #252525)',
                            border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                            color: 'var(--theme-text, #e5e5e5)',
                            zIndex: 99999999
                          }}
                        >
                          <SelectItem value="standard">Quiz Standard</SelectItem>
                          <SelectItem value="placement">Quiz de Positionnement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Nombre de questions et Difficulté */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div>
                        <Label htmlFor="questionCount" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text, #e5e5e5)', display: 'block', marginBottom: '8px' }}>
                          🔢 Nombre de questions *
                        </Label>
                        <Input
                          id="questionCount"
                          type="number"
                          min="5"
                          max="20"
                          value={config.questionCount}
                          onChange={(e) => updateConfig('questionCount', parseInt(e.target.value) || 5)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '14px',
                            color: 'var(--theme-text, #e5e5e5)',
                            backgroundColor: 'var(--theme-elevation-50, #252525)',
                            border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                            borderRadius: '8px'
                          }}
                        />
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                          Entre 5 et 20 questions
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="difficulty" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text, #e5e5e5)', display: 'block', marginBottom: '8px' }}>
                          ⚡ Difficulté
                        </Label>
                        <Select
                          value={config.difficulty}
                          onValueChange={(value: 'easy' | 'medium' | 'hard') => updateConfig('difficulty', value)}
                        >
                          <SelectTrigger style={{
                            marginTop: '4px',
                            backgroundColor: 'var(--theme-elevation-50, #252525)',
                            border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                            color: 'var(--theme-text, #e5e5e5)'
                          }}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            position="popper"
                            sideOffset={5}
                            style={{
                              backgroundColor: 'var(--theme-elevation-50, #252525)',
                              border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                              color: 'var(--theme-text, #e5e5e5)',
                              zIndex: 99999999
                            }}
                          >
                            <SelectItem value="easy">Facile</SelectItem>
                            <SelectItem value="medium">Moyen</SelectItem>
                            <SelectItem value="hard">Difficile</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Options */}
                    <div style={{
                      padding: '16px',
                      backgroundColor: 'var(--theme-elevation-50, #252525)',
                      borderRadius: '8px',
                      border: '1px solid var(--theme-elevation-150, #3a3a3a)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Checkbox
                          id="includeExplanations"
                          checked={config.includeExplanations}
                          onCheckedChange={(checked) => updateConfig('includeExplanations', checked)}
                        />
                        <Label htmlFor="includeExplanations" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--theme-text, #e5e5e5)', cursor: 'pointer' }}>
                          💡 Inclure des explications détaillées
                        </Label>
                      </div>
                    </div>

                    {/* Instructions personnalisées */}
                    <div>
                      <Label htmlFor="customInstructions" style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text, #e5e5e5)', display: 'block', marginBottom: '8px' }}>
                        ✍️ Instructions personnalisées (optionnel)
                      </Label>
                      <Textarea
                        id="customInstructions"
                        placeholder="Ajoutez des instructions spécifiques pour la génération..."
                        value={config.customInstructions}
                        onChange={(e) => updateConfig('customInstructions', e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '14px',
                          color: 'var(--theme-text, #e5e5e5)',
                          backgroundColor: 'var(--theme-elevation-50, #252525)',
                          border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                          borderRadius: '8px',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Boutons d'action */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '12px',
                      paddingTop: '16px',
                      borderTop: '1px solid var(--theme-elevation-150, #3a3a3a)'
                    }}>
                      <Button
                        type="button"
                        onClick={resetModal}
                        style={{
                          padding: '10px 20px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--theme-text, #e5e5e5)',
                          backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
                          border: '1px solid var(--theme-elevation-200, #3a3a3a)',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        Annuler
                      </Button>
                      <Button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!isConfigValid()}
                        style={{
                          padding: '10px 24px',
                          fontSize: '14px',
                          fontWeight: '600',
                          backgroundColor: isConfigValid() ? '#10b981' : '#9ca3af',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: isConfigValid() ? 'pointer' : 'not-allowed',
                          opacity: isConfigValid() ? 1 : 0.6
                        }}
                      >
                        ✨ Générer le Quiz
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>,
        document.body
      )}

      {showPreview && generatedQuizId && (
        <QuizPreview
          quizId={generatedQuizId}
          onClose={handlePreviewClose}
          onPublish={handleQuizPublish}
          onEdit={handleQuizEdit}
          mode="preview"
        />
      )}
    </>
  )
}

export default GenerateAIQuizButton