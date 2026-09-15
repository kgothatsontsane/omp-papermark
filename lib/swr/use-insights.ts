import { useRouter } from "next/router";

import { useTeam } from "@/context/team-context";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";

import { fetcher } from "@/lib/utils";

export type TInsightsData = {
  linkId: string | null;
  geo: { country: string; city: string; view_count: number }[];
  device: { browser: string; os: string; device: string; view_count: number }[];
  viewsOverTime: { day: string; view_count: number }[];
  dropoff: { page_number: string; viewer_count: number }[];
  downloads: {
    download_count: number;
    total_files: number;
    total_bytes: number;
    viewer_count: number;
  } | null;
  downloadRate: { downloads: number; viewers: number } | null;
  funnel: { event_type: string; event_count: number }[];
  verifyLatency: { p50: number | null; p90: number | null } | null;
  failures: {
    email_hash: string | null;
    ip_address: string | null;
    fail_count: number;
  }[];
  security: {
    timestamp: string;
    flag_type: string;
    severity: string;
    detail: string;
    view_id: string | null;
    ip_address: string | null;
  }[];
  heatmap: { second: number; play_count: number }[];
};

export function useDocumentInsights(documentId?: string) {
  const router = useRouter();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const { id: queryId } = router.query as { id: string };
  const docId = documentId ?? queryId;

  const { data: insights, error } = useSWR<TInsightsData>(
    docId &&
      teamId &&
      `/api/teams/${teamId}/documents/${encodeURIComponent(docId)}/insights`,
    fetcher,
    { dedupingInterval: 10000 },
  );

  return { insights, loading: !error && !insights, error };
}

export type TTimelineRow = {
  timestamp: string;
  event_category: string;
  detail: string;
};

export function useViewTimeline(viewId: string, documentId?: string) {
  const router = useRouter();
  const teamInfo = useTeam();
  const { id: queryId } = router.query as { id: string };
  const docId = documentId ?? queryId;

  const { data: timeline, error } = useSWRImmutable<TTimelineRow[]>(
    docId &&
      viewId &&
      `/api/teams/${teamInfo?.currentTeam?.id}/documents/${docId}/views/${viewId}/timeline`,
    fetcher,
  );

  return { timeline, loading: !error && !timeline, error };
}

export type TDataroomInsights = {
  linkId: string | null;
  links: { id: string; name: string | null }[];
  flags: TInsightsData["security"];
};

export function useDataroomInsights(linkId?: string) {
  const router = useRouter();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const { id } = router.query as { id: string };

  const { data: insights, error } = useSWR<TDataroomInsights>(
    id &&
      teamId &&
      `/api/teams/${teamId}/datarooms/${id}/insights${linkId ? `?linkId=${linkId}` : ""}`,
    fetcher,
    { dedupingInterval: 10000 },
  );

  return { insights, loading: !error && !insights, error };
}

export type TInternalList = {
  excludedEmails: string[];
  excludedLinkIds: string[];
};

export function useInternalList() {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { data, error, mutate } = useSWR<TInternalList>(
    teamId && `/api/teams/${teamId}/internal-list`,
    fetcher,
    { dedupingInterval: 10000 },
  );

  return { list: data, loading: !error && !data, error, mutate };
}
