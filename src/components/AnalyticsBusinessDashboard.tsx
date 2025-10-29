"use client";

import React, { useState, useEffect } from "react";
import { useConfig } from "@payloadcms/ui";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
// Note: recharts doit être installé avec: npm install recharts
// Pour l'instant, on utilise des composants de base

interface AnalyticsBusinessDashboardProps {
  className?: string;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface AnalyticsResponse {
  docs: any[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

const AnalyticsBusinessDashboard: React.FC<AnalyticsBusinessDashboardProps> = ({
  className = "",
}) => {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [loading, setLoading] = useState(true);

  interface AnalyticsEvent {
    id: string;
    eventName: string;
    timestamp: string;
    properties?: Record<string, any>;
    campaign?: Record<string, any>;
    device?: Record<string, any>;
    funnel?: Record<string, any>;
    performance?: Record<string, any>;
    user?: any;
    sessionId?: string;
    url?: string;
    userAgent?: string;
    referrer?: string;
    source?: string;
  }

  interface SessionData {
    id: string;
    sessionId: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    pageViews: number;
    landingPage: string;
    referrer?: string;
    deviceInfo?: {
      type: string;
      os: string;
      browser: string;
      screenResolution: string;
    };
    user?: any;
    eventCount?: number;
    conversionGoals?: any;
    lastActivity?: string;
  }

  interface FunnelMetric {
    step: string;
    count: number;
    conversionRate: number;
    dropOffRate: number;
  }

  interface RevenueMetric {
    source: string;
    revenue: number;
    conversions: number;
    avgOrderValue: number;
  }

  interface DeviceMetric {
    device: string;
    sessions: number;
    conversionRate: number;
    revenue: number;
  }

  interface KPIs {
    totalEvents: number;
    uniqueSessions: number;
    conversionRate: string;
    totalRevenue: number;
    avgSessionDuration: string;
    eventsPerSession: string;
    pageViews: number;
  }

  interface Overview {
    totalEvents: number;
    uniqueSessions: number;
    conversionRate: string;
    totalRevenue: number;
    pageViews: number;
  }

  const [metrics, setMetrics] = useState<{
    overview: Overview;
    funnel: FunnelMetric[];
    revenue: RevenueMetric[];
    device: DeviceMetric[];
    kpis: KPIs;
    events: AnalyticsEvent[];
    sessions: SessionData[];
  } | null>(null);

  // Configuration et hooks
  const { config } = useConfig();
  const [eventsData, setEventsData] = useState<AnalyticsResponse | null>(null);
  const [sessionsData, setSessionsData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true);

        // Fetch events
        const eventsResponse = await fetch(
          `${config.serverURL}/api/analytics-events?where[timestamp][greater_than_equal]=${dateRange.start.toISOString()}&where[timestamp][less_than_equal]=${dateRange.end.toISOString()}&limit=1000&sort=-timestamp`
        );
        const eventsResult = await eventsResponse.json();
        setEventsData(eventsResult);

        // Fetch sessions
        const sessionsResponse = await fetch(
          `${config.serverURL}/api/analytics-sessions?where[startTime][greater_than_equal]=${dateRange.start.toISOString()}&where[startTime][less_than_equal]=${dateRange.end.toISOString()}&limit=500&sort=-startTime`
        );
        const sessionsResult = await sessionsResponse.json();
        setSessionsData(sessionsResult);

      } catch (error) {
        console.error('Erreur lors de la récupération des données analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [config.serverURL, dateRange]);

  // Process data when loaded
  useEffect(() => {
    if (!isLoading && eventsData && sessionsData) {
      processBusinessMetrics();
    }
  }, [eventsData, sessionsData]);

  const processBusinessMetrics = (): void => {
    if (!eventsData || !sessionsData) return;

    const events = (eventsData?.docs as AnalyticsEvent[]) || [];
    const sessions = (sessionsData?.docs as SessionData[]) || [];

    // Calculate funnel metrics
    const funnelMetrics = calculateFunnelMetrics(events);

    // Calculate revenue metrics
    const revenueMetrics = calculateRevenueMetrics(events);

    // Calculate device metrics
    const deviceMetrics = calculateDeviceMetrics(events, sessions);

    // Calculate key performance indicators
    const kpis = calculateKPIs(events, sessions);

    setMetrics({
      overview: {
        totalEvents: kpis.totalEvents,
        uniqueSessions: kpis.uniqueSessions,
        conversionRate: kpis.conversionRate,
        totalRevenue: kpis.totalRevenue,
        pageViews: kpis.pageViews,
      },
      funnel: funnelMetrics,
      revenue: revenueMetrics,
      device: deviceMetrics,
      kpis,
      events,
      sessions,
    });

    setLoading(false);
  };

  const calculateFunnelMetrics = (events: AnalyticsEvent[]): FunnelMetric[] => {
    const funnelSteps = [
      "homepage_view",
      "subscription_started",
      "account_created",
      "payment_initiated",
      "payment_completed",
      "subscription_success",
    ];

    const stepCounts = funnelSteps.map(
      (step) => events.filter((e) => e.eventName === step).length,
    );

    return funnelSteps.map((step, index) => {
      const count = stepCounts[index] || 0;
      const previousCount = index > 0 ? (stepCounts[index - 1] || 0) : count;
      const conversionRate =
        previousCount > 0 ? (count / previousCount) * 100 : 100;
      const dropOffRate =
        previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0;

      return {
        step: step.replace(/_/g, " ").toUpperCase(),
        count,
        conversionRate,
        dropOffRate,
      };
    });
  };

  const calculateRevenueMetrics = (
    events: AnalyticsEvent[],
  ): RevenueMetric[] => {
    // Get conversion events with value
    const conversionEvents = events.filter(
      (e) =>
        e.eventName === "subscription_success" &&
        e.properties?.conversionValue &&
        e.properties.conversionValue > 0,
    );

    // Group by campaign/source
    const revenueBySource: Record<
      string,
      { revenue: number; conversions: number }
    > = {};

    conversionEvents.forEach((event) => {
      const source =
        event.campaign?.utm_campaign || event.campaign?.utm_source || "Direct";
      const value = event.properties?.conversionValue || 0;

      if (!revenueBySource[source]) {
        revenueBySource[source] = { revenue: 0, conversions: 0 };
      }

      revenueBySource[source].revenue += value;
      revenueBySource[source].conversions += 1;
    });

    return Object.entries(revenueBySource).map(([source, data]) => ({
      source: source === "Direct" ? "Direct" : source,
      revenue: Math.round(data.revenue),
      conversions: data.conversions,
      avgOrderValue:
        data.conversions > 0 ? Math.round(data.revenue / data.conversions) : 0,
    }));
  };

  const calculateDeviceMetrics = (
    events: AnalyticsEvent[],
    sessions: SessionData[],
  ): DeviceMetric[] => {
    const deviceData: Record<
      string,
      { sessions: number; conversions: number; revenue: number }
    > = {};

    // Process sessions for device info
    sessions.forEach((session) => {
      const device = session.deviceInfo?.type || "Unknown";
      if (!deviceData[device]) {
        deviceData[device] = { sessions: 0, conversions: 0, revenue: 0 };
      }
      deviceData[device].sessions += 1;
    });

    // Process conversion events for revenue
    const conversionEvents = events.filter(
      (e) =>
        e.eventName === "subscription_success" &&
        e.properties?.conversionValue &&
        e.properties.conversionValue > 0,
    );

    conversionEvents.forEach((event) => {
      const sessionId = event.sessionId;
      const session = sessions.find((s) => s.sessionId === sessionId);
      const device = session?.deviceInfo?.type || "Unknown";
      const value = event.properties?.conversionValue || 0;

      if (deviceData[device]) {
        deviceData[device].conversions += 1;
        deviceData[device].revenue += value;
      }
    });

    return Object.entries(deviceData).map(([device, data]) => ({
      device:
        device === "desktop"
          ? "Desktop"
          : device === "mobile"
            ? "Mobile"
            : "Tablet",
      sessions: data.sessions,
      conversionRate:
        data.sessions > 0 ? (data.conversions / data.sessions) * 100 : 0,
      revenue: Math.round(data.revenue),
    }));
  };

  const calculateKPIs = (
    events: AnalyticsEvent[],
    sessions: SessionData[],
  ): KPIs => {
    const totalEvents = events.length;
    const uniqueSessions = sessions.length;
    const pageViews = events.filter((e) => e.eventName === "page_view").length;

    // Calculate conversion rate
    const subscriptionStarted = events.filter(
      (e) => e.eventName === "subscription_started",
    ).length;
    const subscriptionSuccess = events.filter(
      (e) => e.eventName === "subscription_success",
    ).length;
    const conversionRate =
      subscriptionStarted > 0
        ? (subscriptionSuccess / subscriptionStarted) * 100
        : 0;

    // Calculate revenue
    const totalRevenue = events
      .filter(
        (e) =>
          e.eventName === "subscription_success" &&
          e.properties?.conversionValue &&
          e.properties.conversionValue > 0,
      )
      .reduce((sum, e) => sum + (e.properties?.conversionValue || 0), 0);

    // Calculate average session duration
    const totalDuration = sessions.reduce(
      (sum, session) => sum + (session.duration || 0),
      0,
    );
    const avgSessionDuration =
      uniqueSessions > 0 ? totalDuration / uniqueSessions : 0;

    return {
      totalEvents,
      uniqueSessions,
      pageViews,
      conversionRate: conversionRate.toFixed(2),
      totalRevenue: Math.round(totalRevenue),
      avgSessionDuration: formatDuration(avgSessionDuration),
      eventsPerSession:
        uniqueSessions > 0 ? (totalEvents / uniqueSessions).toFixed(1) : "0",
    };
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleDateRangeChange = (range: string): void => {
    const end = new Date();
    let start: Date;

    switch (range) {
      case "7d":
        start = subDays(end, 7);
        break;
      case "30d":
        start = subDays(end, 30);
        break;
      case "90d":
        start = subDays(end, 90);
        break;
      default:
        start = subDays(end, 30);
    }

    setDateRange({ start, end });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with date range selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tableau de Bord Business
            </h1>
            <p className="text-gray-600">
              Analytics et performance du tunnel d'acquisition
            </p>
          </div>

          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            {["7d", "30d", "90d"].map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={`px-4 py-2 text-sm font-medium ${(range === "7d" &&
                    dateRange.start.getTime() ===
                    subDays(new Date(), 7).getTime()) ||
                    (range === "30d" &&
                      dateRange.start.getTime() ===
                      subDays(new Date(), 30).getTime()) ||
                    (range === "90d" &&
                      dateRange.start.getTime() ===
                      subDays(new Date(), 90).getTime())
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
              >
                {range === "7d"
                  ? "7 jours"
                  : range === "30d"
                    ? "30 jours"
                    : "90 jours"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Période: {format(dateRange.start, "dd MMM yyyy", { locale: fr })} -{" "}
          {format(dateRange.end, "dd MMM yyyy", { locale: fr })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Événements totaux
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics?.kpis.totalEvents || 0}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Sessions uniques
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics?.kpis.uniqueSessions || 0}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Taux de conversion
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics?.kpis.conversionRate || 0}%
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-100">
              <span className="text-2xl">🎯</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenu total</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics?.kpis.totalRevenue || 0} €
              </p>
            </div>
            <div className="p-3 rounded-full bg-orange-100">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Analysis */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Tunnel de Conversion
        </h2>

        <div className="space-y-4">
          {metrics?.funnel?.map((step: FunnelMetric, index: number) => (
            <div
              key={step.step}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{step.step}</div>
                  <div className="text-sm text-gray-600">
                    {step.count} événements
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  {step.conversionRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">conversion</div>
                {step.dropOffRate > 0 && (
                  <div className="text-sm text-red-600">
                    -{step.dropOffRate.toFixed(1)}% drop-off
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue by Source */}
      {metrics?.revenue && metrics.revenue.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Revenu par Source
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Graphique de revenus (recharts requis)</p>
            </div>

            <div className="space-y-3">
              {metrics.revenue.map((source: RevenueMetric) => (
                <div
                  key={source.source}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="font-medium text-gray-900">
                    {source.source}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {source.revenue} €
                    </div>
                    <div className="text-sm text-gray-600">
                      {source.conversions} conversions • Moy:{" "}
                      {source.avgOrderValue} €
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Device Performance */}
      {metrics?.device && metrics.device.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Performance par Appareil
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Graphique des appareils (recharts requis)</p>
            </div>

            <div className="space-y-3">
              {metrics.device.map((device: DeviceMetric) => (
                <div
                  key={device.device}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">
                      {device.device === "Mobile"
                        ? "📱"
                        : device.device === "Desktop"
                          ? "🖥️"
                          : "📟"}
                    </span>
                    <div className="font-medium text-gray-900">
                      {device.device}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {device.sessions} sessions
                    </div>
                    <div className="text-sm text-gray-600">
                      {device.conversionRate.toFixed(1)}% • {device.revenue} €
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Pages vues
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {metrics?.kpis.pageViews || 0}
          </p>
          <p className="text-sm text-gray-600">Événements page_view</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Durée moyenne
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {metrics?.kpis.avgSessionDuration || "0m 0s"}
          </p>
          <p className="text-sm text-gray-600">Par session</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Événements/session
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {metrics?.kpis.eventsPerSession || "0"}
          </p>
          <p className="text-sm text-gray-600">Moyenne d'interactions</p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsBusinessDashboard;
