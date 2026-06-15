import { AdminGate } from "@/components/auth/admin-gate"
import LiveTelemetryMap from "@/components/map/live-telemetry-map"

export default function AdminMonitorPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <AdminGate />
      <h1 className="text-2xl font-serif font-semibold">Live Monitor</h1>
      <p className="text-sm text-muted-foreground">
        View active buses in real-time on the map and inspect their latest locations.
      </p>

      {/* Live Leaflet map showing active buses via SSE stream */}
      <div className="mt-5">
        <LiveTelemetryMap />
      </div>

      <div className="mt-4 grid gap-2">
        <div className="rounded-md border bg-card px-4 py-2 text-sm">
          Bus PB-65-1234 • CTU • Last seen: 30s ago (30.7046, 76.7179)
        </div>
        <div className="rounded-md border bg-card px-4 py-2 text-sm">
          Bus PB-11-0077 • PEPSU • Last seen: 1m ago (30.7415, 76.7683)
        </div>
      </div>
    </main>
  )
}
