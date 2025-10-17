"use client"
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import JSONImportInterface from './JSONImportInterface'

export const JSONImportButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
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
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#059669'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#10b981'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.3)'
          }}
        >
          📥 Import JSON/CSV
        </Button>
      </div>

      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            zIndex: 9999999,
            backdropFilter: 'blur(4px)',
            padding: '20px',
            overflowY: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false)
            }
          }}
        >
          <div style={{
            backgroundColor: 'var(--theme-elevation-0, #1a1a1a)',
            borderRadius: '12px',
            padding: '0',
            width: '100%',
            maxWidth: '1400px',
            maxHeight: 'calc(100vh - 40px)',
            overflow: 'auto',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--theme-elevation-150, #2a2a2a)',
            margin: 'auto',
            position: 'relative'
          }}>
            {/* Close Button */}
            <Button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{ 
                position: 'absolute',
                top: '16px',
                right: '16px',
                padding: '8px 12px', 
                fontSize: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                lineHeight: '1',
                zIndex: 10
              }}
            >
              ✕
            </Button>

            {/* Import Interface */}
            <JSONImportInterface />
          </div>
        </div>
      )}
    </>
  )
}

export default JSONImportButton