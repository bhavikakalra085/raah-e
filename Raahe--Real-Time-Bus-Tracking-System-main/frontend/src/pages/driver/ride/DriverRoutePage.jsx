import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import RouteMap from '../components/RouteMap';
import DriverControlEnhanced from '../components/DriverControlEnhanced'; // path to enhanced component

export default function DriverRoutePage({ token, apiBase = '' }) {
  const [user, setUser] = useState(null);
  const [route, setRoute] = useState(null);
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };
  const baseUrl = apiBase || import.meta.env.VITE_API_BASE || "";

  useEffect(() => {
    async function load() {
      try {
        const me = await axios.get(`${baseUrl}/api/auth/me`, authHeader);
        setUser(me.data.user);
        const uid = me.data.user;
        if (me.data.user.route && typeof me.data.user.route === 'object') {
          setRoute(me.data.user.route);
        } else if (me.data.user.route) {
          const r = await axios.get(`${baseUrl}/api/routes/${me.data.user.route}`, authHeader);
          setRoute(r.data.route || r.data);
        }
        const rideResp = await axios.get(`${baseUrl}/api/driver/my-active-ride`, authHeader).catch(()=>null);
        if (rideResp && rideResp.data && rideResp.data.ride) setRide(rideResp.data.ride);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiBase, token]);

  useEffect(() => {
    const socket = io(baseUrl || '/', { transports: ['websocket'], auth: token ? { token } : undefined });
    socketRef.current = socket;
    socket.on('connect', () => {
      if (user && user._id) socket.emit('joinDriverRoom', user._id);
      if (ride && ride._id) socket.emit('joinRide', ride._id);
    });
    socket.on('rideStarted', (p)=> {
      if (p.ride && p.ride.driver === user?._id) setRide(p.ride);
    });
    socket.on('rideEnded', (p)=> {
      if (p.rideId && ride && p.rideId === ride._id) setRide(r=>({...r, status:'ended'}));
    });
    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, [apiBase, token, user, ride]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authorized</div>;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded shadow" style={{height:520}}>
          <RouteMap route={route} ride={ride} socket={socketRef.current} />
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded shadow p-4">
            <DriverControlEnhanced token={token} driverId={user._id} apiBase={apiBase} />
          </div>
          <div className="bg-white rounded shadow p-4">
            <h4 className="font-semibold">Route info</h4>
            {route ? route.stops.map((s,i)=>(
              <div key={i} className="py-2 border-b last:border-b-0">
                <div className="font-medium">{i+1}. {s.name}</div>
                <div className="text-xs text-gray-500">{s.lat?.toFixed(5)},{s.lng?.toFixed(5)}</div>
              </div>
            )) : <div>No route</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
