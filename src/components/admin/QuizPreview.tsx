"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Question {
  id: string
  questionText: any
  options: Array<{
    id: string
    optionText: string
    isCorrect: boolean
  }>
  explanation: string
}

interface Quiz {
  id: string
  title: string
  description: string
  questions: Question[]
  duration: number
  passingScore: number
}

interface QuizPreviewProps {
  quizId: string
  onClose: () => void
  onPublish?: (quizId: string) => void
  onEdit?: (quizId: string) => void
}

export const QuizPreview: React.FC<QuizPreviewProps> = ({
  quizId,
  onClose,
  onPublish,
  onEdit
}) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

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
        zIndex: 1000
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
        zIndex: 1000
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
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto'
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
              <CardTitle>{quiz.title}</CardTitle>
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                {quiz.questions.length} questions • {quiz.duration} minutes • Score minimum: {quiz.passingScore}%
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              style={{ padding: '4px 8px', fontSize: '14px' }}
            >
              ✕
            </Button>
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

            {currentQuestion && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                    Question {currentQuestionIndex + 1} sur {quiz.questions.length}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
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
                    fontWeight: '500'
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onEdit && onEdit(quiz.id)}
                >
                  Modifier
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={handlePublish}
                  style={{ 
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  Publier le Quiz
                </Button>
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
  )
}

export default QuizPreview