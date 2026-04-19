import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/settings")({
  component: () => (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
    </div>
  ),
})
