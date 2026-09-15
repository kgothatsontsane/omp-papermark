import DashboardViewsChart from "@/components/analytics/dashboard-views-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { TInsightsData } from "@/lib/swr/use-insights";

import { SecurityFlagsTable } from "./security-flags-table";

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </div>
  );
}

export function GeoCard({ geo }: { geo: TInsightsData["geo"] }) {
  if (!geo || geo.length === 0) return null;
  const top = [...geo].sort((a, b) => b.view_count - a.view_count).slice(0, 10);
  return (
    <Card title="Top countries">
      <Table>
        <TableHeader>
          <TableRow className="*:whitespace-nowrap *:font-medium hover:bg-transparent">
            <TableHead>Country</TableHead>
            <TableHead>City</TableHead>
            <TableHead className="text-right">Views</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {top.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm font-medium">
                {row.country}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.city}
              </TableCell>
              <TableCell className="text-right text-sm">
                {row.view_count}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function DeviceCard({ device }: { device: TInsightsData["device"] }) {
  if (!device || device.length === 0) return null;
  const top = [...device]
    .sort((a, b) => b.view_count - a.view_count)
    .slice(0, 10);
  return (
    <Card title="Devices">
      <Table>
        <TableHeader>
          <TableRow className="*:whitespace-nowrap *:font-medium hover:bg-transparent">
            <TableHead>Browser</TableHead>
            <TableHead>OS</TableHead>
            <TableHead>Device</TableHead>
            <TableHead className="text-right">Views</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {top.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm font-medium">
                {row.browser}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.os}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.device}
              </TableCell>
              <TableCell className="text-right text-sm">
                {row.view_count}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function ViewsOverTimeCard({
  rows,
}: {
  rows: TInsightsData["viewsOverTime"];
}) {
  if (!rows || rows.length === 0) return null;
  return (
    <Card title="Views over time">
      <DashboardViewsChart
        timeRange="30d"
        data={rows.map((r) => ({ date: r.day, views: r.view_count }))}
      />
    </Card>
  );
}

export function DropoffCard({ rows }: { rows: TInsightsData["dropoff"] }) {
  if (!rows || rows.length === 0) return null;
  const top = [...rows]
    .sort((a, b) => b.viewer_count - a.viewer_count)
    .slice(0, 10);
  return (
    <Card title="Drop-off pages">
      <Table>
        <TableHeader>
          <TableRow className="*:whitespace-nowrap *:font-medium hover:bg-transparent">
            <TableHead>Page</TableHead>
            <TableHead className="text-right">Viewers ending here</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {top.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm font-medium">
                Page {row.page_number}
              </TableCell>
              <TableCell className="text-right text-sm">
                {row.viewer_count}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function DownloadsCard({
  downloads,
  downloadRate,
}: {
  downloads: TInsightsData["downloads"];
  downloadRate: TInsightsData["downloadRate"];
}) {
  if (!downloads && !downloadRate) return null;
  const rate =
    downloadRate && downloadRate.viewers > 0
      ? Math.round((downloadRate.downloads / downloadRate.viewers) * 100)
      : 0;
  return (
    <Card title="Downloads">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-2xl font-semibold">
            {downloads?.download_count ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Downloads</p>
        </div>
        <div>
          <p className="text-2xl font-semibold">
            {downloads?.viewer_count ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Downloaders</p>
        </div>
        <div>
          <p className="text-2xl font-semibold">{rate}%</p>
          <p className="text-xs text-muted-foreground">Download rate</p>
        </div>
        <div>
          <p className="text-2xl font-semibold">
            {downloads?.total_files ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">Files</p>
        </div>
      </div>
    </Card>
  );
}

export function FunnelStrip({ funnel }: { funnel: TInsightsData["funnel"] }) {
  if (!funnel || funnel.length === 0) return null;
  const max = Math.max(...funnel.map((f) => f.event_count), 1);
  return (
    <Card title="Access funnel">
      <div className="flex flex-col gap-2">
        {funnel.map((step) => (
          <div key={step.event_type} className="flex items-center gap-2">
            <span className="w-32 truncate text-xs text-muted-foreground">
              {step.event_type}
            </span>
            <div className="h-2 flex-1 rounded bg-muted">
              <div
                className="h-2 rounded bg-emerald-500"
                style={{ width: `${(step.event_count / max) * 100}%` }}
              />
            </div>
            <span className="w-12 text-right text-xs font-medium">
              {step.event_count}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function VideoHeatmapCard({
  heatmap,
}: {
  heatmap: TInsightsData["heatmap"];
}) {
  if (!heatmap || heatmap.length === 0) return null;
  const max = Math.max(...heatmap.map((h) => h.play_count), 1);
  return (
    <Card title="Video heatmap">
      <div className="flex h-20 items-end gap-px">
        {heatmap.map((h) => (
          <div
            key={h.second}
            className="min-w-[2px] flex-1 rounded-t bg-emerald-500"
            style={{ height: `${(h.play_count / max) * 100}%` }}
            title={`Second ${h.second}: ${h.play_count} plays`}
          />
        ))}
      </div>
    </Card>
  );
}

export default function DocumentInsights({
  insights,
  isVideo,
}: {
  insights: TInsightsData;
  isVideo?: boolean;
}) {
  return (
    <div className="space-y-4">
      <FunnelStrip funnel={insights.funnel} />
      <ViewsOverTimeCard rows={insights.viewsOverTime} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GeoCard geo={insights.geo} />
        <DeviceCard device={insights.device} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DropoffCard rows={insights.dropoff} />
        <DownloadsCard
          downloads={insights.downloads}
          downloadRate={insights.downloadRate}
        />
      </div>
      {isVideo ? <VideoHeatmapCard heatmap={insights.heatmap} /> : null}
      {insights.security && insights.security.length > 0 ? (
        <Card title="Security">
          <SecurityFlagsTable flags={insights.security} />
        </Card>
      ) : null}
    </div>
  );
}
