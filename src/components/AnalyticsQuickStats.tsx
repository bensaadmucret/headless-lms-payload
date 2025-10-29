"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

interface AnalyticsQuickStatsProps {
  className?: string;
}

interface QuickStats {
  totalEvents: number;
  uniqueSessions: number;
  conversionRate: number;
  totalRevenue: number;
  activeUsers: number;
  newSubscriptions: number;
}

interface AnalyticsResponse {
  docs: any[];
  totalDocs: number;
  hasNextPage: boolean;
}

const AnalyticsQuickStats: React.FC<AnalyticsQuickStatsProps> = ({
  className = "",
}) => {
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Get data for last 7 days
  const startDate = subDays(new Date(), 7);
  const endDate = useMemo(() => new Date(), []);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);

        // Fetch events
        const eventsResponse = await fetch(
          `/api/analytics-events?where[timestamp][greater_than_equal]=${startDate.toISOString()}&where[timestamp][less_than_equal]=${endDate.toISOString()}&limit=1000&sort=-timestamp`,
        );
        const eventsData: AnalyticsResponse = await eventsResponse.json();

        // Fetch sessions
        const sessionsResponse = await fetch(
          `/api/analytics-sessions?where[startTime][greater_than_equal]=${startDate.toISOString()}&where[startTime][less_than_equal]=${endDate.toISOString()}&limit=500&sort=-startTime`,
        );
        const sessionsData: AnalyticsResponse = await sessionsResponse.json();

        // Fetch users
        const usersResponse = await fetch(
          `/api/users?where[status][equals]=active&where[createdAt][greater_than_equal]=${startDate.toISOString()}&limit=100`,
        );
        const usersData: AnalyticsResponse = await usersResponse.json();

        // Fetch subscriptions
        const subscriptionsResponse = await fetch(
          `/api/subscriptions?where[status][equals]=active&where[createdAt][greater_than_equal]=${startDate.toISOString()}&limit=100`,
        );
        const subscriptionsData: AnalyticsResponse =
          await subscriptionsResponse.json();

        // Calculate stats
        const events = eventsData?.docs || [];
        const sessions = sessionsData?.docs || [];
        const users = usersData?.docs || [];
        const subscriptions = subscriptionsData?.docs || [];

        const totalEvents = events.length;
        const uniqueSessions = sessions.length;
        const activeUsers = users.length;
        const newSubscriptions = subscriptions.length;

        // Calculate conversion rate
        const subscriptionStarted = events.filter(
          (e: any) => e.eventName === "subscription_started",
        ).length;
        const subscriptionSuccess = events.filter(
          (e: any) => e.eventName === "subscription_success",
        ).length;
        const conversionRate =
          subscriptionStarted > 0
            ? (subscriptionSuccess / subscriptionStarted) * 100
            : 0;

        // Calculate revenue
        const totalRevenue = events
          .filter(
            (e: any) =>
              e.eventName === "subscription_success" &&
              e.properties?.conversionValue > 0,
          )
          .reduce(
            (sum: number, e: any) => sum + (e.properties.conversionValue || 0),
            0,
          );

        setStats({
          totalEvents,
          uniqueSessions,
          conversionRate,
          totalRevenue: Math.round(totalRevenue),
          activeUsers,
          newSubscriptions,
        });
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [startDate]);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={`${className}`}>
        <div className="text-center text-gray-500">
          <p>Aucune donnée analytics disponible pour les 7 derniers jours.</p>
        </div>
      </div>
    );
  }

  const statsItems = [
    {
      label: "Événements",
      value: stats.totalEvents.toLocaleString(),
      icon: "📊",
      color: "bg-blue-100 text-blue-800",
    },
    {
      label: "Sessions",
      value: stats.uniqueSessions.toLocaleString(),
      icon: "👥",
      color: "bg-green-100 text-green-800",
    },
    {
      label: "Taux conversion",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: "🎯",
      color: "bg-purple-100 text-purple-800",
    },
    {
      label: "Revenu 7j",
      value: `${stats.totalRevenue.toLocaleString()} €`,
      icon: "💰",
      color: "bg-orange-100 text-orange-800",
    },
    {
      label: "Nouveaux users",
      value: stats.activeUsers.toLocaleString(),
      icon: "✨",
      color: "bg-emerald-100 text-emerald-800",
    },
    {
      label: "Nouveaux abonnés",
      value: stats.newSubscriptions.toLocaleString(),
      icon: "⭐",
      color: "bg-yellow-100 text-yellow-800",
    },
  ];

  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Statistiques des 7 derniers jours
        </h3>
        <p className="text-sm text-gray-600">
          Période: {format(startDate, "dd MMM", { locale: fr })} -{" "}
          {format(endDate, "dd MMM yyyy", { locale: fr })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statsItems.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg ${item.color} p-2 rounded-lg`}>
                {item.icon}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-sm text-gray-600">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/admin/analytics-business"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Voir le dashboard complet →
        </Link>
      </div>
    </div>
  );
};

export default AnalyticsQuickStats;
