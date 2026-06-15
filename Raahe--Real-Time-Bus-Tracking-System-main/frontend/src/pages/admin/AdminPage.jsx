// src/pages/AdminDriversPage.jsx
import React, { useEffect, useState } from "react";

/**
 * AdminDriversPage (with role check + Punjab cities dropdown for stops)
 */

const PUNJAB_CITIES = [
  { name: "Amritsar", lat: 31.6339793, lng: 74.8722641 },
  { name: "Ludhiana", lat: 30.9009658, lng: 75.8572752 },
  { name: "Jalandhar", lat: 31.326015, lng: 75.576182 },
  { name: "Patiala", lat: 30.3398, lng: 76.3869 },
  { name: "Bathinda", lat: 30.2110, lng: 74.9455 },
  { name: "Mohali (SAS Nagar)", lat: 30.7046, lng: 76.7179 },
  { name: "Hoshiarpur", lat: 31.5326, lng: 75.9139 },
  { name: "Pathankot", lat: 32.2734, lng: 75.6520 },
  { name: "Moga", lat: 30.8165, lng: 75.1710 },
  { name: "Kapurthala", lat: 31.3797, lng: 75.3847 },
  { name: "Firozpur", lat: 30.9168, lng: 74.6130 },
  { name: "Faridkot", lat: 30.6769, lng: 74.7554 },
  { name: "Rupnagar (Ropar)", lat: 30.9659, lng: 76.5330 },
  { name: "Barnala", lat: 30.3771, lng: 75.5536 },
  { name: "Sangrur", lat: 30.2450, lng: 75.8421 },
  { name: "Tarn Taran", lat: 31.4515, lng: 74.9333 },
  { name: "Fazilka", lat: 30.4032, lng: 74.5736 },
  { name: "Muktsar", lat: 30.4700, lng: 74.5206 },
];

