'use client';
// Version: 2025-10-16-21:16 - Fixed authentication
import React, { useState, useEffect } from 'react';

interface GenerationLog {
  id: string;
  user: {
    id: string;
    email: string;
  };
  action: string;
  status: string;
  generationConfig?: {
    subject?: string;
    categoryName?: string;
    studentLevel?: string;
    questionCount?: number;
    difficulty?: string;
  };
  result?: {
    quizId?: string;
    questionsCreated?: number;
    validationScore?: number;
  };
  error?: {
    type?: string;
    message?: string;
  };
  performance?: {
    duration?: number;
    retryCount?: number;
  };
  createdAt: string;
  completedAt?: string;
}

interface GenerationMetrics {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  successRate: number;
  averageDuration: number;
  averageValidationScore: number;
  totalQuestionsGenerated: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  byErrorType: Record<string, number>;
}

const GenerationLogsViewer: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [metrics, setMetrics] = useState<GenerationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('day');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          // L'API peut retourner soit { user: {...} } soit directement l'objet user
          const userData = data.user || data;
          
          if (userData && userData.id) {
            setUser(userData);
          } else {
            console.warn('User data missing');
            setLoading(false);
          }
        } else {
          console.error('Failed to fetch user, status:', response.status);
          setLoading(false);
        }
      } catch (err) {
        console.error('Erreur récupération utilisateur:', err);
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && (user.role === 'superadmin' || user.role === 'admin')) {
      fetchData();
    } else if (user && user.role !== 'superadmin' && user.role !== 'admin') {
      setLoading(false);
    }
  }, [user, timeframe, statusFilter, actionFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch logs
      const logsParams = new URLSearchParams({
        limit: '50',
        sort: '-createdAt',
      });
      
      if (statusFilter !== 'all') {
        logsParams.append('where[status][equals]', statusFilter);
      }
      
      if (actionFilter !== 'all') {
        logsParams.append('where[action][equals]', actionFilter);
      }

      const logsResponse = await fetch(`/api/generationlogs?${logsParams}`);
      const logsData = await logsResponse.json();
      
      if (logsData.docs) {
        setLogs(logsData.docs);
      }

      // Fetch metrics (this would need a custom endpoint)
      const metricsResponse = await fetch(`/api/generation-metrics?timeframe=${timeframe}`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error('Erreur fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (actionFilter !== 'all') params.append('action', actionFilter);
      
      const response = await fetch(`/api/export-generation-logs?${params}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generation-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Erreur lors de l\'export CSV');
      }
    } catch (err) {
      console.error('Erreur export CSV:', err);
      alert('Erreur lors de l\'export CSV');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'started': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'ai_quiz_generation': 'Génération Quiz IA',
      'ai_questions_generation': 'Génération Questions IA',
      'ai_content_validation': 'Validation Contenu IA',
      'auto_quiz_creation': 'Création Quiz Auto',
      'generation_retry': 'Retry Génération',
      'generation_failure': 'Échec Génération',
    };
    return labels[action] || action;
  };

  if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Accès non autorisé. Seuls les administrateurs peuvent consulter les logs de génération.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Logs de Génération IA</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exporter CSV
          </button>
          <button 
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Période
          </label>
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="day">Dernières 24h</option>
            <option value="week">Dernière semaine</option>
            <option value="month">Dernier mois</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statut
          </label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">Tous</option>
            <option value="success">Succès</option>
            <option value="failed">Échec</option>
            <option value="in_progress">En cours</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Action
          </label>
          <select 
            value={actionFilter} 
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">Toutes</option>
            <option value="ai_quiz_generation">Génération Quiz</option>
            <option value="ai_questions_generation">Génération Questions</option>
            <option value="auto_quiz_creation">Création Auto</option>
          </select>
        </div>
      </div>

      {/* Métriques */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-500">Total Générations</h3>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalGenerations || 0}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-500">Taux de Succès</h3>
              <p className="text-2xl font-bold text-green-600">
                {metrics.successRate != null ? metrics.successRate.toFixed(1) : '0.0'}%
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-500">Durée Moyenne</h3>
              <p className="text-2xl font-bold text-blue-600">{formatDuration(metrics.averageDuration)}</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg border">
              <h3 className="text-sm font-medium text-gray-500">Questions Générées</h3>
              <p className="text-2xl font-bold text-purple-600">{metrics.totalQuestionsGenerated || 0}</p>
            </div>
          </div>

          {/* Graphiques de performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Graphique par action */}
            {metrics.byAction && Object.keys(metrics.byAction).length > 0 && (
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Répartition par Action</h3>
                <div className="space-y-3">
                  {Object.entries(metrics.byAction).map(([action, count]) => {
                    const total = metrics.totalGenerations || 1;
                    const percentage = ((count as number) / total) * 100;
                    return (
                      <div key={action}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{getActionLabel(action)}</span>
                          <span className="font-medium">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Graphique par statut */}
            {metrics.byStatus && Object.keys(metrics.byStatus).length > 0 && (
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Répartition par Statut</h3>
                <div className="space-y-3">
                  {Object.entries(metrics.byStatus).map(([status, count]) => {
                    const total = metrics.totalGenerations || 1;
                    const percentage = ((count as number) / total) * 100;
                    const color = status === 'success' ? 'bg-green-600' : 
                                 status === 'failed' ? 'bg-red-600' : 
                                 status === 'in_progress' ? 'bg-blue-600' : 'bg-gray-600';
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 capitalize">{status}</span>
                          <span className="font-medium">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`${color} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Graphique des erreurs */}
          {metrics.byErrorType && Object.keys(metrics.byErrorType).length > 0 && (
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Types d'Erreurs</h3>
              <div className="space-y-3">
                {Object.entries(metrics.byErrorType).map(([errorType, count]) => {
                  const totalErrors = Object.values(metrics.byErrorType).reduce((a: number, b: any) => a + (b as number), 0);
                  const percentage = ((count as number) / totalErrors) * 100;
                  return (
                    <div key={errorType}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{errorType}</span>
                        <span className="font-medium text-red-600">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Liste des logs */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Historique des Générations</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Heure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Configuration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Résultat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durée
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.createdAt)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.user?.email || 'N/A'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getActionLabel(log.action)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.generationConfig && (
                      <div className="space-y-1">
                        {log.generationConfig.subject && (
                          <div><span className="font-medium">Sujet:</span> {log.generationConfig.subject}</div>
                        )}
                        {log.generationConfig.categoryName && (
                          <div><span className="font-medium">Catégorie:</span> {log.generationConfig.categoryName}</div>
                        )}
                        {log.generationConfig.questionCount && (
                          <div><span className="font-medium">Questions:</span> {log.generationConfig.questionCount}</div>
                        )}
                        {log.generationConfig.studentLevel && (
                          <div><span className="font-medium">Niveau:</span> {log.generationConfig.studentLevel}</div>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.result && (
                      <div className="space-y-1">
                        {log.result.questionsCreated && (
                          <div><span className="font-medium">Questions:</span> {log.result.questionsCreated}</div>
                        )}
                        {log.result.validationScore && (
                          <div><span className="font-medium">Score:</span> {log.result.validationScore}/100</div>
                        )}
                        {log.result.quizId && (
                          <div><span className="font-medium">Quiz ID:</span> {log.result.quizId}</div>
                        )}
                      </div>
                    )}
                    {log.error && (
                      <div className="text-red-600">
                        <div><span className="font-medium">Erreur:</span> {log.error.type}</div>
                        {log.error.message && (
                          <div className="text-xs">{log.error.message}</div>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {formatDuration(log.performance?.duration)}
                    </div>
                    {log.performance?.retryCount && log.performance.retryCount > 1 && (
                      <div className="text-xs text-gray-500">
                        {log.performance.retryCount} tentatives
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {logs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucun log de génération trouvé pour les critères sélectionnés.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationLogsViewer;