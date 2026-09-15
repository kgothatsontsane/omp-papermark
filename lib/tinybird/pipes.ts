import { Tinybird } from "@chronark/zod-bird";
import { z } from "zod";

import { VIDEO_EVENT_TYPES } from "../constants";
import { WEBHOOK_TRIGGERS } from "../webhook/constants";

const tb = new Tinybird({
  token: process.env.TINYBIRD_TOKEN!,
  baseUrl: process.env.TINYBIRD_URL,
});

export const getTotalAvgPageDuration = tb.buildPipe({
  pipe: "get_total_average_page_duration__v5",
  parameters: z.object({
    documentId: z.string(),
    excludedLinkIds: z.string().describe("Comma separated linkIds"),
    excludedViewIds: z.string().describe("Comma separated viewIds"),
    since: z.number(),
  }),
  data: z.object({
    versionNumber: z.number().int(),
    pageNumber: z.string(),
    avg_duration: z.number(),
  }),
});

export const getViewPageDuration = tb.buildPipe({
  pipe: "get_page_duration_per_view__v5",
  parameters: z.object({
    documentId: z.string(),
    viewId: z.string(),
    since: z.number(),
    until: z.number().optional(),
  }),
  data: z.object({
    pageNumber: z.string(),
    sum_duration: z.number(),
  }),
});

export const getTotalDocumentDuration = tb.buildPipe({
  pipe: "get_total_document_duration__v1",
  parameters: z.object({
    documentId: z.string(),
    excludedLinkIds: z.string().describe("Comma separated linkIds"),
    excludedViewIds: z.string().describe("Comma separated viewIds"),
    since: z.number(),
    until: z.number().optional(),
  }),
  data: z.object({
    sum_duration: z.number(),
  }),
});

export const getTotalLinkDuration = tb.buildPipe({
  pipe: "get_total_link_duration__v1",
  parameters: z.object({
    linkId: z.string(),
    documentId: z.string(),
    excludedViewIds: z.string().describe("Comma separated viewIds"),
    since: z.number(),
    until: z.number().optional(),
  }),
  data: z.object({
    sum_duration: z.number(),
    view_count: z.number(),
  }),
});

export const getTotalViewerDuration = tb.buildPipe({
  pipe: "get_total_viewer_duration__v1",
  parameters: z.object({
    viewIds: z.string().describe("Comma separated viewIds"),
    since: z.number(),
    until: z.number().optional(),
  }),
  data: z.object({
    sum_duration: z.number(),
  }),
});

export const getViewUserAgent_v2 = tb.buildPipe({
  pipe: "get_useragent_per_view__v2",
  parameters: z.object({
    documentId: z.string(),
    viewId: z.string(),
    since: z.number(),
  }),
  data: z.object({
    country: z.string(),
    city: z.string(),
    browser: z.string(),
    os: z.string(),
    device: z.string(),
    ip_address: z.string().nullable(),
  }),
});

export const getViewUserAgent = tb.buildPipe({
  pipe: "get_useragent_per_view__v3",
  parameters: z.object({
    viewId: z.string(),
  }),
  data: z.object({
    country: z.string(),
    city: z.string(),
    browser: z.string(),
    os: z.string(),
    device: z.string(),
    ip_address: z.string().nullable(),
  }),
});

export const getTotalDataroomDuration = tb.buildPipe({
  pipe: "get_total_dataroom_duration__v1",
  parameters: z.object({
    dataroomId: z.string(),
    excludedLinkIds: z.array(z.string()),
    excludedViewIds: z.array(z.string()),
    since: z.number(),
  }),
  data: z.object({
    viewId: z.string(),
    sum_duration: z.number(),
  }),
});

export const getDocumentDurationPerViewer = tb.buildPipe({
  pipe: "get_document_duration_per_viewer__v1",
  parameters: z.object({
    documentId: z.string(),
    viewIds: z.string().describe("Comma separated viewIds"),
  }),
  data: z.object({
    sum_duration: z.number(),
  }),
});

export const getWebhookEvents = tb.buildPipe({
  pipe: "get_webhook_events__v1",
  parameters: z.object({
    webhookId: z.string(),
  }),
  data: z.object({
    event_id: z.string(),
    webhook_id: z.string(),
    message_id: z.string(), // QStash message ID
    event: z.enum(WEBHOOK_TRIGGERS),
    url: z.string(),
    http_status: z.number(),
    request_body: z.string(),
    response_body: z.string(),
    timestamp: z.string(),
  }),
});

export const getVideoEventsByDocument = tb.buildPipe({
  pipe: "get_video_events_by_document__v1",
  parameters: z.object({
    document_id: z.string(),
  }),
  data: z.object({
    timestamp: z.string(),
    view_id: z.string(),
    event_type: z.enum(VIDEO_EVENT_TYPES),
    start_time: z.number(),
    end_time: z.number(),
    playback_rate: z.number(),
    volume: z.number(),
    is_muted: z.number(),
    is_focused: z.number(),
    is_fullscreen: z.number(),
  }),
});

export const getVideoEventsByView = tb.buildPipe({
  pipe: "get_video_events_by_view__v1",
  parameters: z.object({
    document_id: z.string(),
    view_id: z.string(),
  }),
  data: z.object({
    timestamp: z.string(),
    event_type: z.string(),
    start_time: z.number(),
    end_time: z.number(),
  }),
});

