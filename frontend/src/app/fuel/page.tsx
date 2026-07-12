'use client';

import { useState } from 'react';
import { Fuel, Plus, Search, Calendar } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function FuelPage() {
  const [logs, setLogs] = useState([
    { id: 1, vehicle: 'GJ01AB1234', date: '2026-07-12', quantity: '240 Liters', cost: '₹22,800', efficiency: '3.8 km/l' },
    { id: 2, vehicle: 'MH12KL3456', date: '2026-07-11', quantity: '180 Liters', cost: '₹17,100', efficiency: '4.2 km/l' },
    { id: 3, vehicle: 'HR26G1234', date: '2026-07-10', quantity: '310 Liters', cost: '₹29,450', efficiency: '3.5 km/l' },
    { id: 4, vehicle: 'DL01MA5678', date: '2026-07-09', quantity: '200 Liters', cost: '₹19,000', efficiency: '4.0 km/l' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(l => 
    l.vehicle.toLowerCase().includes(searchTerm.toLowerCase())
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
                <Fuel className="w-5 h-5 text-sky-600" />
                Fuel Monitoring & Dispatch Cost
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Audit diesel refills, track fuel card transactions, and compute vehicle mileage efficiencies.</p>
            </div>
            <button 
              onClick={() => alert('New fuel purchase log workflow initiated.')}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-750 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              Log Refill
            </button>
          </div>

          {/* Search bar */}
          <div className="relative bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search fuel purchase receipts by vehicle number..."
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
                    <th className="px-5 py-3.5">Vehicle Number</th>
                    <th className="px-5 py-3.5">Refueling Date</th>
                    <th className="px-5 py-3.5">Quantity (Liters)</th>
                    <th className="px-5 py-3.5">Total Cost</th>
                    <th className="px-5 py-3.5">Calculated Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
                  {filteredLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-extrabold text-slate-800 text-sm">{l.vehicle}</td>
                      <td className="px-5 py-4 text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {l.date}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-750">{l.quantity}</td>
                      <td className="px-5 py-4 font-extrabold text-slate-850">{l.cost}</td>
                      <td className="px-5 py-4 font-mono font-bold text-sky-650">{l.efficiency}</td>
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
