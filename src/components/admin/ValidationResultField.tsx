'use client'
import React from 'react'
// Interface pour les props du champ personnalisé
interface FieldBaseProps {
  value?: any
  path?: string
}

interface ValidationResultFieldProps extends FieldBaseProps {
  value?: {
    isValid: boolean
    errors: any[]
    warnings: string[]
    previewData?: any[]
    categoryMappings?: any[]
  }
}

const ValidationResultField: React.FC<ValidationResultFieldProps> = ({ value }) => {
  if (!value) return null

  const { isValid, errors = [], warnings = [], categoryMappings = [] } = value

  return (
    <div style={{
      border: '1px solid var(--theme-elevation-150)',
      borderRadius: '4px',
      padding: '16px',
      backgroundColor: 'var(--theme-elevation-50)'
    }}>
      {/* Statut de validation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        padding: '12px',
        borderRadius: '4px',
        backgroundColor: isValid ? 'var(--theme-success-100)' : 'var(--theme-error-100)',
        border: `1px solid ${isValid ? 'var(--theme-success-500)' : 'var(--theme-error-500)'}`
      }}>
        <span style={{ fontSize: '20px' }}>
          {isValid ? '✅' : '❌'}
        </span>
        <span style={{
          fontWeight: '600',
          color: isValid ? 'var(--theme-success-700)' : 'var(--theme-error-700)'
        }}>
          {isValid ? 'Validation réussie' : 'Validation échouée'}
        </span>
      </div>

      {/* Résumé */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--theme-elevation-100)',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--theme-error-500)' }}>
            {errors.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-dim)' }}>
            Erreurs
          </div>
        </div>
        
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--theme-elevation-100)',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--theme-warning-500)' }}>
            {warnings.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-dim)' }}>
            Avertissements
          </div>
        </div>
        
        <div style={{
          padding: '12px',
          backgroundColor: 'var(--theme-elevation-100)',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--theme-info-500)' }}>
            {categoryMappings.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-dim)' }}>
            Mappings
          </div>
        </div>
      </div>

      {/* Erreurs critiques */}
      {errors.filter(e => e.severity === 'critical').length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--theme-error-500)',
            marginBottom: '8px'
          }}>
            🚨 Erreurs Critiques
          </h4>
          {errors.filter(e => e.severity === 'critical').map((error, index) => (
            <div
              key={index}
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--theme-error-100)',
                border: '1px solid var(--theme-error-300)',
                borderRadius: '4px',
                marginBottom: '4px',
                fontSize: '14px'
              }}
            >
              <strong>{error.message}</strong>
              {error.suggestion && (
                <div style={{ 
                  marginTop: '4px', 
                  fontSize: '12px', 
                  color: 'var(--theme-text-dim)' 
                }}>
                  💡 {error.suggestion}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Avertissements */}
      {warnings.length > 0 && (
        <div>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--theme-warning-500)',
            marginBottom: '8px'
          }}>
            ⚠️ Avertissements
          </h4>
          {warnings.map((warning, index) => (
            <div
              key={index}
              style={{
                padding: '8px 12px',
                backgroundColor: 'var(--theme-warning-100)',
                border: '1px solid var(--theme-warning-300)',
                borderRadius: '4px',
                marginBottom: '4px',
                fontSize: '14px'
              }}
            >
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ValidationResultField