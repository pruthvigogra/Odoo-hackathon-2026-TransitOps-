'use client';

import { useState, useEffect } from 'react';
import { Map, Plus, Search, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api } from '@/utils/api';

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      const data = await api.get('/routes');
      setRoutes(data);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRoutes = routes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.start_point.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.end_point.toLowerCase().includes(searchTerm.toLowerCase())
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
                <Map className="w-5 h-5 text-sky-600" />
                Route Corridor Management
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Define approved route paths, geofenced checkpoints, and standard transit timelines.</p>
            </div>
            <button 
              onClick={() => alert('New route corridor definition workflow initiated.')}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-750 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              Create Route
            </button>
          </div>

          {/* Search bar */}
          <div className="relative bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search corridors by name, source, destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none"
            />
          </div>

          {/* Grid list of routes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRoutes.map(r => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-350 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">{r.name}</h3>
                    <span className="text-[10px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded font-bold uppercase block mt-1 w-max">
                      Active Corridor
                    </span>
                  </div>
                  <button 
                    onClick={() => alert('Corridor removal is locked to primary administrators.')}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-150">
                  <div>
                    <span className="text-[9px] font-bold text-slate-450 block">ORIGIN/SOURCE</span>
                    <span className="text-slate-800 font-bold block mt-0.5">{r.start_point}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-455 block">DESTINATION</span>
                    <span className="text-slate-800 font-bold block mt-0.5">{r.end_point}</span>
                  </div>
                </div>

                <div className="text-xs space-y-1 bg-slate-50 border border-slate-150 p-3 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Standard Corridor Width:</span>
                    <span className="font-bold text-slate-850">25.0 km Buffer</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Allowed Transit Time:</span>
                    <span className="font-bold text-slate-850">28 hours max</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
