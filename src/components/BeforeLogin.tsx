'use client'
import React from 'react'

const BeforeLogin: React.FC = () => {
  return (
    <div style={{
      backgroundColor: 'var(--theme-elevation-50, #252525)',
      border: '1px solid var(--theme-elevation-150, #3a3a3a)',
      borderRadius: '8px',
      padding: '24px',
      margin: '24px 0',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>
        🎓
      </div>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: 'var(--theme-text, #e5e5e5)',
        marginBottom: '8px'
      }}>
        MedCoach Admin
      </h2>
      <p style={{
        color: 'var(--theme-text-dim, #9ca3af)',
        fontSize: '16px',
        marginBottom: '16px'
      }}>
        Plateforme d'administration pour la gestion de contenu éducatif médical
      </p>
      

    </div>
  )
}

export default BeforeLogin