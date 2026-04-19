import { createFileRoute } from "@tanstack/react-router"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { getOverview } from "~/lib/server/overview"

export const Route = createFileRoute("/")({
  loader: () => getOverview(),
  component: OverviewPage,
})

const EVENT_LABELS: Record<string, string> = {
  file_delivered: "File delivered",
  file_approved: "File approved",
  revision_requested: "Revision requested",
  file_archived: "File archived",
  file_viewed: "File viewed",
  portal_opened: "Portal opened",
}

function OverviewPage() {
  const { metrics, attention, activity } = Route.useLoaderData()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Overview</h1>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Active portals" value={metrics.active_portals} />
        <MetricCard label="Awaiting review" value={metrics.awaiting_review} />
        <MetricCard label="Files delivered" value={metrics.files_delivered} />
        <MetricCard label="Approvals" value={metrics.approvals} />
      </div>

      {/* Needs attention */}
      {attention.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-medium">Needs attention</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Pending files</TableHead>
                <TableHead>Waiting since</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {attention.map((portal) => (
                <TableRow key={portal.id}>
                  <TableCell className="font-medium">{portal.client_name}</TableCell>
                  <TableCell>{portal.pending_count}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {portal.oldest_pending
                      ? new Date(portal.oldest_pending).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      Nudge
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {/* Recent activity */}
      <section className="space-y-3">
        <h2 className="text-base font-medium">Recent activity</h2>
        <div className="space-y-1">
          {activity.map((event) => {
            const meta = event.metadata_json as { fileName?: string } | null
            return (
              <div key={event.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{event.client_name}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {EVENT_LABELS[event.event_type] ?? event.event_type}
                    {meta?.fileName ? ` — ${meta.fileName}` : ""}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleDateString()}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-3xl font-semibold">{value}</span>
      </CardContent>
    </Card>
  )
}
