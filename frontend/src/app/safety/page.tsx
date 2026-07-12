'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, AlertTriangle, UserX, Search, ChevronDown,
  ArrowUpRight, ArrowDownRight, Calendar, Phone, Mail, RefreshCw
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api, getUser } from '@/utils/api';

export default function SafetyDashboardPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [user, setUser] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const data = await api.get('/drivers');
      setDrivers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (message: string, type: string) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleStatus = async (driver: any) => {
    const newStatus = driver.status === 'Suspended' ? 'Available' : 'Suspended';
    setActionLoading(driver.id);
    try {
      await api.patch(`/drivers/${driver.id}/status`, { status: newStatus });
      showToast(
        newStatus === 'Suspended'
          ? `${driver.name} has been suspended.`
          : `${driver.name} has been reactivated.`,
        newStatus === 'Suspended' ? 'warning' : 'success'
      );
      fetchDrivers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ---------- Computed KPIs ----------
  const today = new Date();
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  const totalDrivers = drivers.length;
  const suspendedDrivers = drivers.filter(d => d.status === 'Suspended').length;
  const expiringLicenses = drivers.filter(d => {
    if (!d.license_expiry) return false;
    const exp = new Date(d.license_expiry);
    return exp <= in30Days;
  }).length;
  const activeDrivers = drivers.filter(d => d.status === 'Available' || d.status === 'Driving').length;

  // ---------- Helpers ----------
  const getLicenseFlag = (dateStr: string) => {
    if (!dateStr) return { color: 'none', label: '' };
    const exp = new Date(dateStr);
    const diffMs = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { color: 'red', label: `Expired ${Math.abs(diffDays)}d ago` };
    if (diffDays <= 30) return { color: 'amber', label: `${diffDays}d remaining` };
    return { color: 'green', label: `${diffDays}d remaining` };
  };

  // ---------- Filtered list ----------
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.license_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.email && d.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter =
      filterStatus === 'All' ||
      (filterStatus === 'Expiring' && getLicenseFlag(d.license_expiry).color !== 'green') ||
      d.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen flex text-slate-800 custom-page-bg">
      <Navbar />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">

          {/* Toast */}
          {toast && (
            <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-lg border animate-scale-in ${
              toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              toast.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
              'bg-rose-50 text-rose-800 border-rose-200'
            }`}>
              {toast.message}
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-600" />
                Safety & Compliance Dashboard
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Monitor driver licensing, compliance status, and fleet safety posture.</p>
            </div>
            <button
              onClick={fetchDrivers}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Drivers */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">TOTAL DRIVERS</span>
                <div className="p-1.5 bg-sky-50 rounded-lg"><Users className="w-4 h-4 text-sky-600" /></div>
              </div>
              <span className="text-2xl font-black text-slate-800">{totalDrivers}</span>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-emerald-600">
                <ArrowUpRight className="w-3 h-3" /> {activeDrivers} active
              </div>
            </div>

            {/* Licenses Expiring Soon */}
            <div className={`border rounded-2xl p-5 shadow-sm ${expiringLicenses > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">EXPIRING LICENSES</span>
                <div className={`p-1.5 rounded-lg ${expiringLicenses > 0 ? 'bg-amber-100' : 'bg-slate-50'}`}>
                  <AlertTriangle className={`w-4 h-4 ${expiringLicenses > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                </div>
              </div>
              <span className={`text-2xl font-black ${expiringLicenses > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{expiringLicenses}</span>
              <p className="text-[10px] font-bold text-slate-500 mt-1">Within next 30 days</p>
            </div>

            {/* Suspended Drivers */}
            <div className={`border rounded-2xl p-5 shadow-sm ${suspendedDrivers > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">SUSPENDED</span>
                <div className={`p-1.5 rounded-lg ${suspendedDrivers > 0 ? 'bg-rose-100' : 'bg-slate-50'}`}>
                  <UserX className={`w-4 h-4 ${suspendedDrivers > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
                </div>
              </div>
              <span className={`text-2xl font-black ${suspendedDrivers > 0 ? 'text-rose-700' : 'text-slate-800'}`}>{suspendedDrivers}</span>
              <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-rose-500">
                {suspendedDrivers > 0 && <><ArrowDownRight className="w-3 h-3" /> Requires review</>}
              </div>
            </div>

            {/* Compliance Rate */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">COMPLIANCE RATE</span>
                <div className="p-1.5 bg-emerald-50 rounded-lg"><ShieldCheck className="w-4 h-4 text-emerald-600" /></div>
              </div>
              <span className="text-2xl font-black text-emerald-700">
                {totalDrivers > 0 ? Math.round(((totalDrivers - expiringLicenses - suspendedDrivers) / totalDrivers) * 100) : 100}%
              </span>
              <p className="text-[10px] font-bold text-slate-500 mt-1">Valid license & active</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, license number, or email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-sky-300"
              />
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-4 pr-9 py-2.5 focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Driving">Driving</option>
                <option value="Suspended">Suspended</option>
                <option value="Expiring">Expiring / Expired</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Drivers Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                    <th className="text-left px-5 py-3">Driver Name</th>
                    <th className="text-left px-5 py-3">License Number</th>
                    <th className="text-left px-5 py-3">License Expiry</th>
                    <th className="text-left px-5 py-3">Contact</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-right px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDrivers.map(d => {
                    const flag = getLicenseFlag(d.license_expiry);
                    const isExpiredOrExpiring = flag.color === 'red' || flag.color === 'amber';

                    return (
                      <tr
                        key={d.id}
                        className={`transition-colors ${
                          flag.color === 'red'
                            ? 'bg-rose-50/50 hover:bg-rose-50'
                            : flag.color === 'amber'
                            ? 'bg-amber-50/40 hover:bg-amber-50'
                            : 'hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-sky-100 rounded-xl flex items-center justify-center text-sky-700 font-extrabold text-sm flex-shrink-0">
                              {d.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 block">{d.name}</span>
                              <span className="text-[10px] text-slate-400">ID #{100 + d.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* License Number */}
                        <td className="px-5 py-3.5">
                          <span className="font-mono font-bold text-slate-700">{d.license_number}</span>
                        </td>

                        {/* License Expiry */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Calendar className={`w-3.5 h-3.5 ${
                              flag.color === 'red' ? 'text-rose-500' :
                              flag.color === 'amber' ? 'text-amber-500' :
                              'text-slate-400'
                            }`} />
                            <div>
                              <span className={`font-bold block ${
                                flag.color === 'red' ? 'text-rose-700' :
                                flag.color === 'amber' ? 'text-amber-700' :
                                'text-slate-700'
                              }`}>{d.license_expiry}</span>
                              {isExpiredOrExpiring && (
                                <span className={`text-[9px] font-bold ${
                                  flag.color === 'red' ? 'text-rose-500' : 'text-amber-500'
                                }`}>
                                  {flag.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {d.email}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {d.phone}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase border ${
                            d.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            d.status === 'Driving' ? 'bg-sky-50 text-sky-700 border-sky-100' :
                            d.status === 'Suspended' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {d.status}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3.5 text-right">
                          {d.status === 'Suspended' ? (
                            <button
                              disabled={actionLoading === d.id}
                              onClick={() => handleToggleStatus(d)}
                              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                            >
                              {actionLoading === d.id ? 'Updating...' : 'Reactivate'}
                            </button>
                          ) : (d.status === 'Available' || d.status === 'Resting') ? (
                            <button
                              disabled={actionLoading === d.id}
                              onClick={() => handleToggleStatus(d)}
                              className="inline-flex items-center gap-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                            >
                              {actionLoading === d.id ? 'Updating...' : 'Suspend'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">On Duty</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredDrivers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-slate-400 font-semibold">
                        No drivers matching filter criteria.
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
