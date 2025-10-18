'use client'
import React from 'react'
import Link from 'next/link'

const JSONImportDashboardWidget: React.FC = () => {
  return (
    <div style={{
      backgroundColor: 'var(--theme-elevation-50, #252525)',
      border: '1px solid var(--theme-elevation-150, #3a3a3a)',
      borderRadius: '6px',
      padding: '16px',
      margin: '12px 0'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>📥</span>
          <div>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--theme-text, #e5e5e5)',
              margin: '0 0 4px 0'
            }}>
              Import JSON/CSV
            </h4>
            <p style={{
              color: 'var(--theme-text-dim, #9ca3af)',
              fontSize: '12px',
              margin: '0'
            }}>
              Questions, parcours, flashcards
            </p>
          </div>
        </div>
        
        <Link 
          href="/admin/collections/knowledge-base"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: '#10b981',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Gérer
        </Link>
      </div>
    </div>
  )
}

export default JSONImportDashboardWidget