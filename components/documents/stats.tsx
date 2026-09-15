import { useRouter, useSearchParams } from "next/navigation";

import { useState } from "react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { useDocumentInsights } from "@/lib/swr/use-insights";
import { useDocumentLinks } from "@/lib/swr/use-document";
import { useStats } from "@/lib/swr/use-stats";

import DocumentInsights from "../analytics/document-insights";
import InternalListManager from "../analytics/internal-list-manager";
import StatsCard from "./stats-card";
import StatsChart from "./stats-chart";

export const StatsComponent = ({
  documentId,
  numPages,
  isVideo = false,
}: {
  documentId: string;
  numPages: number;
  isVideo?: boolean;
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialExclude = searchParams?.get("excludeInternal") === "true";
  const [excludeTeamMembers, setExcludeTeamMembers] =
    useState<boolean>(initialExclude);

  const statsData = useStats({ excludeTeamMembers });
  const { insights } = useDocumentInsights(documentId);
  const { links } = useDocumentLinks();

  const onToggle = (checked: boolean) => {
    setExcludeTeamMembers(checked);
    const params = new URLSearchParams(searchParams?.toString());
    params.set("excludeInternal", checked.toString());
    router.push(`${documentId}/?${params.toString()}`);
  };

  return (
    <>
      <div className="flex items-center justify-end space-x-2">
        <Switch
          disabled={statsData.loading || statsData.error}
          id="toggle-stats"
          checked={excludeTeamMembers}
          onCheckedChange={onToggle}
        />
        <Label
          htmlFor="toggle-stats"
          className={excludeTeamMembers ? "" : "text-muted-foreground"}
        >
          Exclude internal visits
        </Label>
      </div>

      {/* Stats Chart */}
      <StatsChart
        documentId={documentId}
        totalPagesMax={numPages}
        statsData={statsData}
      />

      {/* Stats Card */}
      <StatsCard statsData={statsData} />

      {/* Internal list */}
      <InternalListManager links={links ?? []} />

      {/* Phase-1 insights */}
      {insights ? (
        <DocumentInsights insights={insights} isVideo={isVideo} />
      ) : null}
    </>
  );
};
