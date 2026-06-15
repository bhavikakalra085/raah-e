// src/pages/LostFoundPage.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";
const LOST_ITEM_OPTIONS = [
  "Phone",
  "Wallet",
  "Bag",
  "Keys",
  "Water Bottle",
  "ID Card",
  "Umbrella",
  "Earbuds/Headphones",
  "Clothing",
  "Other",
];

function readUserRole() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw || raw === "null" || raw === "undefined") return null;
    const u = JSON.parse(raw);
    return u?.role || null;
  } catch {
    return null;
  }
}
function authHeader() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
function fmtDate(d) {
  try {
    const dt = new Date(d);
    return dt.toLocaleString();
  } catch {
    return d;
  }
}

export default function LostFoundPage() {
  const role = useMemo(() => (readUserRole() || "").toLowerCase(), []);
  const isAdmin = role === "admin";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Lost &amp; Found</h1>
      {isAdmin ? <AdminLostFound /> : <UserLostFound />}
    </div>
  );
}

/* ------------------ USER VIEW ------------------ */
function UserLostFound() {
  const [busNumber, setBusNumber] = useState("");
  const [dateOfLoss, setDateOfLoss] = useState("");      // "YYYY-MM-DD"
  const [approxTime, setApproxTime] = useState("");      // "HH:mm"
  const [itemType, setItemType] = useState("Phone");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [mine, setMine] = useState([]);
  const [loadingMine, setLoadingMine] = useState(true);

  async function loadMine() {
    setLoadingMine(true);
    try {
      const res = await fetch(`${API_BASE}/api/lostfound/mine`, {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      const json = await res.json();
      if (json.ok) setMine(json.complaints || []);
    } catch (e) {
      // noop
    } finally {
      setLoadingMine(false);
    }
  }

  useEffect(() => {
    loadMine();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setOkMsg("");

    if (!busNumber.trim()) return setErr("Bus number is required");
    if (!dateOfLoss) return setErr("Date is required");
    if (!itemType) return setErr("Item type is required");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/lostfound`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          busNumber: busNumber.trim(),
          dateOfLoss, // send "YYYY-MM-DD"
          approxTime: approxTime || "",
          itemType,
          description,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to submit");
      setOkMsg("Complaint submitted successfully.");
      setBusNumber("");
      setDateOfLoss("");
      setApproxTime("");
      setItemType("Phone");
      setDescription("");
      loadMine();
    } catch (e) {
      setErr(e.message || "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="p-4 border rounded mb-6">
        <h2 className="font-semibold mb-3">Register Lost Item</h2>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Bus Number</span>
            <input
              className="border rounded px-3 py-2"
              value={busNumber}
              onChange={(e) => setBusNumber(e.target.value)}
              placeholder="e.g. PB-XX-1234"
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Date</span>
              <input
                type="date"
                className="border rounded px-3 py-2"
                value={dateOfLoss}
                onChange={(e) => setDateOfLoss(e.target.value)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Approx Time</span>
              <input
                type="time"
                className="border rounded px-3 py-2"
                value={approxTime}
                onChange={(e) => setApproxTime(e.target.value)}
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-sm">Item</span>
            <select
              className="border rounded px-3 py-2"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
            >
              {LOST_ITEM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm">Additional Information</span>
            <textarea
              className="border rounded px-3 py-2"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item, seat/area, color, brand, etc."
            />
          </label>

          {err && <div className="text-red-600 text-sm">{err}</div>}
          {okMsg && <div className="text-green-700 text-sm">{okMsg}</div>}

          <div className="flex justify-end">
            <button
              className={`px-4 py-2 rounded text-white ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
              disabled={loading}
              type="submit"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>

      <div className="p-4 border rounded">
        <h2 className="font-semibold mb-3">My Complaints</h2>
        {loadingMine ? (
          <div className="text-gray-600">Loading…</div>
        ) : mine.length === 0 ? (
          <div className="text-gray-500 text-sm">No complaints yet.</div>
        ) : (
          <div className="space-y-3">
            {mine.map((c) => (
              <div key={c._id} className="border rounded p-3">
                <div className="flex justify-between">
                  <div className="font-medium">
                    {c.itemType} · Bus {c.busNumber}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${c.status === "open" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                    {c.status}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Date: {new Date(c.dateOfLoss).toLocaleDateString()} {c.approxTime ? `• ${c.approxTime}` : ""}
                </div>
                {c.description && <div className="text-sm mt-1">{c.description}</div>}
                {c.status === "resolved" && (
                  <div className="mt-2 text-sm">
                    <div><b>Pickup station:</b> {c.pickupStationCity || "—"}</div>
                    {c.resolutionNote && <div><b>Note:</b> {c.resolutionNote}</div>}
                    {c.resolvedAt && <div className="text-xs text-gray-500">Resolved: {fmtDate(c.resolvedAt)}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------ ADMIN VIEW ------------------ */
function AdminLostFound() {
  const [list, setList] = useState([]);
  const [statusFilter, setStatusFilter] = useState("open"); // open | resolved | all
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveItem, setResolveItem] = useState(null);
  const [pickupCity, setPickupCity] = useState("");
  const [note, setNote] = useState("");
  const [resolving, setResolving] = useState(false);

  async function fetchList() {
    setLoading(true);
    setErr("");
    try {
      const q = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const res = await fetch(`${API_BASE}/api/lostfound${q}`, {
        headers: { "Content-Type": "application/json", ...authHeader() },
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to load");
      setList(json.complaints || []);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function openResolve(item) {
    setResolveItem(item);
    setPickupCity("");
    setNote("");
    setResolveOpen(true);
  }

  async function submitResolve(e) {
    e.preventDefault();
    if (!resolveItem) return;
    setResolving(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/lostfound/${resolveItem._id}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ pickupStationCity: pickupCity, resolutionNote: note }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Resolve failed");
      setResolveOpen(false);
      setResolveItem(null);
      await fetchList();
    } catch (e) {
      setErr(e.message || "Resolve failed");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm">Status</label>
        <select
          className="border rounded px-2 py-1"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
        <button onClick={fetchList} className="ml-2 px-3 py-1 rounded bg-gray-100">Refresh</button>
      </div>

      {err && <div className="text-red-600">{err}</div>}
      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : list.length === 0 ? (
        <div className="text-gray-500 text-sm">No records.</div>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <div key={c._id} className="border rounded p-3">
              <div className="flex justify-between">
                <div className="font-medium">
                  {c.itemType} · Bus {c.busNumber}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${c.status === "open" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                  {c.status}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                By: {c.userName || c.userEmail || c.userPhone || "User"} • {new Date(c.dateOfLoss).toLocaleDateString()} {c.approxTime ? `• ${c.approxTime}` : ""}
              </div>
              {c.description && <div className="text-sm mt-1">{c.description}</div>}

              {c.status === "resolved" ? (
                <div className="mt-2 text-sm">
                  <div><b>Pickup station:</b> {c.pickupStationCity || "—"}</div>
                  {c.resolutionNote && <div><b>Note:</b> {c.resolutionNote}</div>}
                  {c.resolvedAt && <div className="text-xs text-gray-500">Resolved: {fmtDate(c.resolvedAt)}</div>}
                </div>
              ) : (
                <div className="mt-3">
                  <button onClick={() => openResolve(c)} className="px-3 py-1 text-white bg-green-600 rounded text-sm">
                    Mark Resolved
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolve modal */}
      {resolveOpen && resolveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setResolveOpen(false)} />
          <div className="relative z-10 bg-white max-w-md w-full rounded shadow-lg p-5">
            <h3 className="text-lg font-semibold mb-2">Resolve Complaint</h3>
            <div className="text-sm mb-3 text-gray-700">
              {resolveItem.itemType} · Bus {resolveItem.busNumber} • {new Date(resolveItem.dateOfLoss).toLocaleDateString()}
            </div>

            <form onSubmit={submitResolve} className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Pickup Station City</span>
                <input
                  className="border rounded px-3 py-2"
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  placeholder="e.g. Ludhiana Depot"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Note to user (optional)</span>
                <textarea
                  className="border rounded px-3 py-2"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Where to collect, hours, contact, etc."
                />
              </label>

              {err && <div className="text-red-600 text-sm">{err}</div>}
              <div className="flex items-center justify-end gap-2 mt-1">
                <button type="button" onClick={() => setResolveOpen(false)} className="px-3 py-1 border rounded">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className={`px-4 py-1 rounded text-white ${resolving ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
                >
                  {resolving ? "Resolving..." : "Resolve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
