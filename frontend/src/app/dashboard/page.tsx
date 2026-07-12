'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import { 
  AlertOctagon, ShieldAlert, X, Activity, RefreshCw
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import TollProgressCard from '@/components/TollProgressCard';
import SimulatorPanel from '@/components/SimulatorPanel';
import { api } from '@/utils/api';

// Dynamically import Leaflet Map to avoid SSR errors
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  
  // Active trip details for inspected vehicle
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [activeRouteTolls, setActiveRouteTolls] = useState<any[]>([]);
  const [activeClearanceLogs, setActiveClearanceLogs] = useState<any[]>([]);

  // Simulation Status
  const [simStatus, setSimStatus] = useState<any>({ isActive: false });

  // Notifications/Toasts
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchSimulatorStatus();

    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('vehicle_update', (ping: any) => {
      setVehicles(prev => prev.map(v => {
        if (v.id === ping.vehicleId) {
          return {
            ...v,
            lat: ping.lat,
            lng: ping.lng,
            speed: ping.speed,
            heading: ping.heading,
            statusColor: ping.status,
            status: ping.active_trip_id ? 'On Trip' : 'Available',
            last_ping: ping.timestamp,
            active_trip_id: ping.active_trip_id
          };
        }
        return v;
      }));

      setSelectedVehicle((prev: any) => {
        if (prev && prev.id === ping.vehicleId) {
          return {
            ...prev,
            lat: ping.lat,
            lng: ping.lng,
            speed: ping.speed,
            heading: ping.heading,
            statusColor: ping.status,
            status: ping.active_trip_id ? 'On Trip' : 'Available',
            last_ping: ping.timestamp,
            active_trip_id: ping.active_trip_id
          };
        }
        return prev;
      });
    });

    socket.on('new_alert', (alert: any) => {
      setAlerts(prev => [alert, ...prev]);
      showToastNotification(alert.message, alert.severity === 'Critical' ? 'error' : 'warning');
      
      setVehicles(prev => prev.map(v => {
        if (v.id === alert.vehicle_id) {
          return { ...v, statusColor: 'Red' };
        }
        return v;
      }));
    });

    socket.on('toll_update', (tollData: any) => {
      setActiveTrip((prev: any) => {
        if (prev && prev.id === tollData.trip_id) {
          fetchTollClearanceLogs(tollData.trip_id);
        }
        return prev;
      });
      showToastNotification(`FASTag cleared at plaza: ${tollData.name}`, 'success');
    });

    socket.on('simulator_tick', (tick: any) => {
      setSimStatus((prev: any) => ({ ...prev, currentIndex: tick.currentIndex, isActive: true }));
    });

    socket.on('simulator_stopped', (data: any) => {
      setSimStatus({ isActive: false });
      showToastNotification(`Simulated trip completed. Reason: ${data.reason}`, 'info');
      fetchDashboardData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedVehicle && selectedVehicle.active_trip_id) {
      fetchActiveTripDetails(selectedVehicle.active_trip_id);
    } else {
      setActiveTrip(null);
      setActiveRouteTolls([]);
      setActiveClearanceLogs([]);
    }
  }, [selectedVehicle]);

  const fetchDashboardData = async () => {
    try {
      const [vData, dData, rData, tData, aData] = await Promise.all([
        api.get('/vehicles'),
        api.get('/drivers'),
        api.get('/routes'),
        api.get('/trips'),
        api.get('/alerts')
      ]);
      setVehicles(vData);
      setDrivers(dData);
      setRoutes(rData);
      setTrips(tData);
      setAlerts(aData);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSimulatorStatus = async () => {
    try {
      const res = await api.get('/simulator/status');
      setSimStatus(res);
      if (res.isActive && res.tripId) {
        const allVehicles = await api.get('/vehicles');
        const matched = allVehicles.find((v: any) => v.id === res.vehicleId);
        if (matched) setSelectedVehicle(matched);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveTripDetails = async (tripId: number) => {
    try {
      const allTrips = await api.get('/trips');
      const tripObj = allTrips.find((t: any) => t.id === tripId);
      if (!tripObj) return;

      setActiveTrip(tripObj);

      const tolls = await api.get(`/routes/${tripObj.route_id}/tolls`);
      setActiveRouteTolls(tolls);

      fetchTollClearanceLogs(tripId);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTollClearanceLogs = async (tripId: number) => {
    try {
      const logs = await api.get(`/trips/${tripId}/tolls`);
      setActiveClearanceLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  const showToastNotification = (message: string, type: string) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const totalVehicles = vehicles.length;
  const vehiclesOnTrip = vehicles.filter(v => v.active_trip_id !== null).length;
  const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
  const activeAlertsCount = alerts.filter(a => a.resolved_at === null).length;

  const totalClearedTollsCount = activeClearanceLogs.filter(log => log.status === 'Cleared').length;
  const totalTollExpenses = totalClearedTollsCount * 350;

  return (
    <div className="min-h-screen flex text-slate-800 custom-page-bg">
      <Navbar />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {/* Real-time Toast Banner */}
          {toast && (
            <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4.5 py-3 rounded-2xl border shadow-lg transition-all duration-300 animate-slide-in ${
              toast.type === 'error' ? 'bg-rose-55 border-rose-200 text-rose-800' :
              toast.type === 'warning' ? 'bg-amber-55 border-amber-200 text-amber-800' :
              toast.type === 'success' ? 'bg-emerald-55 border-emerald-200 text-emerald-800' :
              'bg-white border-slate-200 text-slate-800'
            }`}>
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <div className="text-xs font-bold leading-normal pr-4">{toast.message}</div>
              <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 block mb-1">TOTAL FLEET SIZE</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-800">{totalVehicles}</span>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Vehicles</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
            <span className="text-[10px] font-bold text-emerald-600 block mb-1">ON TRIP ACTIVE</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-800">{vehiclesOnTrip}</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Live Map</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 block mb-1">AVAILABLE STANDBY</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-800">{availableVehicles}</span>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Ready</span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm">
            <span className="text-[10px] font-bold text-rose-600 block mb-1">COMPLIANCE ALERTS</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-800">{activeAlertsCount}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${activeAlertsCount > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                Unresolved
              </span>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm col-span-2 md:col-span-1">
            <span className="text-[10px] font-bold text-amber-600 block mb-1">FASTAG CLEARANCES COST</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-800">₹{totalTollExpenses || '0'}</span>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Today</span>
            </div>
          </div>
        </div>

        {/* Live Grid Map & Side Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[550px]">
          
          {/* Leaflet Live Map */}
          <div className="lg:col-span-3 h-full relative">
            <Map 
              vehicles={vehicles}
              activeRoute={activeTrip ? routes.find(r => r.id === activeTrip.route_id) : null}
              checkpoints={activeTrip ? checkpointsFilter(activeTrip.route_id) : []}
              tolls={activeRouteTolls}
              onSelectVehicle={(v) => setSelectedVehicle(v)}
            />
            {/* Live Indicator overlay */}
            <div className="absolute top-4 left-4 bg-white/95 border border-slate-200 rounded-xl px-2.5 py-1.5 z-10 flex items-center gap-1.5 text-[10px] font-extrabold text-slate-800 shadow-sm">
              <Activity className="w-3 h-3 text-sky-600 animate-pulse" />
              <span>LIVE TRACKING PING STREAM</span>
            </div>
          </div>

          {/* Right Inspector Panel */}
          <div className="lg:col-span-1 flex flex-col justify-between gap-4 h-full">
            <div className="flex-1 overflow-hidden min-h-0">
              <TollProgressCard 
                trip={activeTrip}
                routeTolls={activeRouteTolls}
                clearanceLogs={activeClearanceLogs}
                onCallDriver={() => alert(`Dialing driver: ${activeTrip?.driver_name || 'N/A'}`)}
                onViewAlert={(msg) => alert(`Compliance alert details:\n${msg}`)}
              />
            </div>
          </div>

        </div>

        {/* Control Simulator Panel & Alert Feed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Simulator Panel */}
          <div className="md:col-span-1">
            <SimulatorPanel
              vehicles={vehicles}
              drivers={drivers}
              routes={routes}
              onSimulationStart={() => {
                showToastNotification('Simulation launched! Vehicle is reporting pings.', 'success');
                fetchSimulatorStatus();
              }}
              onSimulationStop={() => {
                showToastNotification('Simulation stopped.', 'info');
                fetchSimulatorStatus();
              }}
              simStatus={simStatus}
              setSimStatus={setSimStatus}
              activeTolls={activeRouteTolls}
            />
          </div>

          {/* Live Alerts Feed log */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  Live Operational Compliance Feed
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Real-time alerts for route deviations and skipped FASTag checkpoints.</p>
              </div>
              <button 
                onClick={fetchDashboardData}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                title="Refresh Feed"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-56 pr-1 space-y-2">
              {alerts.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-10">
                  No active compliance alerts. Route corridors are normal.
                </div>
              ) : (
                alerts.map((a) => (
                  <div 
                    key={a.id} 
                    className={`p-3 border rounded-xl flex items-center justify-between transition-colors ${
                      a.resolved_at 
                        ? 'bg-slate-50 border-slate-200 text-slate-400' 
                        : a.severity === 'Critical'
                        ? 'bg-rose-50 border-rose-200 text-rose-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 pr-4">
                      <div className="flex-shrink-0 mt-0.5">
                        <ShieldAlert className={`w-4.5 h-4.5 ${
                          a.resolved_at ? 'text-slate-400' :
                          a.severity === 'Critical' ? 'text-rose-600 animate-pulse' : 'text-amber-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-800">{a.registration_number}</span>
                          <span className="text-[8px] text-slate-350">•</span>
                          <span className="text-[9px] text-slate-500">{a.driver_name || 'System'}</span>
                        </div>
                        <p className="text-[11px] font-medium leading-normal mt-0.5 text-slate-700">{a.message}</p>
                        <span className="text-[9px] text-slate-400 block mt-1.5">
                          {new Date(a.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      {a.resolved_at ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">RESOLVED</span>
                      ) : (
                        <button
                          onClick={async () => {
                            await api.put(`/alerts/${a.id}/resolve`);
                            fetchDashboardData();
                            showToastNotification('Alert marked resolved.', 'success');
                          }}
                          className="text-[9px] font-bold px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
        </div>
      </main>
    </div>
  );
}

function checkpointsFilter(routeId: number) {
  if (routeId === 1) {
    return [
      { name: 'Delhi Exit Geofence', lat: 28.5200, lng: 77.1500, sequence: 1 },
      { name: 'Jaipur Bypass Checkpoint', lat: 26.9500, lng: 75.8500, sequence: 2 },
      { name: 'Udaipur Transit Station', lat: 24.5800, lng: 73.7100, sequence: 3 },
      { name: 'Ahmedabad Outer Ring', lat: 23.0500, lng: 72.6500, sequence: 4 },
      { name: 'Surat Security Plaza', lat: 21.1700, lng: 72.8300, sequence: 5 },
      { name: 'Mumbai Entrance Gate', lat: 19.1500, lng: 72.9500, sequence: 6 }
    ];
  } else {
    return [
      { name: 'Kalamboli Entry Geofence', lat: 19.0200, lng: 73.1000, sequence: 1 },
      { name: 'Khalapur Food Mall Checkpoint', lat: 18.8200, lng: 73.3000, sequence: 2 },
      { name: 'Talegaon Exit Checkpoint', lat: 18.7200, lng: 73.6800, sequence: 3 }
    ];
  }
}
