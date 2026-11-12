import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

import { useTeam } from "@/context/team-context";
import { View } from "@prisma/client";
import { toast } from "sonner";
import useSWR from "swr";

import { DocumentWithVersion, LinkWithViews } from "@/lib/types";
import { fetcher } from "@/lib/utils";

export function useDocument() {
  const router = useRouter();
  const teamInfo = useTeam();

  const { id } = router.query as {
    id: string;
  };

  const {
    data: document,
    error,
    mutate,
  } = useSWR<DocumentWithVersion>(
    teamInfo?.currentTeam?.id &&
      id &&
      `/api/teams/${teamInfo?.currentTeam?.id}/documents/${encodeURIComponent(
        id,
      )}`,
    fetcher,
    {
      // Reduce background-driven revalidation to avoid excessive API traffic
      dedupingInterval: 30000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      onError: (err) => {
        if (err.status === 404) {
          toast.error("Document not found", {
            description:
              "The document you're looking for doesn't exist or has been moved.",
          });
          router.replace("/documents");
        }
      },
    },
  );

  return {
    document,
    primaryVersion: document?.versions[0],
    loading: !error && !document,
    error,
    mutate,
  };
}

export function useDocumentLinks() {
  const router = useRouter();
  const teamInfo = useTeam();

  const { id } = router.query as {
    id: string;
  };

  const { data: links, error } = useSWR<LinkWithViews[]>(
    teamInfo?.currentTeam?.id &&
      id &&
      `/api/teams/${teamInfo?.currentTeam?.id}/documents/${encodeURIComponent(
        id,
      )}/links`,
    fetcher,
    {
      dedupingInterval: 10000,
    },
  );

  return {
    links,
    loading: !error && !links,
    error,
  };
}

interface ViewWithDuration extends View {
  internal: boolean;
  duration: {
    data: { pageNumber: string; sum_duration: number }[];
  };
  totalDuration: number;
  completionRate: number;
  link: {
    name: string | null;
  };
  feedbackResponse: {
    id: string;
    data: {
      question: string;
      answer: string;
    };
  } | null;
  agreementResponse: {
    id: string;
    agreementId: string;
    agreement: {
      name: string;
    };
  } | null;
  versionNumber: number;
  versionNumPages: number;
}

type TStatsData = {
  hiddenViewCount: number;
  viewsWithDuration: ViewWithDuration[];
  totalViews: number;
};

export function useDocumentVisits(page: number, limit: number) {
  const router = useRouter();
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { id } = router.query as {
    id: string;
  };

  const cacheKey =
    teamId && id
      ? `/api/teams/${teamId}/documents/${id}/views?page=${page}&limit=${limit}`
      : null;

  const {
    data: views,
    error,
    mutate,
  } = useSWR<TStatsData>(cacheKey, fetcher, {
    dedupingInterval: 20000,
  });

  return {
    views,
    loading: !error && !views,
    error,
    mutate,
  };
}

interface DocumentProcessingStatus {
  currentPageCount: number;
  totalPages: number;
  hasPages: boolean;
  status?: string;
}

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "ERROR"]);

export function useDocumentProcessingStatus(documentVersionId: string) {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const [refreshInterval, setRefreshInterval] = useState(5000);
  const previousStatusRef = useRef<string | null>(null);

  useEffect(() => {
    setRefreshInterval(5000);
    previousStatusRef.current = null;
  }, [documentVersionId]);

  const { data: status, error } = useSWR<DocumentProcessingStatus>(
    teamId &&
      `/api/teams/${teamId}/documents/document-processing-status?documentVersionId=${documentVersionId}`,
    fetcher,
    {
      refreshInterval,
    },
  );

  useEffect(() => {
    if (error) {
      setRefreshInterval(0);
      return;
    }
    if (!status) return;
    const isTerminalByStatus =
      !!status.status && TERMINAL_STATUSES.has(status.status);
    const isTerminalByPages =
      status.hasPages &&
      status.totalPages > 0 &&
      status.currentPageCount >= status.totalPages;
    if (isTerminalByStatus || isTerminalByPages) {
      setRefreshInterval(0);
      return;
    }
    const currentKey = `${status.status ?? ""}:${status.currentPageCount}:${status.totalPages}:${status.hasPages}`;
    if (previousStatusRef.current === null) {
      previousStatusRef.current = currentKey;
      setRefreshInterval(5000);
      return;
    }
    if (previousStatusRef.current !== currentKey) {
      previousStatusRef.current = currentKey;
      setRefreshInterval(5000);
      return;
    }
    setRefreshInterval((previous) =>
      previous === 0 ? 5000 : Math.min(previous * 2, 30000),
    );
  }, [status, error]);

  return {
    status: status,
    loading: !error && !status,
    error: error,
  };
}

export function useDocumentThumbnail(
  pageNumber: number,
  documentId: string,
  versionNumber?: number,
) {
  const { data, error } = useSWR<{ imageUrl: string }>(
    pageNumber === 0
      ? null
      : `/api/jobs/get-thumbnail?documentId=${documentId}&pageNumber=${pageNumber}&versionNumber=${versionNumber}`,
    fetcher,
    {
      dedupingInterval: 1200000,
      revalidateOnFocus: false,
      // revalidateOnMount: false,
      revalidateIfStale: false,
      refreshInterval: 0,
    },
  );

  if (pageNumber === 0) {
    return {
      data: null,
      loading: false,
      error: null,
    };
  }

  return {
    data,
    loading: !error && !data,
    error,
  };
}
