"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@payloadcms/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Question {
  id: string
  questionText: any
  options: Array<{
    id: string
    optionText: string
    isCorrect: boolean
  }>
  explanation: string
  generatedByAI?: boolean
  validationStatus?: 'pending' | 'approved' | 'rejected' | 'needs_review'
  validationNotes?: string
  validatedBy?: string
  validatedAt?: string
}

interface Quiz {
  id: string
  title: string
  description: string
  questions: Question[]
  duration: number
  passingScore: number
  published?: boolean
  validationStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected'
  validationNotes?: string
}

interface QuizPreviewProps {
  quizId: string
  onClose: () => void
  onPublish?: (quizId: string) => void
  onEdit?: (quizId: string) => void
  mode?: 'preview' | 'edit' | 'validate'
}

export const QuizPreview: React.FC<QuizPreviewProps> = ({
  quizId,
  onClose,
  onPublish,
  onEdit,
  mode = 'preview'
}) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [editMode, setEditMode] = useState(false)
  const [validationMode, setValidationMode] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<string | null>(null)
  const [validationNotes, setValidationNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await fetch(`/api/quizzes/${quizId}?depth=2`, {
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error('Erreur lors du chargement du quiz')
        }
        
        const data = await response.json()
        setQuiz(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [quizId])

  const handlePublish = async () => {
    if (!quiz) return

    try {
      const response = await fetch(`/api/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          published: true
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la publication')
      }

      if (onPublish) {
        onPublish(quiz.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de publication')
    }
  }

  const extractTextFromRichText = (richText: any): string => {
    if (typeof richText === 'string') return richText
    if (!richText?.root?.children) return ''
    
    return richText.root.children
      .map((child: any) => {
        if (child.children) {
          return child.children
            .map((textNode: any) => textNode.text || '')
            .join('')
        }
        return ''
      })
      .join(' ')
  }

  // Fonction pour sauvegarder les modifications d'une question
  const saveQuestionEdit = async (questionId: string, updatedQuestion: Partial<Question>) => {
    if (!quiz) return

    setSaving(true)
    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedQuestion)
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde')
      }

      const updatedQuestionData = await response.json()
      
      // Mettre à jour le quiz local
      setQuiz(prev => {
        if (!prev) return prev
        return {
          ...prev,
          questions: prev.questions.map(q => 
            q.id === questionId ? { ...q, ...updatedQuestionData } : q
          )
        }
      })

      setEditingQuestion(null)
      setEditMode(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  // Fonction pour régénérer une question spécifique
  const regenerateQuestion = async (questionId: string) => {
    if (!quiz) return

    setRegeneratingQuestionId(questionId)
    try {
      const response = await fetch(`/api/ai-quiz/regenerate-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId,
          quizId: quiz.id,
          regenerationReason: 'user_request'
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la régénération')
      }

      const newQuestionData = await response.json()
      
      // Mettre à jour le quiz local
      setQuiz(prev => {
        if (!prev) return prev
        return {
          ...prev,
          questions: prev.questions.map(q => 
            q.id === questionId ? { ...q, ...newQuestionData.question } : q
          )
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de régénération')
    } finally {
      setRegeneratingQuestionId(null)
    }
  }

  // Fonction pour valider une question
  const validateQuestion = async (questionId: string, status: 'approved' | 'rejected', notes?: string) => {
    if (!quiz) return

    setSaving(true)
    try {
      const response = await fetch(`/api/questions/${questionId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          validationStatus: status,
          validationNotes: notes,
          validatedAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la validation')
      }

      const validatedQuestion = await response.json()
      
      // Mettre à jour le quiz local
      setQuiz(prev => {
        if (!prev) return prev
        return {
          ...prev,
          questions: prev.questions.map(q => 
            q.id === questionId ? { ...q, ...validatedQuestion } : q
          )
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de validation')
    } finally {
      setSaving(false)
    }
  }

  // Fonction pour valider le quiz complet
  const validateQuiz = async (status: 'approved' | 'rejected', notes: string) => {
    if (!quiz) return

    setSaving(true)
    try {
      const response = await fetch(`/api/quizzes/${quiz.id}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          validationStatus: status,
          validationNotes: notes,
          validatedAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la validation du quiz')
      }

      const validatedQuiz = await response.json()
      setQuiz(prev => prev ? { ...prev, ...validatedQuiz } : null)
      
      if (status === 'approved' && onPublish) {
        onPublish(quiz.id)
      }

      // Si le quiz est rejeté, le supprimer complètement puis fermer la modale
      if (status === 'rejected') {
        try {
          const deleteResponse = await fetch(`/api/quizzes/${quiz.id}`, {
            method: 'DELETE',
            credentials: 'include'
          })

          if (!deleteResponse.ok) {
            throw new Error('Erreur lors de la suppression du quiz rejeté')
          }
        } catch (deleteError) {
          console.error(deleteError)
          setError(deleteError instanceof Error ? deleteError.message : 'Erreur lors de la suppression du quiz rejeté')
        } finally {
          onClose()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de validation du quiz')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4000
      }}>
        <Card style={{ maxWidth: '400px', width: '90%' }}>
          <CardContent style={{ padding: '40px', textAlign: 'center' }}>
            <p>Chargement du quiz...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4000
      }}>
        <Card style={{ maxWidth: '400px', width: '90%' }}>
          <CardContent style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#ef4444', marginBottom: '16px' }}>
              {error || 'Quiz non trouvé'}
            </p>
            <Button onClick={onClose}>Fermer</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]

  // Rendu du mode édition d'une question
  const renderQuestionEditor = () => {
    if (!editingQuestion) return null

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4001,
        padding: '24px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          color: '#111827'
        }}>
          <Card style={{ border: 'none', boxShadow: 'none' }}>
            <CardHeader>
              <CardTitle>Modifier la Question</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                {/* Texte de la question */}
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Texte de la question
                  </label>
                  <Textarea
                    value={extractTextFromRichText(editingQuestion.questionText)}
                    onChange={(e) => setEditingQuestion(prev => prev ? {
                      ...prev,
                      questionText: e.target.value
                    } : null)}
                    rows={3}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Options de réponse */}
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>
                    Options de réponse
                  </label>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {editingQuestion.options.map((option, index) => (
                      <div key={option.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        padding: '12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}>
                        <Checkbox
                          checked={option.isCorrect}
                          onCheckedChange={(checked) => {
                            setEditingQuestion(prev => {
                              if (!prev) return null
                              return {
                                ...prev,
                                options: prev.options.map((opt, idx) => ({
                                  ...opt,
                                  isCorrect: idx === index ? !!checked : false
                                }))
                              }
                            })
                          }}
                        />
                        <span style={{ 
                          minWidth: '24px', 
                          fontSize: '14px', 
                          fontWeight: '600' 
                        }}>
                          {String.fromCharCode(65 + index)}:
                        </span>
                        <Input
                          value={option.optionText}
                          onChange={(e) => {
                            setEditingQuestion(prev => {
                              if (!prev) return null
                              return {
                                ...prev,
                                options: prev.options.map((opt, idx) => 
                                  idx === index ? { ...opt, optionText: e.target.value } : opt
                                )
                              }
                            })
                          }}
                          style={{ flex: 1 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explication */}
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Explication
                  </label>
                  <Textarea
                    value={editingQuestion.explanation}
                    onChange={(e) => setEditingQuestion(prev => prev ? {
                      ...prev,
                      explanation: e.target.value
                    } : null)}
                    rows={4}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingQuestion(null)}
                    disabled={saving}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    onClick={() => saveQuestionEdit(editingQuestion.id, editingQuestion)}
                    disabled={saving}
                    style={{ backgroundColor: '#10b981', color: 'white' }}
                  >
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 4000,
        padding: '72px 32px 32px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          color: '#111827'
        }}>
          <Card style={{ border: 'none', boxShadow: 'none' }}>
            <CardHeader style={{ 
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CardTitle>{quiz.title}</CardTitle>
                  {quiz.validationStatus && (
                    <Badge variant={
                      quiz.validationStatus === 'approved' ? 'default' :
                      quiz.validationStatus === 'rejected' ? 'destructive' :
                      'secondary'
                    }>
                      {quiz.validationStatus === 'approved' ? '✓ Approuvé' :
                       quiz.validationStatus === 'rejected' ? '✗ Rejeté' :
                       quiz.validationStatus === 'pending_review' ? '⏳ En attente' :
                       '📝 Brouillon'}
                    </Badge>
                  )}
                </div>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                  {quiz.questions.length} questions • {quiz.duration} minutes • Score minimum: {quiz.passingScore}%
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Mode toggles */}
                <Button
                  type="button"
                  variant={editMode ? "default" : "outline"}
                  onClick={() => {
                    setEditMode(!editMode)
                    setValidationMode(false)
                  }}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  {editMode ? '👁️ Aperçu' : '✏️ Éditer'}
                </Button>
                <Button
                  type="button"
                  variant={validationMode ? "default" : "outline"}
                  onClick={() => {
                    setValidationMode(!validationMode)
                    setEditMode(false)
                  }}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  {validationMode ? '👁️ Aperçu' : '✅ Valider'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  style={{ padding: '4px 8px', fontSize: '14px' }}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
          
          <CardContent style={{ padding: '24px' }}>
            {quiz.description && (
              <p style={{ 
                fontSize: '14px', 
                color: '#374151', 
                marginBottom: '24px',
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px'
              }}>
                {quiz.description}
              </p>
            )}

            {/* Mode validation du quiz complet */}
            {validationMode && (
              <div style={{
                marginBottom: '24px',
                padding: '20px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #f59e0b'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  Validation du Quiz
                </h3>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                    Notes de validation
                  </label>
                  <Textarea
                    value={validationNotes}
                    onChange={(e) => setValidationNotes(e.target.value)}
                    placeholder="Ajoutez vos commentaires sur la qualité du quiz..."
                    rows={3}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Button
                    type="button"
                    onClick={() => validateQuiz('approved', validationNotes)}
                    disabled={saving}
                    style={{ backgroundColor: '#10b981', color: 'white' }}
                  >
                    ✅ Approuver le Quiz
                  </Button>
                  <Button
                    type="button"
                    onClick={() => validateQuiz('rejected', validationNotes)}
                    disabled={saving}
                    style={{ backgroundColor: '#ef4444', color: 'white' }}
                  >
                    ❌ Rejeter le Quiz
                  </Button>
                </div>
              </div>
            )}

            {currentQuestion && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                      Question {currentQuestionIndex + 1} sur {quiz.questions.length}
                    </h3>
                    {currentQuestion.generatedByAI && (
                      <Badge variant="secondary" style={{ fontSize: '10px' }}>
                        🤖 IA
                      </Badge>
                    )}
                    {currentQuestion.validationStatus && (
                      <Badge variant={
                        currentQuestion.validationStatus === 'approved' ? 'default' :
                        currentQuestion.validationStatus === 'rejected' ? 'destructive' :
                        'secondary'
                      }>
                        {currentQuestion.validationStatus === 'approved' ? '✓' :
                         currentQuestion.validationStatus === 'rejected' ? '✗' :
                         currentQuestion.validationStatus === 'needs_review' ? '⚠️' :
                         '⏳'}
                      </Badge>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Actions spécifiques à la question */}
                    {editMode && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingQuestion(currentQuestion)}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          ✏️ Modifier
                        </Button>
                        {currentQuestion.generatedByAI && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => regenerateQuestion(currentQuestion.id)}
                            disabled={regeneratingQuestionId === currentQuestion.id}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            {regeneratingQuestionId === currentQuestion.id ? '⏳' : '🔄'} Régénérer
                          </Button>
                        )}
                      </>
                    )}
                    
                    {validationMode && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => validateQuestion(currentQuestion.id, 'approved')}
                          disabled={saving}
                          style={{ padding: '4px 8px', fontSize: '12px', color: '#10b981' }}
                        >
                          ✅
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => validateQuestion(currentQuestion.id, 'rejected')}
                          disabled={saving}
                          style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444' }}
                        >
                          ❌
                        </Button>
                      </div>
                    )}

                    {/* Navigation */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                      disabled={currentQuestionIndex === 0}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      ← Précédent
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex(Math.min(quiz.questions.length - 1, currentQuestionIndex + 1))}
                      disabled={currentQuestionIndex === quiz.questions.length - 1}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      Suivant →
                    </Button>
                  </div>
                </div>

                <div style={{ 
                  padding: '20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <p style={{ 
                    fontSize: '16px', 
                    lineHeight: '1.5',
                    marginBottom: '16px',
                    fontWeight: '500',
                    color: '#111827'
                  }}>
                    {extractTextFromRichText(currentQuestion.questionText)}
                  </p>

                  <div style={{ display: 'grid', gap: '8px' }}>
                    {currentQuestion.options.map((option, index) => (
                      <div
                        key={option.id}
                        style={{
                          padding: '12px',
                          backgroundColor: option.isCorrect ? '#dcfce7' : 'white',
                          border: option.isCorrect ? '2px solid #16a34a' : '1px solid #d1d5db',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: option.isCorrect ? '#16a34a' : '#6b7280',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span style={{ fontSize: '14px' }}>
                          {option.optionText}
                        </span>
                        {option.isCorrect && (
                          <span style={{ 
                            marginLeft: 'auto',
                            fontSize: '12px',
                            color: '#16a34a',
                            fontWeight: '600'
                          }}>
                            ✓ Bonne réponse
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {currentQuestion.explanation && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      backgroundColor: '#eff6ff',
                      borderLeft: '4px solid #3b82f6',
                      borderRadius: '4px'
                    }}>
                      <p style={{ 
                        fontSize: '13px', 
                        color: '#1e40af',
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        Explication:
                      </p>
                      <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.4' }}>
                        {currentQuestion.explanation}
                      </p>
                    </div>
                  )}

                  {/* Notes de validation de la question */}
                  {currentQuestion.validationNotes && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      backgroundColor: '#fef3c7',
                      borderLeft: '4px solid #f59e0b',
                      borderRadius: '4px'
                    }}>
                      <p style={{ 
                        fontSize: '13px', 
                        color: '#92400e',
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        Notes de validation:
                      </p>
                      <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.4' }}>
                        {currentQuestion.validationNotes}
                      </p>
                      {currentQuestion.validatedBy && currentQuestion.validatedAt && (
                        <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                          Validé par {currentQuestion.validatedBy} le {new Date(currentQuestion.validatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Statut de régénération */}
                  {regeneratingQuestionId === currentQuestion.id && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px',
                      backgroundColor: '#dbeafe',
                      borderLeft: '4px solid #3b82f6',
                      borderRadius: '4px',
                      textAlign: 'center'
                    }}>
                      <p style={{ fontSize: '13px', color: '#1e40af' }}>
                        🔄 Régénération en cours...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Résumé de validation */}
            {(editMode || validationMode) && (
              <div style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  Résumé de validation
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>
                      {quiz.questions.filter(q => q.validationStatus === 'approved').length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Approuvées</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>
                      {quiz.questions.filter(q => q.validationStatus === 'rejected').length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Rejetées</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>
                      {quiz.questions.filter(q => q.validationStatus === 'needs_review').length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>À revoir</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#6b7280' }}>
                      {quiz.questions.filter(q => !q.validationStatus || q.validationStatus === 'pending').length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>En attente</div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                {!editMode && !validationMode && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onEdit && onEdit(quiz.id)}
                    >
                      Modifier dans l'éditeur
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      onClick={handlePublish}
                      disabled={quiz.validationStatus === 'rejected'}
                      style={{ 
                        backgroundColor: quiz.validationStatus === 'approved' ? '#10b981' : '#6b7280',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      {quiz.published ? 'Quiz Publié' : 'Publier le Quiz'}
                    </Button>
                  </>
                )}
                
                {editMode && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Marquer le quiz comme nécessitant une révision après modification
                      setQuiz(prev => prev ? {
                        ...prev,
                        validationStatus: 'pending_review'
                      } : null)
                      setEditMode(false)
                    }}
                  >
                    Terminer l'édition
                  </Button>
                )}

                {validationMode && (
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Mode validation activé - Validez chaque question individuellement
                  </div>
                )}
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Fermer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    {/* Modal d'édition de question */}
    {renderQuestionEditor()}
  </>
  )
}

export default QuizPreview