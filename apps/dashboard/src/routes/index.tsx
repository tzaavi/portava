import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: () => (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
    </div>
  ),
})