export const getClickEventsByView = tb.buildPipe({
  pipe: "get_click_events_by_view__v1",
  parameters: z.object({
    document_id: z.string(),
    view_id: z.string(),
  }),
  data: z.object({
    timestamp: z.string(),
    document_id: z.string(),
    dataroom_id: z.string().nullable(),
    view_id: z.string(),
    page_number: z.string(),
    version_number: z.number(),
    href: z.string(),
  }),
});

export const getAccessFunnel = tb.buildPipe({
  pipe: "get_access_funnel__v1",
  parameters: z.object({
    link_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    event_type: z.string(),
    event_count: z.number(),
  }),
});

export const getAccessFailures = tb.buildPipe({
  pipe: "get_access_failures__v1",
  parameters: z.object({
    link_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    email_hash: z.string().nullable(),
    ip_address: z.string().nullable(),
    fail_count: z.number(),
  }),
});

export const getVerifyLatency = tb.buildPipe({
  pipe: "get_verify_latency__v1",
  parameters: z.object({
    link_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    p50: z.number().nullable(),
    p90: z.number().nullable(),
  }),
});

export const getDownloadsByView = tb.buildPipe({
  pipe: "get_downloads_by_view__v1",
  parameters: z.object({
    view_id: z.string(),
  }),
  data: z.object({
    timestamp: z.string(),
    document_id: z.string().nullable(),
    dataroom_id: z.string().nullable(),
    download_type: z.string(),
    file_count: z.number(),
    total_bytes: z.number(),
  }),
});

export const getDownloadsByDocument = tb.buildPipe({
  pipe: "get_downloads_by_document__v1",
  parameters: z.object({
    document_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    download_count: z.number(),
    total_files: z.number(),
    total_bytes: z.number(),
    viewer_count: z.number(),
  }),
});

export const getDownloadRate = tb.buildPipe({
  pipe: "get_download_rate__v1",
  parameters: z.object({
    link_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    downloads: z.number(),
    viewers: z.number(),
  }),
});

export const getGeoBreakdown = tb.buildPipe({
  pipe: "get_geo_breakdown__v1",
  parameters: z.object({
    link_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    country: z.string(),
    city: z.string(),
    view_count: z.number(),
  }),
});

export const getDeviceBreakdown = tb.buildPipe({
  pipe: "get_device_breakdown__v1",
  parameters: z.object({
    link_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    browser: z.string(),
    os: z.string(),
    device: z.string(),
    view_count: z.number(),
  }),
});

export const getViewsOverTime = tb.buildPipe({
  pipe: "get_views_over_time__v1",
  parameters: z.object({
    link_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    day: z.string(),
    view_count: z.number(),
  }),
});

export const getDropoffPage = tb.buildPipe({
  pipe: "get_dropoff_page__v1",
  parameters: z.object({
    document_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    page_number: z.string(),
    viewer_count: z.number(),
  }),
});

export const getVideoHeatmap = tb.buildPipe({
  pipe: "get_video_heatmap__v1",
  parameters: z.object({
    document_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    second: z.number(),
    play_count: z.number(),
  }),
});

export const getSecurityFlags = tb.buildPipe({
  pipe: "get_security_flags__v1",
  parameters: z.object({
    link_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    timestamp: z.string(),
    flag_type: z.string(),
    severity: z.string(),
    detail: z.string(),
    view_id: z.string().nullable(),
    ip_address: z.string().nullable(),
  }),
});

export const getViewTimeline = tb.buildPipe({
  pipe: "get_view_timeline__v1",
  parameters: z.object({
    view_id: z.string(),
  }),
  data: z.object({
    timestamp: z.string(),
    event_category: z.string(),
    detail: z.string(),
  }),
});

export const getTeamActivity = tb.buildPipe({
  pipe: "get_team_activity__v1",
  parameters: z.object({
    team_id: z.string(),
    since: z.number(),
    limit: z.number().optional(),
  }),
  data: z.object({
    timestamp: z.number(),
    actor_user_id: z.string(),
    event_type: z.string(),
    document_id: z.string().nullable(),
    link_id: z.string().nullable(),
    dataroom_id: z.string().nullable(),
    detail: z.string(),
  }),
});

export const getNavFlow = tb.buildPipe({
  pipe: "get_nav_flow__v1",
  parameters: z.object({
    dataroom_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    event_type: z.string(),
    event_count: z.number(),
  }),
});

export const getPopularDocs = tb.buildPipe({
  pipe: "get_popular_docs__v1",
  parameters: z.object({
    dataroom_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    document_id: z.string().nullable(),
    open_count: z.number(),
  }),
});

export const getTopSearches = tb.buildPipe({
  pipe: "get_top_searches__v1",
  parameters: z.object({
    dataroom_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    query: z.string().nullable(),
    search_count: z.number(),
  }),
});

export const getBookmarkLeaderboard = tb.buildPipe({
  pipe: "get_bookmark_leaderboard__v1",
  parameters: z.object({
    dataroom_id: z.string(),
    since: z.number(),
  }),
  data: z.object({
    document_id: z.string().nullable(),
    bookmark_count: z.number(),
  }),
});
