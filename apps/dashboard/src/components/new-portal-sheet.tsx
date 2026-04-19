import { useRouter } from "@tanstack/react-router"
import * as React from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet"
import { createPortal } from "~/lib/server/create-portal"

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

export function NewPortalSheet() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  const [form, setForm] = React.useState<FormData>(INITIAL_FORM)
  const [submitting, setSubmitting] = React.useState(false)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function reset() {
    setStep(1)
    setForm(INITIAL_FORM)
    setSubmitting(false)
  }

  async function handleCreate() {
    setSubmitting(true)
    try {
      await createPortal({
        data: {
          client_name: form.clientName,
          client_email: form.clientEmail,
          drive_folder_id: form.driveFolderId,
          brand_color: form.brandColor,
        },
      })
      setOpen(false)
      reset()
      router.invalidate()
    } finally {
      setSubmitting(false)
    }
  }

  const canNext =
    step === 1 ||
    (step === 2 && form.agencyName.trim() !== "") ||
    (step === 3 && form.clientName.trim() !== "" && form.clientEmail.trim() !== "") ||
    step === 4

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <SheetTrigger render={<Button />}>+ New portal</SheetTrigger>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New portal</SheetTitle>
          <SheetDescription>
            Step {step} of {TOTAL_STEPS}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-1 py-4">
          {step === 1 && <StepConnectDrive />}
          {step === 2 && <StepBranding form={form} set={set} />}
          {step === 3 && <StepClientDetails form={form} set={set} />}
          {step === 4 && <StepReview form={form} />}
        </div>

        <SheetFooter>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Button disabled={submitting} onClick={handleCreate}>
              {submitting ? "Creating…" : "Create & send invite"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function StepConnectDrive() {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Connect Google Drive</h3>
      <p className="text-sm text-muted-foreground">
        Share your client's Drive folder with the Portava service account so we can create the
        portal structure and watch for new deliverables.
      </p>
      <div className="rounded-lg border bg-muted/50 px-4 py-3 font-mono text-sm select-all">
        portava@portava-app.iam.gserviceaccount.com
      </div>
      <p className="text-sm text-muted-foreground">
        Grant <strong>Editor</strong> access so Portava can create subfolders automatically.
      </p>
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
      <h3 className="font-medium">Agency branding</h3>
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
      <h3 className="font-medium">Client details</h3>
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
      <div className="space-y-2">
        <Label htmlFor="drive-folder">Drive folder URL or ID</Label>
        <Input
          id="drive-folder"
          value={form.driveFolderId}
          onChange={(e) => set("driveFolderId", e.target.value)}
          placeholder="https://drive.google.com/drive/folders/…"
        />
      </div>
    </div>
  )
}

function StepReview({ form }: { form: FormData }) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Review</h3>
      <dl className="space-y-3 text-sm">
        <ReviewRow label="Client" value={form.clientName} />
        <ReviewRow label="Email" value={form.clientEmail} />
        <ReviewRow label="Drive folder" value={form.driveFolderId || "—"} />
        <ReviewRow label="Agency" value={form.agencyName} />
        <div className="flex items-center justify-between">
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
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
