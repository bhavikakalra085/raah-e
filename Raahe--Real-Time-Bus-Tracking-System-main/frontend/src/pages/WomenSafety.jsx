// src/pages/WomenSafety.jsx
import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// Simple phone normalization helper (UI-side)
function formatPhoneForApi(raw) {
  if (!raw) return null;
  const d = raw.toString().replace(/[^+\d]/g, '');
  if (!d) return null;
  return d.startsWith('+') ? d : `+${d}`;
}

// Map preview using Google Maps embed; more robust embed params
function MapPreview({ lat, lng }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return <div className="p-3 border rounded text-xs text-gray-500">No location</div>;
  }
  const q = `${lat},${lng}`;
  const url = `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
  return (
    <div className="w-[220px] h-[140px] border rounded overflow-hidden">
      <iframe
        title="map"
        src={url}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
      />
    </div>
  );
}

// Small thumbnail reused
function MapThumb({ lat, lng }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return <div className="w-[220px] h-[140px] border rounded flex items-center justify-center text-xs text-gray-500">No location</div>;
  }
  const q = `${lat},${lng}`;
  const url = `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
  return (
    <div className="w-[220px] h-[140px] border rounded overflow-hidden mt-2">
      <iframe title="mini-map" src={url} width="100%" height="100%" style={{ border: 0 }} loading="lazy" />
    </div>
  );
}

// decode JWT payload safely (no verification) to extract name
function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch (e) {
    console.warn('decodeJwtPayload failed', e);
    return null;
  }
}

// robust token reader: checks several likely localStorage shapes
function readTokenFromStorage() {
  // common simple keys
  const keys = ['token', 'authToken', 'session', 'userSession', 'app_session', 'app_session_token'];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    // try parse JSON; if parse fails treat as raw token string
    if (raw.trim().startsWith('{')) {
      try {
        const obj = JSON.parse(raw);
        if (!obj) continue;
        // common possible shapes:
        if (typeof obj === 'string') return obj;
        if (obj.token && typeof obj.token === 'string') return obj.token;
        if (obj.authToken && typeof obj.authToken === 'string') return obj.authToken;
        if (obj.session && obj.session.token) return obj.session.token;
        if (obj.data && obj.data.token) return obj.data.token;
        if (obj?.user && obj?.token) return obj.token;
        // fallback: if object has a string property that looks like a jwt (contains two dots)
        for (const v of Object.values(obj)) {
          if (typeof v === 'string' && v.split('.').length === 3) return v;
        }
      } catch (e) {
        // not JSON, maybe it's a raw token with braces
        if (raw.split('.').length === 3) return raw;
      }
    } else {
      // raw token string
      if (raw.split('.').length === 3) return raw;
      // else just return the value (may be token)
      return raw;
    }
  }

  // final fallback: check 'session' specifically (your earlier code used localStorage.setItem("session", JSON.stringify(session)))
  const maybe = localStorage.getItem('session');
  if (maybe) {
    try {
      const obj = JSON.parse(maybe);
      if (obj && obj.token) return obj.token;
      if (obj && obj.session && obj.session.token) return obj.session.token;
      if (obj && obj.user && obj.token) return obj.token;
    } catch {}
  }
  return null;
}

