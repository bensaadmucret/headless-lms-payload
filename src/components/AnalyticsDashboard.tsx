import React, { useState, useEffect } from 'react';
import { usePayloadAPI } from 'payload/components/hooks';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AnalyticsDashboardProps {
  className?: string;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  color: string;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }>;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = '' }) => {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [selectedFunnel, setSelectedFunnel] = useState<string>('subscription');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Récupérer les données d'analytics
  const [{ data: eventsData, isLoading: eventsLoading }] = usePayloadAPI(
    '/api/analytics-events',
    {
      qs: {
        where: {
          timestamp: {
            greater_than_equal: dateRange.start.toISOString(),
            less_than_equal: dateRange.end.toISOString(),
          },
        },
        limit: 1000,
        sort: '-timestamp',
      },
    }
  );

  const [{ data: sessionsData, isLoading: sessionsLoading }] = usePayloadAPI(
    '/api/analytics-sessions',
    {
      qs: {
        where: {
          startTime: {
            greater_than_equal: dateRange.start.toISOString(),
            less_than_equal: dateRange.end.toISOString(),
          },
        },
        limit: 500,
        sort: '-startTime',
      },
    }
  );

  useEffect(() => {
    if (!eventsLoading && !sessionsLoading && eventsData && sessionsData) {
      processAnalyticsData();
    }
  }, [eventsData, sessionsData, eventsLoading, sessionsLoading]);

  const processAnalyticsData = () => {
    const events = eventsData?.docs || [];
    const sessions = sessionsData?.docs || [];

    // Calculer les métriques principales
    const totalEvents = events.length;
    const uniqueSessions = sessions.length;
    const conversionEvents = events.filter((e: any) =>
      e.properties?.conversion === true
    );
    const conversionRate = totalEvents > 0 ? (conversionEvents.length / totalEvents) * 100 : 0;

    // Analyser le tunnel de conversion
    const funnelData = analyzeFunnel(events);

    // Analyse par appareil
    const deviceAnalysis = analyzeDeviceUsage(events);

    // Analyse des campagnes
    const campaignAnalysis = analyzeCampaigns(events);

    setAnalyticsData({
      overview: {
        totalEvents,
        uniqueSessions,
        conversionRate: conversionRate.toFixed(2),
        avgSessionDuration: calculateAvgSessionDuration(sessions),
      },
      funnelData,
      deviceAnalysis,
      campaignAnalysis,
      events,
      sessions,
    });

    setLoading(false);
  };

  const analyzeFunnel = (events: any[]) => {
    const funnelSteps = [
      'homepage_view',
      'subscription_started',
      'account_created',
      'payment_initiated',
      'payment_completed',
    ];

    const stepCounts = funnelSteps.map(step =>
      events.filter((e: any) => e.eventName === step).length
    );

    const conversionRates = stepCounts.map((count, index) => {
      if (index === 0) return 100;
      const prevCount = stepCounts[index - 1];
      return prevCount > 0 ? (count / prevCount) * 100 : 0;
    });

    return {
      steps: funnelSteps,
      counts: stepCounts,
      conversionRates,
    };
  };

  const analyzeDeviceUsage = (events: any[]) => {
    const deviceCounts: Record<string, number> = {};

    events.forEach((event: any) => {
      if (event.device?.type) {
        deviceCounts[event.device.type] = (deviceCounts[event.device.type] || 0) + 1;
      }
    });

    return Object.entries(deviceCounts).map(([device, count]) => ({
      device,
      count,
      percentage: ((count / events.length) * 100).toFixed(1),
    }));
  };

  const analyzeCampaigns = (events: any[]) => {
    const campaignCounts: Record<string, number> = {};

    events.forEach((event: any) => {
      const campaign = event.campaign?.utm_campaign || 'direct';
      campaignCounts[campaign] = (campaignCounts[campaign] || 0) + 1;
    });

    return Object.entries(campaignCounts)
      .map(([campaign, count]) => ({
        campaign,
        count,
        percentage: ((count / events.length) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
  };

  const calculateAvgSessionDuration = (sessions: any[]): string => {
    if (sessions.length === 0) return '0 min';

    const totalDuration = sessions.reduce((sum, session) => {
      return sum + (session.duration || 0);
    }, 0);

    const avgSeconds = totalDuration / sessions.length;
    const minutes = Math.floor(avgSeconds / 60);
    const seconds = Math.round(avgSeconds % 60);

    return `${minutes} min ${seconds} s`;
  };

  const handleDateRangeChange = (range: string) => {
    const end = new Date();
    let start: Date;

    switch (range) {
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '90d':
        start = subDays(end, 90);
        break;
      default:
        start = subDays(end, 30);
    }

    setDateRange({ start, end });
  };

  const MetricCard: React.FC<MetricCard> = ({ title, value, change, icon, color }) => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {change !== undefined && (
            <p className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '↗' : '↘'} {Math.abs(change)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* En-tête avec contrôles */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Analytics</h1>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedFunnel}
              onChange={(e) => setSelectedFunnel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="subscription">Tunnel d'abonnement</option>
              <option value="onboarding">Tunnel d'onboarding</option>
              <option value="checkout">Tunnel de paiement</option>
            </select>

            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              {['7d', '30d', '90d'].map((range) => (
                <button
                  key={range}
                  onClick={() => handleDateRangeChange(range)}
                  className={`px-3 py-2 text-sm font-medium ${
                    (range === '7d' && dateRange.start.getTime() === subDays(new Date(), 7).getTime()) ||
                    (range === '30d' && dateRange.start.getTime() === subDays(new Date(), 30).getTime()) ||
                    (range === '90d' && dateRange.start.getTime() === subDays(new Date(), 90).getTime())
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {range === '7d' ? '7 jours' : range === '30d' ? '30 jours' : '90 jours'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Période: {format(dateRange.start, 'dd MMM yyyy', { locale: fr })} - {format(dateRange.end, 'dd MMM yyyy', { locale: fr })}
        </div>
      </div>

      {/* Cartes de métriques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Événements totaux"
          value={analyticsData?.overview.totalEvents || 0}
          icon="📊"
          color="bg-blue-100"
        />
        <MetricCard
          title="Sessions uniques"
          value={analyticsData?.overview.uniqueSessions || 0}
          icon="👥"
          color="bg-green-100"
        />
        <MetricCard
          title="Taux de conversion"
          value={`${analyticsData?.overview.conversionRate || 0}%`}
          icon="🎯"
          color="bg-purple-100"
        />
        <MetricCard
          title="Durée moyenne"
          value={analyticsData?.overview.avgSessionDuration || '0 min'}
          icon="⏱️"
          color="bg-orange-100"
        />
      </div>

      {/* Tunnel de conversion */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tunnel de Conversion</h2>

        <div className="space-y-4">
          {analyticsData?.funnelData?.steps?.map((step: string, index: number) => {
            const count = analyticsData.funnelData.counts[index] || 0;
            const conversionRate = analyticsData.funnelData.conversionRates[index] || 0;

            return (
              <div key={step} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {step.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {count} événements
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {conversionRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">
                    taux de conversion
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Répartition par appareil */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Répartition par appareil</h2>

          <div className="space-y-3">
            {analyticsData?.deviceAnalysis?.map((device: any) => (
              <div key={device.device} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">
                    {device.device === 'mobile' ? '📱' : device.device === 'desktop' ? '🖥️' : '📟'}
                  </span>
                  <span className="font-medium text-gray-900">
                    {device.device === 'mobile' ? 'Mobile' : device.device === 'desktop' ? 'Desktop' : 'Tablette'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${device.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12">
                    {device.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance des campagnes</h2>

          <div className="space-y-3">
            {analyticsData?.campaignAnalysis?.slice(0, 5).map((campaign: any) => (
              <div key={campaign.campaign} className="flex items-center justify-between">
                <div className="font-medium text-gray-900">
                  {campaign.campaign === 'direct' ? 'Direct' : campaign.campaign}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {campaign.count} événements
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {campaign.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Événements récents */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Événements récents</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Événement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analyticsData?.events?.slice(0, 10).map((event: any) => (
                <tr key={event.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {event.eventName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.user ? `${event.user.firstname} ${event.user.lastname}` : 'Anonyme'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.device?.type || 'Inconnu'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(event.timestamp), 'dd MMM HH:mm', { locale: fr })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
