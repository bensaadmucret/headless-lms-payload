"use client"
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface LivePreviewProps {
  jobId: string
  onStatusChange?: (status: string) => void
  refreshInterval?: number
}

interface JobStatus {
  id: string
  status: string
  progress: {
    total: number
    processed: number
    successful: number
    failed: number
  }
  currentStep?: string
  logs?: Array<{
    timestamp: string
    level: 'info' | 'warning' | 'error' | 'success'
    message: string
  }>
  errors?: Array<{
    message: string
    itemIndex?: number
  }>
}

export const JSONImportLivePreview: React.FC<LivePreviewProps> = ({
  jobId,
  onStatusChange,
  refreshInterval = 2000
}) => {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    if (!jobId) return

    let intervalId: NodeJS.Timeout
    let isActive = true

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/json-import/status/${jobId}`, {
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const status = await response.json()
        
        if (isActive) {
          setJobStatus(status)
          setIsConnected(true)
          setLastUpdate(new Date())
          
          if (onStatusChange && status.status !== jobStatus?.status) {
            onStatusChange(status.status)
          }
          
          // Stop polling if job is completed or failed
          if (['completed', 'failed'].includes(status.status)) {
            clearInterval(intervalId)
          }
        }
      } catch (error) {
        console.error('Failed to fetch job status:', error)
        if (isActive) {
          setIsConnected(false)
        }
      }
    }

    // Initial fetch
    fetchStatus()

    // Set up polling
    intervalId = setInterval(fetchStatus, refreshInterval)

    return () => {
      isActive = false
      clearInterval(intervalId)
    }
  }, [jobId, refreshInterval, onStatusChange])

  if (!jobStatus) {
    return (
      <Card>
        <CardContent style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          <p style={{ color: '#6b7280' }}>Connexion au suivi en temps réel...</p>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    const colors = {
      queued: '#f59e0b',
      processing: '#3b82f6',
      validating: '#8b5cf6',
      completed: '#10b981',
      failed: '#ef4444',
      paused: '#6b7280'
    }
    return colors[status as keyof typeof colors] || '#6b7280'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      queued: '⏳',
      processing: '⚙️',
      validating: '✅',
      completed: '🎉',
      failed: '❌',
      paused: '⏸️'
    }
    return icons[status as keyof typeof icons] || '❓'
  }

  const progressPercentage = jobStatus.progress.total > 0 
    ? Math.round((jobStatus.progress.processed / jobStatus.progress.total) * 100)
    : 0

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* Connection Status */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}`,
        borderRadius: '6px',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%',
            backgroundColor: isConnected ? '#10b981' : '#ef4444'
          }} />
          <span style={{ color: isConnected ? '#10b981' : '#ef4444', fontWeight: '600' }}>
            {isConnected ? 'Connecté' : 'Déconnecté'}
          </span>
        </div>
        {lastUpdate && (
          <span style={{ color: '#6b7280' }}>
            Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
          </span>
        )}
      </div>

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>{getStatusIcon(jobStatus.status)}</span>
              Statut en Temps Réel
            </CardTitle>
            <Badge style={{ backgroundColor: getStatusColor(jobStatus.status) }}>
              {jobStatus.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {jobStatus.currentStep && (
            <p style={{ 
              color: 'var(--theme-text, #e5e5e5)', 
              marginBottom: '12px',
              fontSize: '14px'
            }}>
              📍 {jobStatus.currentStep}
            </p>
          )}

          {/* Progress Bar */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <span style={{ color: 'var(--theme-text, #e5e5e5)', fontSize: '14px', fontWeight: '600' }}>
                Progression
              </span>
              <span style={{ color: '#6b7280', fontSize: '12px' }}>
                {jobStatus.progress.processed} / {jobStatus.progress.total} ({progressPercentage}%)
              </span>
            </div>
            
            <div style={{
              width: '100%',
              backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
              borderRadius: '6px',
              overflow: 'hidden',
              height: '8px'
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                background: jobStatus.status === 'failed' 
                  ? '#ef4444'
                  : jobStatus.status === 'completed'
                  ? '#10b981'
                  : '#3b82f6',
                height: '100%',
                borderRadius: '6px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '12px',
            fontSize: '12px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', color: '#10b981', fontWeight: '700' }}>
                {jobStatus.progress.successful}
              </div>
              <div style={{ color: '#6b7280' }}>Réussis</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', color: '#ef4444', fontWeight: '700' }}>
                {jobStatus.progress.failed}
              </div>
              <div style={{ color: '#6b7280' }}>Échecs</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', color: '#f59e0b', fontWeight: '700' }}>
                {jobStatus.progress.total - jobStatus.progress.processed}
              </div>
              <div style={{ color: '#6b7280' }}>Restants</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      {jobStatus.logs && jobStatus.logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: '16px' }}>📋 Logs Récents</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              display: 'grid',
              gap: '8px'
            }}>
              {jobStatus.logs.slice(-5).map((log, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--theme-elevation-50, #252525)',
                    borderRadius: '4px',
                    borderLeft: `3px solid ${
                      log.level === 'error' ? '#ef4444' :
                      log.level === 'warning' ? '#f59e0b' :
                      log.level === 'success' ? '#10b981' :
                      '#3b82f6'
                    }`,
                    fontSize: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span>
                      {log.level === 'error' ? '❌' :
                       log.level === 'warning' ? '⚠️' :
                       log.level === 'success' ? '✅' :
                       'ℹ️'}
                    </span>
                    <span style={{ color: '#6b7280' }}>
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                  <div style={{ color: 'var(--theme-text, #e5e5e5)' }}>
                    {log.message}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Errors */}
      {jobStatus.errors && jobStatus.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: '16px', color: '#ef4444' }}>
              ❌ Erreurs Récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '8px' }}>
              {jobStatus.errors.slice(-3).map((error, index) => (
                <div
                  key={index}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ color: '#ef4444', fontWeight: '600', marginBottom: '2px' }}>
                    {error.message}
                  </div>
                  {error.itemIndex !== undefined && (
                    <div style={{ color: '#6b7280' }}>
                      Ligne {error.itemIndex + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default JSONImportLivePreview