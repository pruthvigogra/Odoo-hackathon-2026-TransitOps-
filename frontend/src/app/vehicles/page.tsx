'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, ShieldAlert, X
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api, getUser } from '@/utils/api';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [user, setUser] = useState<any>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [formData, setFormData] = useState({
    registration_number: '',
    manufacturer: '',
    model: '',
    manufacturing_year: new Date().getFullYear().toString(),
    type: 'HCV Trailer',
    capacity: '40',
    acquisition_date: new Date().toISOString().split('T')[0],
    acquisition_cost: '3500000',
    odometer: '1000',
    gps_device_id: '',
    fastag_id: '',
    fuel_type: 'Diesel',
    mileage: '3.5',
    insurance_expiry: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
    permit_expiry: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
    puc_expiry: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
    status: 'Available',
    current_driver_id: ''
  });

  useEffect(() => {
    setUser(getUser());
    fetchVehicles();
    fetchDrivers();
  }, []);

  const fetchVehicles = async () => {
    try {
      const data = await api.get('/vehicles');
      setVehicles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDrivers = async () => {
    try {
      const data = await api.get('/drivers');
      setDrivers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const checkExpiryWarning = (dateStr: string) => {
    if (!dateStr) return { warning: false, days: 0 };
    const diffTime = new Date(dateStr).getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      warning: diffDays <= 30 && diffDays >= 0,
      expired: diffDays < 0,
      days: diffDays
    };
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setFormData({
      registration_number: '',
      manufacturer: '',
      model: '',
      manufacturing_year: '2022',
      type: 'HCV Trailer',
      capacity: '40',
      acquisition_date: new Date().toISOString().split('T')[0],
      acquisition_cost: '3500000',
      odometer: '1000',
      gps_device_id: `GPS-NEW-${Math.floor(10000 + Math.random() * 90000)}`,
      fastag_id: `FTAG-NEW-${Math.floor(10000 + Math.random() * 90000)}`,
      fuel_type: 'Diesel',
      mileage: '4.0',
      insurance_expiry: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
      permit_expiry: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
      puc_expiry: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0],
      status: 'Available',
      current_driver_id: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      registration_number: vehicle.registration_number,
      manufacturer: vehicle.manufacturer,
      model: vehicle.model,
      manufacturing_year: String(vehicle.manufacturing_year),
      type: vehicle.type,
      capacity: String(vehicle.capacity),
      acquisition_date: vehicle.acquisition_date,
      acquisition_cost: String(vehicle.acquisition_cost),
      odometer: String(vehicle.odometer),
      gps_device_id: vehicle.gps_device_id,
      fastag_id: vehicle.fastag_id,
      fuel_type: vehicle.fuel_type,
      mileage: String(vehicle.mileage),
      insurance_expiry: vehicle.insurance_expiry,
      permit_expiry: vehicle.permit_expiry,
      puc_expiry: vehicle.puc_expiry,
      status: vehicle.status,
      current_driver_id: vehicle.current_driver_id ? String(vehicle.current_driver_id) : ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        current_driver_id: formData.current_driver_id ? parseInt(formData.current_driver_id) : null
      };

      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}`, payload);
      } else {
        await api.post('/vehicles', payload);
      }
      setIsModalOpen(false);
      fetchVehicles();
    } catch (err) {
      console.error(err);
      alert('Failed to save vehicle details');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this vehicle from the active fleet?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      fetchVehicles();
    } catch (err) {
      console.error(err);
      alert('Failed to delete vehicle');
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'All' || v.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const expiringDocsCount = vehicles.reduce((sum, v) => {
    const ins = checkExpiryWarning(v.insurance_expiry);
    const perm = checkExpiryWarning(v.permit_expiry);
    const puc = checkExpiryWarning(v.puc_expiry);
    const hasExpiring = ins.warning || ins.expired || perm.warning || perm.expired || puc.warning || puc.expired;
    return sum + (hasExpiring ? 1 : 0);
  }, 0);

  return (
    <div className="min-h-screen flex text-slate-800 custom-page-bg">
      <Navbar />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">
        
        {/* Page Title & Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-600" />
              Fleet Vehicle Configuration
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Configure GPS tracking, FASTag IDs, and audit expiration logs for all trucks.</p>
          </div>
          {user && ['Admin', 'Fleet Manager'].includes(user.role) && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-750 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              Register Vehicle
            </button>
          )}
        </div>

        {/* Expiring Docs Warning Banner */}
        {expiringDocsCount > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-slate-800">Fleet Document Expiry Warning</h4>
              <p className="text-[11px] text-slate-700 mt-0.5">
                We detected <strong>{expiringDocsCount}</strong> vehicles with insurance, transit permits, or pollution certificates expiring within the next 30 days. Fix these in the configurations below to prevent toll clearance lockouts.
              </p>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search by registration, manufacturer, model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="Idle">Idle</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Out of Service">Out of Service</option>
            </select>
          </div>
        </div>

        {/* Vehicles Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase select-none">
                  <th className="px-5 py-3.5">Vehicle Details</th>
                  <th className="px-5 py-3.5">GPS / FASTag IDs</th>
                  <th className="px-5 py-3.5">Assigned Driver</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Document Audits</th>
                  {user && ['Admin', 'Fleet Manager'].includes(user.role) && (
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
                {filteredVehicles.map(v => {
                  const ins = checkExpiryWarning(v.insurance_expiry);
                  const perm = checkExpiryWarning(v.permit_expiry);
                  const puc = checkExpiryWarning(v.puc_expiry);

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 text-sm">{v.registration_number}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {v.manufacturer} {v.model} ({v.manufacturing_year}) • {v.type}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-[10px] text-slate-600 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">GPS:</span>
                          <span>{v.gps_device_id}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">TAG:</span>
                          <span className="text-sky-600 font-bold">{v.fastag_id}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-700 font-medium">
                        {v.driver_name ? (
                          <div>
                            <span className="text-slate-800 font-bold">{v.driver_name}</span>
                            <span className="text-[9px] text-slate-500 block">Active Assignment</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          v.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          v.status === 'On Trip' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                          v.status === 'Maintenance' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {v.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 w-16">Insurance:</span>
                          <span className={`text-[10px] font-bold ${ins.expired ? 'text-rose-600' : ins.warning ? 'text-amber-600 animate-pulse font-bold' : 'text-slate-600'}`}>
                            {v.insurance_expiry} {ins.warning && '(Expiring)'} {ins.expired && '(Expired)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 w-16">Transit Perm:</span>
                          <span className={`text-[10px] font-bold ${perm.expired ? 'text-rose-600' : perm.warning ? 'text-amber-600 animate-pulse font-bold' : 'text-slate-600'}`}>
                            {v.permit_expiry} {perm.warning && '(Expiring)'} {perm.expired && '(Expired)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 w-16">Emission (PUC):</span>
                          <span className={`text-[10px] font-bold ${puc.expired ? 'text-rose-600' : puc.warning ? 'text-amber-600 animate-pulse font-bold' : 'text-slate-600'}`}>
                            {v.puc_expiry} {puc.warning && '(Expiring)'} {puc.expired && '(Expired)'}
                          </span>
                        </div>
                      </td>

                      {user && ['Admin', 'Fleet Manager'].includes(user.role) && (
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(v)}
                              className="p-1.5 hover:bg-slate-150 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                              title="Edit Configuration"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {user.role === 'Admin' && (
                              <button
                                onClick={() => handleDelete(v.id)}
                                className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 transition-colors"
                                title="Remove Vehicle"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filteredVehicles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-400 py-10">
                      No vehicles found matching search parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* CRUD Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">
                {editingVehicle ? 'Edit Vehicle Configurations' : 'Register New Fleet Vehicle'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-650"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">REGISTRATION NUMBER</label>
                  <input
                    type="text"
                    required
                    value={formData.registration_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, registration_number: e.target.value }))}
                    placeholder="e.g. DL-01-MA-1234"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">VEHICLE STATUS</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  >
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="Idle">Idle</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Out of Service">Out of Service</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">MANUFACTURER</label>
                  <input
                    type="text"
                    required
                    value={formData.manufacturer}
                    onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                    placeholder="e.g. Tata Motors"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">MODEL</label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g. Prima 4028.S"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">MANUFACTURING YEAR</label>
                  <input
                    type="number"
                    required
                    value={formData.manufacturing_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, manufacturing_year: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">CAPACITY (TONS)</label>
                  <input
                    type="number"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">GPS DEVICE SERIAL ID</label>
                  <input
                    type="text"
                    required
                    value={formData.gps_device_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, gps_device_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">FASTAG PLAZA WALLET ID</label>
                  <input
                    type="text"
                    required
                    value={formData.fastag_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, fastag_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">CURRENT ODOMETER (KM)</label>
                  <input
                    type="number"
                    required
                    value={formData.odometer}
                    onChange={(e) => setFormData(prev => ({ ...prev, odometer: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">FUEL TYPE</label>
                  <input
                    type="text"
                    required
                    value={formData.fuel_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, fuel_type: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-600 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>
              </div>

              {/* Expiration Audits Section */}
              <div className="border-t border-slate-150 pt-4 mt-3">
                <span className="text-[10px] font-bold text-sky-600 block mb-3">COMPLIANCE & LEGAL DOCUMENTATION DATES</span>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 block">INSURANCE EXPIRY</label>
                    <input
                      type="date"
                      required
                      value={formData.insurance_expiry}
                      onChange={(e) => setFormData(prev => ({ ...prev, insurance_expiry: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 block">PERMIT EXPIRY</label>
                    <input
                      type="date"
                      required
                      value={formData.permit_expiry}
                      onChange={(e) => setFormData(prev => ({ ...prev, permit_expiry: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 block">EMISSION CERTIFICATE (PUC)</label>
                    <input
                      type="date"
                      required
                      value={formData.puc_expiry}
                      onChange={(e) => setFormData(prev => ({ ...prev, puc_expiry: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150 mt-4">
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
                  {editingVehicle ? 'Update Configuration' : 'Complete Registration'}
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
