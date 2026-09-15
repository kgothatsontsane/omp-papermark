import { useTeam } from "@/context/team-context";
import {
  Database,
  FileUp,
  GitCommitVertical,
  Link2,
  Link2Off,
  Trash2,
} from "lucide-react";
import useSWR from "swr";

import { fetcher, timeAgo } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ActivityRow = {
  timestamp: number;
  actor_user_id: string;
  event_type: string;
  document_id: string | null;
  link_id: string | null;
  dataroom_id: string | null;
  detail: string;
};

const ICONS: Record<string, typeof FileUp> = {
  doc_uploaded: FileUp,
  version_added: GitCommitVertical,
  link_created: Link2,
  link_disabled: Link2Off,
  link_deleted: Trash2,
  dataroom_created: Database,
};

export default function TeamActivityFeed() {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;

  const { data: activity } = useSWR<ActivityRow[]>(
    teamId ? `/api/teams/${teamId}/activity?limit=20` : null,
    fetcher,
  );

  if (!activity || activity.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Uploads, versions, links, and datarooms across your team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {activity.map((row, i) => {
            const Icon = ICONS[row.event_type] ?? FileUp;
            return (
              <li
                key={`${row.timestamp}-${i}`}
                className="flex items-center gap-3 text-sm"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {row.detail}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {timeAgo(new Date(row.timestamp))}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
