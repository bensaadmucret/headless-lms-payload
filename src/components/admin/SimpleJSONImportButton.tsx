"use client"
import React from 'react'

export const SimpleJSONImportButton: React.FC = () => {
  const handleClick = () => {
    alert('Interface d\'import JSON/CSV - En cours de développement')
  }

  return (
    <div style={{ marginTop: 12, marginBottom: 12 }}>
      <button
        type="button"
        onClick={handleClick}
        style={{ 
          backgroundColor: '#10b981',
          color: '#ffffff',
          border: 'none',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '600',
          borderRadius: '6px',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
        }}
      >
        📥 Import JSON/CSV (Test)
      </button>
    </div>
  )
}

export default SimpleJSONImportButton