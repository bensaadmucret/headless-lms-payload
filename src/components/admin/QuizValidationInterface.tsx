"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '../ui/badge'
import QuizPreview from './QuizPreview'

interface Quiz {
  id: string
  title: string
  description: string
  questions: any[]
  validationStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected'
  validationNotes?: string
  generatedByAI?: boolean
  createdAt: string
}

interface QuizValidationInterfaceProps {
  onClose: () => void
}

/**
 * Interface de validation pour les experts
 * Tâche 9: Système de validation manuelle par les experts
 * Exigences: 9.3
 */
export const QuizValidationInterface: React.FC<QuizValidationInterfaceProps> = ({
  onClose
}) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'ai_generated'>('pending')

  useEffect(() => {
    fetchQuizzesForValidation()
  }, [filter])

  const fetchQuizzesForValidation = async () => {
    setLoading(true)
    try {
      let url = '/api/quizzes?limit=50&depth=1'
      
      // Appliquer les filtres
      if (filter === 'pending') {
        url += '&where[validationStatus][in]=draft,pending_review'
      } else if (filter === 'ai_generated') {
        url += '&where[generatedByAI][equals]=true'
      }

      const response = await fetch(url, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des quiz')
      }
      
      const data = await response.json()
      setQuizzes(data.docs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" style={{ backgroundColor: '#10b981' }}>✅ Approuvé</Badge>
      case 'rejected':
        return <Badge variant="destructive">❌ Rejeté</Badge>
      case 'pending_review':
        return <Badge variant="secondary" style={{ backgroundColor: '#f59e0b' }}>⏳ En attente</Badge>
      default:
        return <Badge variant="outline">📝 Brouillon</Badge>
    }
  }

  const getPriorityScore = (quiz: Quiz) => {
    let score = 0
    
    // Quiz générés par IA ont une priorité plus élevée
    if (quiz.generatedByAI) score += 10
    
    // Quiz en attente de révision ont une priorité plus élevée
    if (quiz.validationStatus === 'pending_review') score += 5
    
    // Quiz plus récents ont une priorité plus élevée
    const daysSinceCreation = (Date.now() - new Date(quiz.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreation < 1) score += 3
    else if (daysSinceCreation < 7) score += 1
    
    return score
  }

  const sortedQuizzes = [...quizzes].sort((a, b) => getPriorityScore(b) - getPriorityScore(a))

  if (selectedQuizId) {
    return (
      <QuizPreview
        quizId={selectedQuizId}
        mode="validate"
        onClose={() => {
          setSelectedQuizId(null)
          fetchQuizzesForValidation() // Rafraîchir la liste après validation
        }}
        onPublish={() => {
          setSelectedQuizId(null)
          fetchQuizzesForValidation()
        }}
        onEdit={() => {
          setSelectedQuizId(null)
          fetchQuizzesForValidation()
        }}
      />
    )
  }

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
        maxWidth: '1000px',
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
              <CardTitle>Interface de Validation des Quiz</CardTitle>
              <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                Validez les quiz générés par l'IA et les soumissions en attente
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
            {/* Filtres */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px'
            }}>
              <Button
                type="button"
                variant={filter === 'pending' ? "default" : "outline"}
                onClick={() => setFilter('pending')}
                style={{ fontSize: '12px' }}
              >
                En attente ({quizzes.filter(q => ['draft', 'pending_review'].includes(q.validationStatus || 'draft')).length})
              </Button>
              <Button
                type="button"
                variant={filter === 'ai_generated' ? "default" : "outline"}
                onClick={() => setFilter('ai_generated')}
                style={{ fontSize: '12px' }}
              >
                Générés par IA ({quizzes.filter(q => q.generatedByAI).length})
              </Button>
              <Button
                type="button"
                variant={filter === 'all' ? "default" : "outline"}
                onClick={() => setFilter('all')}
                style={{ fontSize: '12px' }}
              >
                Tous ({quizzes.length})
              </Button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Chargement des quiz...</p>
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#ef4444' }}>{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchQuizzesForValidation}
                  style={{ marginTop: '12px' }}
                >
                  Réessayer
                </Button>
              </div>
            ) : sortedQuizzes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: '#6b7280' }}>
                  {filter === 'pending' ? 'Aucun quiz en attente de validation' :
                   filter === 'ai_generated' ? 'Aucun quiz généré par IA' :
                   'Aucun quiz trouvé'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {sortedQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: getPriorityScore(quiz) > 5 ? '#fef3c7' : 'white'
                    }}
                    onClick={() => setSelectedQuizId(quiz.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          marginBottom: '4px',
                          color: '#1f2937'
                        }}>
                          {quiz.title}
                        </h3>
                        {quiz.description && (
                          <p style={{ 
                            fontSize: '14px', 
                            color: '#6b7280',
                            marginBottom: '8px'
                          }}>
                            {quiz.description.length > 100 
                              ? `${quiz.description.substring(0, 100)}...`
                              : quiz.description
                            }
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {quiz.generatedByAI && (
                          <Badge variant="secondary" style={{ fontSize: '10px' }}>
                            🤖 IA
                          </Badge>
                        )}
                        {getStatusBadge(quiz.validationStatus)}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      <span>
                        {quiz.questions.length} questions • 
                        Créé le {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                      {getPriorityScore(quiz) > 5 && (
                        <Badge variant="outline" style={{ fontSize: '10px' }}>
                          🔥 Priorité
                        </Badge>
                      )}
                    </div>

                    {quiz.validationNotes && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        <strong>Notes:</strong> {quiz.validationNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default QuizValidationInterface