import useSWR from "swr";

import { fetcher } from "@/lib/utils";

export type TViewerList = {
  id: string;
  name: string;
  items: string[];
};

export type TViewerBookmarksData = {
  bookmarks: string[];
  lists: TViewerList[];
};

export function useViewerBookmarks(linkId?: string, viewId?: string) {
  const { data, error, mutate } = useSWR<TViewerBookmarksData>(
    linkId && viewId
      ? `/api/links/bookmarks?linkId=${linkId}&viewId=${viewId}`
      : null,
    fetcher,
  );

  return {
    bookmarks: data?.bookmarks ?? [],
    lists: data?.lists ?? [],
    loading: !error && !data,
    error,
    mutate,
  };
}
