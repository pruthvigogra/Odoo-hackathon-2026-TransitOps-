'use client';

import { useState, useEffect } from 'react';
import { Navigation, Plus, Search, HelpCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api } from '@/utils/api';

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const data = await api.get('/trips');
      setTrips(data);
    } catch (err) {
      console.error(err);
    }
  };

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
                Transit Trip Log & Dispatcher
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Dispatch drivers, attach vehicle tracking keys, and monitor ETA schedules.</p>
            </div>
            <button 
              onClick={() => alert('New trip dispatch workflow initiated. Assign vehicles via operations dashboard.')}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-750 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              Dispatch Trip
            </button>
          </div>

          {/* Search bar */}
          <div className="relative bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search dispatched logs by vehicle number, driver name, route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none"
            />
          </div>

          {/* Trips Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase select-none">
                    <th className="px-5 py-3.5">Trip Details</th>
                    <th className="px-5 py-3.5">Assigned Vehicle</th>
                    <th className="px-5 py-3.5">Driver Duty</th>
                    <th className="px-5 py-3.5">Dispatched Path</th>
                    <th className="px-5 py-3.5">Transit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
                  {filteredTrips.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-slate-800">TRP-{1000 + t.id}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">ID: {t.id}</span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-extrabold text-slate-800 text-sm">{t.registration_number || 'N/A'}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Asset Tracker Online</span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-800">{t.driver_name || 'N/A'}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">ID: {t.driver_id || 'N/A'}</span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-slate-800 font-bold block">{t.route_name || 'Delhi ➔ Mumbai'}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Standard Corridor</span>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase border ${
                          t.status === 'On Trip' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                          t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {t.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredTrips.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-400 py-10">
                        No dispatched trips found matching search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
