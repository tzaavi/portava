import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import { CheckCircle2, ChevronLeft, Loader2 } from "lucide-react"
import * as React from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { createPortal } from "~/lib/server/create-portal"
import { testDriveConnection } from "~/lib/server/test-drive-connection"

const TOTAL_STEPS = 4

interface FormData {
  agencyName: string
  brandColor: string
  clientName: string
  clientEmail: string
  driveFolderId: string
}

const INITIAL_FORM: FormData = {
  agencyName: "Studio Nine",
  brandColor: "#6366f1",
  clientName: "",
  clientEmail: "",
  driveFolderId: "",
}

export const Route = createFileRoute("/portals/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    step: Math.min(TOTAL_STEPS, Math.max(1, Number(search.step) || 1)),
  }),
  component: NewPortalPage,
})

function NewPortalPage() {
  const { step } = Route.useSearch()
  const navigate = useNavigate({ from: "/portals/new" })
  const [form, setForm] = React.useState<FormData>(INITIAL_FORM)
  const [driveVerified, setDriveVerified] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (key === "driveFolderId") setDriveVerified(false)
  }

  function goTo(s: number) {
    setError(null)
    navigate({ search: { step: s } })
  }

  async function handleCreate() {
    setSubmitting(true)
    setError(null)
    try {
      await createPortal({
        data: {
          client_name: form.clientName,
          client_email: form.clientEmail,
          drive_folder_id: form.driveFolderId,
          brand_color: form.brandColor,
        },
      })
      navigate({ to: "/portals" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const canNext =
    (step === 1 && form.driveFolderId.trim() !== "" && driveVerified) ||
    (step === 2 && form.agencyName.trim() !== "") ||
    (step === 3 && form.clientName.trim() !== "" && form.clientEmail.trim() !== "") ||
    step === 4

  return (
    <div className="mx-auto max-w-xl space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/portals" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Portals
        </Link>
        <span>/</span>
        <span className="text-foreground">New portal</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">New portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i + 1 <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        {step === 1 && (
          <StepConnectDrive
            form={form}
            set={set}
            driveVerified={driveVerified}
            setDriveVerified={setDriveVerified}
          />
        )}
        {step === 2 && <StepBranding form={form} set={set} />}
        {step === 3 && <StepClientDetails form={form} set={set} />}
        {step === 4 && <StepReview form={form} />}
      </div>

      {/* Error */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Navigation */}
      <div className="flex justify-between">
        {step > 1 ? (
          <Button variant="outline" onClick={() => goTo(step - 1)}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {step < TOTAL_STEPS ? (
          <Button disabled={!canNext} onClick={() => goTo(step + 1)}>
            Continue
          </Button>
        ) : (
          <Button disabled={submitting || !canNext} onClick={handleCreate}>
            {submitting ? "Creating…" : "Create & send invite"}
          </Button>
        )}
      </div>
    </div>
  )
}

function StepConnectDrive({
  form,
  set,
  driveVerified,
  setDriveVerified,
}: {
  form: FormData
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void
  driveVerified: boolean
  setDriveVerified: (v: boolean) => void
}) {
  const [testing, setTesting] = React.useState(false)
  const [testError, setTestError] = React.useState<string | null>(null)
  const [folderName, setFolderName] = React.useState<string | null>(null)

  async function handleTest() {
    setTesting(true)
    setTestError(null)
    setFolderName(null)
    try {
      const result = await testDriveConnection({ data: { folder_url: form.driveFolderId } })
      setFolderName(result.name)
      setDriveVerified(true)
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Could not access folder")
      setDriveVerified(false)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold">Connect Google Drive</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your client's Drive folder with the Portava service account, then paste the folder
          URL below to verify access.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Service account email
        </p>
        <div className="rounded-lg border bg-muted/50 px-4 py-3 font-mono text-sm select-all">
          portava-drive@portava-stage.iam.gserviceaccount.com
        </div>
        <p className="text-xs text-muted-foreground">
          Grant <strong>Editor</strong> access so Portava can create subfolders automatically.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="drive-folder">Drive folder URL or ID</Label>
        <div className="flex gap-2">
          <Input
            id="drive-folder"
            value={form.driveFolderId}
            onChange={(e) => set("driveFolderId", e.target.value)}
            placeholder="https://drive.google.com/drive/folders/…"
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || form.driveFolderId.trim() === ""}
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test"}
          </Button>
        </div>

        {driveVerified && folderName && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            Connected to <span className="font-medium">{folderName}</span>
          </div>
        )}

        {testError && <p className="text-sm text-destructive">{testError}</p>}
      </div>
    </div>
  )
}

function StepBranding({
  form,
  set,
}: {
  form: FormData
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Agency branding</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This branding will be shown to your client in their portal.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="agency-name">Agency name</Label>
        <Input
          id="agency-name"
          value={form.agencyName}
          onChange={(e) => set("agencyName", e.target.value)}
          placeholder="Your agency name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="brand-color">Brand color</Label>
        <div className="flex items-center gap-3">
          <input
            id="brand-color"
            type="color"
            value={form.brandColor}
            onChange={(e) => set("brandColor", e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
          />
          <span className="font-mono text-sm text-muted-foreground">{form.brandColor}</span>
        </div>
      </div>
    </div>
  )
}

function StepClientDetails({
  form,
  set,
}: {
  form: FormData
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Client details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about the client this portal is for.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="client-name">Client name</Label>
        <Input
          id="client-name"
          value={form.clientName}
          onChange={(e) => set("clientName", e.target.value)}
          placeholder="e.g. Acme Corp"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client-email">Client email</Label>
        <Input
          id="client-email"
          type="email"
          value={form.clientEmail}
          onChange={(e) => set("clientEmail", e.target.value)}
          placeholder="e.g. hello@acme.com"
        />
      </div>
    </div>
  )
}

function StepReview({ form }: { form: FormData }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Review</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything look right? We'll create the folders and send an invite.
        </p>
      </div>
      <dl className="divide-y text-sm">
        <ReviewRow label="Drive folder" value={form.driveFolderId} />
        <ReviewRow label="Client" value={form.clientName} />
        <ReviewRow label="Email" value={form.clientEmail} />
        <ReviewRow label="Agency" value={form.agencyName} />
        <div className="flex items-center justify-between py-3">
          <dt className="text-muted-foreground">Brand color</dt>
          <dd className="flex items-center gap-2">
            <span
              className="inline-block h-4 w-4 rounded-full border"
              style={{ backgroundColor: form.brandColor }}
            />
            <span className="font-mono">{form.brandColor}</span>
          </dd>
        </div>
      </dl>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
