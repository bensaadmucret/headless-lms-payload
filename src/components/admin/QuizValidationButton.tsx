"use client"
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import QuizValidationInterface from './QuizValidationInterface'

/**
 * Bouton pour ouvrir l'interface de validation des quiz
 * Tâche 9: Système de validation manuelle par les experts
 * Exigences: 9.3
 */
export const QuizValidationButton: React.FC = () => {
  const [showValidationInterface, setShowValidationInterface] = useState(false)

  return (
    <>
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <Button
          type="button"
          onClick={() => setShowValidationInterface(true)}
          style={{ 
            backgroundColor: '#f59e0b',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#d97706'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(245, 158, 11, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f59e0b'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.3)'
          }}
        >
          ✅ Interface de Validation
        </Button>
      </div>

      {showValidationInterface && (
        <QuizValidationInterface
          onClose={() => setShowValidationInterface(false)}
        />
      )}
    </>
  )
}

export default QuizValidationButton