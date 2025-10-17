'use client'
import React from 'react'
import { DefaultListView } from '@payloadcms/ui'

// Composant d'upload natif Payload
const ImportUploadSection: React.FC = () => {
  return (
    <div style={{
      backgroundColor: 'var(--theme-elevation-50)',
      border: '1px solid var(--theme-elevation-150)',
      borderRadius: '4px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '16px',
        color: 'var(--theme-text)'
      }}>
        📥 Nouvel Import JSON/CSV
      </h2>
      
      <p style={{
        color: 'var(--theme-text-dim)',
        marginBottom: '16px',
        fontSize: '14px'
      }}>
        Utilisez le bouton "Créer nouveau" ci-dessus pour lancer un import, ou consultez l'historique ci-dessous.
      </p>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--theme-elevation-100)',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>
            Questions QCM
          </div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-dim)' }}>
            Format JSON/CSV
          </div>
        </div>
        
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--theme-elevation-100)',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🃏</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>
            Flashcards
          </div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-dim)' }}>
            Révision espacée
          </div>
        </div>
        
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--theme-elevation-100)',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🛤️</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>
            Parcours
          </div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-dim)' }}>
            Apprentissage guidé
          </div>
        </div>
        
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--theme-elevation-100)',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text)' }}>
            Migration CSV
          </div>
          <div style={{ fontSize: '12px', color: 'var(--theme-text-dim)' }}>
            Depuis Anki, etc.
          </div>
        </div>
      </div>
      
      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: 'var(--theme-info-100)',
        border: '1px solid var(--theme-info-300)',
        borderRadius: '4px',
        fontSize: '14px',
        color: 'var(--theme-info-700)'
      }}>
        💡 <strong>Astuce:</strong> Téléchargez les templates depuis{' '}
        <a 
          href="/api/json-import/templates" 
          target="_blank"
          style={{ color: 'var(--theme-info-700)', textDecoration: 'underline' }}
        >
          /api/json-import/templates
        </a>
      </div>
    </div>
  )
}

// Vue liste native avec section d'upload
const ImportJobsList: React.FC<any> = (props) => {
  return (
    <div>
      {/* Section d'upload en haut */}
      <ImportUploadSection />
      
      {/* Vue liste native Payload */}
      <DefaultListView {...props} />
    </div>
  )
}

export default ImportJobsList