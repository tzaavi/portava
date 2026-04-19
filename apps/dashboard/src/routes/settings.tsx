import { createFileRoute, useRouter } from "@tanstack/react-router"
import * as React from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { getAgencySettings, updateAgencySettings } from "~/lib/server/settings"

export const Route = createFileRoute("/settings")({
  loader: () => getAgencySettings(),
  component: SettingsPage,
})

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter — $29/mo",
  pro: "Pro — $59/mo",
  agency: "Agency — $119/mo",
}

const NOTIFICATION_OPTIONS = [
  { value: "immediate", label: "Immediate", description: "Email on every client action" },
  { value: "digest", label: "Weekly digest", description: "Monday 9am summary" },
  { value: "dashboard", label: "Dashboard only", description: "No emails" },
]

function SettingsPage() {
  const agency = Route.useLoaderData()
  const router = useRouter()

  const branding = agency.branding_json as {
    primaryColor?: string
    logoUrl?: string | null
    notifications?: string
  } | null

  const [name, setName] = React.useState(agency.name)
  const [brandColor, setBrandColor] = React.useState(branding?.primaryColor ?? "#6366f1")
  const [logoUrl, setLogoUrl] = React.useState(branding?.logoUrl ?? "")
  const [notifications, setNotifications] = React.useState(branding?.notifications ?? "immediate")
  const [saving, setSaving] = React.useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateAgencySettings({
        data: { name, brand_color: brandColor, logo_url: logoUrl, notifications },
      })
      router.invalidate()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Shown to clients in their portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agency-name">Agency name</Label>
            <Input
              id="agency-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-color">Brand color</Label>
            <div className="flex items-center gap-3">
              <input
                id="brand-color"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
              />
              <span className="font-mono text-sm text-muted-foreground">{brandColor}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo URL</Label>
            <Input
              id="logo-url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Subdomain */}
      <Card>
        <CardHeader>
          <CardTitle>Subdomain</CardTitle>
          <CardDescription>Your agency's portal URL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {agency.subdomain ? (
            <div className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-3 py-1.5 font-mono text-sm">
              {agency.subdomain}.portava.io
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Claim a subdomain on the Starter plan or above.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Drive connection */}
      <Card>
        <CardHeader>
          <CardTitle>Google Drive</CardTitle>
          <CardDescription>Service account used to manage portal folders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm">Connected</span>
          </div>
          <div className="rounded-lg border bg-muted/50 px-4 py-3 font-mono text-sm select-all">
            {agency.drive_service_account_email ?? "portava@portava-app.iam.gserviceaccount.com"}
          </div>
        </CardContent>
      </Card>

      {/* Notification preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>How you want to hear about client activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {NOTIFICATION_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="notifications"
                  value={opt.value}
                  checked={notifications === opt.value}
                  onChange={() => setNotifications(opt.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan & billing */}
      <Card>
        <CardHeader>
          <CardTitle>Plan & billing</CardTitle>
          <CardDescription>Your current subscription.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm font-medium">{PLAN_LABELS[agency.plan] ?? agency.plan}</span>
          <Button variant="outline" size="sm" disabled>
            Manage billing
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}
