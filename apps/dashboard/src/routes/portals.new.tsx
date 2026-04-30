import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { CheckCircle2, ChevronLeft, Loader2 } from "lucide-react"
import * as React from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { createPortal } from "~/lib/server/create-portal"
import { shareWithServiceAccount } from "~/lib/server/share-with-service-account"
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
    <div className="mx-auto max-w-3xl space-y-8">
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

type ConnectMethod = "share" | "oauth"

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const s = document.createElement("script")
    s.src = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
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
  const [method, setMethod] = React.useState<ConnectMethod>("share")
  const [folderName, setFolderName] = React.useState<string | null>(null)

  // Service account method state
  const [testing, setTesting] = React.useState(false)
  const [testError, setTestError] = React.useState<string | null>(null)

  // OAuth method state
  const [connecting, setConnecting] = React.useState(false)
  const [connectError, setConnectError] = React.useState<string | null>(null)

  function onConnected(folderId: string, name: string) {
    set("driveFolderId", folderId)
    setFolderName(name)
    setDriveVerified(true)
  }

  function switchMethod(m: ConnectMethod) {
    setMethod(m)
    setTestError(null)
    setConnectError(null)
    if (driveVerified) {
      set("driveFolderId", "")
      setDriveVerified(false)
      setFolderName(null)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestError(null)
    setFolderName(null)
    try {
      const result = await testDriveConnection({ data: { folder_url: form.driveFolderId } })
      onConnected(form.driveFolderId, result.name)
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Could not access folder")
      setDriveVerified(false)
    } finally {
      setTesting(false)
    }
  }

  async function handleOAuth() {
    setConnecting(true)
    setConnectError(null)
    try {
      await Promise.all([
        loadScript("https://accounts.google.com/gsi/client"),
        loadScript("https://apis.google.com/js/api.js"),
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gapi = (window as any).gapi

      await new Promise<void>((resolve, reject) => {
        const tokenClient = g.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: "https://www.googleapis.com/auth/drive",
          callback: (tokenResponse: { access_token?: string; error?: string }) => {
            if (tokenResponse.error || !tokenResponse.access_token) {
              reject(new Error(tokenResponse.error ?? "Authentication cancelled"))
              return
            }

            const accessToken = tokenResponse.access_token

            gapi.load("picker", () => {
              const picker = new g.picker.PickerBuilder()
                .addView(
                  new g.picker.DocsView(g.picker.ViewId.FOLDERS)
                    .setSelectFolderEnabled(true)
                    .setMimeTypes("application/vnd.google-apps.folder"),
                )
                .setOAuthToken(accessToken)
                .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY)
                .setCallback(
                  async (data: { action: string; docs?: Array<{ id: string; name: string }> }) => {
                    if (data.action === g.picker.Action.PICKED && data.docs?.[0]) {
                      const { id: folderId, name } = data.docs[0]
                      try {
                        await shareWithServiceAccount({ data: { folder_id: folderId, access_token: accessToken } })
                        onConnected(folderId, name)
                        resolve()
                      } catch (shareErr) {
                        reject(shareErr)
                      }
                    } else if (data.action === g.picker.Action.CANCEL) {
                      reject(new Error("No folder selected"))
                    }
                  },
                )
                .build()
              picker.setVisible(true)
            })
          },
        })

        tokenClient.requestAccessToken({ prompt: "" })
      })
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Could not connect to Google Drive")
      setDriveVerified(false)
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold">Connect Google Drive</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how to give Portava access to your client's folder.
        </p>
      </div>

      {/* Method toggle */}
      <div className="flex rounded-lg border p-1 gap-1">
        <button
          type="button"
          onClick={() => switchMethod("share")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            method === "share"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Share a folder
        </button>
        <button
          type="button"
          onClick={() => switchMethod("oauth")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            method === "oauth"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Connect with Google
        </button>
      </div>

      {/* Verified state — shown above both panels */}
      {driveVerified && folderName && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Connected to <span className="font-medium">{folderName}</span>
        </div>
      )}

      {/* Service account panel */}
      {method === "share" && (
        <div className="space-y-4">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              Portava only sees the folder you share — nothing else in your Drive
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              You stay in control: revoke access anytime by removing the share
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              No Google sign-in required — works even when you're logged out
            </li>
          </ul>

          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Share this folder with
            </p>
            <div className="rounded-lg border bg-muted/50 px-4 py-3 font-mono text-sm select-all">
              portava-drive@portava-stage.iam.gserviceaccount.com
            </div>
            <p className="text-xs text-muted-foreground">
              Grant <strong>Editor</strong> access so Portava can create subfolders automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drive-folder">Folder URL or ID</Label>
            <div className="flex gap-2">
              <Input
                id="drive-folder"
                value={form.driveFolderId}
                onChange={(e) => {
                  set("driveFolderId", e.target.value)
                  setDriveVerified(false)
                  setFolderName(null)
                }}
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
            {testError && <p className="text-sm text-destructive">{testError}</p>}
          </div>
        </div>
      )}

      {/* OAuth panel */}
      {method === "oauth" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Don't want to manually share a folder with Portava? Use this option instead — pick your
            client's folder from the Drive picker and Portava will automatically set up the share
            for you.
          </p>
          <p className="text-xs text-muted-foreground">
            This requires temporarily granting Portava access to your Google Drive. We only use it
            to share the folder you pick — nothing else is read or modified. If you'd rather not
            grant Drive access, use the <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => switchMethod("share")}>Share a folder</button> option instead.
          </p>

          {!driveVerified && (
            <Button
              variant="outline"
              onClick={handleOAuth}
              disabled={connecting}
              className="flex w-full items-center justify-center gap-3 border-2"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {connecting ? "Connecting…" : "Connect with Google"}
            </Button>
          )}

          {connectError && <p className="text-sm text-destructive">{connectError}</p>}
        </div>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
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
