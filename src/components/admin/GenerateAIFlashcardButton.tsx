"use client"

import React, { useMemo, useState } from 'react'
import { useFormFields, Button, TextInput, TextareaInput, FieldLabel } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'

interface FlashcardConfig {
  topic: string
  count: number
  specialty?: string
}

const defaultConfig: FlashcardConfig = {
  topic: '',
  count: 5,
  specialty: ''
}

const formatDisplayValue = (value?: string) => value || 'Non défini'

const deriveRelationshipValue = (value: unknown): { id?: string; label?: string } => {
  if (!value) return {}

  if (typeof value === 'object') {
    const record = value as { id?: string | number; title?: string; value?: string | number }
    return {
      id: record.id ? String(record.id) : record.value ? String(record.value) : undefined,
      label: record.title || (record.id ? `#${record.id}` : undefined)
    }
  }

  return { id: String(value), label: `#${value}` }
}

export const GenerateAIFlashcardButton: React.FC = () => {
  const router = useRouter()
  const [config, setConfig] = useState<FlashcardConfig>(defaultConfig)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [createdCount, setCreatedCount] = useState<number | null>(null)
  const [deckName, setDeckName] = useState<string | null>(null)

  const formValues = useFormFields(([fields]) => ({
    category: fields?.category?.value,
    difficulty: fields?.difficulty?.value,
    level: fields?.level?.value
  }))

  const categoryInfo = useMemo(() => deriveRelationshipValue(formValues.category), [formValues.category])
  const difficultyLabel = useMemo(() => {
    if (!formValues.difficulty) return undefined
    const mapping: Record<string, string> = {
      easy: 'Facile',
      medium: 'Moyen',
      hard: 'Difficile'
    }
    return mapping[String(formValues.difficulty)] || String(formValues.difficulty)
  }, [formValues.difficulty])
  const levelLabel = useMemo(() => {
    if (!formValues.level) return undefined
    const mapping: Record<string, string> = {
      PASS: 'PASS',
      LAS: 'LAS',
      both: 'PASS & LAS'
    }
    return mapping[String(formValues.level).toUpperCase()] || String(formValues.level)
  }, [formValues.level])

  const updateConfig = <K extends keyof FlashcardConfig>(field: K, value: FlashcardConfig[K]) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const isConfigValid = () => {
    const hasFormCategory = Boolean(categoryInfo.id)
    return config.topic.trim().length >= 5 && hasFormCategory && config.count >= 1 && config.count <= 20
  }

  const handleGenerate = async () => {
    setLoading(true)
    setStatusMessage('Génération des flashcards en cours...')
    setErrorMessage(null)

    try {
      const response = await fetch('/api/flashcards/generate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic: config.topic.trim(),
          count: config.count,
          difficulty: formValues.difficulty,
          specialty: config.specialty || undefined,
          targetAudience: formValues.level,
          categoryId: categoryInfo.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Échec de la génération des flashcards')
      }

      const savedCount = typeof data?.count === 'number' ? data.count : data?.cards?.length || 0
      const createdDeck = data?.deck?.deckName || null
      
      setCreatedCount(savedCount)
      setDeckName(createdDeck)
      setStatusMessage(`✅ ${savedCount} flashcards créées avec succès !`)

      // Redirection vers le deck créé après un court délai
      setTimeout(() => {
        if (data?.deck?.id) {
          router.push(`/admin/collections/flashcard-decks/${data.deck.id}`)
        } else {
          router.push('/admin/collections/flashcards')
        }
        router.refresh()
      }, 2000)
    } catch (error) {
      console.error('Erreur de génération IA:', error)
      setStatusMessage(null)
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue lors de la génération')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="field-type">
      <div className="field-type" style={{ marginBottom: '1.5rem' }}>
        <FieldLabel label="Sujet / instructions" required />
        <TextareaInput
          path="ai-topic"
          value={config.topic}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateConfig('topic', e.target.value)}
          placeholder="Ex: Chimie organique – réactions de substitution"
          rows={3}
        />
        <div style={{ 
          fontSize: '13px', 
          color: 'var(--theme-elevation-400)',
          marginTop: '0.5rem'
        }}>
          Minimum 5 caractères
        </div>
      </div>

      <div className="field-type" style={{ marginBottom: '1.5rem' }}>
        <FieldLabel label="Nombre de cartes" required />
        <TextInput
          path="ai-count"
          value={String(config.count)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('count', Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
        />
        <div style={{ 
          fontSize: '13px', 
          color: 'var(--theme-elevation-400)',
          marginTop: '0.5rem'
        }}>
          Limite : 1 à 20 cartes
        </div>
      </div>

      <div className="field-type" style={{ marginBottom: '1.5rem' }}>
        <FieldLabel label="Spécialité (optionnel)" />
        <TextInput
          path="ai-specialty"
          value={config.specialty || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateConfig('specialty', e.target.value)}
          placeholder="Cardiologie, Pharmacologie..."
        />
      </div>

      {statusMessage && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          fontSize: '13px',
          color: 'var(--theme-success-500)',
          backgroundColor: 'var(--theme-elevation-50)',
          borderRadius: '3px'
        }}>
          {statusMessage}
          {createdCount !== null && (
            <div style={{ marginTop: '0.25rem' }}>
              {createdCount} flashcards sauvegardées dans le deck{deckName ? ` "${deckName}"` : ''}.
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          fontSize: '13px',
          color: 'var(--theme-error-500)',
          backgroundColor: 'var(--theme-elevation-50)',
          borderRadius: '3px'
        }}>
          {errorMessage}
        </div>
      )}

      {!isConfigValid() && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          fontSize: '13px',
          color: 'var(--theme-warning-500)',
          backgroundColor: 'var(--theme-elevation-50)',
          borderRadius: '3px'
        }}>
          Renseignez catégorie/difficulté/niveau dans le formulaire principal et ajoutez un sujet avant de générer.
        </div>
      )}

      <Button
        buttonStyle="primary"
        onClick={handleGenerate}
        disabled={!isConfigValid() || loading}
      >
        {loading ? 'Génération...' : 'Générer les flashcards IA'}
      </Button>
    </div>
  )
}

export default GenerateAIFlashcardButton
