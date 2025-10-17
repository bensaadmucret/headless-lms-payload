'use client'
import React from 'react'

const BeforeDashboard: React.FC = () => {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        backgroundColor: 'var(--theme-elevation-0, #1a1a1a)',
        padding: '20px',
        borderRadius: '8px'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: 'var(--theme-text, #e5e5e5)',
          marginBottom: '8px'
        }}>
          🎓 MedCoach Admin
        </h2>
        <p style={{
          color: 'var(--theme-text-dim, #9ca3af)',
          fontSize: '14px',
          margin: '0'
        }}>
          Gérez votre contenu éducatif
        </p>
      </div>
    </div>
  )
}

export default BeforeDashboard