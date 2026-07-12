'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Navigation, Plus, Search, CheckCircle, Truck, Info, X, MapPin } from 'lucide-react';
import Navbar from '@/components/Navbar';
import TollProgressCard from '@/components/TollProgressCard';
import { api } from '@/utils/api';
import { io, Socket } from 'socket.io-client';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [activeRouteTolls, setActiveRouteTolls] = useState<any[]>([]);
  const [activeClearanceLogs, setActiveClearanceLogs] = useState<any[]>([]);
  
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  const [dispatchForm, setDispatchForm] = useState({ routeId: '', vehicleId: '', driverId: '', cargoWeight: '' });
  const [completeForm, setCompleteForm] = useState({ fuelConsumed: '', fuelCost: '', finalOdometer: '' });
  const [errorMsg, setErrorMsg] = useState('');
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchInitialData();

    const socket = io('http://localhost:5000');
    socketRef.current = socket;
    
    socket.on('vehicle_update', (ping) => {
      setActiveTrip(prev => {
        if (prev && prev.vehicle_id === ping.vehicleId) {
          return { ...prev, lat: ping.lat, lng: ping.lng };
        }
        return prev;
      });
      // Update trips array for live coords if needed
      setTrips(prev => prev.map(t => {
        if (t.vehicle_id === ping.vehicleId && t.status === 'Active') {
          return { ...t, lat: ping.lat, lng: ping.lng };
        }
        return t;
      }));
    });

    socket.on('toll_update', (data) => {
      setActiveTrip(prev => {
        if (prev && prev.id === data.trip_id) {
          fetchTollData(prev.id, prev.route_id);
        }
        return prev;
      });
    });
    
    return () => { socket.disconnect(); };
  }, []);

  const fetchInitialData = async () => {
    try {
      const [tRes, vRes, dRes, rRes] = await Promise.all([
        api.get('/trips'), api.get('/vehicles'), api.get('/drivers'), api.get('/routes')
      ]);
      setTrips(tRes); setVehicles(vRes); setDrivers(dRes); setRoutes(rRes);
    } catch(err) { console.error(err); }
  };

  const fetchTollData = async (tripId: number, routeId: number) => {
    try {
      const [tolls, logs] = await Promise.all([
        api.get(`/routes/${routeId}/tolls`),
        api.get(`/trips/${tripId}/tolls`)
      ]);
      setActiveRouteTolls(tolls);
      setActiveClearanceLogs(logs);
    } catch(err) { console.error(err); }
  }

  const handleTripSelect = (t: any) => {
    setActiveTrip(t);
    fetchTollData(t.id, t.route_id);
  };
  
  const handleDispatch = async (e: any) => {
    e.preventDefault();
    setErrorMsg('');
    const v = vehicles.find(x => x.id === parseInt(dispatchForm.vehicleId));
    if (!v) return setErrorMsg('Please select a vehicle.');
    if (!dispatchForm.driverId) return setErrorMsg('Please select a driver.');
    if (!dispatchForm.routeId) return setErrorMsg('Please select a route.');
    
    if (dispatchForm.cargoWeight && parseFloat(dispatchForm.cargoWeight) > v.capacity) {
      setErrorMsg(`Cargo weight (${dispatchForm.cargoWeight}T) exceeds vehicle capacity (${v.capacity}T)!`);
      return;
    }
    
    try {
      // 1. Start Trip
      const res = await api.post('/trips/start', {
        route_id: dispatchForm.routeId,
        vehicle_id: dispatchForm.vehicleId,
        driver_id: dispatchForm.driverId
      });
      
      // 2. Trigger simulator for this trip
      await api.post('/simulator/start', {
        tripId: res.id,
        routeId: dispatchForm.routeId,
        vehicleId: dispatchForm.vehicleId,
        driverId: dispatchForm.driverId
      });
      
      setShowDispatchModal(false);
      setDispatchForm({ routeId: '', vehicleId: '', driverId: '', cargoWeight: '' });
      fetchInitialData();
    } catch(err: any) {
      setErrorMsg(err.response?.data?.error || err.message);
    }
  };

  const handleComplete = async (e: any) => {
    e.preventDefault();
    if (!activeTrip) return;
    try {
      await api.post(`/trips/${activeTrip.id}/end`, {
        fuel_consumed: completeForm.fuelConsumed,
        fuel_cost: completeForm.fuelCost,
        final_odometer: completeForm.finalOdometer
      });
      setShowCompleteModal(false);
      setCompleteForm({ fuelConsumed: '', fuelCost: '', finalOdometer: '' });
      setActiveTrip(null);
      fetchInitialData();
    } catch(err: any) {
      console.error(err);
    }
  };

  const availableVehicles = vehicles.filter(v => v.status === 'Available');
  const availableDrivers = drivers.filter(d => d.status === 'Available');

  const filteredTrips = trips.filter(t => 
    (t.registration_number && t.registration_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.driver_name && t.driver_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.route_name && t.route_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex text-slate-800 custom-page-bg">
      <Navbar />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <Navigation className="w-5 h-5 text-sky-600" />
                Live Dispatch Board
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Dispatch trips and track real-time fleet activity.</p>
            </div>
            <button 
              onClick={() => setShowDispatchModal(true)}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-750 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              Dispatch Trip
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col - Trips List */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="relative bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                <input
                  type="text"
                  placeholder="Search trips..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg pl-9 pr-4 py-2 focus:outline-none"
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-y-auto h-[70vh] shadow-sm p-2 flex flex-col gap-2">
                {filteredTrips.map(t => (
                  <div 
                    key={t.id} 
                    onClick={() => handleTripSelect(t)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${activeTrip?.id === t.id ? 'border-sky-500 bg-sky-50/50 shadow-sm' : 'border-slate-200 hover:border-sky-300'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-800">TRP-{1000 + t.id}</span>
                        <span className="text-[10px] text-slate-500 block">{t.route_name}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                          t.status === 'Active' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {t.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      <div className="flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-slate-400"/> {t.registration_number}</div>
                      <div className="flex items-center gap-1"><Info className="w-3.5 h-3.5 text-slate-400"/> {t.driver_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col - Live Map & Details */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm h-[400px] relative z-10">
                {activeTrip ? (
                  <Map 
                    vehicles={activeTrip.lat ? [{ id: activeTrip.vehicle_id, lat: activeTrip.lat, lng: activeTrip.lng, statusColor: 'Green', registration_number: activeTrip.registration_number }] : []} 
                    selectedVehicle={activeTrip.lat ? { id: activeTrip.vehicle_id, lat: activeTrip.lat, lng: activeTrip.lng, statusColor: 'Green', registration_number: activeTrip.registration_number } : null}
                    routes={routes} 
                    routeCheckpoints={[]} 
                    tolls={activeRouteTolls} 
                  />
                ) : (
                  <div className="h-full bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
                    <MapPin className="w-5 h-5 mr-2 opacity-50" /> Select an active trip to view live map.
                  </div>
                )}
              </div>

              {activeTrip && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TollProgressCard trip={activeTrip} tolls={activeRouteTolls} clearanceLogs={activeClearanceLogs} />
                  
                  {activeTrip.status === 'Active' && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Complete Trip Actions
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">Log fuel and odometer to complete and release assets.</p>
                      <button 
                        onClick={() => setShowCompleteModal(true)}
                        className="w-full bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/10"
                      >
                        Complete Trip Now
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><Truck className="w-4 h-4 text-sky-600"/> Dispatch New Trip</h2>
              <button onClick={() => setShowDispatchModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleDispatch} className="p-6 space-y-4">
              {errorMsg && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100">{errorMsg}</div>}
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Route</label>
                <select required value={dispatchForm.routeId} onChange={e => setDispatchForm({...dispatchForm, routeId: e.target.value})} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300">
                  <option value="">Select Route</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.name} ({r.distance} km)</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle (Available Only)</label>
                <select required value={dispatchForm.vehicleId} onChange={e => setDispatchForm({...dispatchForm, vehicleId: e.target.value})} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300">
                  <option value="">Select Vehicle</option>
                  {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number} - {v.model} (Cap: {v.capacity}T)</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cargo Weight (Tons)</label>
                <input required type="number" step="0.1" value={dispatchForm.cargoWeight} onChange={e => setDispatchForm({...dispatchForm, cargoWeight: e.target.value})} placeholder="e.g. 24.5" className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Driver (Available Only)</label>
                <select required value={dispatchForm.driverId} onChange={e => setDispatchForm({...dispatchForm, driverId: e.target.value})} className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300">
                  <option value="">Select Driver</option>
                  {availableDrivers.map(d => <option key={d.id} value={d.id}>{d.name} (License: {d.license_number})</option>)}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowDispatchModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-md transition-colors">Confirm & Dispatch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
              <h2 className="font-bold text-emerald-800 flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Complete Trip Log</h2>
              <button onClick={() => setShowCompleteModal(false)} className="text-emerald-400 hover:text-emerald-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleComplete} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Final Odometer Reading</label>
                <input required type="number" step="0.1" value={completeForm.finalOdometer} onChange={e => setCompleteForm({...completeForm, finalOdometer: e.target.value})} placeholder="e.g. 125400" className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-300" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fuel Consumed (Liters)</label>
                <input required type="number" step="0.1" value={completeForm.fuelConsumed} onChange={e => setCompleteForm({...completeForm, fuelConsumed: e.target.value})} placeholder="e.g. 350.5" className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-300" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Fuel Cost (₹)</label>
                <input required type="number" step="0.1" value={completeForm.fuelCost} onChange={e => setCompleteForm({...completeForm, fuelCost: e.target.value})} placeholder="e.g. 31500" className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-300" />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCompleteModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
