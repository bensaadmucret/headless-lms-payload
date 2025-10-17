"use client"
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

interface ValidationScreenProps {
  validationResult: ValidationResult
  onRetry: () => void
  onProceed: () => void
  onBack: () => void
}

export const JSONImportValidationScreen: React.FC<ValidationScreenProps> = ({
  validationResult,
  onRetry,
  onProceed,
  onBack
}) => {
  const { errors, warnings, categoryMappings } = validationResult

  const criticalErrors = errors.filter(e => e.severity === 'critical')
  const majorErrors = errors.filter(e => e.severity === 'major')
  const minorErrors = errors.filter(e => e.severity === 'minor')
  const warningErrors = errors.filter(e => e.severity === 'warning')

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      critical: { color: 'bg-red-500', text: 'Critique', icon: '🚨' },
      major: { color: 'bg-orange-500', text: 'Majeur', icon: '⚠️' },
      minor: { color: 'bg-yellow-500', text: 'Mineur', icon: '⚡' },
      warning: { color: 'bg-blue-500', text: 'Avertissement', icon: 'ℹ️' }
    }
    
    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.warning
    return (
      <Badge className={`${config.color} text-white`}>
        {config.icon} {config.text}
      </Badge>
    )
  }

  const getTypeIcon = (type: string) => {
    const typeIcons = {
      validation: '📋',
      database: '🗄️',
      mapping: '🔗',
      reference: '📎',
      system: '⚙️'
    }
    return typeIcons[type as keyof typeof typeIcons] || '❓'
  }

  const canProceed = criticalErrors.length === 0

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
          ✅ Rapport de Validation
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280',
          marginBottom: '24px'
        }}>
          Vérification de la qualité et de la structure de vos données
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '16px',
        marginBottom: '32px'
      }}>
        <Card style={{ 
          backgroundColor: criticalErrors.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${criticalErrors.length > 0 ? '#ef4444' : '#10b981'}`
        }}>
          <CardContent style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>
              {criticalErrors.length > 0 ? '❌' : '✅'}
            </div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: criticalErrors.length > 0 ? '#ef4444' : '#10b981',
              marginBottom: '4px'
            }}>
              {criticalErrors.length > 0 ? 'Validation Échouée' : 'Validation Réussie'}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              {criticalErrors.length > 0 
                ? `${criticalErrors.length} erreur(s) critique(s)` 
                : 'Aucune erreur critique détectée'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'var(--theme-text, #e5e5e5)',
              marginBottom: '4px'
            }}>
              Total Erreurs
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              {errors.length} problème(s) détecté(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: 'var(--theme-text, #e5e5e5)',
              marginBottom: '4px'
            }}>
              Avertissements
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              {warnings.length} avertissement(s)
            </p>
          </CardContent>
        </Card>

        {categoryMappings && categoryMappings.length > 0 && (
          <Card>
            <CardContent style={{ padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏷️</div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: 'var(--theme-text, #e5e5e5)',
                marginBottom: '4px'
              }}>
                Catégories
              </h3>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                {categoryMappings.length} mapping(s) requis
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Critical Errors */}
      {criticalErrors.length > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader>
            <CardTitle style={{ color: '#ef4444' }}>
              🚨 Erreurs Critiques - Action Requise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <p style={{ color: '#ef4444', fontWeight: '600', marginBottom: '8px' }}>
                ⛔ Import impossible - Corrections nécessaires
              </p>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Les erreurs critiques doivent être corrigées avant de pouvoir procéder à l'import.
              </p>
            </div>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              {criticalErrors.map((error, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--theme-elevation-50, #252525)',
                    border: '1px solid #ef4444',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{getTypeIcon(error.type)}</span>
                    {getSeverityBadge(error.severity)}
                    {error.itemIndex !== undefined && (
                      <Badge style={{ backgroundColor: '#6b7280' }}>
                        Ligne {error.itemIndex + 1}
                      </Badge>
                    )}
                    {error.field && (
                      <Badge style={{ backgroundColor: '#8b5cf6' }}>
                        {error.field}
                      </Badge>
                    )}
                  </div>
                  
                  <p style={{ 
                    color: 'var(--theme-text, #e5e5e5)', 
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    {error.message}
                  </p>
                  
                  {error.suggestion && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid #10b981',
                      borderRadius: '6px'
                    }}>
                      <p style={{ color: '#10b981', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                        💡 Suggestion:
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        {error.suggestion}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Errors */}
      {(majorErrors.length > 0 || minorErrors.length > 0 || warningErrors.length > 0) && (
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader>
            <CardTitle>
              ⚠️ Autres Problèmes Détectés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '12px' }}>
              {[...majorErrors, ...minorErrors, ...warningErrors].map((error, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--theme-elevation-50, #252525)',
                    border: `1px solid ${
                      error.severity === 'major' ? '#f59e0b' : 
                      error.severity === 'minor' ? '#eab308' : '#3b82f6'
                    }`,
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{getTypeIcon(error.type)}</span>
                    {getSeverityBadge(error.severity)}
                    {error.itemIndex !== undefined && (
                      <Badge style={{ backgroundColor: '#6b7280' }}>
                        Ligne {error.itemIndex + 1}
                      </Badge>
                    )}
                    {error.field && (
                      <Badge style={{ backgroundColor: '#8b5cf6' }}>
                        {error.field}
                      </Badge>
                    )}
                  </div>
                  
                  <p style={{ 
                    color: 'var(--theme-text, #e5e5e5)', 
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    {error.message}
                  </p>
                  
                  {error.suggestion && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px'
                    }}>
                      <p style={{ color: '#3b82f6', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                        💡 Suggestion:
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        {error.suggestion}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Mappings */}
      {categoryMappings && categoryMappings.length > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader>
            <CardTitle>
              🏷️ Mapping des Catégories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Les catégories suivantes nécessitent une validation avant l'import:
            </p>
            
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
                    <div>
                      <p style={{ 
                        color: 'var(--theme-text, #e5e5e5)', 
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        "{mapping.originalName}"
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        → Suggéré: "{mapping.suggestedCategory}" ({Math.round(mapping.confidence * 100)}% confiance)
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Badge style={{ 
                        backgroundColor: mapping.action === 'map' ? '#10b981' : 
                                       mapping.action === 'create' ? '#f59e0b' : '#6b7280'
                      }}>
                        {mapping.action === 'map' ? '🔗 Mapper' : 
                         mapping.action === 'create' ? '➕ Créer' : '🚫 Ignorer'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader>
            <CardTitle>
              ℹ️ Avertissements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '8px' }}>
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid #3b82f6',
                    borderRadius: '6px'
                  }}
                >
                  <p style={{ color: '#3b82f6', fontSize: '14px' }}>
                    ℹ️ {warning}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          ← Retour
        </Button>
        
        <Button
          onClick={onRetry}
          style={{
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none'
          }}
        >
          🔄 Revalider
        </Button>
        
        <Button
          onClick={onProceed}
          disabled={!canProceed}
          style={{
            backgroundColor: canProceed ? '#10b981' : '#6b7280',
            color: 'white',
            border: 'none',
            opacity: canProceed ? 1 : 0.6,
            cursor: canProceed ? 'pointer' : 'not-allowed'
          }}
        >
          {canProceed ? '✅ Continuer vers l\'aperçu' : '⛔ Corrections requises'}
        </Button>
      </div>
    </div>
  )
}

export default JSONImportValidationScreen