'use client'
import React from 'react'
import { DefaultEditView } from '@payloadcms/ui'

const ImportJobEdit: React.FC<any> = (props) => {
  return (
    <div>
      {/* En-tête personnalisé pour les jobs d'import */}
      <div style={{
        backgroundColor: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: '4px',
        padding: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>📥</span>
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--theme-text)',
              margin: 0
            }}>
              Détails de l'Import
            </h2>
            <p style={{
              fontSize: '14px',
              color: 'var(--theme-text-dim)',
              margin: '4px 0 0 0'
            }}>
              Consultez les détails et résultats de cet import
            </p>
          </div>
        </div>
      </div>
      
      {/* Vue d'édition native Payload */}
      <DefaultEditView {...props} />
    </div>
  )
}

export default ImportJobEdit