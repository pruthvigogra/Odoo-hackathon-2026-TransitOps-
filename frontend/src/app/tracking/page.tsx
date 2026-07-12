'use client';

import { useState, useEffect } from 'react';
import { Compass, Search, RefreshCw, Activity } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api } from '@/utils/api';

export default function TrackingPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchVehicles = async () => {
    try {
      const data = await api.get('/vehicles');
      setVehicles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredVehicles = vehicles.filter(v => 
    v.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.driver_name && v.driver_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
                <Compass className="w-5 h-5 text-sky-600 animate-spin" style={{ animationDuration: '6s' }} />
                Live GPS Device Telemetry
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Real-time coordinates, vectors, headings, and satellite connection health logs.</p>
            </div>
            <button 
              onClick={fetchVehicles}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs px-3.5 py-2.5 rounded-xl transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Pings
            </button>
          </div>

          {/* Search bar */}
          <div className="relative bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search assets by registration number, assigned dispatcher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none"
            />
          </div>

          {/* Telemetry log list */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase select-none">
                    <th className="px-5 py-3.5">Device Serial ID</th>
                    <th className="px-5 py-3.5">Vehicle / Driver</th>
                    <th className="px-5 py-3.5">Coordinates (Lat, Lng)</th>
                    <th className="px-5 py-3.5">Heading / Speed</th>
                    <th className="px-5 py-3.5">Signals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
                  {filteredVehicles.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-slate-800">{v.gps_device_id}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Asset Tracker #1</span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-extrabold text-slate-800 text-sm">{v.registration_number}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{v.driver_name || 'Standby Duty'}</span>
                      </td>

                      <td className="px-5 py-4 font-mono text-[11px] text-slate-650">
                        {v.lat !== null && v.lng !== null ? (
                          <div>
                            <span className="text-slate-800 font-bold">{v.lat.toFixed(6)}, {v.lng.toFixed(6)}</span>
                            <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                              <Activity className="w-2.5 h-2.5 animate-pulse" /> Active streaming
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Offline / No GPS Locks</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {v.lat !== null ? (
                          <div>
                            <span className="font-bold text-slate-800">{v.speed || '0'} km/h</span>
                            <span className="text-[9px] text-slate-500 block mt-0.5">Vector: {v.heading || '0'}° heading</span>
                          </div>
                        ) : (
                          <span className="text-slate-450">N/A</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          v.lat !== null ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-450 border border-slate-200'
                        }`}>
                          {v.lat !== null ? 'Connected' : 'Sleeping'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