export default function AdminPage() {
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [error, setError] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // assign modal state
  const [useExisting, setUseExisting] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState("");

  // ⬇️ newStops now stores chosen Punjab cities
  const [newRouteName, setNewRouteName] = useState("");
  const [newStops, setNewStops] = useState([{ cityName: "", lat: null, lng: null }]);

  // role detection
  const [isAdmin, setIsAdmin] = useState(null);
  const [checkingRole, setCheckingRole] = useState(false);

  const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";
  const storedToken = localStorage.getItem("token");
  const authHeader = { Authorization: `Bearer ${storedToken}` };

  useEffect(() => {
    let mounted = true;
    async function detectRole() {
      setCheckingRole(true);
      try {
        if (!storedToken) {
          if (mounted) setIsAdmin(false);
          return;
        }

        function parseJwtPayload(token) {
          try {
            const parts = token.split(".");
            if (parts.length < 2) return null;
            let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            while (b64.length % 4) b64 += "=";
            const str = atob(b64);
            const decoded = decodeURIComponent(
              str
                .split("")
                .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
                .join("")
            );
            return JSON.parse(decoded);
          } catch {
            return null;
          }
        }

        const payload = parseJwtPayload(storedToken);
        if (payload?.role) {
          const allowed = ["admin", "superadmin", "manager"];
          if (mounted) setIsAdmin(allowed.includes(String(payload.role).toLowerCase()));
          return;
        }

        const tryEndpoints = ["/api/auth/me", "/api/me", "/api/user/me", "/api/profile"];
        for (const ep of tryEndpoints) {
          try {
            const url = `${API_BASE}${ep}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${storedToken}` } });
            if (!res.ok) continue;
            const json = await res.json();
            const role = json?.user?.role ?? json?.role ?? json?.data?.role;
            if (role) {
              const allowed = ["admin", "superadmin", "manager"];
              if (mounted) setIsAdmin(allowed.includes(String(role).toLowerCase()));
              return;
            }
          } catch {
            // try next
          }
        }
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setCheckingRole(false);
      }
    }
    detectRole();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedToken]);

  async function parseResponse(res) {
    if (!res) return { ok: false, _missing: true, message: "No response" };
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try { return await res.json(); } catch { return { ok: false, _invalidJson: true, status: res.status }; }
    }
    const text = await res.text();
    return { ok: false, _nonJson: true, status: res.status, bodyText: text };
  }

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [dRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/drivers`, { headers: { ...authHeader } }),
        fetch(`${API_BASE}/api/admin/routes`, { headers: { ...authHeader } }),
      ]);
      const dJson = await parseResponse(dRes);
      const rJson = await parseResponse(rRes);

      if (!dJson.ok) throw new Error(dJson.message || "Failed to load drivers");
      if (!rJson.ok) throw new Error(rJson.message || "Failed to load routes");

      setDrivers(dJson.drivers || []);
      setRoutes(rJson.routes || []);
    } catch (err) {
      console.error("fetchData error:", err);
      setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin === true) fetchData();
    else if (isAdmin === false) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const unassigned = drivers.filter((d) => !d.route);
  const assigned = drivers.filter((d) => d.route);
  const [vehicleNumber, setVehicleNumber] = useState("");

  function openAssign(driver) {
    setSelectedDriver(driver);
    setUseExisting(Boolean(driver.route));
    setSelectedRouteId(driver.route?._id || "");
    setNewRouteName("");
    // reset to one empty dropdown row
    setNewStops([{ cityName: "", lat: null, lng: null }]);
    setVehicleNumber(driver.vehicleNumber || "");
    setShowAssignModal(true);
    setError("");
    setStartTime(driver.route?.startTime || "");
    setEndTime(driver.route?.endTime || "");
  }

  // 🔽 Dropdown helpers
  function addStopRow() {
    setNewStops((s) => [...s, { cityName: "", lat: null, lng: null }]);
  }

  function selectCity(idx, cityName) {
    const city = PUNJAB_CITIES.find((c) => c.name === cityName) || null;
    setNewStops((s) =>
      s.map((row, i) =>
        i === idx
          ? { cityName, lat: city?.lat ?? null, lng: city?.lng ?? null }
          : row
      )
    );
  }

  function removeStop(i) {
    setNewStops((s) => s.filter((_, idx) => idx !== i));
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!selectedDriver) return;
    setError("");

    try {
      let body;
      if (useExisting) {
        if (!selectedRouteId) throw new Error("Select a route");
        body = { routeId: selectedRouteId };
      } else {
        if (!newRouteName.trim()) throw new Error("Provide a route name");

        const stopsClean = newStops
          .filter((s) => s.cityName) // only rows where a city is chosen
          .map((s, idx) => ({
            name: s.cityName,
            lat: s.lat,
            lng: s.lng,
            order: idx,
          }));

        if (stopsClean.length === 0) {
          throw new Error("Add at least one stop (choose a city).");
        }

        body = {
          route: {
            fullName: newRouteName.trim(),
            stops: stopsClean,
            startTime,
            endTime,
          },
        };
      }

      const res = await fetch(
        `${API_BASE}/api/admin/driver/${selectedDriver._id}/assign-route`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(body),
        }
      );

      const json = await parseResponse(res);
      if (!json.ok) throw new Error(json.message || "Assign failed");

      await fetchData();
      setShowAssignModal(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Assign failed");
    }
  }

  if (isAdmin === null || checkingRole) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Admin — Manage Drivers & Routes</h1>
        <div className="text-gray-600">Checking account role…</div>
      </div>
    );
  }

  if(!storedToken){
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h2 className="text-2xl font-semibold mb-3">You are not logged in</h2>
        <div className="p-4 bg-yellow-50 border rounded">
          <p className="mb-2">This dashboard is only available to users registered as <strong>Administrators</strong>.</p>
          <p className="text-sm text-gray-600">You must log in as a Admin in order to access this page</p>
        </div>
        {/* <Link to='/'></Link> */}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Admin — Manage Drivers & Routes</h1>
        <div className="p-4 bg-yellow-50 border rounded">
          <p className="mb-2">Access restricted — this page is for administrators only.</p>
          <p className="text-sm text-gray-600">
            Your account role does not appear to be an administrator. If you believe you should have access, contact an administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Admin — Manage Drivers & Routes</h1>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600 mb-3">{error}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-2">Unassigned Drivers</h2>
          <div className="space-y-3">
            {unassigned.length === 0 && <div className="text-sm text-gray-500">None</div>}
            {unassigned.map((d) => (
              <div key={d._id} className="p-3 border rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.fullName}</div>
                  <div className="text-xs text-gray-600 mt-2">Vehicle: {d.vehicleNumber}</div>
                  <div className="text-xs text-gray-600 mt-1">License: {d.licenseNumber}</div>
                </div>
                <div>
                  <button onClick={() => openAssign(d)} className="px-3 py-1 bg-blue-600 text-white rounded">
                    Assign Route
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Assigned Drivers</h2>
          <div className="space-y-3">
            {assigned.length === 0 && <div className="text-sm text-gray-500">None</div>}
            {assigned.map((d) => (
              <div key={d._id} className="p-3 border rounded">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{d.fullName}</div>
                    <div className="flex gap-4">
                      <div className="text-xs text-gray-600">Vehicle: {d.vehicleNumber}</div>
                      <div className="text-xs text-gray-600">{d.email}</div>
                    </div>
                    <div className="text-sm mt-2 font-medium">{d.route?.fullName || d.route?.name}</div>
                    <div className="mt-1 flex gap-4">
                      <div className="text-xs text-gray-500">
                        {d.route?.stops?.map((s) => s.name).join(" → ")}
                      </div>
                      <div className="text-xs text-gray-600">
                        Time: {d.route?.startTime} → {d.route?.endTime}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => openAssign(d)} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm">
                      Reassign
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Assign modal */}
      {showAssignModal && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAssignModal(false)} />
          <div className="relative z-10 bg-white max-w-2xl w-full rounded shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Assign route to {selectedDriver.fullName || selectedDriver.name || "Driver"}</h3>

            <form onSubmit={handleAssign} className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={useExisting} onChange={() => setUseExisting(true)} />
                  <span className="text-sm">Use existing route</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={!useExisting} onChange={() => setUseExisting(false)} />
                  <span className="text-sm">Create new route</span>
                </label>
              </div>

              {useExisting ? (
                <div>
                  <select
                    className="w-full border rounded p-2"
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                  >
                    <option value="">-- select route --</option>
                    {routes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.fullName || r.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block mb-2">Route name</label>
                  <input
                    value={newRouteName}
                    onChange={(e) => setNewRouteName(e.target.value)}
                    className="w-full border rounded p-2"
                    placeholder="Route name (e.g. Amritsar → Ludhiana)"
                  />

                  {/* 🔽 Punjab city dropdowns */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">Stops</div>
                      <button type="button" onClick={addStopRow} className="text-sm text-blue-600">+ Add stop</button>
                    </div>

                    <div className="space-y-2">
                      {newStops.map((s, idx) => (
                        <div key={idx} className="flex gap-2">
                          <select
                            className="flex-1 border rounded p-2"
                            value={s.cityName}
                            onChange={(e) => selectCity(idx, e.target.value)}
                          >
                            <option value="">-- choose city --</option>
                            {PUNJAB_CITIES.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={() => removeStop(idx)} className="px-2 bg-red-100 rounded">X</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block mb-1">Starting Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full border rounded p-2"
                    />

                    <label className="block mt-3 mb-1">Estimated Ending Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full border rounded p-2"
                    />
                  </div>
                </div>
              )}

              {error && <div className="text-red-600">{error}</div>}

              <div className="flex items-center justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-3 py-2 border rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">Assign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
