import { useState } from "react";

import { useTeam } from "@/context/team-context";
import {
  BadgeCheckIcon,
  BadgeInfoIcon,
  Download,
  DownloadCloudIcon,
  FileBadgeIcon,
  MailOpenIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useDataroom } from "@/lib/swr/use-dataroom";
import { useDataroomVisits } from "@/lib/swr/use-dataroom";
import { timeAgo } from "@/lib/utils";

import ChevronDown from "@/components/shared/icons/chevron-down";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BadgeTooltip } from "@/components/ui/tooltip";

import { ExportVisitsModal } from "../datarooms/export-visits-modal";
import DataroomVisitorCustomFields from "./dataroom-visitor-custom-fields";
import { DataroomVisitorUserAgent } from "./dataroom-visitor-useragent";
import DataroomVisitHistory from "./dataroom-visitors-history";
import { VisitorAvatar } from "./visitor-avatar";

export default function DataroomVisitorsTable({
  dataroomId,
  groupId,
  name,
}: {
  dataroomId: string;
  groupId?: string;
  name?: string;
}) {
  const teamInfo = useTeam();
  const teamId = teamInfo?.currentTeam?.id;
  const { views } = useDataroomVisits({ dataroomId, groupId });
  const { dataroom } = useDataroom();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const exportVisitCounts = () => {
    setExportModalOpen(true);
  };

  const exportActivityReport = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/reports/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataroomId }),
      });
      if (!response.ok) {
        toast.error("Failed to start activity report");
        return;
      }
      toast.success("Activity report started. Check your email when ready.");
    } catch {
      toast.error("Failed to start activity report");
    }
  };

  const handleRemindViewer = async (
    viewId: string,
    viewerEmail: string | null,
  ) => {
    if (!viewerEmail) {
      toast.error("No viewer email on this view");
      return;
    }
    setRemindingId(viewId);
    try {
      const response = await fetch(
        `/api/teams/${teamId}/views/${viewId}/remind`,
        { method: "POST" },
      );
      if (!response.ok) {
        toast.error("Failed to send reminder");
        return;
      }
      toast.success(`Reminder sent to ${viewerEmail}`);
    } catch {
      toast.error("Failed to send reminder");
    } finally {
      setRemindingId(null);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between md:mb-4">
        <h2>All visitors</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportActivityReport}>
            <Download className="!size-4" />
            Export report
          </Button>
          <Button variant="outline" size="sm" onClick={exportVisitCounts}>
            <Download className="!size-4" />
            Export visits
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="*:whitespace-nowrap *:font-medium hover:bg-transparent">
              <TableHead>Name</TableHead>
              {/* <TableHead>Visit Duration</TableHead> */}
              {/* <TableHead>Last Viewed Document</TableHead> */}
              <TableHead>Last Viewed</TableHead>
              <TableHead className="text-center sm:text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {views?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex h-40 w-full items-center justify-center">
                    <p>No visits yet. Try sharing a link.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {views ? (
              views.map((view) => (
                <Collapsible key={view.id} asChild>
                  <>
                    <TableRow key={view.id} className="group/row">
                      {/* Name */}
                      <TableCell className="">
                        <div className="flex items-center overflow-visible sm:space-x-3">
                          <VisitorAvatar viewerEmail={view.viewerEmail} />
                          <div className="min-w-0 flex-1">
                            <div className="focus:outline-none">
                              <p className="flex items-center gap-x-2 overflow-visible text-sm font-medium text-gray-800 dark:text-gray-200">
                                {view.viewerEmail ? (
                                  <>
                                    {view.viewerEmail}{" "}
                                    {view.verified && (
                                      <BadgeTooltip
                                        content="Verified visitor"
                                        key={`verified-${view.id}`}
                                      >
                                        <BadgeCheckIcon className="h-4 w-4 text-emerald-500 hover:text-emerald-600" />
                                      </BadgeTooltip>
                                    )}
                                    {view.internal && (
                                      <BadgeTooltip
                                        content="Internal visitor"
                                        key={`internal-${view.id}`}
                                      >
                                        <BadgeInfoIcon className="h-4 w-4 text-blue-500 hover:text-blue-600" />
                                      </BadgeTooltip>
                                    )}
                                    {view.downloadedAt && (
                                      <BadgeTooltip
                                        content={`Downloaded ${timeAgo(view.downloadedAt)}`}
                                        key={`download-${view.id}`}
                                      >
                                        <DownloadCloudIcon className="h-4 w-4 text-cyan-500 hover:text-cyan-600" />
                                      </BadgeTooltip>
                                    )}
                                    {view.agreementResponse && (
                                      <BadgeTooltip
                                        content={`Agreed to ${view.agreementResponse.agreement.name}`}
                                        key={`agreement-${view.id}`}
                                      >
                                        <FileBadgeIcon className="h-4 w-4 text-emerald-500 hover:text-emerald-600" />
                                      </BadgeTooltip>
                                    )}
                                  </>
                                ) : (
                                  "Anonymous"
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground/60 sm:text-sm">
                                {view.link.name ? view.link.name : view.linkId}
                              </p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      {/* Duration */}
                      {/* <TableCell className="">
                        <div className="text-sm text-muted-foreground">
                          {durationFormat(view.totalDuration)}
                        </div>
                      </TableCell> */}
                      {/* Completion */}
                      {/* <TableCell className="flex justify-start">
                        <div className="text-sm text-muted-foreground">
                          <Gauge
                            value={view.completionRate}
                            size={"small"}
                            showValue={true}
                          />
                        </div>
                      </TableCell> */}
                      {/* Last Viewed */}
                      <TableCell className="text-sm text-muted-foreground">
                        <time dateTime={new Date(view.viewedAt).toISOString()}>
                          {timeAgo(view.viewedAt)}
                        </time>
                      </TableCell>
                      {/* Actions */}
                      <TableCell className="cursor-pointer p-0 text-center sm:text-right">
                        <div className="flex items-center justify-end space-x-1 p-5">
                          {view.viewerEmail ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={remindingId === view.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleRemindViewer(view.id, view.viewerEmail);
                              }}
                            >
                              Remind
                            </Button>
                          ) : null}
                          <CollapsibleTrigger asChild>
                            <div className="flex justify-end space-x-1 [&[data-state=open]>svg.chevron]:rotate-180">
                              <ChevronDown className="chevron h-4 w-4 shrink-0 transition-transform duration-200" />
                            </div>
                          </CollapsibleTrigger>
                        </div>
                      </TableCell>
                    </TableRow>

                    <CollapsibleContent asChild>
                      <>
                        <TableRow>
                          <TableCell colSpan={3}>
                            <DataroomVisitorCustomFields
                              viewId={view.id}
                              teamId={view.teamId!}
                              dataroomId={dataroomId}
                            />
                            <DataroomVisitorUserAgent viewId={view.id} />
                          </TableCell>
                        </TableRow>
                        <TableRow key={view.id}>
                          <TableCell>
                            <div className="flex items-center gap-x-4 overflow-visible">
                              <MailOpenIcon className="h-5 w-5 text-[#fb7a00]" />
                              Accessed {view.dataroomName} dataroom
                            </div>
                          </TableCell>

                          <TableCell>
                            <div>
                              <time
                                className="truncate text-sm text-muted-foreground"
                                dateTime={new Date(
                                  view.viewedAt,
                                ).toLocaleString()}
                                title={new Date(view.viewedAt).toLocaleString()}
                              >
                                {timeAgo(view.viewedAt)}
                              </time>
                            </div>
                          </TableCell>
                          <TableCell className="table-cell"></TableCell>
                        </TableRow>

                        {view.downloadedAt ? (
                          <TableRow key={`download-item-${view.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-x-4 overflow-visible">
                                <DownloadCloudIcon className="h-5 w-5 text-cyan-500 hover:text-cyan-600" />
                                Downloaded {view.dataroomName} dataroom
                              </div>
                            </TableCell>

                            <TableCell>
                              <div>
                                <time
                                  className="truncate text-sm text-muted-foreground"
                                  dateTime={new Date(
                                    view.downloadedAt,
                                  ).toLocaleString()}
                                  title={new Date(
                                    view.downloadedAt,
                                  ).toLocaleString()}
                                >
                                  {timeAgo(view.downloadedAt)}
                                </time>
                              </div>
                            </TableCell>
                            <TableCell className="table-cell"></TableCell>
                          </TableRow>
                        ) : null}

                        <DataroomVisitHistory
                          viewId={view.id}
                          dataroomId={dataroomId}
                        />
                      </>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))
            ) : (
              <TableRow>
                <TableCell className="min-w-[100px]">
                  <Skeleton className="h-6 w-full" />
                </TableCell>
                <TableCell className="min-w-[450px]">
                  <Skeleton className="h-6 w-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-24" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {dataroom && teamId && exportModalOpen && (
        <ExportVisitsModal
          dataroomId={dataroomId}
          dataroomName={dataroom.name}
          teamId={teamId}
          groupId={groupId}
          groupName={name}
          onClose={() => setExportModalOpen(false)}
        />
      )}
    </div>
  );
}
