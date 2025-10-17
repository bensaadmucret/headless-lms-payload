"use client"
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ImportJob {
  id: string
  fileName: string
  importType: 'questions' | 'quizzes' | 'flashcards' | 'learning-paths' | 'csv'
  status: 'queued' | 'processing' | 'validating' | 'preview' | 'completed' | 'failed' | 'paused'
  progress: {
    total: number
    processed: number
    successful: number
    failed: number
  }
  currentStep?: string
  estimatedTimeRemaining?: number
  createdAt: string
  completedAt?: string
  errors?: ImportError[]
  warnings?: string[]
  logs?: ImportLog[]
}

interface ImportError {
  type: 'validation' | 'database' | 'mapping' | 'reference' | 'system'
  severity: 'critical' | 'major' | 'minor' | 'warning'
  itemIndex?: number
  field?: string
  message: string
  suggestion?: string
}

interface ImportLog {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  details?: any
}

interface ProgressScreenProps {
  job: ImportJob
  onBack: () => void
  onRetry?: () => void
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
}

export const JSONImportProgressScreen: React.FC<ProgressScreenProps> = ({
  job,
  onBack,
  onRetry,
  onPause,
  onResume,
  onCancel
}) => {
  const [realTimeLogs, setRealTimeLogs] = useState<ImportLog[]>(job.logs || [])
  const [autoScroll, setAutoScroll] = useState(true)

  // Simulate real-time log updates (in real implementation, this would be WebSocket or polling)
  useEffect(() => {
    if (job.status === 'processing' || job.status === 'validating') {
      const interval = setInterval(() => {
        // Add simulated log entries
        const newLog: ImportLog = {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Traitement en cours... ${job.progress.processed}/${job.progress.total} éléments`,
          details: { processed: job.progress.processed, total: job.progress.total }
        }
        
        setRealTimeLogs(prev => [...prev, newLog].slice(-100)) // Keep last 100 logs
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [job.status, job.progress])

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (autoScroll) {
      const logsContainer = document.getElementById('logs-container')
      if (logsContainer) {
        logsContainer.scrollTop = logsContainer.scrollHeight
      }
    }
  }, [realTimeLogs, autoScroll])

  const getStatusInfo = (status: string) => {
    const statusConfig = {
      queued: { 
        color: 'bg-yellow-500', 
        text: 'En attente', 
        icon: '⏳',
        description: 'Import en file d\'attente'
      },
      processing: { 
        color: 'bg-blue-500', 
        text: 'Traitement', 
        icon: '⚙️',
        description: 'Import en cours de traitement'
      },
      validating: { 
        color: 'bg-purple-500', 
        text: 'Validation', 
        icon: '✅',
        description: 'Validation des données'
      },
      completed: { 
        color: 'bg-green-500', 
        text: 'Terminé', 
        icon: '🎉',
        description: 'Import terminé avec succès'
      },
      failed: { 
        color: 'bg-red-500', 
        text: 'Échec', 
        icon: '❌',
        description: 'Import échoué'
      },
      paused: { 
        color: 'bg-gray-500', 
        text: 'En pause', 
        icon: '⏸️',
        description: 'Import mis en pause'
      }
    }
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.queued
  }

  const getProgressPercentage = () => {
    if (job.progress.total === 0) return 0
    return Math.round((job.progress.processed / job.progress.total) * 100)
  }

  const getLogIcon = (level: string) => {
    const logIcons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    }
    return logIcons[level as keyof typeof logIcons] || 'ℹ️'
  }

  const getLogColor = (level: string) => {
    const logColors = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      success: '#10b981'
    }
    return logColors[level as keyof typeof logColors] || '#6b7280'
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const statusInfo = getStatusInfo(job.status)
  const progressPercentage = getProgressPercentage()
  const isActive = ['processing', 'validating'].includes(job.status)
  const isCompleted = job.status === 'completed'
  const isFailed = job.status === 'failed'
  const isPaused = job.status === 'paused'

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          color: 'var(--theme-text, #e5e5e5)',
          marginBottom: '8px'
        }}>
          ⏳ Progression de l'Import
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280',
          marginBottom: '24px'
        }}>
          Suivi en temps réel de l'import: {job.fileName}
        </p>
      </div>

      {/* Status Card */}
      <Card style={{ marginBottom: '24px' }}>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{statusInfo.icon}</span>
              Statut de l'Import
            </CardTitle>
            <Badge className={`${statusInfo.color} text-white`}>
              {statusInfo.text}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ marginBottom: '24px' }}>
            <p style={{ 
              color: 'var(--theme-text, #e5e5e5)', 
              fontSize: '16px',
              marginBottom: '8px'
            }}>
              {statusInfo.description}
            </p>
            
            {job.currentStep && (
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Étape actuelle: {job.currentStep}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ color: 'var(--theme-text, #e5e5e5)', fontWeight: '600' }}>
                Progression
              </span>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>
                {job.progress.processed} / {job.progress.total} ({progressPercentage}%)
              </span>
            </div>
            
            <div style={{
              width: '100%',
              backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
              borderRadius: '8px',
              overflow: 'hidden',
              height: '12px'
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                background: isFailed 
                  ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                  : isCompleted
                  ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                height: '100%',
                borderRadius: '8px',
                transition: 'width 0.5s ease',
                animation: isActive ? 'pulse 2s infinite' : 'none'
              }} />
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '16px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', color: '#10b981', fontWeight: '700' }}>
                {job.progress.successful}
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                ✅ Réussis
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', color: '#ef4444', fontWeight: '700' }}>
                {job.progress.failed}
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                ❌ Échecs
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', color: '#f59e0b', fontWeight: '700' }}>
                {job.progress.total - job.progress.processed}
              </div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                ⏳ Restants
              </div>
            </div>
            
            {job.estimatedTimeRemaining && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', color: '#3b82f6', fontWeight: '700' }}>
                  {formatDuration(job.estimatedTimeRemaining)}
                </div>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  ⏱️ Temps restant
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Control Buttons */}
      {isActive && (
        <Card style={{ marginBottom: '24px' }}>
          <CardContent style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {!isPaused && onPause && (
                <Button
                  onClick={onPause}
                  style={{
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  ⏸️ Mettre en pause
                </Button>
              )}
              
              {isPaused && onResume && (
                <Button
                  onClick={onResume}
                  style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  ▶️ Reprendre
                </Button>
              )}
              
              {onCancel && (
                <Button
                  onClick={onCancel}
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  ❌ Annuler
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Logs */}
      <Card style={{ marginBottom: '24px' }}>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardTitle>📋 Logs en Temps Réel</CardTitle>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                Auto-scroll
              </label>
              <Badge style={{ backgroundColor: '#6b7280' }}>
                {realTimeLogs.length} entrées
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            id="logs-container"
            style={{
              height: '300px',
              overflowY: 'auto',
              backgroundColor: 'var(--theme-elevation-50, #252525)',
              border: '1px solid var(--theme-elevation-150, #3a3a3a)',
              borderRadius: '8px',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '13px'
            }}
          >
            {realTimeLogs.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#6b7280',
                padding: '48px 0'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
                <p>Aucun log disponible</p>
              </div>
            ) : (
              realTimeLogs.map((log, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: '8px',
                    padding: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '4px',
                    borderLeft: `3px solid ${getLogColor(log.level)}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{getLogIcon(log.level)}</span>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>
                      {formatTime(log.timestamp)}
                    </span>
                    <span style={{ color: getLogColor(log.level), fontWeight: '600' }}>
                      {log.level.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ 
                    color: 'var(--theme-text, #e5e5e5)', 
                    marginTop: '4px',
                    marginLeft: '24px'
                  }}>
                    {log.message}
                  </div>
                  {log.details && (
                    <div style={{ 
                      color: '#6b7280', 
                      fontSize: '11px',
                      marginTop: '4px',
                      marginLeft: '24px'
                    }}>
                      {JSON.stringify(log.details, null, 2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Errors Summary */}
      {job.errors && job.errors.length > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <CardHeader>
            <CardTitle style={{ color: '#ef4444' }}>
              ❌ Erreurs Rencontrées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '12px' }}>
              {job.errors.slice(0, 10).map((error, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '6px'
                  }}
                >
                  <p style={{ color: '#ef4444', fontWeight: '600', marginBottom: '4px' }}>
                    {error.message}
                  </p>
                  {error.itemIndex !== undefined && (
                    <p style={{ color: '#6b7280', fontSize: '12px' }}>
                      Ligne {error.itemIndex + 1}
                    </p>
                  )}
                </div>
              ))}
              
              {job.errors.length > 10 && (
                <p style={{ color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                  ... et {job.errors.length - 10} autres erreurs
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'flex-end',
        paddingTop: '24px',
        borderTop: '1px solid var(--theme-elevation-150, #3a3a3a)'
      }}>
        <Button
          onClick={onBack}
          style={{
            backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
            color: 'var(--theme-text, #e5e5e5)',
            border: '1px solid var(--theme-elevation-150, #3a3a3a)'
          }}
        >
          ← Retour
        </Button>
        
        {isFailed && onRetry && (
          <Button
            onClick={onRetry}
            style={{
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none'
            }}
          >
            🔄 Réessayer
          </Button>
        )}
        
        {isCompleted && (
          <Button
            onClick={() => window.location.href = '/admin/collections/questions'}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none'
            }}
          >
            ✅ Voir les résultats
          </Button>
        )}
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}

export default JSONImportProgressScreen