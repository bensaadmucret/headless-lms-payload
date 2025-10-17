"use client"
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface PreviewItem {
  id: string
  type: 'question' | 'flashcard' | 'learning-path' | 'category'
  originalData: any
  processedData: any
  status: 'valid' | 'warning' | 'error'
  warnings?: string[]
  errors?: string[]
}

interface CategoryMapping {
  originalName: string
  suggestedCategory: string
  confidence: number
  action: 'map' | 'create' | 'ignore'
}

interface PreviewScreenProps {
  previewData: PreviewItem[]
  categoryMappings?: CategoryMapping[]
  onBack: () => void
  onImport: () => void
  onEditItem: (itemId: string, newData: any) => void
  onUpdateCategoryMapping: (originalName: string, action: 'map' | 'create' | 'ignore', targetCategory?: string) => void
}

export const JSONImportPreviewScreen: React.FC<PreviewScreenProps> = ({
  previewData,
  categoryMappings = [],
  onBack,
  onImport,
  onEditItem,
  onUpdateCategoryMapping
}) => {
  const [selectedTab, setSelectedTab] = useState<'questions' | 'flashcards' | 'paths' | 'categories'>('questions')
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [searchTerm, setSearchTerm] = useState('')

  const filterItemsByType = (type: string) => {
    return previewData.filter(item => {
      const matchesType = item.type === type || (type === 'paths' && item.type === 'learning-path')
      const matchesSearch = !searchTerm || 
        JSON.stringify(item.processedData).toLowerCase().includes(searchTerm.toLowerCase())
      return matchesType && matchesSearch
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      valid: { color: 'bg-green-500', text: 'Valide', icon: '✅' },
      warning: { color: 'bg-yellow-500', text: 'Attention', icon: '⚠️' },
      error: { color: 'bg-red-500', text: 'Erreur', icon: '❌' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.valid
    return (
      <Badge className={`${config.color} text-white`}>
        {config.icon} {config.text}
      </Badge>
    )
  }

  const getTypeIcon = (type: string) => {
    const typeIcons = {
      question: '❓',
      flashcard: '🃏',
      'learning-path': '🛤️',
      category: '🏷️'
    }
    return typeIcons[type as keyof typeof typeIcons] || '📄'
  }

  const handleEditItem = (item: PreviewItem) => {
    setEditingItem(item.id)
    setEditData(item.processedData)
  }

  const handleSaveEdit = () => {
    if (editingItem) {
      onEditItem(editingItem, editData)
      setEditingItem(null)
      setEditData({})
    }
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
    setEditData({})
  }

  const validItems = previewData.filter(item => item.status === 'valid').length
  const warningItems = previewData.filter(item => item.status === 'warning').length
  const errorItems = previewData.filter(item => item.status === 'error').length

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          color: 'var(--theme-text, #e5e5e5)',
          marginBottom: '8px'
        }}>
          👁️ Aperçu des Données
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280',
          marginBottom: '24px'
        }}>
          Vérifiez et modifiez vos données avant l'import final
        </p>
      </div>

      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '32px'
      }}>
        <Card>
          <CardContent style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'var(--theme-text, #e5e5e5)',
              marginBottom: '4px'
            }}>
              Total
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              {previewData.length} élément(s)
            </p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
          <CardContent style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#10b981',
              marginBottom: '4px'
            }}>
              Valides
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              {validItems} élément(s)
            </p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
          <CardContent style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#f59e0b',
              marginBottom: '4px'
            }}>
              Avertissements
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              {warningItems} élément(s)
            </p>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
          <CardContent style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>❌</div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#ef4444',
              marginBottom: '4px'
            }}>
              Erreurs
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              {errorItems} élément(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Mappings */}
      {categoryMappings.length > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader>
            <CardTitle>🏷️ Configuration des Catégories</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '12px' }}>
              {categoryMappings.map((mapping, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--theme-elevation-50, #252525)',
                    border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        color: 'var(--theme-text, #e5e5e5)', 
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        "{mapping.originalName}"
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        Suggéré: "{mapping.suggestedCategory}" ({Math.round(mapping.confidence * 100)}% confiance)
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Button
                        size="sm"
                        onClick={() => onUpdateCategoryMapping(mapping.originalName, 'map', mapping.suggestedCategory)}
                        style={{
                          backgroundColor: mapping.action === 'map' ? '#10b981' : 'var(--theme-elevation-100, #2a2a2a)',
                          color: mapping.action === 'map' ? 'white' : 'var(--theme-text, #e5e5e5)',
                          fontSize: '12px',
                          padding: '4px 8px'
                        }}
                      >
                        🔗 Mapper
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onUpdateCategoryMapping(mapping.originalName, 'create')}
                        style={{
                          backgroundColor: mapping.action === 'create' ? '#f59e0b' : 'var(--theme-elevation-100, #2a2a2a)',
                          color: mapping.action === 'create' ? 'white' : 'var(--theme-text, #e5e5e5)',
                          fontSize: '12px',
                          padding: '4px 8px'
                        }}
                      >
                        ➕ Créer
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onUpdateCategoryMapping(mapping.originalName, 'ignore')}
                        style={{
                          backgroundColor: mapping.action === 'ignore' ? '#6b7280' : 'var(--theme-elevation-100, #2a2a2a)',
                          color: mapping.action === 'ignore' ? 'white' : 'var(--theme-text, #e5e5e5)',
                          fontSize: '12px',
                          padding: '4px 8px'
                        }}
                      >
                        🚫 Ignorer
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="🔍 Rechercher dans les données..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              backgroundColor: 'var(--theme-elevation-50, #252525)',
              border: '1px solid var(--theme-elevation-150, #3a3a3a)',
              color: 'var(--theme-text, #e5e5e5)'
            }}
          />
        </div>
        
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { key: 'questions', label: '❓ Questions', count: filterItemsByType('question').length },
            { key: 'flashcards', label: '🃏 Flashcards', count: filterItemsByType('flashcard').length },
            { key: 'paths', label: '🛤️ Parcours', count: filterItemsByType('learning-path').length }
          ].map(tab => (
            <Button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: selectedTab === tab.key 
                  ? 'var(--theme-elevation-200, #3a3a3a)' 
                  : 'var(--theme-elevation-50, #252525)',
                color: selectedTab === tab.key 
                  ? 'var(--theme-text, #e5e5e5)' 
                  : '#6b7280',
                border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                borderRadius: '8px'
              }}
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </div>
      </div>

      {/* Data Preview */}
      <Card style={{ marginBottom: '24px' }}>
        <CardHeader>
          <CardTitle>
            {getTypeIcon(selectedTab)} Aperçu des {
              selectedTab === 'questions' ? 'Questions' :
              selectedTab === 'flashcards' ? 'Flashcards' :
              'Parcours d\'apprentissage'
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'grid', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
            {filterItemsByType(selectedTab === 'paths' ? 'learning-path' : selectedTab).map((item, index) => (
              <div
                key={item.id}
                style={{
                  padding: '16px',
                  backgroundColor: 'var(--theme-elevation-50, #252525)',
                  border: `1px solid ${
                    item.status === 'error' ? '#ef4444' :
                    item.status === 'warning' ? '#f59e0b' :
                    'var(--theme-elevation-150, #3a3a3a)'
                  }`,
                  borderRadius: '8px'
                }}
              >
                {/* Item Header */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{getTypeIcon(item.type)}</span>
                    {getStatusBadge(item.status)}
                    <Badge style={{ backgroundColor: '#6b7280' }}>
                      #{index + 1}
                    </Badge>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => handleEditItem(item)}
                    style={{
                      backgroundColor: '#667eea',
                      color: 'white',
                      fontSize: '12px',
                      padding: '4px 8px'
                    }}
                  >
                    ✏️ Modifier
                  </Button>
                </div>

                {/* Item Content */}
                {editingItem === item.id ? (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {/* Edit Form */}
                    {item.type === 'question' && (
                      <>
                        <div>
                          <Label>Question</Label>
                          <Textarea
                            value={editData.questionText || ''}
                            onChange={(e) => setEditData({...editData, questionText: e.target.value})}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label>Explication</Label>
                          <Textarea
                            value={editData.explanation || ''}
                            onChange={(e) => setEditData({...editData, explanation: e.target.value})}
                            rows={2}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button onClick={handleSaveEdit} style={{ backgroundColor: '#10b981', color: 'white' }}>
                            ✅ Sauvegarder
                          </Button>
                          <Button onClick={handleCancelEdit} style={{ backgroundColor: '#6b7280', color: 'white' }}>
                            ❌ Annuler
                          </Button>
                        </div>
                      </>
                    )}
                    
                    {item.type === 'flashcard' && (
                      <>
                        <div>
                          <Label>Recto</Label>
                          <Textarea
                            value={editData.front || ''}
                            onChange={(e) => setEditData({...editData, front: e.target.value})}
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Verso</Label>
                          <Textarea
                            value={editData.back || ''}
                            onChange={(e) => setEditData({...editData, back: e.target.value})}
                            rows={2}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button onClick={handleSaveEdit} style={{ backgroundColor: '#10b981', color: 'white' }}>
                            ✅ Sauvegarder
                          </Button>
                          <Button onClick={handleCancelEdit} style={{ backgroundColor: '#6b7280', color: 'white' }}>
                            ❌ Annuler
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div>
                    {/* Display Content */}
                    {item.type === 'question' && (
                      <div>
                        <p style={{ 
                          color: 'var(--theme-text, #e5e5e5)', 
                          fontWeight: '600',
                          marginBottom: '8px'
                        }}>
                          {item.processedData.questionText}
                        </p>
                        {item.processedData.options && (
                          <div style={{ marginBottom: '8px' }}>
                            {item.processedData.options.map((option: any, optIndex: number) => (
                              <p key={optIndex} style={{ 
                                color: option.isCorrect ? '#10b981' : '#6b7280',
                                fontSize: '14px',
                                marginLeft: '16px'
                              }}>
                                {option.isCorrect ? '✅' : '⭕'} {option.text}
                              </p>
                            ))}
                          </div>
                        )}
                        {item.processedData.explanation && (
                          <p style={{ color: '#6b7280', fontSize: '14px', fontStyle: 'italic' }}>
                            💡 {item.processedData.explanation}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {item.type === 'flashcard' && (
                      <div>
                        <div style={{ marginBottom: '8px' }}>
                          <p style={{ color: '#10b981', fontSize: '14px', fontWeight: '600' }}>
                            📄 Recto:
                          </p>
                          <p style={{ color: 'var(--theme-text, #e5e5e5)', marginLeft: '16px' }}>
                            {item.processedData.front}
                          </p>
                        </div>
                        <div>
                          <p style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '600' }}>
                            📄 Verso:
                          </p>
                          <p style={{ color: 'var(--theme-text, #e5e5e5)', marginLeft: '16px' }}>
                            {item.processedData.back}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {item.type === 'learning-path' && (
                      <div>
                        <p style={{ 
                          color: 'var(--theme-text, #e5e5e5)', 
                          fontWeight: '600',
                          marginBottom: '8px'
                        }}>
                          {item.processedData.title}
                        </p>
                        <p style={{ color: '#6b7280', fontSize: '14px' }}>
                          {item.processedData.steps?.length || 0} étape(s)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Warnings and Errors */}
                {(item.warnings?.length || 0) > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    {item.warnings?.map((warning, wIndex) => (
                      <p key={wIndex} style={{ color: '#f59e0b', fontSize: '12px' }}>
                        ⚠️ {warning}
                      </p>
                    ))}
                  </div>
                )}
                
                {(item.errors?.length || 0) > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    {item.errors?.map((error, eIndex) => (
                      <p key={eIndex} style={{ color: '#ef4444', fontSize: '12px' }}>
                        ❌ {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {filterItemsByType(selectedTab === 'paths' ? 'learning-path' : selectedTab).length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '48px',
                color: '#6b7280'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <p>Aucun élément trouvé pour cette catégorie</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'flex-end',
        paddingTop: '24px',
        borderTop: '1px solid var(--theme-elevation-150, #3a3a3a)'
      }}>
        <Button
          onClick={onBack}
          style={{
            backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
            color: 'var(--theme-text, #e5e5e5)',
            border: '1px solid var(--theme-elevation-150, #3a3a3a)'
          }}
        >
          ← Retour à la validation
        </Button>
        
        <Button
          onClick={onImport}
          disabled={errorItems > 0}
          style={{
            backgroundColor: errorItems > 0 ? '#6b7280' : '#10b981',
            color: 'white',
            border: 'none',
            opacity: errorItems > 0 ? 0.6 : 1,
            cursor: errorItems > 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {errorItems > 0 ? '⛔ Erreurs à corriger' : '🚀 Lancer l\'import'}
        </Button>
      </div>
    </div>
  )
}

export default JSONImportPreviewScreen