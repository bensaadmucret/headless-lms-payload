"use client"
import React from 'react'

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
      critical: { color: '#ef4444', text: 'Critique', icon: '🚨' },
      major: { color: '#f59e0b', text: 'Majeur', icon: '⚠️' },
      minor: { color: '#eab308', text: 'Mineur', icon: '⚡' },
      warning: { color: '#3b82f6', text: 'Avertissement', icon: 'ℹ️' }
    }
    
    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.warning
    return (
      <span style={{
        backgroundColor: config.color,
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {config.icon} {config.text}
      </span>
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
        <div style={{ 
          backgroundColor: criticalErrors.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${criticalErrors.length > 0 ? '#ef4444' : '#10b981'}`,
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center'
        }}>
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
        </div>

        <div style={{
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '8px',
          backgroundColor: 'var(--theme-elevation-50)',
          padding: '20px',
          textAlign: 'center'
        }}>
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
        </div>

        <div style={{
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '8px',
          backgroundColor: 'var(--theme-elevation-50)',
          padding: '20px',
          textAlign: 'center'
        }}>
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
        </div>

        {categoryMappings && categoryMappings.length > 0 && (
          <div style={{
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: '8px',
            backgroundColor: 'var(--theme-elevation-50)',
            padding: '20px',
            textAlign: 'center'
          }}>
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
          </div>
        )}
      </div>

      {/* Critical Errors */}
      {criticalErrors.length > 0 && (
        <div style={{ 
          marginBottom: '24px',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '8px',
          backgroundColor: 'var(--theme-elevation-50)'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--theme-elevation-150)',
            backgroundColor: 'var(--theme-elevation-100)'
          }}>
            <h3 style={{ 
              color: '#ef4444',
              margin: 0,
              fontSize: '18px',
              fontWeight: '600'
            }}>
              🚨 Erreurs Critiques - Action Requise
            </h3>
          </div>
          <div style={{ padding: '16px' }}>
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
                      <span style={{ 
                        backgroundColor: '#6b7280',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '12px'
                      }}>
                        Ligne {error.itemIndex + 1}
                      </span>
                    )}
                    {error.field && (
                      <span style={{ 
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '12px'
                      }}>
                        {error.field}
                      </span>
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
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'flex-end',
        paddingTop: '24px',
        borderTop: '1px solid var(--theme-elevation-150, #3a3a3a)'
      }}>
        <button
          onClick={onBack}
          style={{
            backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
            color: 'var(--theme-text, #e5e5e5)',
            border: '1px solid var(--theme-elevation-150, #3a3a3a)',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ← Retour
        </button>
        
        <button
          onClick={onRetry}
          style={{
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Revalider
        </button>
        
        <button
          onClick={onProceed}
          disabled={!canProceed}
          style={{
            backgroundColor: canProceed ? '#10b981' : '#6b7280',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            opacity: canProceed ? 1 : 0.6,
            fontSize: '14px'
          }}
        >
          {canProceed ? '✅ Continuer vers l\'aperçu' : '⛔ Corrections requises'}
        </button>
      </div>
    </div>
  )
}

export default JSONImportValidationScreen