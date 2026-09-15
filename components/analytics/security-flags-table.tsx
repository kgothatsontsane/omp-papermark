import { timeAgo } from "@/lib/utils";

import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useDataroomInsights } from "@/lib/swr/use-insights";
import { TInsightsData } from "@/lib/swr/use-insights";

import { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

function severityVariant(severity: string): BadgeVariant {
  switch (severity.toLowerCase()) {
    case "high":
    case "critical":
      return "destructive";
    case "medium":
      return "secondary";
    default:
      return "outline";
  }
}

export function SecurityFlagsTable({
  flags,
}: {
  flags: TInsightsData["security"];
}) {
  if (!flags || flags.length === 0) {
    return (
      <div className="flex h-20 w-full items-center justify-center rounded-md border">
        <p className="text-sm text-muted-foreground">No security flags</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="*:whitespace-nowrap *:font-medium hover:bg-transparent">
            <TableHead>Flag</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Detail</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flags.map((flag, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm font-medium">
                {flag.flag_type}
              </TableCell>
              <TableCell>
                <Badge variant={severityVariant(flag.severity)}>
                  {flag.severity}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[320px] truncate text-sm text-muted-foreground">
                {flag.detail}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <time
                  dateTime={new Date(flag.timestamp).toISOString()}
                  title={new Date(flag.timestamp).toLocaleString()}
                >
                  {timeAgo(new Date(flag.timestamp))}
                </time>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function DataroomSecuritySection({ dataroomId }: { dataroomId: string }) {
  const { insights, loading } = useDataroomInsights();

  if (loading) {
    return (
      <div>
        <h3 className="mb-4 text-lg font-medium">Security</h3>
        <div className="flex h-20 w-full items-center justify-center rounded-md border">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-dataroom-id={dataroomId}>
      <h3 className="mb-4 text-lg font-medium">Security</h3>
      <SecurityFlagsTable flags={insights?.flags ?? []} />
    </div>
  );
}
