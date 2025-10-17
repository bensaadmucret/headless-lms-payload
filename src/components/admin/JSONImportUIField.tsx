import React from 'react'

const JSONImportUIField: React.FC = () => {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f0f9ff',
      border: '1px solid #0ea5e9',
      borderRadius: '8px',
      margin: '16px 0'
    }}>
      <h3 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>
        📥 Import JSON/CSV
      </h3>
      <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
        Interface d'import en cours de développement
      </p>
      <button
        onClick={() => alert('Interface d\'import JSON/CSV - Bientôt disponible !')}
        style={{
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Ouvrir l'interface d'import
      </button>
    </div>
  )
}

export default JSONImportUIField