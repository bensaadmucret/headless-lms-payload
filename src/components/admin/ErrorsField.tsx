'use client'
import React from 'react'
// Interface pour les props du champ personnalisé
interface FieldBaseProps {
  value?: any
  path?: string
}

interface ErrorsFieldProps extends FieldBaseProps {
  value?: Array<{
    type: string
    severity: string
    message: string
    suggestion?: string
    itemIndex?: number
    field?: string
  }>
}

const ErrorsField: React.FC<ErrorsFieldProps> = ({ value }) => {
  if (!value || value.length === 0) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--theme-success-100)',
        border: '1px solid var(--theme-success-300)',
        borderRadius: '4px',
        textAlign: 'center',
        color: 'var(--theme-success-700)'
      }}>
        ✅ Aucune erreur détectée
      </div>
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'var(--theme-error-500)'
      case 'major': return 'var(--theme-warning-600)'
      case 'minor': return 'var(--theme-warning-400)'
      case 'warning': return 'var(--theme-info-500)'
      default: return 'var(--theme-text-dim)'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨'
      case 'major': return '⚠️'
      case 'minor': return '⚡'
      case 'warning': return 'ℹ️'
      default: return '❓'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'validation': return '📋'
      case 'database': return '🗄️'
      case 'mapping': return '🔗'
      case 'reference': return '📎'
      case 'system': return '⚙️'
      default: return '❓'
    }
  }

  return (
    <div style={{
      border: '1px solid var(--theme-elevation-150)',
      borderRadius: '4px',
      backgroundColor: 'var(--theme-elevation-50)'
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--theme-elevation-150)',
        backgroundColor: 'var(--theme-elevation-100)',
        fontWeight: '600',
        fontSize: '14px'
      }}>
        📋 Erreurs détectées ({value.length})
      </div>
      
      <div style={{ padding: '16px' }}>
        {value.map((error, index) => (
          <div
            key={index}
            style={{
              padding: '12px',
              marginBottom: '8px',
              border: `1px solid ${getSeverityColor(error.severity)}`,
              borderRadius: '4px',
              backgroundColor: 'var(--theme-elevation-0)'
            }}
          >
            {/* En-tête de l'erreur */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>
                {getTypeIcon(error.type)}
              </span>
              <span style={{ fontSize: '16px' }}>
                {getSeverityIcon(error.severity)}
              </span>
              <span style={{
                fontSize: '12px',
                padding: '2px 6px',
                borderRadius: '3px',
                backgroundColor: getSeverityColor(error.severity),
                color: 'white',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {error.severity}
              </span>
              {error.itemIndex !== undefined && (
                <span style={{
                  fontSize: '12px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  backgroundColor: 'var(--theme-elevation-200)',
                  color: 'var(--theme-text)'
                }}>
                  Ligne {error.itemIndex + 1}
                </span>
              )}
              {error.field && (
                <span style={{
                  fontSize: '12px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  backgroundColor: 'var(--theme-info-500)',
                  color: 'white'
                }}>
                  {error.field}
                </span>
              )}
            </div>

            {/* Message d'erreur */}
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--theme-text)',
              marginBottom: error.suggestion ? '8px' : '0'
            }}>
              {error.message}
            </div>

            {/* Suggestion */}
            {error.suggestion && (
              <div style={{
                padding: '8px',
                backgroundColor: 'var(--theme-info-100)',
                border: '1px solid var(--theme-info-300)',
                borderRadius: '4px',
                fontSize: '13px',
                color: 'var(--theme-info-700)'
              }}>
                <strong>💡 Suggestion:</strong> {error.suggestion}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ErrorsField