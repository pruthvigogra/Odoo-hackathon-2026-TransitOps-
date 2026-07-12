'use client';

import { useState } from 'react';
import { FileText, Plus, Search, Calendar, ShieldCheck, ShieldAlert } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function DocumentsPage() {
  const [docs, setDocs] = useState([
    { id: 1, vehicle: 'GJ01AB1234', title: 'Commercial Transit Permit', type: 'Permit', expiry: '2026-09-12', status: 'Valid' },
    { id: 2, vehicle: 'GJ01AB1234', title: 'National Goods Carriage Policy', type: 'Insurance', expiry: '2026-08-01', status: 'Expiring Soon' },
    { id: 3, vehicle: 'MH12KL3456', title: 'Pollution Under Control Check (PUC)', type: 'Emission', expiry: '2026-07-28', status: 'Expiring Soon' },
    { id: 4, vehicle: 'HR26G1234', title: 'Carrier Liability Coverage', type: 'Insurance', expiry: '2026-05-15', status: 'Expired' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocs = docs.filter(d => 
    d.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
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
                <FileText className="w-5 h-5 text-sky-600" />
                Fleet Document Compliance Repository
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Track transit permits, liability policies, emission checks, and receive expiry warnings.</p>
            </div>
            <button 
              onClick={() => alert('New document upload dialog initiated.')}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-750 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              Upload Document
            </button>
          </div>

          {/* Search bar */}
          <div className="relative bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search file database by vehicle number, policy title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none"
            />
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase select-none">
                    <th className="px-5 py-3.5">Document Title</th>
                    <th className="px-5 py-3.5">Vehicle Number</th>
                    <th className="px-5 py-3.5">Classification</th>
                    <th className="px-5 py-3.5">Expiry Date</th>
                    <th className="px-5 py-3.5">Compliance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
                  {filteredDocs.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-extrabold text-slate-800 text-sm block">{d.title}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Scanned file verified</span>
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-700">{d.vehicle}</td>
                      <td className="px-5 py-4 text-slate-500">{d.type}</td>
                      <td className="px-5 py-4 text-slate-550">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {d.expiry}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase border flex items-center gap-1.5 w-max ${
                          d.status === 'Valid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          d.status === 'Expiring Soon' ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse' :
                          'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {d.status === 'Valid' ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                          {d.status}
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
