import type { Endpoint, PayloadRequest, PayloadHandler } from 'payload';

type RequestUser = Exclude<PayloadRequest['user'], null>;

type AnalyticsUser = {
  id: string | number;
  role?: string;
  [key: string]: unknown;
};

type AnalyticsEvent = {
  eventName: string;
  timestamp?: string;
  url?: string;
  userAgent?: string;
  source?: string;
  properties?: Record<string, unknown>;
  campaign?: Record<string, string>;
  device?: Record<string, unknown>;
  funnel?: {
    step?: number;
    funnelName?: string;
    conversionValue?: number;
  };
  performance?: {
    pageLoadTime?: number;
    coreWebVitals?: {
      lcp?: number;
      fid?: number;
      cls?: number;
    };
  };
  referrer?: string;
};

type AnalyticsEventRequest = {
  events: AnalyticsEvent[];
  sessionId: string;
};

type SessionUpdates = {
  $inc?: {
    pageViews?: number;
    'conversionGoals.achieved'?: number;
    'conversionGoals.value'?: number;
  };
  lastActivity?: string;
};

type CleanEventContext = {
  sessionId: string;
  user?: AnalyticsUser;
  req: PayloadRequest;
};

type FetchHeadersLike = {
  get: (name: string) => string | null;
};

const isFetchHeaders = (headers: unknown): headers is FetchHeadersLike =>
  typeof headers === 'object' && headers !== null && 'get' in headers &&
  typeof (headers as FetchHeadersLike).get === 'function';

const getRequestHeader = (
  req: PayloadRequest,
  headerName: string,
): string | string[] | undefined => {
  const { headers } = req;
  if (!headers) {
    return undefined;
  }

  if (isFetchHeaders(headers)) {
    return headers.get(headerName) ?? undefined;
  }

  const normalizedName = headerName.toLowerCase();
  return (headers as Record<string, string | string[] | undefined>)[normalizedName];
};

const mapRequestUser = (user: PayloadRequest['user']): AnalyticsUser | undefined => {
  if (!user || typeof user !== 'object') {
    return undefined;
  }

  const { id } = user;

  if (typeof id !== 'string' && typeof id !== 'number') {
    return undefined;
  }

  const normalizedUser: AnalyticsUser = { id };

  if (typeof user.role === 'string') {
    normalizedUser.role = user.role;
  }

  return normalizedUser;
};

// Helper function to get client IP address
const getClientIp = (req: PayloadRequest): string | null => {
  // Gestion de l'en-tête x-forwarded-for
  const forwarded = req.headers.get?.('x-forwarded-for') || (req.headers as any)['x-forwarded-for'];

  if (forwarded) {
    if (typeof forwarded === 'string') {
      const firstSegment = forwarded.split(',')[0]?.trim();
      return firstSegment ?? forwarded.trim();
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
      const firstForwarded = forwarded.find(
        (value): value is string => typeof value === 'string' && value.length > 0,
      ) ?? forwarded[0];

      if (typeof firstForwarded === 'string') {
        const firstEntry = firstForwarded.split(',')[0]?.trim();
        return firstEntry ?? firstForwarded.trim();
      }
    }
  }

  // Gestion de l'adresse distante via la socket (si disponible)
  const socket = (req as any).socket;
  if (socket?.remoteAddress) {
    return socket.remoteAddress;
  }

  return null;
};