export default function WomenSafety() {
  const [step, setStep] = useState('intro'); // intro -> confirm -> locate -> pick -> numbers -> sent
  const [isOnBus, setIsOnBus] = useState(null);
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [nearbyRides, setNearbyRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phone1, setPhone1] = useState(''); // additional contact 1 (optional)
  const [phone2, setPhone2] = useState(''); // additional contact 2 (optional)
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [radius, setRadius] = useState(500); // default searching radius in meters
  const [error, setError] = useState('');
  const [savedContacts, setSavedContacts] = useState([]); // [{ number, label?, include:true }]
  const [passengerName, setPassengerName] = useState(''); // extracted from JWT or server

  // On mount: read token, decode name and fetch /api/auth/me to get saved contacts
  useEffect(() => {
    (async () => {
      try {
        const token = readTokenFromStorage();
        if (!token) {
          console.log('[WomenSafety] no token found in localStorage');
          return;
        }

        // 1) try decode token for name
        const payload = decodeJwtPayload(token);
        console.log('[WomenSafety] decoded JWT payload:', payload);
        const nameFromToken =
          payload?.fullName || payload?.name || (payload?.user && (payload.user.fullName || payload.user.name)) || '';
        if (nameFromToken) {
          setPassengerName(nameFromToken);
        } else {
          console.log('[WomenSafety] no name in token payload, will fetch profile');
        }

        // 2) fetch authoritative profile (gives saved contacts and canonical name)
        try {
          const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            console.warn('[WomenSafety] /api/auth/me returned', res.status);
            return;
          }
          const json = await res.json();
          const user = json.user || {};
          // prefer server-side fullName if available (override token-free case)
          if (!nameFromToken && (user.fullName || user.name)) {
            setPassengerName(user.fullName || user.name);
          }

          // extract saved contacts robustly (many possible shapes)
          const candidates =
            user.emergencyContacts ||
            user.emergencyNumbers ||
            user.savedEmergencyContacts ||
            user.emergencyPhones ||
            user.contacts ||
            null;

          if (Array.isArray(candidates) && candidates.length) {
            const normalized = candidates.slice(0, 3).map((c, idx) => ({
              number: (typeof c === 'string' ? c : c.number || c.phone || '') || '',
              label: `Contact ${idx + 1}`,
              include: true,
            }));
            setSavedContacts(normalized);
          } else {
            // fallback: check contact1/contact2/contact3 fields
            const list = [];
            if (user.contact1) list.push({ number: user.contact1, label: 'Contact 1', include: true });
            if (user.contact2) list.push({ number: user.contact2, label: 'Contact 2', include: true });
            if (user.contact3) list.push({ number: user.contact3, label: 'Contact 3', include: true });
            if (list.length) setSavedContacts(list.slice(0, 3));
          }
          console.log('[WomenSafety] savedContacts', savedContacts);
        } catch (fetchErr) {
          console.warn('[WomenSafety] profile fetch failed', fetchErr);
        }
      } catch (e) {
        console.error('[WomenSafety] init error', e);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  // Step 1: user answers if they're on bus
  function chooseOnBus(ans) {
    setIsOnBus(!!ans);
    if (ans) {
      setStep('locate');
      getLocation();
    } else {
      // not on bus: show help text
      setStep('not-on-bus');
    }
  }

  // get location
  function getLocation() {
    setError('');
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setLoading(false);
        searchNearby(lat, lng, radius);
      },
      (err) => {
        console.warn('geoloc err', err);
        setError('Could not get location: ' + (err.message || err.code));
        setLoading(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  // call backend for nearby rides
  async function searchNearby(lat, lng, rad) {
    setLoading(true);
    setError('');
    try {
      const url = `${API_BASE}/api/safety/nearby-rides?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${encodeURIComponent(rad)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || 'Failed to get nearby rides');
      setNearbyRides(json.rides || []);
      if ((json.rides || []).length === 1) {
        setSelectedRide(json.rides[0]);
        setStep('numbers'); // auto proceed because single strong match
      } else {
        setStep('pick');
      }
    } catch (e) {
      console.error('searchNearby error', e);
      setError(e.message || 'Error fetching nearby rides');
      setStep('pick');
    } finally {
      setLoading(false);
    }
  }

  // explicit pick (if multiple)
  function pickRide(ride) {
    setSelectedRide(ride);
    setStep('numbers');
  }

  // toggle include/exclude saved contact
  function toggleSavedInclude(idx) {
    setSavedContacts((s) => s.map((c, i) => (i === idx ? { ...c, include: !c.include } : c)));
  }

  // send alert
  async function sendAlert() {
    setError('');
    setMessage('');

    // combine recipients:
    const includedSaved = savedContacts.filter(c => c.include).map(c => formatPhoneForApi(c.number)).filter(Boolean);
    const extra1 = formatPhoneForApi(phone1);
    const extra2 = formatPhoneForApi(phone2);

    const recipients = [...includedSaved];
    if (extra1) recipients.push(extra1);
    if (extra2) recipients.push(extra2);

    if (recipients.length === 0) { setError('Please provide at least one contact (saved or other).'); return; }

    setLoading(true);
    try {
      const token = readTokenFromStorage();
      const payload = {
        // keep compatibility: include to1/to2 for existing backend handlers
        to1: extra1,
        to2: extra2,
        // new: send full recipients array so backend can iterate/send
        recipients,
        rideId: selectedRide?._id,
        lat: coords.lat,
        lng: coords.lng,
        note: note || '',
        passengerName: passengerName || '', // extracted from token/server
      };

      const res = await fetch(`${API_BASE}/api/safety/alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.message || 'Failed to send alert');
      setMessage('Alert sent. Contacts should receive the SMS shortly.');
      setStep('sent');
    } catch (e) {
      console.error('sendAlert error', e);
      setError(e.message || 'Failed to send alert');
    } finally {
      setLoading(false);
    }
  }

  // UI
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Women Safety — Send Quick Alert</h1>

      {step === 'intro' && (
        <div>
          <p className="mb-4">Are you travelling on a bus right now?</p>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => chooseOnBus(true)}>Yes</button>
            <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => chooseOnBus(false)}>No</button>
          </div>
        </div>
      )}

      {step === 'not-on-bus' && (
        <div>
          <p className="mb-3">If you are not on a bus but feel unsafe, contact local emergency services immediately.</p>
          <p className="mb-3">Local emergency numbers: 112 (India). You can also pre-fill contacts and send the alert with an approximate location.</p>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => { setStep('locate'); getLocation(); }}>Continue with location</button>
        </div>
      )}

      {step === 'locate' && (
        <div>
          <p className="mb-2">Getting your location…</p>
          {loading && <div className="text-sm text-gray-500">Waiting for GPS...</div>}
          {!loading && coords.lat && (
            <div>
              <div className="mb-2">Detected location: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>
              <MapPreview lat={coords.lat} lng={coords.lng} />
              <div className="mt-3">
                <button className="px-3 py-2 bg-gray-800 text-white rounded" onClick={() => searchNearby(coords.lat, coords.lng, radius)}>Find nearby buses</button>
              </div>
            </div>
          )}
          {error && <div className="text-red-600 mt-3">{error}</div>}
        </div>
      )}

      {step === 'pick' && (
        <div>
          <p className="mb-2">Select the bus you're on (closest first):</p>
          {nearbyRides.length === 0 && <div className="text-gray-600">No active buses found within {radius} meters.</div>}
          <div className="space-y-2 mt-2">
            {nearbyRides.map((r) => (
              <div key={r._id} className="border p-3 rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{r.route?.fullName || 'Route'}</div>
                  <div className="text-xs text-gray-600">Vehicle: {r.driver?.vehicleNumber || '—'} — Driver: {r.driver?.fullName || '—'}</div>
                  <div className="text-xs text-gray-500">Distance: {r.distMeters ? `${Math.round(r.distMeters)} m` : '—'}</div>
                </div>
                <div>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => pickRide(r)}>This is my bus</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => getLocation()}>Retry location</button>
            <button className="px-3 py-2 ml-2 bg-gray-800 text-white rounded" onClick={() => setStep('numbers')}>Proceed anyway</button>
          </div>
          {error && <div className="text-red-600 mt-3">{error}</div>}
        </div>
      )}

      {step === 'numbers' && (
        <div>
          <p className="mb-2">Confirm details & choose contacts to notify</p>
          <div className="mb-3 border rounded p-3">
            <div className="text-sm">Selected Bus:</div>
            <div className="font-medium">{selectedRide?.route?.fullName || '—'}</div>
            <div className="text-xs text-gray-600">Vehicle: {selectedRide?.driver?.vehicleNumber || '—'}</div>
            <div className="text-xs text-gray-600">Driver: {selectedRide?.driver?.fullName || '—'} {selectedRide?.driver?.phoneNumber ? `• ${selectedRide.driver.phoneNumber}` : ''}</div>
            <div className="mt-2">
              <strong>Approx location:</strong> {selectedRide?.lastLocation ? `${selectedRide.lastLocation.lat.toFixed(5)}, ${selectedRide.lastLocation.lng.toFixed(5)}` : `${coords.lat?.toFixed(5)}, ${coords.lng?.toFixed(5)}`}
            </div>
            <div className="mt-2"><MapPreview lat={(selectedRide?.lastLocation && selectedRide.lastLocation.lat) || coords.lat} lng={(selectedRide?.lastLocation && selectedRide.lastLocation.lng) || coords.lng} /></div>
          </div>

          {/* show extracted passenger name (read-only) */}
          <div className="mb-3">
            <div className="text-sm text-gray-600">Passenger</div>
            <div className="font-medium">{passengerName || 'Unknown'}</div>
          </div>

          {/* saved contacts (from profile) */}
          <div className="mb-3 border rounded p-3">
            <div className="text-sm text-gray-600 mb-2">Saved emergency contacts (from your profile)</div>
            {savedContacts.length === 0 ? (
              <div className="text-xs text-gray-500">No saved emergency contacts found in your profile.</div>
            ) : (
              <div className="space-y-2">
                {savedContacts.map((c, idx) => (
                  <label key={idx} className="flex items-center gap-3">
                    <input type="checkbox" checked={c.include} onChange={() => toggleSavedInclude(idx)} />
                    <span className="font-medium text-sm">{`Contact ${idx + 1}:`}</span>
                    <span className="text-sm text-gray-700">{c.number || '—'}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* other numbers (two optional) */}
          <div className="space-y-2">
            <div>
              <label className="text-sm">Other contact number 1 (optional)</label>
              <input value={phone1} onChange={(e) => setPhone1(e.target.value)} placeholder="+9198xxxxxxxx" className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="text-sm">Other contact number 2 (optional)</label>
              <input value={phone2} onChange={(e) => setPhone2(e.target.value)} placeholder="+9198xxxxxxxx" className="w-full border rounded px-2 py-1" />
            </div>

            <div>
              <label className="text-sm">Short note (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any additional information" className="w-full border rounded px-2 py-1" />
            </div>

            <div className="flex gap-2 mt-3">
              <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={() => sendAlert()} disabled={loading}>{loading ? 'Sending…' : 'Send Alert'}</button>
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => { setStep('pick'); setMessage(''); setError(''); }}>Back</button>
            </div>

            {error && <div className="text-red-600 mt-2">{error}</div>}
            {message && <div className="text-green-600 mt-2">{message}</div>}
          </div>
        </div>
      )}

      {step === 'sent' && (
        <div>
          <h3 className="text-lg font-semibold">Alert sent</h3>
          <p className="mt-2">Your contacts have been notified. If you still feel unsafe, contact local emergency services or authorities.</p>
          <div className="mt-4">
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => { setStep('intro'); setNearbyRides([]); setSelectedRide(null); setPhone1(''); setPhone2(''); setNote(''); setMessage(''); /* do not clear passengerName */ }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
