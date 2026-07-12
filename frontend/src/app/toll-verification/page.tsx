'use client';

import { useState, useEffect } from 'react';
import { Landmark, Search, ShieldCheck, CheckCircle2, ShieldAlert } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api } from '@/utils/api';

export default function TollVerificationPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTollLogs();
  }, []);

  const fetchTollLogs = async () => {
    try {
      // Fetch dynamic active clearance logs via mock or recent lists
      const res = await api.get('/alerts');
      // Convert alerts or retrieve recent toll checks
      setLogs([
        { id: 1, plazaName: 'Delhi Exit Plaza NH-48', regNo: 'GJ01AB1234', timestamp: new Date(Date.now() - 3600000).toLocaleString(), status: 'Cleared', fee: '₹350' },
        { id: 2, plazaName: 'Jaipur Bypass Toll Plaza', regNo: 'MH12KL3456', timestamp: new Date(Date.now() - 7200000).toLocaleString(), status: 'Cleared', fee: '₹350' },
        { id: 3, plazaName: 'Ahmedabad Outer Ring Plaza', regNo: 'GJ01AB1234', timestamp: new Date(Date.now() - 10800000).toLocaleString(), status: 'Skipped', fee: '₹0', isViolation: true },
        { id: 4, plazaName: 'Khalapur Toll Plaza Mumbai-Pune', regNo: 'HR26G1234', timestamp: new Date(Date.now() - 14400000).toLocaleString(), status: 'Cleared', fee: '₹350' },
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredLogs = logs.filter(l => 
    l.plazaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.regNo.toLowerCase().includes(searchTerm.toLowerCase())
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
                <Landmark className="w-5 h-5 text-sky-600" />
                FASTag Toll Plaza Verification
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Cross-check live GPS telemetry logs against official bank FASTag crossings to detect skipped tolls.</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
              Verify Rate: <strong className="text-emerald-600 font-extrabold">94.8%</strong>
            </span>
          </div>

          {/* Search bar */}
          <div className="relative bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search FASTag plaza records by plaza name, truck registration..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none"
            />
          </div>

          {/* Verification Logs Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase select-none">
                    <th className="px-5 py-3.5">Toll Plaza Name</th>
                    <th className="px-5 py-3.5">Truck Registration</th>
                    <th className="px-5 py-3.5">Clearance Timestamp</th>
                    <th className="px-5 py-3.5">Transaction Fee</th>
                    <th className="px-5 py-3.5">Compliance status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
                  {filteredLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-800">{l.plazaName}</span>
                        <span className="text-[9px] text-slate-450 block mt-0.5">NH-48 Route Link</span>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs font-bold text-slate-800">
                        {l.regNo}
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {l.timestamp}
                      </td>

                      <td className="px-5 py-4 font-extrabold text-slate-850">
                        {l.fee}
                      </td>

                      <td className="px-5 py-4">
                        {l.isViolation ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-700 flex items-center gap-1 w-max">
                            <ShieldAlert className="w-3.5 h-3.5" /> Skipped / Verification Failed
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center gap-1 w-max">
                            <ShieldCheck className="w-3.5 h-3.5" /> Cleared & Verified
                          </span>
                        )}
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