// Sanitize nested properties
const sanitizeProperties = (properties: unknown): Record<string, unknown> | undefined => {
  if (!properties || typeof properties !== 'object') return undefined;

  const sanitized: Record<string, unknown> = {};
  const allowedTypes = ['string', 'number', 'boolean'];

  Object.entries(properties as Record<string, unknown>).forEach(([key, value]) => {
    const type = typeof value;

    if (allowedTypes.includes(type)) {
      sanitized[key] = value;
    } else if (value !== null && type === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      const nested = sanitizeProperties(value);
      if (nested) {
        sanitized[key] = nested;
      }
    }
  });

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

// Sanitize campaign data
const sanitizeCampaignData = (campaign: unknown): Record<string, string> | undefined => {
  if (!campaign || typeof campaign !== 'object') return undefined;

  const allowedKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const sanitized: Record<string, string> = {};

  allowedKeys.forEach((key) => {
    const value = (campaign as Record<string, unknown>)[key];
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    }
  });

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

// Sanitize device data
const sanitizeDeviceData = (device: unknown): Record<string, unknown> | undefined => {
  if (!device || typeof device !== 'object') return undefined;

  const allowedKeys = ['type', 'os', 'browser', 'screenResolution'];
  const sanitized: Record<string, unknown> = {};

  allowedKeys.forEach((key) => {
    const value = (device as Record<string, unknown>)[key];
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
  });

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

// Sanitize funnel data
const sanitizeFunnelData = (funnel: unknown): { step?: number; funnelName?: string; conversionValue?: number } | undefined => {
  if (!funnel || typeof funnel !== 'object') return undefined;

  const result: { step?: number; funnelName?: string; conversionValue?: number } = {};
  const funnelObj = funnel as Record<string, unknown>;

  if (typeof funnelObj.step === 'number') {
    result.step = funnelObj.step;
  }
  if (typeof funnelObj.funnelName === 'string') {
    result.funnelName = funnelObj.funnelName.trim();
  }
  if (typeof funnelObj.conversionValue === 'number') {
    result.conversionValue = Math.max(0, funnelObj.conversionValue);
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

// Sanitize performance data
const sanitizePerformanceData = (performance: unknown): { pageLoadTime?: number; coreWebVitals?: Record<string, number> } | undefined => {
  if (!performance || typeof performance !== 'object') return undefined;

  const perf = performance as Record<string, unknown>;
  const result: { pageLoadTime?: number; coreWebVitals?: Record<string, number> } = {};

  if (typeof perf.pageLoadTime === 'number' && perf.pageLoadTime > 0) {
    result.pageLoadTime = Math.round(perf.pageLoadTime);
  }

  if (perf.coreWebVitals && typeof perf.coreWebVitals === 'object') {
    const cwv = perf.coreWebVitals as Record<string, unknown>;
    const sanitizedCWV: Record<string, number> = {};

    if (typeof cwv.lcp === 'number' && cwv.lcp > 0) {
      sanitizedCWV.lcp = Math.round(cwv.lcp);
    }
    if (typeof cwv.fid === 'number' && cwv.fid > 0) {
      sanitizedCWV.fid = Math.round(cwv.fid);
    }
    if (typeof cwv.cls === 'number' && cwv.cls >= 0) {
      sanitizedCWV.cls = Math.round(cwv.cls * 1000) / 1000; // 3 decimal places max
    }

    if (Object.keys(sanitizedCWV).length > 0) {
      result.coreWebVitals = sanitizedCWV;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

// Clean and validate an analytics event
const cleanAnalyticsEvent = async (
  event: AnalyticsEvent,
  context: CleanEventContext
): Promise<Record<string, unknown>> => {
  const { sessionId, user, req } = context;
  const now = new Date().toISOString();

  // Récupération sécurisée des en-têtes
  const getRequestHeader = (request: PayloadRequest, headerName: string): string | undefined => {
    if (request.headers.get) {
      return request.headers.get(headerName) || undefined;
    }
    // Fallback pour les anciennes versions
    const headers = request.headers as any;
    return headers[headerName] || undefined;
  };

  const getHeaderValue = (header: string | string[] | undefined): string => {
    if (!header) return '';
    if (Array.isArray(header)) return header[0] || '';
    return header;
  };

  const referer = getHeaderValue(
    getRequestHeader(req, 'referer') ?? getRequestHeader(req, 'referrer'),
  );
  const userAgent = getHeaderValue(getRequestHeader(req, 'user-agent'));

  // Données de base de l'événement
  const cleanEvent: Record<string, unknown> = {
    eventName: String(event.eventName || 'unknown').trim(),
    sessionId,
    timestamp: event.timestamp || now,
    url: event.url || referer,
    userAgent: event.userAgent || userAgent,
    source: event.source || 'website',
  };

  // Associate user if logged in
  if (user?.id) {
    cleanEvent.user = user.id;
  }

  // Sanitize and add properties
  if (event.properties) {
    const sanitizedProps = sanitizeProperties(event.properties);
    if (sanitizedProps) {
      cleanEvent.properties = sanitizedProps;
    }
  }

  // Add campaign data if present
  if (event.campaign) {
    const campaignData = sanitizeCampaignData(event.campaign);
    if (campaignData) {
      cleanEvent.campaign = campaignData;
    }
  }

  // Add device info if present
  if (event.device) {
    const deviceData = sanitizeDeviceData(event.device);
    if (deviceData) {
      cleanEvent.deviceInfo = deviceData;
    }
  }

  // Add funnel data if present
  if (event.funnel) {
    const funnelData = sanitizeFunnelData(event.funnel);
    if (funnelData) {
      cleanEvent.funnel = funnelData;
    }
  }

  // Add performance data if present
  if (event.performance) {
    const perfData = sanitizePerformanceData(event.performance);
    if (perfData) {
      cleanEvent.performance = perfData;
    }
  }

  // Add IP address (admin only)
  const clientIp = getClientIp(req);
  if (clientIp) {
    cleanEvent.ipAddress = clientIp;
  }

  // Add referrer if present
  if (event.referrer) {
    cleanEvent.referrer = String(event.referrer).trim();
  }

  return cleanEvent;
};

// Create a new session from events
const createSessionFromEvents = (
  firstEvent: AnalyticsEvent,
  sessionId: string,
  user?: RequestUser | null
): Record<string, unknown> => {
  const now = new Date().toISOString();

  const sessionData: Record<string, unknown> = {
    sessionId,
    startTime: firstEvent.timestamp || now,
    lastActivity: now,
    eventCount: 1,
    pageViews: firstEvent.eventName === 'page_view' ? 1 : 0,
  };

  // Set landing page if URL is available
  if (firstEvent.url) {
    try {
      const url = new URL(firstEvent.url);
      sessionData.landingPage = url.pathname;
    } catch (e) {
      // If URL parsing fails, use the raw URL
      sessionData.landingPage = firstEvent.url;
    }
  } else {
    sessionData.landingPage = '/';
  }

  // Add user reference if available
  if (user?.id) {
    sessionData.user = user.id;
  }

  // Add referrer if available
  if (firstEvent.referrer) {
    sessionData.referrer = firstEvent.referrer;
  }

  // Add device info if available
  if (firstEvent.device) {
    const deviceData = sanitizeDeviceData(firstEvent.device);
    if (deviceData) {
      sessionData.deviceInfo = deviceData;
    }
  }

  // Add campaign data if available
  if (firstEvent.campaign) {
    const campaignData = sanitizeCampaignData(firstEvent.campaign);
    if (campaignData) {
      sessionData.customProperties = {
        ...(sessionData.customProperties as Record<string, unknown> || {}),
        campaign: campaignData,
      };
    }
  }

  return sessionData;
};

const handler = async (req: PayloadRequest, res: any) => {
  try {
    const { events, sessionId } = (req.body as unknown) as AnalyticsEventRequest;

    // Validate request body
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Events array is required and cannot be empty',
      });
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'A valid session ID is required',
      });
    }

    const analyticsUser = mapRequestUser(req.user);
    const now = new Date().toISOString();

    // Process each event
    const createdEvents = [];
    const sessionUpdates: SessionUpdates = {
      lastActivity: now,
      $inc: {
        pageViews: 0,
        'conversionGoals.achieved': 0,
        'conversionGoals.value': 0,
      },
    };

    for (const event of events) {
      try {
        // Clean and validate the event
        const cleanEvent = await cleanAnalyticsEvent(event, {
          sessionId,
          user: analyticsUser,
          req,
        });

        // Create the event in Payload (using any to bypass collection type checking)
        const createdEvent = await (req.payload as any).create({
          collection: 'analytics-events',
          data: cleanEvent,
        });

        createdEvents.push(createdEvent);

        // Update session metrics
        if (event.eventName === 'page_view' && sessionUpdates.$inc) {
          sessionUpdates.$inc.pageViews = (sessionUpdates.$inc.pageViews || 0) + 1;
        }

        if (event.funnel?.conversionValue && sessionUpdates.$inc) {
          sessionUpdates.$inc['conversionGoals.achieved'] = (sessionUpdates.$inc['conversionGoals.achieved'] || 0) + 1;
          sessionUpdates.$inc['conversionGoals.value'] = (sessionUpdates.$inc['conversionGoals.value'] || 0) + event.funnel.conversionValue;
        }
      } catch (error) {
        console.error('Error processing analytics event:', error, event);
        // Continue with other events if one fails
        continue;
      }
    }

    // Update or create session
    try {
      // Check if session exists (using any to bypass collection type checking)
      const existingSessions = await (req.payload as any).find({
        collection: 'analytics-sessions',
        where: {
          sessionId: {
            equals: sessionId,
          },
        },
        limit: 1,
      });

      if (existingSessions.docs.length > 0) {
        // Update existing session
        const session = existingSessions.docs[0];
        if (session?.id) {
          await (req.payload as any).update({
            collection: 'analytics-sessions',
            id: session.id,
            data: sessionUpdates,
          });
        }
      } else if (events.length > 0 && events[0]) {
        // Create new session only if we have events
        const sessionData = createSessionFromEvents(events[0], sessionId, req.user);
        await (req.payload as any).create({
          collection: 'analytics-sessions',
          data: {
            ...sessionData,
            ...(sessionUpdates.$inc && {
              pageViews: sessionUpdates.$inc.pageViews || 0,
              conversionGoals: {
                achieved: sessionUpdates.$inc['conversionGoals.achieved'] || 0,
                value: sessionUpdates.$inc['conversionGoals.value'] || 0,
              },
            }),
          },
        });
      }
    } catch (sessionError) {
      console.error('Error updating session:', sessionError);
      // Don't fail the request if session update fails
    }

    return res.status(200).json({
      success: true,
      processed: createdEvents.length,
      total: events.length,
      sessionId,
    });
  } catch (error) {
    console.error('Analytics events endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export const analyticsEventsEndpoint: Endpoint = {
  path: '/analytics/events',
  method: 'post',
  handler: handler as PayloadHandler,
};

export default analyticsEventsEndpoint;
