"use client"
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useDocumentInfo } from '@payloadcms/ui'

export const ExtractNowButton: React.FC = () => {
  const { id } = useDocumentInfo()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleExtract = async () => {
    if (!id) {
      setMessage('Enregistrez le document avant de lancer l\'extraction.')
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/knowledge-base/${id}/extract-now`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || `Erreur HTTP ${res.status}`)
      }
      setMessage('Extraction effectuée. Rechargement...')
      // Recharger pour voir les champs mis à jour
      setTimeout(() => window.location.reload(), 1000)
    } catch (e: any) {
      setMessage(e?.message || 'Erreur lors de l\'extraction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button type="button" variant="default" onClick={handleExtract} disabled={loading || !id}>
          {loading ? 'Extraction en cours...' : 'Extraire maintenant'}
        </Button>
        {message && <span style={{ fontSize: 12 }}>{message}</span>}
      </div>
      {!id && <div style={{ fontSize: 12, opacity: 0.8 }}>Enregistrez le document pour activer ce bouton.</div>}
    </div>
  )
}

// Export par défaut pour compatibilité
export default ExtractNowButton
