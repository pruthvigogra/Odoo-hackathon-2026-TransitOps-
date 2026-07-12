'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Calendar, Star, ShieldAlert, Award, AlertTriangle, ShieldCheck, Users, X
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api, getUser } from '@/utils/api';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [user, setUser] = useState<any>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    license_number: '',
    license_expiry: new Date(Date.now() + 180*24*60*60*1000).toISOString().split('T')[0],
    status: 'Available',
    rating: '5.0',
    accident_history: '0'
  });

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

  const openAddModal = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      license_number: '',
      license_expiry: new Date(Date.now() + 180*24*60*60*1000).toISOString().split('T')[0],
      status: 'Available',
      rating: '5.0',
      accident_history: '0'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (driver: any) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      license_number: driver.license_number,
      license_expiry: driver.license_expiry,
      status: driver.status,
      rating: String(driver.rating),
      accident_history: String(driver.accident_history)
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        rating: parseFloat(formData.rating),
        accident_history: parseInt(formData.accident_history)
      };

      if (editingDriver) {
        await api.put(`/drivers/${editingDriver.id}`, payload);
      } else {
        await api.post('/drivers', payload);
      }
      setIsModalOpen(false);
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert('Failed to save driver details');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to suspend or remove this driver?')) return;
    try {
      await api.delete(`/drivers/${id}`);
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete driver');
    }
  };

  const checkExpiryWarning = (dateStr: string) => {
    if (!dateStr) return { warning: false, days: 0 };
    const diffTime = new Date(dateStr).getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      warning: diffDays <= 45 && diffDays >= 0,
      expired: diffDays < 0,
      days: diffDays
    };
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.license_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'All' || d.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen flex text-slate-800 custom-page-bg">
      <Navbar />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* Page Title & Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              Driver Operations & Scorecards
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Audit driver licensing records, active duty logs, and hazard performance ratings.</p>
          </div>
          {user && ['Admin', 'Fleet Manager'].includes(user.role) && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-750 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              Onboard Driver
            </button>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search by name, license number, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-4 py-2.5 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Driving">Driving</option>
              <option value="Resting">Resting</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>
        </div>

        {/* Drivers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map(d => {
            const licenseCheck = checkExpiryWarning(d.license_expiry);

            return (
              <div 
                key={d.id} 
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-800">{d.name}</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">{d.email}</p>
                      <p className="text-[10px] text-slate-400">{d.phone}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      d.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      d.status === 'Driving' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                      d.status === 'Resting' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                      'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {d.status}
                    </span>
                  </div>

                  {/* Driver Scorecard Metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-150 p-3 rounded-xl mt-4 text-center">
                    <div>
                      <span className="text-[8px] text-slate-500 font-bold block">SAFETY RATING</span>
                      <div className="flex items-center justify-center gap-0.5 text-xs font-black text-amber-600 mt-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {d.rating.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 font-bold block">TOTAL TRIPS</span>
                      <span className="text-xs font-black text-slate-800 block mt-1">{d.total_trips || '0'}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-500 font-bold block">INCIDENTS</span>
                      <span className={`text-xs font-black block mt-1 ${d.accident_history > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {d.accident_history || '0'}
                      </span>
                    </div>
                  </div>

                  {/* License Info */}
                  <div className="mt-4 pt-3.5 border-t border-slate-150 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Commercial DL No:</span>
                      <span className="text-slate-700 font-mono font-bold">{d.license_number}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">License Expiration:</span>
                      <span className={`font-bold flex items-center gap-1 ${
                        licenseCheck.expired ? 'text-rose-600' :
                        licenseCheck.warning ? 'text-amber-600 animate-pulse' :
                        'text-slate-700'
                      }`}>
                        {d.license_expiry}
                        {licenseCheck.warning && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                        {licenseCheck.expired && <ShieldAlert className="w-3 h-3 text-rose-500" />}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit/Delete Actions */}
                {user && ['Admin', 'Fleet Manager'].includes(user.role) && (
                  <div className="flex justify-end gap-1.5 pt-4 border-t border-slate-150 mt-4.5">
                    <button
                      onClick={() => openEditModal(d)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-350 transition-all text-[11px] font-bold flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      Configure
                    </button>
                    {user.role === 'Admin' && (
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 transition-colors"
                        title="Suspend Driver"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredDrivers.length === 0 && (
            <div className="col-span-full text-center text-slate-400 py-10">
              No drivers onboarded matching search criteria.
            </div>
          )}
        </div>

      </div>

      {/* CRUD Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-slate-250 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">
                {editingDriver ? 'Configure Driver Record' : 'Onboard Commercial Driver'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-650"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">DRIVER FULL NAME</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Ramesh Singh"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">MOBILE NUMBER</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="name@transitops.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">COMMERCIAL DL NUMBER</label>
                  <input
                    type="text"
                    required
                    value={formData.license_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                    placeholder="HR-2620XXXXXXXX"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">DL EXPIRY DATE</label>
                  <input
                    type="date"
                    required
                    value={formData.license_expiry}
                    onChange={(e) => setFormData(prev => ({ ...prev, license_expiry: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">SHIFT STATUS</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 text-xs rounded-xl px-3 py-2.5"
                  >
                    <option value="Available">Available</option>
                    <option value="Driving">Driving</option>
                    <option value="Resting">Resting</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">RATING</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    required
                    value={formData.rating}
                    onChange={(e) => setFormData(prev => ({ ...prev, rating: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 text-xs rounded-xl px-3.5 py-2.5"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 block">ACCIDENT / COMPLIANCE INFRACTION HISTORY COUNT</label>
                <input
                  type="number"
                  required
                  value={formData.accident_history}
                  onChange={(e) => setFormData(prev => ({ ...prev, accident_history: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-250 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-650 hover:bg-sky-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md"
                  style={{ backgroundColor: '#0284c7' }}
                >
                  {editingDriver ? 'Update Scorecard' : 'Complete Onboarding'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
