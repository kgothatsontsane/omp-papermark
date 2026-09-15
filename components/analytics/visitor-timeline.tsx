import {
  DownloadIcon,
  FileDigitIcon,
  KeyRoundIcon,
  MousePointerClickIcon,
  PlayIcon,
} from "lucide-react";

import { timeAgo } from "@/lib/utils";

import { useViewTimeline } from "@/lib/swr/use-insights";

function TimelineIcon({ category }: { category: string }) {
  const className = "h-4 w-4 shrink-0 text-muted-foreground";
  switch (category) {
    case "page":
      return <FileDigitIcon className={className} />;
    case "click":
      return <MousePointerClickIcon className={className} />;
    case "download":
      return <DownloadIcon className={className} />;
    case "access":
      return <KeyRoundIcon className={className} />;
    case "video":
      return <PlayIcon className={className} />;
    default:
      return <FileDigitIcon className={className} />;
  }
}

export default function VisitorTimeline({
  viewId,
  documentId,
}: {
  viewId: string;
  documentId?: string;
}) {
  const { timeline, loading, error } = useViewTimeline(viewId, documentId);

  if (error) {
    return null;
  }

  if (loading) {
    return <div className="pb-0.5 pl-1.5 md:pb-1 md:pl-2">Loading...</div>;
  }

  if (!timeline || timeline.length === 0) {
    return null;
  }

  return (
    <div className="pb-0.5 pl-0.5 md:pb-1 md:pl-1">
      <div className="flex items-center gap-x-1 px-1 py-1 text-sm font-medium">
        Timeline
      </div>
      <ol className="space-y-2 px-1 py-1">
        {timeline.map((row, i) => (
          <li key={i} className="flex items-start gap-x-2 text-sm">
            <span className="mt-0.5">
              <TimelineIcon category={row.event_category} />
            </span>
            <span className="min-w-0 flex-1 break-words text-muted-foreground">
              <span className="font-medium capitalize text-foreground">
                {row.event_category}
              </span>{" "}
              {row.detail}
            </span>
            <time
              className="shrink-0 text-xs text-muted-foreground/60"
              dateTime={new Date(row.timestamp).toISOString()}
              title={new Date(row.timestamp).toLocaleString()}
            >
              {timeAgo(new Date(row.timestamp))}
            </time>
          </li>
        ))}
      </ol>
    </div>
  );
}
