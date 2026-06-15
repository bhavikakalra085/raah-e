"use client"

import useSWR from "swr"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AdminGate } from "@/components/auth/admin-gate"
import { AdminAPI } from "@/components/admin/api"

export default function AdminBusesPage() {
  const { data, mutate, isLoading } = useSWR("/api/buses", AdminAPI.listBuses)
  const [number, setNumber] = useState("")
  const [operator, setOperator] = useState("CTU")
  const [capacity, setCapacity] = useState(40)

  async function addBus() {
    if (!number.trim()) return
    const newBus = { number: number.trim(), operator: operator.trim(), capacity: Number(capacity) || 40 }
    await AdminAPI.createBus(newBus)
    setNumber("")
    await mutate()
  }

  async function removeBus(id) {
    await AdminAPI.deleteBus(id)
    await mutate()
  }

  const buses = data || []

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <AdminGate />
      <h1 className="text-2xl font-serif font-semibold">Manage Buses</h1>

      <Card className="mt-4">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_120px_auto]">
          <Input
            placeholder="Bus Number (e.g., PB-65-1234)"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
          <Input placeholder="Operator" value={operator} onChange={(e) => setOperator(e.target.value)} />
          <Input
            type="number"
            placeholder="Capacity"
            value={capacity}
            onChange={(e) => setCapacity(Number.parseInt(e.target.value))}
          />
          <Button onClick={addBus}>Add Bus</Button>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading buses…</p>
        ) : buses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No buses yet. Add your first bus above.</p>
        ) : (
          buses.map((b) => (
            <Card key={b._id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{b.number}</div>
                  <div className="text-sm text-muted-foreground">
                    {b.operator || "Operator"} • Capacity {b.capacity}
                  </div>
                </div>
                <Button variant="destructive" onClick={() => removeBus(b._id)}>
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
