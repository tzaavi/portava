import { createFileRoute } from "@tanstack/react-router"
import { ExternalLink } from "lucide-react"
import { NewPortalSheet } from "~/components/new-portal-sheet"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { getPortals } from "~/lib/server/portals"

export const Route = createFileRoute("/portals")({
  loader: () => getPortals(),
  component: PortalsPage,
})

function PortalsPage() {
  const portals = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portals</h1>
        <NewPortalSheet />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pending review</TableHead>
            <TableHead>Last activity</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {portals.map((portal) => (
            <TableRow key={portal.id}>
              <TableCell>
                <div className="font-medium">{portal.client_name}</div>
                <div className="text-sm text-muted-foreground">{portal.client_email}</div>
              </TableCell>
              <TableCell>
                <Badge variant={portal.status === "active" ? "default" : "secondary"}>
                  {portal.status}
                </Badge>
              </TableCell>
              <TableCell>
                {Number(portal.pending_count) > 0 ? (
                  <Badge variant="destructive">{portal.pending_count}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {portal.last_activity ? new Date(portal.last_activity).toLocaleDateString() : "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={
                      // biome-ignore lint/a11y/useAnchorContent: children rendered by Button via render prop
                      <a
                        href={`https://drive.google.com/drive/folders/${portal.id}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open in Drive"
                      />
                    }
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Drive
                  </Button>
                  <Button variant="outline" size="sm">
                    Nudge
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
