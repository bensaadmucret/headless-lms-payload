"use client"
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export const JSONImportTestButton: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('')

  const testEndpoints = async () => {
    try {
      setTestResult('Test en cours...')
      
      // Test 1: Lister les templates
      const templatesResponse = await fetch('/api/json-import/templates', {
        credentials: 'include'
      })
      
      if (!templatesResponse.ok) {
        throw new Error(`Templates endpoint failed: ${templatesResponse.status}`)
      }
      
      const templates = await templatesResponse.json()
      console.log('Templates disponibles:', templates)
      
      // Test 2: Télécharger un template
      const downloadResponse = await fetch('/api/json-import/templates/questions-simple.json', {
        credentials: 'include'
      })
      
      if (!downloadResponse.ok) {
        throw new Error(`Download endpoint failed: ${downloadResponse.status}`)
      }
      
      // Test 3: Historique
      const historyResponse = await fetch('/api/json-import/history', {
        credentials: 'include'
      })
      
      if (!historyResponse.ok) {
        throw new Error(`History endpoint failed: ${historyResponse.status}`)
      }
      
      const history = await historyResponse.json()
      console.log('Historique:', history)
      
      setTestResult('✅ Tous les endpoints fonctionnent correctement!')
      
    } catch (error) {
      console.error('Erreur test:', error)
      setTestResult(`❌ Erreur: ${error.message}`)
    }
  }

  return (
    <div style={{ marginTop: 12, marginBottom: 12 }}>
      <Button
        type="button"
        onClick={testEndpoints}
        style={{ 
          backgroundColor: '#f59e0b',
          color: '#ffffff',
          border: 'none',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: '600',
          borderRadius: '6px',
          cursor: 'pointer',
          marginRight: '12px'
        }}
      >
        🧪 Test Endpoints JSON Import
      </Button>
      
      {testResult && (
        <div style={{ 
          marginTop: '8px', 
          padding: '8px 12px',
          backgroundColor: testResult.includes('❌') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${testResult.includes('❌') ? '#ef4444' : '#10b981'}`,
          borderRadius: '6px',
          fontSize: '14px',
          color: testResult.includes('❌') ? '#ef4444' : '#10b981'
        }}>
          {testResult}
        </div>
      )}
    </div>
  )
}

export default JSONImportTestButton