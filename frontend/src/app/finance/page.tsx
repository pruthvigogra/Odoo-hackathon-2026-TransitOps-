'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, Fuel, Wrench, TrendingUp, Truck, Plus, X, RefreshCw,
  Search, ChevronDown, Calendar, AlertTriangle
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api, getUser } from '@/utils/api';

export default function FinanceDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [costData, setCostData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const [fuelForm, setFuelForm] = useState({
    vehicle_id: '',
    date: new Date().toISOString().split('T')[0],
    liters: '',
    cost: ''
  });

  useEffect(() => {
    setUser(getUser());
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [fuels, vehs, costs] = await Promise.all([
        api.get('/fuel'),
        api.get('/vehicles'),
        api.get('/fleet/operational-costs')
      ]);
      setFuelLogs(fuels);
      setVehicles(vehs);
      setCostData(costs);
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (msg: string, type: string) => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddFuelLog = async (e: any) => {
    e.preventDefault();
    try {
      await api.post('/fuel', {
        vehicle_id: parseInt(fuelForm.vehicle_id),
        amount: parseFloat(fuelForm.liters),
        date: fuelForm.date,
        odometer: 0,
        price_per_liter: parseFloat(fuelForm.cost) / parseFloat(fuelForm.liters),
        total_cost: parseFloat(fuelForm.cost),
        description: 'Manual entry via Finance dashboard'
      });
      showToast('Fuel log entry created successfully.', 'success');
      setShowAddForm(false);
      setFuelForm({ vehicle_id: '', date: new Date().toISOString().split('T')[0], liters: '', cost: '' });
      fetchAll();
    } catch (err: any) {
      showToast(err.message || 'Failed to create fuel log', 'error');
    }
  };

  const getVehicleName = (id: number) => {
    const v = vehicles.find(x => x.id === id);
    return v ? `${v.registration_number}` : `#${id}`;
  };

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num === 0) return '₹0';
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const filteredLogs = fuelLogs.filter(f =>
    getVehicleName(f.vehicle_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.date && f.date.includes(searchTerm))
  );

  const totalFuelCost = costData ? parseFloat(costData.total_fuel_cost) : 0;
  const totalMaintCost = costData ? parseFloat(costData.total_maintenance_cost) : 0;
  const totalOpCost = costData ? costData.total_operational_cost : 0;
  const perVehicle = costData?.per_vehicle || [];

  return (
    <div className="min-h-screen flex text-slate-800 custom-page-bg">
      <Navbar />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">

          {/* Toast */}
          {toast && (
            <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-lg border animate-scale-in ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {toast.message}
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-sky-600" />
                Financial Operations Dashboard
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Fleet-wide fuel, maintenance, and operational cost analytics.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAll}
                className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
              >
                <Plus className="w-4 h-4 stroke-[2.5px]" /> Log Fuel Entry
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Fuel Cost */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">TOTAL FUEL COST</span>
                <div className="p-1.5 bg-amber-50 rounded-lg"><Fuel className="w-4 h-4 text-amber-600" /></div>
              </div>
              <span className="text-2xl font-black text-slate-800">{formatCurrency(totalFuelCost)}</span>
              <p className="text-[10px] font-bold text-slate-500 mt-1">All-time fleet fuel spend</p>
            </div>

            {/* Total Maintenance Cost */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">TOTAL MAINTENANCE</span>
                <div className="p-1.5 bg-violet-50 rounded-lg"><Wrench className="w-4 h-4 text-violet-600" /></div>
              </div>
              <span className="text-2xl font-black text-slate-800">{formatCurrency(totalMaintCost)}</span>
              <p className="text-[10px] font-bold text-slate-500 mt-1">All-time service & repair</p>
            </div>

            {/* Total Operational Cost */}
            <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">OPERATIONAL COST</span>
                <div className="p-1.5 bg-sky-100 rounded-lg"><TrendingUp className="w-4 h-4 text-sky-600" /></div>
              </div>
              <span className="text-2xl font-black text-sky-700">{formatCurrency(totalOpCost)}</span>
              <p className="text-[10px] font-bold text-slate-500 mt-1">Fuel + Maintenance combined</p>
            </div>

            {/* ROI Placeholder */}
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-center">
              <AlertTriangle className="w-5 h-5 text-slate-400 mb-2" />
              <span className="text-[9px] font-bold text-slate-400 tracking-wider">ROI CALCULATION</span>
              <p className="text-[10px] text-slate-400 mt-1">Revenue not yet tracked in schema — planned for next phase</p>
            </div>
          </div>

          {/* Per-Vehicle Operational Cost Breakdown */}
          {perVehicle.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-sky-600" />
                  Per-Vehicle Operational Cost Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                      <th className="text-left px-5 py-2.5">Vehicle</th>
                      <th className="text-right px-5 py-2.5">Fuel Cost</th>
                      <th className="text-right px-5 py-2.5">Maintenance</th>
                      <th className="text-right px-5 py-2.5">Total Op. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {perVehicle.filter((v: any) => parseFloat(v.operational_cost) > 0).map((v: any) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <span className="font-bold text-slate-800">{v.registration_number}</span>
                          <span className="text-[10px] text-slate-400 ml-2">{v.model}</span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-amber-700">{formatCurrency(v.fuel_cost)}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-violet-700">{formatCurrency(v.maintenance_cost)}</td>
                        <td className="px-5 py-3 text-right font-mono font-black text-sky-700">{formatCurrency(v.operational_cost)}</td>
                      </tr>
                    ))}
                    {perVehicle.filter((v: any) => parseFloat(v.operational_cost) > 0).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-slate-400 font-semibold">
                          No operational costs recorded yet. Complete a trip or log fuel to see data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fuel Logs Section */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search fuel logs by vehicle, date, or description..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-sky-300"
                />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-600" />
                  Fuel Log Ledger
                  <span className="text-[9px] text-slate-400 font-bold ml-1">({filteredLogs.length} entries)</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                      <th className="text-left px-5 py-2.5">#</th>
                      <th className="text-left px-5 py-2.5">Vehicle</th>
                      <th className="text-left px-5 py-2.5">Date</th>
                      <th className="text-right px-5 py-2.5">Liters</th>
                      <th className="text-right px-5 py-2.5">Cost</th>
                      <th className="text-left px-5 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLogs.map((f, i) => (
                      <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 text-slate-400 font-mono">{i + 1}</td>
                        <td className="px-5 py-3">
                          <span className="font-bold text-slate-800">{getVehicleName(f.vehicle_id)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700">{f.date}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-slate-700">
                          {f.amount || f.liters || '—'} L
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-amber-700">
                          {formatCurrency(f.total_cost || f.cost || 0)}
                        </td>
                        <td className="px-5 py-3 text-slate-500 max-w-[200px] truncate">
                          {f.description || '—'}
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-semibold">
                          No fuel log entries found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Add Fuel Entry Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><Fuel className="w-4 h-4 text-amber-600" /> Log Fuel Entry</h2>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddFuelLog} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle</label>
                <select
                  required
                  value={fuelForm.vehicle_id}
                  onChange={e => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300"
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number} — {v.model}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                <input
                  required
                  type="date"
                  value={fuelForm.date}
                  onChange={e => setFuelForm({ ...fuelForm, date: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Liters</label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    min="0"
                    value={fuelForm.liters}
                    onChange={e => setFuelForm({ ...fuelForm, liters: e.target.value })}
                    placeholder="e.g. 350"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Cost (₹)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={fuelForm.cost}
                    onChange={e => setFuelForm({ ...fuelForm, cost: e.target.value })}
                    placeholder="e.g. 31500"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-300"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-md transition-colors">Save Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
