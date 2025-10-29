"use client";

import React, { useState, useEffect } from "react";
import { useConfig } from "@payloadcms/ui";
import { format, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
// Note: recharts doit être installé avec: npm install recharts
// Pour l'instant, on utilise des composants de base

interface UserAnalyticsDetailProps {
  userId: string;
}

interface UserEvent {
  id: string;
  eventName: string;
  timestamp: string;
  properties?: any;
  campaign?: any;
  device?: any;
}

interface UserSession {
  id: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  pageViews: number;
  eventCount: number;
  deviceInfo?: any;
  landingPage?: string;
  referrer?: string;
}

interface UserSubscription {
  id: string;
  status: string;
  plan: any;
  startDate: string;
  endDate?: string;
  amount?: number;
}

const UserAnalyticsDetail: React.FC<UserAnalyticsDetailProps> = ({
  userId,
}) => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null,
  );

  const { config } = useConfig();
  const [userLoading, setUserLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [userDataResponse, setUserDataResponse] = useState<any>(null);
  const [eventsData, setEventsData] = useState<any>(null);
  const [sessionsData, setSessionsData] = useState<any>(null);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setUserLoading(true);
        const response = await fetch(`${config.serverURL}/api/users/${userId}?depth=2`);
        const data = await response.json();
        setUserDataResponse(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setUserLoading(false);
      }
    };

    fetchUserData();
  }, [userId, config.serverURL]);

  // Fetch user events
  useEffect(() => {
    const fetchEventsData = async () => {
      try {
        setEventsLoading(true);
        const response = await fetch(
          `${config.serverURL}/api/analytics-events?where[user][equals]=${userId}&limit=100&sort=-timestamp`
        );
        const data = await response.json();
        setEventsData(data);
      } catch (error) {
        console.error('Error fetching events data:', error);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEventsData();
  }, [userId, config.serverURL]);

  // Fetch user sessions
  useEffect(() => {
    const fetchSessionsData = async () => {
      try {
        setSessionsLoading(true);
        const response = await fetch(
          `${config.serverURL}/api/analytics-sessions?where[user][equals]=${userId}&limit=50&sort=-startTime`
        );
        const data = await response.json();
        setSessionsData(data);
      } catch (error) {
        console.error('Error fetching sessions data:', error);
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchSessionsData();
  }, [userId, config.serverURL]);

  useEffect(() => {
    if (
      !userLoading &&
      !eventsLoading &&
      !sessionsLoading &&
      userDataResponse
    ) {
      processUserData();
    }
  }, [userDataResponse, eventsLoading, sessionsLoading, userLoading]);

  const processUserData = () => {
    setUserData(userDataResponse);
    setEvents(eventsData?.docs || []);
    setSessions(sessionsData?.docs || []);

    // Find active subscription
    const activeSubscription = userDataResponse?.subscriptions?.find?.(
      (sub: any) => sub.status === "active" || sub.status === "trialing",
    );
    setSubscription(activeSubscription || null);

    setLoading(false);
  };

  const calculateUserMetrics = () => {
    const totalEvents = events.length;
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce(
      (sum, session) => sum + (session.duration || 0),
      0,
    );
    const avgSessionDuration =
      totalSessions > 0 ? totalDuration / totalSessions : 0;

    const conversionEvents = events.filter(
      (e) =>
        e.eventName === "subscription_success" ||
        e.eventName === "payment_completed",
    ).length;

    const lastActivity = events.length > 0 ? events[0]?.timestamp : null;
    const daysSinceLastActivity = lastActivity
      ? differenceInDays(new Date(), parseISO(lastActivity))
      : null;

    return {
      totalEvents,
      totalSessions,
      avgSessionDuration: formatDuration(avgSessionDuration),
      conversionEvents,
      lastActivity,
      daysSinceLastActivity,
    };
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getEventTypeColor = (eventName: string): string => {
    const colors: Record<string, string> = {
      page_view: "bg-blue-100 text-blue-800",
      subscription_started: "bg-green-100 text-green-800",
      account_created: "bg-purple-100 text-purple-800",
      payment_initiated: "bg-yellow-100 text-yellow-800",
      payment_completed: "bg-emerald-100 text-emerald-800",
      subscription_success: "bg-green-100 text-green-800",
      subscription_abandon: "bg-red-100 text-red-800",
      error: "bg-red-100 text-red-800",
    };
    return colors[eventName] || "bg-gray-100 text-gray-800";
  };

  const prepareTimelineData = () => {
    return events
      .map((event) => ({
        date: format(parseISO(event.timestamp), "dd MMM HH:mm", { locale: fr }),
        event: event.eventName,
        value: 1,
      }))
      .reverse();
  };

  const prepareDeviceUsageData = () => {
    const deviceCounts: Record<string, number> = {};
    sessions.forEach((session) => {
      const device = session.deviceInfo?.type || "Unknown";
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    return Object.entries(deviceCounts).map(([device, count]) => ({
      device:
        device === "desktop"
          ? "Desktop"
          : device === "mobile"
            ? "Mobile"
            : "Tablet",
      count,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Utilisateur non trouvé
        </h2>
        <p className="text-gray-600">
          L'utilisateur avec l'ID {userId} n'existe pas.
        </p>
      </div>
    );
  }

  const metrics = calculateUserMetrics();
  const timelineData = prepareTimelineData();
  const deviceData = prepareDeviceUsageData();

  return (
    <div className="space-y-6">
      {/* User Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {userData.firstname} {userData.lastname}
            </h1>
            <p className="text-gray-600">{userData.email}</p>
            <p className="text-sm text-gray-500">
              Membre depuis{" "}
              {format(parseISO(userData.createdAt), "dd MMMM yyyy", {
                locale: fr,
              })}
            </p>
          </div>
          <div className="text-right">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${userData.status === "active"
                  ? "bg-green-100 text-green-800"
                  : userData.status === "suspended"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                }`}
            >
              {userData.status === "active"
                ? "Actif"
                : userData.status === "suspended"
                  ? "Suspendu"
                  : "En attente"}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Info */}
      {subscription && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Abonnement
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Plan</p>
              <p className="font-semibold text-gray-900">
                {subscription.plan?.name || "Inconnu"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Statut</p>
              <p className="font-semibold text-gray-900">
                {subscription.status === "active"
                  ? "Actif"
                  : subscription.status === "trialing"
                    ? "Période d'essai"
                    : subscription.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Montant</p>
              <p className="font-semibold text-gray-900">
                {subscription.amount || subscription.plan?.price} €
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Date de début</p>
              <p className="font-semibold text-gray-900">
                {format(parseISO(subscription.startDate), "dd MMMM yyyy", {
                  locale: fr,
                })}
              </p>
            </div>
            {subscription.endDate && (
              <div>
                <p className="text-sm text-gray-600">Date de fin</p>
                <p className="font-semibold text-gray-900">
                  {format(parseISO(subscription.endDate), "dd MMMM yyyy", {
                    locale: fr,
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Événements</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.totalEvents}
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
              <p className="text-sm font-medium text-gray-600">Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.totalSessions}
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
              <p className="text-sm font-medium text-gray-600">Conversions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.conversionEvents}
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
              <p className="text-sm font-medium text-gray-600">Durée moyenne</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.avgSessionDuration}
              </p>
            </div>
            <div className="p-3 rounded-full bg-orange-100">
              <span className="text-2xl">⏱️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Last Activity */}
      {metrics.lastActivity && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Dernière activité
          </h3>
          <div className="flex items-center space-x-4">
            <div>
              <p className="text-gray-600">
                {format(
                  parseISO(metrics.lastActivity),
                  "dd MMMM yyyy à HH:mm",
                  { locale: fr },
                )}
              </p>
              {metrics.daysSinceLastActivity !== null && (
                <p className="text-sm text-gray-500">
                  {metrics.daysSinceLastActivity === 0
                    ? "Aujourd'hui"
                    : metrics.daysSinceLastActivity === 1
                      ? "Hier"
                      : `Il y a ${metrics.daysSinceLastActivity} jours`}
                </p>
              )}
            </div>
            {metrics.daysSinceLastActivity !== null &&
              metrics.daysSinceLastActivity > 7 && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-1 rounded-full text-sm">
                  Inactif récemment
                </div>
              )}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      {timelineData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Timeline d&apos;activité
          </h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Graphique timeline (recharts requis)</p>
          </div>
        </div>
      )}

      {/* Device Usage */}
      {deviceData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Utilisation par appareil
          </h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Graphique appareils (recharts requis)</p>
          </div>
        </div>
      )}

      {/* Recent Events */}
      {events.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Événements récents
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {events.slice(0, 20).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.eventName)}`}
                  >
                    {event.eventName}
                  </span>
                  <div className="text-sm text-gray-600">
                    {format(parseISO(event.timestamp), "dd MMM HH:mm", {
                      locale: fr,
                    })}
                  </div>
                </div>
                {event.properties?.conversionValue && (
                  <div className="text-sm font-medium text-green-600">
                    {event.properties.conversionValue} €
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Data State */}
      {events.length === 0 && sessions.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune activité
          </h3>
          <p className="text-sm text-gray-500">
            Cet utilisateur n&apos;a pas encore généré d&apos;événements
            analytics.
          </p>
        </div>
      )}
    </div>
  );
};

export default UserAnalyticsDetail;
