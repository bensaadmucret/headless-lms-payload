"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  createdAt: string
  completedAt?: string
  createdBy?: {
    id: string
    email: string
    name?: string
  }
  errors?: ImportError[]
  warnings?: string[]
  summary?: {
    questionsCreated: number
    categoriesCreated: number
    flashcardsCreated: number
    pathsCreated: number
  }
}

interface ImportError {
  type: 'validation' | 'database' | 'mapping' | 'reference' | 'system'
  severity: 'critical' | 'major' | 'minor' | 'warning'
  message: string
}

interface HistoryFilters {
  status: string
  importType: string
  dateRange: string
  searchTerm: string
  createdBy: string
}

interface HistoryScreenProps {
  onBack: () => void
  onViewJob: (jobId: string) => void
  onRetryJob: (jobId: string) => void
  onDeleteJob: (jobId: string) => void
}

export const JSONImportHistoryScreen: React.FC<HistoryScreenProps> = ({
  onBack,
  onViewJob,
  onRetryJob,
  onDeleteJob
}) => {
  const [jobs, setJobs] = useState<ImportJob[]>([])
  const [filteredJobs, setFilteredJobs] = useState<ImportJob[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<HistoryFilters>({
    status: 'all',
    importType: 'all',
    dateRange: 'all',
    searchTerm: '',
    createdBy: 'all'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [sortBy, setSortBy] = useState<'createdAt' | 'fileName' | 'status'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Load import history
  useEffect(() => {
    loadImportHistory()
  }, [])

  // Apply filters
  useEffect(() => {
    applyFilters()
  }, [jobs, filters, sortBy, sortOrder])

  const loadImportHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/json-import/history', {
        credentials: 'include'
      })
      const data = await response.json()
      setJobs(data.jobs || [])
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...jobs]

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(job => job.status === filters.status)
    }

    // Import type filter
    if (filters.importType !== 'all') {
      filtered = filtered.filter(job => job.importType === filters.importType)
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
      }
      
      if (filters.dateRange !== 'all') {
        filtered = filtered.filter(job => new Date(job.createdAt) >= filterDate)
      }
    }

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(job => 
        job.fileName.toLowerCase().includes(searchLower) ||
        job.createdBy?.email.toLowerCase().includes(searchLower) ||
        job.createdBy?.name?.toLowerCase().includes(searchLower)
      )
    }

    // Created by filter
    if (filters.createdBy !== 'all') {
      filtered = filtered.filter(job => job.createdBy?.id === filters.createdBy)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        case 'fileName':
          aValue = a.fileName.toLowerCase()
          bValue = b.fileName.toLowerCase()
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        default:
          aValue = a.createdAt
          bValue = b.createdAt
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredJobs(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      queued: { color: 'bg-yellow-500', text: 'En attente', icon: '⏳' },
      processing: { color: 'bg-blue-500', text: 'Traitement', icon: '⚙️' },
      validating: { color: 'bg-purple-500', text: 'Validation', icon: '✅' },
      preview: { color: 'bg-orange-500', text: 'Aperçu', icon: '👁️' },
      completed: { color: 'bg-green-500', text: 'Terminé', icon: '🎉' },
      failed: { color: 'bg-red-500', text: 'Échec', icon: '❌' },
      paused: { color: 'bg-gray-500', text: 'En pause', icon: '⏸️' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.queued
    return (
      <Badge className={`${config.color} text-white`}>
        {config.icon} {config.text}
      </Badge>
    )
  }

  const getTypeIcon = (type: string) => {
    const typeIcons = {
      questions: '❓',
      flashcards: '🃏',
      'learning-paths': '🛤️',
      csv: '📊',
      quizzes: '📝'
    }
    return typeIcons[type as keyof typeof typeIcons] || '📄'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (startDate: string, endDate?: string) => {
    if (!endDate) return 'En cours...'
    
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const duration = Math.round((end - start) / 1000)
    
    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.round(duration / 60)}m`
    return `${Math.round(duration / 3600)}h`
  }

  const getUniqueUsers = () => {
    const users = jobs
      .filter(job => job.createdBy)
      .map(job => job.createdBy!)
      .filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      )
    return users
  }

  const exportHistory = async () => {
    try {
      const response = await fetch('/api/json-import/export-history', {
        credentials: 'include'
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `import-history-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  // Pagination
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentJobs = filteredJobs.slice(startIndex, endIndex)

  const uniqueUsers = getUniqueUsers()

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          color: 'var(--theme-text, #e5e5e5)',
          marginBottom: '8px'
        }}>
          📋 Historique des Imports
        </h1>
        <p style={{ 
          fontSize: '16px', 
          color: '#6b7280',
          marginBottom: '24px'
        }}>
          Consultez et gérez l'historique de tous vos imports
        </p>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <CardHeader>
          <CardTitle>🔍 Filtres et Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px',
            marginBottom: '16px'
          }}>
            {/* Search */}
            <div>
              <Label>Recherche</Label>
              <Input
                placeholder="Nom de fichier, utilisateur..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
            </div>

            {/* Status Filter */}
            <div>
              <Label>Statut</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="completed">✅ Terminé</SelectItem>
                  <SelectItem value="failed">❌ Échec</SelectItem>
                  <SelectItem value="processing">⚙️ En cours</SelectItem>
                  <SelectItem value="queued">⏳ En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type Filter */}
            <div>
              <Label>Type d'import</Label>
              <Select value={filters.importType} onValueChange={(value) => setFilters(prev => ({ ...prev, importType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="questions">❓ Questions</SelectItem>
                  <SelectItem value="flashcards">🃏 Flashcards</SelectItem>
                  <SelectItem value="learning-paths">🛤️ Parcours</SelectItem>
                  <SelectItem value="csv">📊 CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div>
              <Label>Période</Label>
              <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            {uniqueUsers.length > 1 && (
              <div>
                <Label>Utilisateur</Label>
                <Select value={filters.createdBy} onValueChange={(value) => setFilters(prev => ({ ...prev, createdBy: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    {uniqueUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Sort and Export */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Label>Trier par:</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger style={{ width: '150px' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">📅 Date</SelectItem>
                  <SelectItem value="fileName">📄 Nom</SelectItem>
                  <SelectItem value="status">📊 Statut</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                style={{
                  backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
                  color: 'var(--theme-text, #e5e5e5)',
                  border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                  padding: '8px 12px'
                }}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
            
            <Button
              onClick={exportHistory}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none'
              }}
            >
              📥 Exporter CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <p style={{ color: '#6b7280' }}>
          {filteredJobs.length} résultat(s) trouvé(s) sur {jobs.length} import(s) total
        </p>
        
        {filteredJobs.length > itemsPerPage && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
                color: 'var(--theme-text, #e5e5e5)',
                border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                padding: '4px 8px'
              }}
            >
              ←
            </Button>
            
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              Page {currentPage} sur {totalPages}
            </span>
            
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
                color: 'var(--theme-text, #e5e5e5)',
                border: '1px solid var(--theme-elevation-150, #3a3a3a)',
                padding: '4px 8px'
              }}
            >
              →
            </Button>
          </div>
        )}
      </div>

      {/* Jobs List */}
      {loading ? (
        <Card>
          <CardContent style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
            <p style={{ color: '#6b7280' }}>Chargement de l'historique...</p>
          </CardContent>
        </Card>
      ) : currentJobs.length === 0 ? (
        <Card>
          <CardContent style={{ padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <p style={{ color: '#6b7280', marginBottom: '8px' }}>
              Aucun import trouvé
            </p>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              {filters.searchTerm || filters.status !== 'all' || filters.importType !== 'all' 
                ? 'Essayez de modifier vos filtres'
                : 'Commencez par importer votre premier fichier'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {currentJobs.map((job) => (
            <Card key={job.id}>
              <CardContent style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Job Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{getTypeIcon(job.importType)}</span>
                      <h3 style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: 'var(--theme-text, #e5e5e5)',
                        margin: 0
                      }}>
                        {job.fileName}
                      </h3>
                      {getStatusBadge(job.status)}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                        📅 {formatDate(job.createdAt)}
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                        ⏱️ {formatDuration(job.createdAt, job.completedAt)}
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                        👤 {job.createdBy?.name || job.createdBy?.email || 'Inconnu'}
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                        📊 {job.progress.processed}/{job.progress.total} éléments
                      </p>
                    </div>

                    {/* Progress Bar */}
                    {job.progress.total > 0 && (
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{
                          width: '100%',
                          backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          height: '6px'
                        }}>
                          <div style={{
                            width: `${(job.progress.processed / job.progress.total) * 100}%`,
                            background: job.status === 'failed' 
                              ? '#ef4444'
                              : job.status === 'completed'
                              ? '#10b981'
                              : '#667eea',
                            height: '100%',
                            borderRadius: '4px'
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {job.summary && (
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                        {job.summary.questionsCreated > 0 && (
                          <span style={{ color: '#10b981' }}>
                            ✅ {job.summary.questionsCreated} questions
                          </span>
                        )}
                        {job.summary.flashcardsCreated > 0 && (
                          <span style={{ color: '#10b981' }}>
                            ✅ {job.summary.flashcardsCreated} flashcards
                          </span>
                        )}
                        {job.summary.categoriesCreated > 0 && (
                          <span style={{ color: '#f59e0b' }}>
                            ➕ {job.summary.categoriesCreated} catégories
                          </span>
                        )}
                        {job.errors && job.errors.length > 0 && (
                          <span style={{ color: '#ef4444' }}>
                            ❌ {job.errors.length} erreurs
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    <Button
                      onClick={() => onViewJob(job.id)}
                      style={{
                        backgroundColor: '#667eea',
                        color: 'white',
                        border: 'none',
                        fontSize: '12px',
                        padding: '6px 12px'
                      }}
                    >
                      👁️ Voir
                    </Button>
                    
                    {job.status === 'failed' && (
                      <Button
                        onClick={() => onRetryJob(job.id)}
                        style={{
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          fontSize: '12px',
                          padding: '6px 12px'
                        }}
                      >
                        🔄 Retry
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => onDeleteJob(job.id)}
                      style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        fontSize: '12px',
                        padding: '6px 12px'
                      }}
                    >
                      🗑️ Suppr.
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Back Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-start',
        paddingTop: '24px',
        borderTop: '1px solid var(--theme-elevation-150, #3a3a3a)',
        marginTop: '24px'
      }}>
        <Button
          onClick={onBack}
          style={{
            backgroundColor: 'var(--theme-elevation-100, #2a2a2a)',
            color: 'var(--theme-text, #e5e5e5)',
            border: '1px solid var(--theme-elevation-150, #3a3a3a)'
          }}
        >
          ← Retour à l'import
        </Button>
      </div>
    </div>
  )
}

export default JSONImportHistoryScreen