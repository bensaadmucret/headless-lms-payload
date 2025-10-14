"use client"
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDocumentInfo } from '@payloadcms/ui'

interface GenerationFormData {
  categoryId: string
  categoryName: string
  courseId: string
  courseName: string
  difficultyLevel: 'pass' | 'las'
  questionCount: number
  medicalDomain: string
  sourceContent: string
}

export const GenerateAIQuestionsButton: React.FC = () => {
  const { id } = useDocumentInfo()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [formData, setFormData] = useState<GenerationFormData>({
    categoryId: '',
    categoryName: '',
    courseId: '',
    courseName: '',
    difficultyLevel: 'pass',
    questionCount: 1,
    medicalDomain: '',
    sourceContent: ''
  })

  const handleGenerate = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const requestData = {
        ...formData,
        questionCount: Math.min(formData.questionCount, 5) // Limiter à 5 questions max depuis l'interface
      }

      const res = await fetch('/api/questions/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || `Erreur HTTP ${res.status}`)
      }

      const successCount = data.data?.created || 0
      const requestedCount = data.data?.requested || 0

      setMessage(`${successCount}/${requestedCount} question(s) générée(s) avec succès. Rechargement...`)

      // Recharger pour voir les nouvelles questions
      setTimeout(() => window.location.reload(), 2000)

    } catch (e: any) {
      setMessage(e?.message || 'Erreur lors de la génération des questions IA')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: keyof GenerationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div style={{ marginTop: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <Button
          type="button"
          variant="default"
          onClick={() => setIsFormVisible(!isFormVisible)}
        >
          {isFormVisible ? 'Masquer' : 'Générer Questions IA'}
        </Button>
        {message && <span style={{ fontSize: 12, color: message.includes('succès') ? 'green' : 'red' }}>{message}</span>}
      </div>

      {isFormVisible && (
        <Card>
          <CardHeader>
            <CardTitle>Génération de Questions IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <Label htmlFor="categoryName">Nom de la catégorie</Label>
                  <Input
                    id="categoryName"
                    placeholder="Ex: Anatomie cardiovasculaire"
                    value={formData.categoryName}
                    onChange={(e) => updateFormData('categoryName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="courseName">Nom du cours (optionnel)</Label>
                  <Input
                    id="courseName"
                    placeholder="Ex: Physiologie cardiovasculaire"
                    value={formData.courseName}
                    onChange={(e) => updateFormData('courseName', e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <Label htmlFor="difficultyLevel">Niveau d'études</Label>
                  <Select
                    value={formData.difficultyLevel}
                    onValueChange={(value: 'pass' | 'las') => updateFormData('difficultyLevel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">PASS (1ère année)</SelectItem>
                      <SelectItem value="las">LAS (2ème année)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="questionCount">Nombre de questions</Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.questionCount}
                    onChange={(e) => updateFormData('questionCount', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label htmlFor="medicalDomain">Domaine médical</Label>
                  <Input
                    id="medicalDomain"
                    placeholder="Ex: cardiologie, neurologie"
                    value={formData.medicalDomain}
                    onChange={(e) => updateFormData('medicalDomain', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="sourceContent">Contenu source (optionnel)</Label>
                <Textarea
                  id="sourceContent"
                  placeholder="Collez ici le contenu médical pour générer des questions spécifiques..."
                  value={formData.sourceContent}
                  onChange={(e) => updateFormData('sourceContent', e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                type="button"
                variant="default"
                onClick={handleGenerate}
                disabled={loading || !formData.categoryName || !formData.medicalDomain}
                style={{ alignSelf: 'flex-start' }}
              >
                {loading ? 'Génération en cours...' : 'Générer les questions'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Export par défaut pour compatibilité
export default GenerateAIQuestionsButton
