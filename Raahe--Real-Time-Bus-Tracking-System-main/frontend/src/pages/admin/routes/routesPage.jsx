"use client"

import useSWR from "swr"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AdminGate } from "@/components/auth/admin-gate"
import { AdminAPI } from "@/components/admin/api"

export default function AdminRoutesPage() {
  const { data, mutate, isLoading } = useSWR("/api/routes", AdminAPI.listRoutes)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [minutes, setMinutes] = useState(75) // kept in UI; not persisted in current schema

  async function addRoute() {
    if (!from.trim() || !to.trim()) return
    const payload = {
      from: from.trim(),
      to: to.trim(),
      name: ${from.trim()} → ${to.trim()},
      city: "Chandigarh",
      stops: [],
      path: [],
      isActive: true,
    }
    await AdminAPI.createRoute(payload)
    setFrom("")
    setTo("")
    await mutate()
  }

  async function removeRoute(id) {
    await AdminAPI.deleteRoute(id)
    await mutate()
  }

  const rows = data || []

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminGate />
      <h1 className="text-2xl font-serif font-semibold">Manage Routes</h1>

      <Card className="mt-4">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_120px_auto]">
          <Input placeholder="From" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input
            type="number"
            placeholder="Duration (min)"
            value={minutes}
            onChange={(e) => setMinutes(Number.parseInt(e.target.value))}
          />
          <Button onClick={addRoute}>Add Route</Button>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading routes…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No routes yet. Add your first route above.</p>
        ) : (
          rows.map((r) => (
            <Card key={r._id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">
                    {r.from} → {r.to}
                  </div>
                  <div className="text-sm text-muted-foreground">{minutes} min</div>
                </div>
                <Button variant="destructive" onClick={() => removeRoute(r._id)}>
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  )
}
