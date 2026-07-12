'use client';

import { useState } from 'react';
import { Wrench, Plus, Search, CheckCircle2, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function MaintenancePage() {
  const [tickets, setTickets] = useState([
    { id: 1, vehicle: 'GJ01AB5678', type: 'Full Service', dueDate: '2026-07-13', priority: 'High', status: 'Scheduled' },
    { id: 2, vehicle: 'MH12KL9012', type: 'Tyre Rotation & Check', dueDate: '2026-07-15', priority: 'Medium', status: 'In Progress' },
    { id: 3, vehicle: 'RJ14GH3456', type: 'Engine Cylinder Flush', dueDate: '2026-07-18', priority: 'Medium', status: 'Scheduled' },
    { id: 4, vehicle: 'GJ05CD1122', type: 'Emission Filter Renewal', dueDate: '2026-07-21', priority: 'Low', status: 'Completed' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTickets = tickets.filter(t => 
    t.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase())
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
                <Wrench className="w-5 h-5 text-sky-600" />
                Fleet Maintenance & Diagnostics
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Schedule engine tune-ups, tire rotations, and inspect diagnostic logs of active trucks.</p>
            </div>
            <button 
              onClick={() => alert('New maintenance ticket scheduling workflow initiated.')}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-750 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              Schedule Service
            </button>
          </div>

          {/* Search bar */}
          <div className="relative bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search diagnostic tickets by vehicle number, service type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none"
            />
          </div>

          {/* Grid list of maintenance schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTickets.map(t => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-350 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">{t.vehicle}</h3>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Job: {t.type}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                    t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    t.status === 'In Progress' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                    'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    {t.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-150">
                  <div>
                    <span className="text-[9px] font-bold text-slate-450 block">DUE DATE</span>
                    <span className="text-slate-800 font-bold block mt-0.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> {t.dueDate}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-455 block">PRIORITY CRITICALITY</span>
                    <span className={`font-bold block mt-0.5 ${t.priority === 'High' ? 'text-rose-600' : 'text-slate-700'}`}>
                      {t.priority} Risk
                    </span>
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
