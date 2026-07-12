'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, ShieldAlert, RefreshCw, X, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api } from '@/utils/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const data = await api.get('/alerts');
      setAlerts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const resolveAlert = async (id: number) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filterType === 'All') return true;
    if (filterType === 'Unresolved') return a.resolved_at === null;
    if (filterType === 'Resolved') return a.resolved_at !== null;
    return true;
  });

  return (
    <div className="min-h-screen flex text-slate-800 custom-page-bg">
      <Navbar />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 animate-pulse" />
                Compliance Violation Alerts Log
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Audit log of GPS route deviations, skipped checkpoints, and unauthorized stop delays.</p>
            </div>
            <button 
              onClick={fetchAlerts}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 text-xs px-3.5 py-2.5 rounded-xl transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Logs
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400">FILTER STATUS</span>
            <div className="flex gap-2">
              {['All', 'Unresolved', 'Resolved'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-xl transition-colors border ${
                    filterType === type 
                      ? 'bg-sky-600 border-sky-600 text-white' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="space-y-3">
            {filteredAlerts.map(a => (
              <div 
                key={a.id} 
                className={`p-4 border rounded-2xl flex items-center justify-between transition-colors bg-white shadow-sm hover:border-slate-300 ${
                  a.resolved_at ? 'border-slate-150 text-slate-400' : 'border-rose-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <ShieldAlert className={`w-5 h-5 ${a.resolved_at ? 'text-slate-350' : 'text-rose-600'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{a.registration_number}</span>
                      <span className="text-[9px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-550">Driver: {a.driver_name || 'System'}</span>
                    </div>
                    <p className="text-xs leading-normal mt-1 text-slate-700 font-medium">{a.message}</p>
                    <span className="text-[9px] text-slate-400 block mt-2">
                      Dispatched At: {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {a.resolved_at ? (
                    <span className="text-[9px] font-bold px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-500 uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => resolveAlert(a.id)}
                      className="text-[9px] font-bold px-3 py-1.5 rounded bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-750 transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filteredAlerts.length === 0 && (
              <div className="bg-white/90 border border-slate-200 rounded-2xl py-12 text-center text-xs text-slate-400 font-semibold shadow-sm">
                No compliance alerts recorded in this filter category.
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
