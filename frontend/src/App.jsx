import React, { useState, useEffect } from 'react';
import { 
  Truck, Users, Navigation, DollarSign, BarChart3, Settings, 
  Plus, LogOut, ShieldAlert, CheckCircle2, AlertTriangle, X, 
  Lock, ArrowRight, Activity, Zap, FileSpreadsheet, Eye
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend
} from 'recharts';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  
  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Fleet Manager');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Core Platform Data State
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Active module tab
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modals state
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showAddFuel, setShowAddFuel] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  
  // Dynamic action modals
  const [activeCompleteTripModal, setActiveCompleteTripModal] = useState(null); // stores trip object
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState(null); // stores vehicle object

  // Form Fields Inputs
  const [vehicleForm, setVehicleForm] = useState({ reg_no: '', name: '', type: 'Heavy Truck', max_load_capacity: '', odometer: '', acquisition_cost: '' });
  const [driverForm, setDriverForm] = useState({ name: '', license_no: '', license_category: 'Heavy Transport', license_expiry_date: '', contact_no: '' });
  const [tripForm, setTripForm] = useState({ source: '', destination: '', cargo_weight: '', planned_distance: '', vehicle_id: '', driver_id: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({ vehicle_id: '', service_type: '', cost: '', date: '' });
  const [fuelForm, setFuelForm] = useState({ vehicle_id: '', date: '', liters: '', cost: '' });
  const [expenseForm, setExpenseForm] = useState({ vehicle_id: '', trip_id: '', toll: '', other: '' });

  // Complete Trip Form Fields
  const [completeTripForm, setCompleteTripForm] = useState({ final_odometer: '', fuel_consumed: '', revenue: '', toll_expense: '', other_expense: '' });

  // Safety Score Modifier state
  const [adjustScoreDriverId, setAdjustScoreDriverId] = useState(null);
  const [adjustScoreValue, setAdjustScoreValue] = useState('');

  // Fetch initial system data
  const fetchData = async () => {
    try {
      const vRes = await fetch(`${API_BASE}/vehicles`);
      const vData = await vRes.json();
      setVehicles(vData);

      const dRes = await fetch(`${API_BASE}/drivers`);
      const dData = await dRes.json();
      setDrivers(dData);

      const tRes = await fetch(`${API_BASE}/trips`);
      const tData = await tRes.json();
      setTrips(tData);

      const mRes = await fetch(`${API_BASE}/maintenance`);
      const mData = await mRes.json();
      setMaintenance(mData);

      const fRes = await fetch(`${API_BASE}/fuel`);
      const fData = await fRes.json();
      setFuelLogs(fData);

      const eRes = await fetch(`${API_BASE}/expenses`);
      const eData = await eRes.json();
      setExpenses(eData);

      const aRes = await fetch(`${API_BASE}/reports/analytics`);
      const aData = await aRes.json();
      setAnalytics(aData);
    } catch (err) {
      console.error("Error fetching system data: ", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  // Handle User Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 423) {
          setErrorMsg(data.error);
        } else {
          setLoginAttempts(prev => prev + 1);
          setErrorMsg(data.error || 'Authentication failed');
        }
        return;
      }

      setToken(data.token);
      setUser(data.user);
      if (rememberMe) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      // Default initial tabs based on roles
      if (data.user.role === 'Dispatcher') {
        setActiveTab('trips');
      } else if (data.user.role === 'Safety Officer') {
        setActiveTab('drivers');
      } else if (data.user.role === 'Financial Analyst') {
        setActiveTab('expenses');
      } else {
        setActiveTab('dashboard');
      }
    } catch (err) {
      setErrorMsg('Cannot connect to backend server');
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Helper function to check role access permissions
  const hasAccess = (module, action = 'view') => {
    if (!user) return false;
    const rbac = {
      'Fleet Manager': { fleet: 'Full', drivers: 'Full', trips: 'None', expenses: 'None', analytics: 'View' },
      'Dispatcher': { fleet: 'View', drivers: 'None', trips: 'Full', expenses: 'None', analytics: 'None' },
      'Safety Officer': { fleet: 'None', drivers: 'Full', trips: 'View', expenses: 'None', analytics: 'None' },
      'Financial Analyst': { fleet: 'View', drivers: 'None', trips: 'None', expenses: 'Full', analytics: 'View' }
    };
    const access = rbac[user.role]?.[module] || 'None';
    if (action === 'write') {
      return access === 'Full';
    }
    return access !== 'None';
  };

  // ---------------- FORM ACTIONS ----------------

  const addVehicle = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(vehicleForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAddVehicle(false);
      setVehicleForm({ reg_no: '', name: '', type: 'Heavy Truck', max_load_capacity: '', odometer: '', acquisition_cost: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const addDriver = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(driverForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAddDriver(false);
      setDriverForm({ name: '', license_no: '', license_category: 'Heavy Transport', license_expiry_date: '', contact_no: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleDriverSuspension = async (driverId, currentStatus) => {
    const nextStatus = currentStatus === 'Suspended' ? 'Available' : 'Suspended';
    try {
      const res = await fetch(`${API_BASE}/drivers/${driverId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error('Failed to update driver status');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const adjustSafetyScore = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/drivers/${adjustScoreDriverId}/safety`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ safety_score: parseFloat(adjustScoreValue) })
      });
      if (!res.ok) throw new Error('Failed to update safety score');
      setAdjustScoreDriverId(null);
      setAdjustScoreValue('');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const createTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(tripForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowCreateTrip(false);
      setTripForm({ source: '', destination: '', cargo_weight: '', planned_distance: '', vehicle_id: '', driver_id: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const dispatchTrip = async (tripId) => {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/dispatch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const cancelTrip = async (tripId) => {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to cancel trip');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const completeTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/trips/${activeCompleteTripModal.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(completeTripForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActiveCompleteTripModal(null);
      setCompleteTripForm({ final_odometer: '', fuel_consumed: '', revenue: '', toll_expense: '', other_expense: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const addMaintenance = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(maintenanceForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAddMaintenance(false);
      setMaintenanceForm({ vehicle_id: '', service_type: '', cost: '', date: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const closeMaintenance = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/maintenance/${id}/close`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to close maintenance');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const addFuel = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/fuel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(fuelForm)
      });
      if (!res.ok) throw new Error('Failed to log fuel');
      setShowAddFuel(false);
      setFuelForm({ vehicle_id: '', date: '', liters: '', cost: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(expenseForm)
      });
      if (!res.ok) throw new Error('Failed to add expense');
      setShowAddExpense(false);
      setExpenseForm({ vehicle_id: '', trip_id: '', toll: '', other: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const retireVehicle = async (id) => {
    if (!confirm("Are you sure you want to retire this vehicle permanently? It will be excluded from all dispatch pools.")) return;
    try {
      const res = await fetch(`${API_BASE}/vehicles/${id}/retire`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to retire vehicle');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const exportCSV = () => {
    if (!analytics || !analytics.vehicleAnalyticsList) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Registration No,Vehicle Name,Acquisition Cost,Revenue,Operational Cost,ROI (%)\n";
    
    analytics.vehicleAnalyticsList.forEach(v => {
      csvContent += `${v.reg_no},${v.name},${v.acquisition_cost},${v.revenue},${v.operational_cost},${v.roi}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TransitOps_Fleet_ROI_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper validation alerts
  const isLicenseExpiringSoon = (expiryStr) => {
    const today = new Date();
    const expiry = new Date(expiryStr);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  // ---------------- AUTHENTICATION UI ----------------
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Background Visual Enhancements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full filter blur-3xl opacity-10 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600 rounded-full filter blur-3xl opacity-10 translate-x-1/2 translate-y-1/2"></div>

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Truck className="h-8 w-8 text-blue-500 animate-pulse" />
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">TransitOps</span>
          </div>

          <h2 className="text-center text-xl font-semibold text-slate-200 mb-8">Control Tower Portal</h2>

          {errorMsg && (
            <div className="bg-red-950/50 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm mb-6 flex items-start gap-2">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workspace Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="Fleet Manager">Fleet Manager</option>
                <option value="Dispatcher">Dispatcher</option>
                <option value="Safety Officer">Safety Officer</option>
                <option value="Financial Analyst">Financial Analyst</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@transitops.com"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Security Password</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0" 
                />
                Remember me
              </label>
              <a href="#" onClick={() => alert('Password reset requests must go through your systems administrator.')} className="text-blue-400 hover:underline">Forgot password?</a>
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              Sign In to Dashboard
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-500">TransitOps Operations Suite v1.4.0</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand header */}
          <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-800 bg-slate-950/40">
            <Truck className="h-6 w-6 text-blue-500" />
            <span className="text-lg font-bold tracking-wider uppercase bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">TransitOps</span>
          </div>

          {/* User profile info info */}
          <div className="p-4 bg-slate-950/20 border-b border-slate-800/50">
            <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Active Role</div>
            <div className="text-sm font-bold text-blue-400 mt-0.5">{user.role}</div>
            <div className="text-xs text-slate-400 mt-1 truncate">{user.name}</div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {hasAccess('analytics') && (
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <BarChart3 className="h-4 w-4" />
                Fleet Metrics
              </button>
            )}

            {hasAccess('fleet') && (
              <button 
                onClick={() => setActiveTab('vehicles')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'vehicles' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Truck className="h-4 w-4" />
                Vehicle Registry
              </button>
            )}

            {hasAccess('drivers') && (
              <button 
                onClick={() => setActiveTab('drivers')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'drivers' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Users className="h-4 w-4" />
                Drivers & Safety
              </button>
            )}

            {hasAccess('trips') && (
              <button 
                onClick={() => setActiveTab('trips')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'trips' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <Navigation className="h-4 w-4" />
                Trips Console
              </button>
            )}

            {hasAccess('expenses') && (
              <button 
                onClick={() => setActiveTab('expenses')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'expenses' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
              >
                <DollarSign className="h-4 w-4" />
                Expenses & Fuel
              </button>
            )}

            {/* Driver self-service screen available to all for demo */}
            <button 
              onClick={() => setActiveTab('driver-app')} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'driver-app' ? 'bg-purple-900/60 border border-purple-800/80 text-purple-200' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Zap className="h-4 w-4" />
              Demo Driver App
            </button>

            <button 
              onClick={() => setActiveTab('settings')} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Settings className="h-4 w-4" />
              Settings & RBAC
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Board Component Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
        
        {/* ================= tab: DASHBOARD (Fleet Metrics) ================= */}
        {activeTab === 'dashboard' && analytics && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Fleet Analytics & KPIs</h1>
                <p className="text-sm text-slate-400">Live operational overview metrics and financial health reports</p>
              </div>
              {user.role === 'Financial Analyst' && (
                <button 
                  onClick={exportCSV} 
                  className="bg-blue-600 hover:bg-blue-500 text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Fleet ROI (CSV)
                </button>
              )}
            </div>

            {/* KPI Metrics row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Fleet Utilization</div>
                <div className="text-2xl font-extrabold mt-2 text-slate-100">{analytics.kpis.fleetUtilization}%</div>
                <div className="text-xs text-blue-400 mt-1">Active / Total active vehicles</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Fuel Efficiency</div>
                <div className="text-2xl font-extrabold mt-2 text-slate-100">{analytics.kpis.fuelEfficiency} <span className="text-sm text-slate-400">km/L</span></div>
                <div className="text-xs text-emerald-400 mt-1">Calculated distance per liter</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Operational Cost</div>
                <div className="text-2xl font-extrabold mt-2 text-slate-100">${analytics.kpis.totalOpCost.toLocaleString()}</div>
                <div className="text-xs text-rose-400 mt-1">Fuel + Maintenance logs</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Vehicle Status</div>
                <div className="flex gap-3 mt-3 text-xs">
                  <div>🟢 {analytics.kpis.availableVehicles} Avail</div>
                  <div>🔵 {analytics.kpis.activeVehicles} Trip</div>
                  <div>🟡 {analytics.kpis.maintenanceVehicles} Shop</div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Monthly Revenue Overview</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Legend />
                      <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Costliest Vehicles (Fuel + Maintenance)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topCostliestVehicles}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="reg_no" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                      <Legend />
                      <Bar dataKey="operational_cost" name="Op Cost ($)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ROI Formula Display Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-300">Fleet Return on Investment (ROI) Matrix</h4>
                <p className="text-xs text-slate-500 mt-1 font-mono">Formula: ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost</p>
              </div>
              <div className="text-xs bg-slate-950 px-4 py-2 border border-slate-800 rounded-lg text-slate-400">
                Data recalculated automatically from real-time operational logs.
              </div>
            </div>

            {/* Vehicle Analytics ROI Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/60 border-b border-slate-800">
                  <tr>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Reg No.</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Acquisition Cost</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Total Revenue</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Operational Cost</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Return (ROI)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {analytics.vehicleAnalyticsList.map(v => (
                    <tr key={v.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 text-sm font-medium text-slate-200">{v.name}</td>
                      <td className="p-4 text-sm text-slate-400">{v.reg_no}</td>
                      <td className="p-4 text-sm text-slate-300">${v.acquisition_cost.toLocaleString()}</td>
                      <td className="p-4 text-sm text-emerald-400">${v.revenue.toLocaleString()}</td>
                      <td className="p-4 text-sm text-rose-400">${v.operational_cost.toLocaleString()}</td>
                      <td className="p-4 text-sm">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold ${v.roi >= 0 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60' : 'bg-rose-950/60 text-rose-400 border border-rose-900/60'}`}>
                          {v.roi}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ================= tab: VEHICLES ================= */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Vehicle Registry</h1>
                <p className="text-sm text-slate-400">Manage vehicle registry profiles and track service logs.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {hasAccess('fleet', 'write') && (
                  <>
                    <button 
                      onClick={() => setShowAddVehicle(true)} 
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Vehicle
                    </button>
                    <button 
                      onClick={() => setShowAddMaintenance(true)} 
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      Log Service Record
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Rule Banner */}
            <div className="bg-indigo-950/40 border border-indigo-900/60 rounded-xl p-4 flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-indigo-400 shrink-0" />
              <span className="text-xs text-indigo-200">
                <strong className="font-semibold text-white">System Policy:</strong> Vehicles flagged as <code className="bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-300">Retired</code> or <code className="bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-300">In Shop</code> are automatically excluded from the Dispatcher's selection pool.
              </span>
            </div>

            {/* Vehicles Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/60 border-b border-slate-800">
                  <tr>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Reg. No.</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Model/Name</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Type</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Max Capacity</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Odometer</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {vehicles.map(v => (
                    <tr key={v.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="p-4 text-sm font-semibold text-slate-200 font-mono">{v.reg_no}</td>
                      <td className="p-4 text-sm text-slate-300">{v.name}</td>
                      <td className="p-4 text-sm text-slate-400">{v.type}</td>
                      <td className="p-4 text-sm text-slate-300">{v.max_load_capacity.toLocaleString()} kg</td>
                      <td className="p-4 text-sm text-slate-300 font-mono">{v.odometer.toLocaleString()} km</td>
                      <td className="p-4 text-sm">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          v.status === 'Available' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60' :
                          v.status === 'On Trip' ? 'bg-blue-950 text-blue-400 border border-blue-900/60' :
                          v.status === 'In Shop' ? 'bg-amber-950 text-amber-400 border border-amber-900/60' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-right space-x-2">
                        <button 
                          onClick={() => {
                            const historyTrips = trips.filter(t => t.vehicle_id === v.id);
                            const historyMaint = maintenance.filter(m => m.vehicle_id === v.id);
                            setSelectedVehicleHistory({ vehicle: v, trips: historyTrips, maintenance: historyMaint });
                          }}
                          className="text-slate-400 hover:text-slate-200 text-xs bg-slate-800 px-2 py-1 rounded"
                        >
                          History
                        </button>
                        {hasAccess('fleet', 'write') && v.status !== 'Retired' && (
                          <button 
                            onClick={() => retireVehicle(v.id)}
                            className="bg-rose-950/60 hover:bg-rose-950 border border-rose-900/60 text-rose-400 text-xs px-2.5 py-1 rounded"
                          >
                            Retire
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Maintenance Service Log section */}
            <div>
              <h2 className="text-xl font-bold mb-4">Logged Maintenance Records</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950/60 border-b border-slate-800">
                    <tr>
                      <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle Reg</th>
                      <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Service Details</th>
                      <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Date Logged</th>
                      <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Cost</th>
                      <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                      <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {maintenance.map(m => (
                      <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 text-sm font-mono text-slate-200">{m.vehicle_reg}</td>
                        <td className="p-4 text-sm text-slate-300">{m.service_type}</td>
                        <td className="p-4 text-sm text-slate-400">{m.date}</td>
                        <td className="p-4 text-sm text-slate-300 font-mono">${m.cost.toLocaleString()}</td>
                        <td className="p-4 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${m.status === 'Open' ? 'bg-amber-950 text-amber-400 border border-amber-900/40' : 'bg-slate-850 text-slate-400 border border-slate-800'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-right">
                          {hasAccess('fleet', 'write') && m.status === 'Open' && (
                            <button 
                              onClick={() => closeMaintenance(m.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded transition-colors"
                            >
                              Close Service
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= tab: DRIVERS ================= */}
        {activeTab === 'drivers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Driver Profiles & Compliance</h1>
                <p className="text-sm text-slate-400">Monitor driver health metrics, licenses, and safety points.</p>
              </div>
              {hasAccess('drivers', 'write') && (
                <button 
                  onClick={() => setShowAddDriver(true)} 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Driver
                </button>
              )}
            </div>

            {/* Drivers list table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/60 border-b border-slate-800">
                  <tr>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Driver Name</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">License No.</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Class</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Expiry Date</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Contact</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Safety Rating</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Duty Status</th>
                    <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {drivers.map(d => {
                    const expired = new Date(d.license_expiry_date) < new Date();
                    const warning = isLicenseExpiringSoon(d.license_expiry_date);

                    return (
                      <tr key={d.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="p-4 text-sm font-semibold text-slate-200">{d.name}</td>
                        <td className="p-4 text-sm text-slate-400 font-mono">{d.license_no}</td>
                        <td className="p-4 text-sm text-slate-400">{d.license_category}</td>
                        <td className="p-4 text-sm font-mono">
                          {expired ? (
                            <span className="text-red-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              {d.license_expiry_date} (Expired)
                            </span>
                          ) : warning ? (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4 shrink-0" />
                              {d.license_expiry_date} (Expiring Soon)
                            </span>
                          ) : (
                            <span className="text-slate-300">{d.license_expiry_date}</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-slate-400 font-mono">{d.contact_no}</td>
                        <td className="p-4 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            d.safety_score >= 85 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/60' :
                            d.safety_score >= 60 ? 'bg-amber-950/80 text-amber-400 border border-amber-900/60' :
                            'bg-red-950/80 text-red-400 border border-red-900/60'
                          }`}>
                            {d.safety_score} pts
                          </span>
                        </td>
                        <td className="p-4 text-sm">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            d.status === 'Available' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/60' :
                            d.status === 'On Trip' ? 'bg-blue-950 text-blue-400 border border-blue-900/60' :
                            d.status === 'Suspended' ? 'bg-red-950 text-red-400 border border-red-900/60' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-right space-x-2">
                          {hasAccess('drivers', 'write') && (
                            <>
                              <button 
                                onClick={() => { setAdjustScoreDriverId(d.id); setAdjustScoreValue(d.safety_score); }}
                                className="text-slate-400 hover:text-slate-200 text-xs bg-slate-800 px-2 py-1 rounded"
                              >
                                Adjust Score
                              </button>
                              <button 
                                onClick={() => toggleDriverSuspension(d.id, d.status)}
                                className={`text-xs px-2.5 py-1 rounded transition-colors border ${
                                  d.status === 'Suspended' 
                                    ? 'bg-emerald-950/60 hover:bg-emerald-900 border-emerald-800 text-emerald-400' 
                                    : 'bg-red-950/60 hover:bg-red-900 border-red-800 text-red-400'
                                }`}
                              >
                                {d.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= tab: TRIPS (Dispatch Console) ================= */}
        {activeTab === 'trips' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Trips Dispatch Board</h1>
                <p className="text-sm text-slate-400">Plan routes, assign drivers, and check live load validation safety rules.</p>
              </div>
              {hasAccess('trips', 'write') && (
                <button 
                  onClick={() => setShowCreateTrip(true)} 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Dispatch New Cargo Trip
                </button>
              )}
            </div>

            {/* List of active board trips */}
            <div className="grid grid-cols-1 gap-4">
              {trips.map(t => (
                <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">TRIP #{t.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        t.status === 'Draft' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                        t.status === 'Dispatched' ? 'bg-blue-950 text-blue-400 border border-blue-900/40' :
                        t.status === 'Completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' :
                        'bg-red-950 text-red-400 border border-red-900/40'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <div className="text-md font-bold text-slate-200 mt-2 flex items-center gap-2">
                      {t.source} <ArrowRight className="h-4 w-4 text-slate-500" /> {t.destination}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-xs text-slate-400">
                      <div>
                        <span className="block text-slate-500">Vehicle:</span>
                        <strong className="text-slate-300 font-medium">{t.vehicle_name} ({t.vehicle_reg})</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500">Driver Assigned:</span>
                        <strong className="text-slate-300 font-medium">{t.driver_name || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500">Cargo Weight:</span>
                        <strong className="text-slate-300 font-medium">{t.cargo_weight.toLocaleString()} kg</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500">Distance planned:</span>
                        <strong className="text-slate-300 font-medium">{t.planned_distance.toLocaleString()} km</strong>
                      </div>
                    </div>
                  </div>

                  {/* Trip Execution Controls */}
                  <div className="flex gap-2 self-stretch md:self-auto justify-end border-t md:border-t-0 border-slate-800/80 pt-3 md:pt-0">
                    {hasAccess('trips', 'write') && t.status === 'Draft' && (
                      <>
                        <button 
                          onClick={() => dispatchTrip(t.id)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-2 rounded transition-colors"
                        >
                          Execute Dispatch
                        </button>
                        <button 
                          onClick={() => cancelTrip(t.id)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded transition-colors"
                        >
                          Cancel Draft
                        </button>
                      </>
                    )}

                    {hasAccess('trips', 'write') && t.status === 'Dispatched' && (
                      <>
                        <button 
                          onClick={() => {
                            setActiveCompleteTripModal(t);
                            // Autofill next predicted odometer
                            setCompleteTripForm({
                              final_odometer: (t.final_odometer || 0) || Math.round(vehicles.find(v => v.id === t.vehicle_id)?.odometer + t.planned_distance),
                              fuel_consumed: '',
                              revenue: '',
                              toll_expense: '',
                              other_expense: ''
                            });
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded transition-colors"
                        >
                          Complete Trip Ops
                        </button>
                        <button 
                          onClick={() => cancelTrip(t.id)}
                          className="bg-rose-950/60 hover:bg-rose-950 border border-rose-900/60 text-rose-400 text-xs px-3.5 py-2 rounded transition-colors"
                        >
                          Abort/Cancel
                        </button>
                      </>
                    )}

                    {t.status === 'Completed' && (
                      <div className="text-xs font-mono text-slate-500">
                        Odo logged: {t.final_odometer} km | Fuel: {t.fuel_consumed} L
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= tab: EXPENSES & FUEL ================= */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Fuel logs & Expense registry</h1>
                <p className="text-sm text-slate-400">Keep account logs of fuel usage, highway toll receipts, and regular maintenance.</p>
              </div>
              {hasAccess('expenses', 'write') && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAddFuel(true)} 
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Log Fuel Purchase
                  </button>
                  <button 
                    onClick={() => setShowAddExpense(true)} 
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    Add Other Expense
                  </button>
                </div>
              )}
            </div>

            {/* Tables grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Fuel logs table */}
              <div>
                <h3 className="text-lg font-bold mb-3">Refueling Logs</h3>
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-950/60 border-b border-slate-800">
                      <tr>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Date</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Liters</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {fuelLogs.map(f => (
                        <tr key={f.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-4 text-sm font-mono text-slate-350">{f.vehicle_reg}</td>
                          <td className="p-4 text-sm text-slate-400">{f.date}</td>
                          <td className="p-4 text-sm text-slate-300 font-mono">{f.liters} L</td>
                          <td className="p-4 text-sm text-slate-300 font-mono">${f.cost.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* General Expenses Table */}
              <div>
                <h3 className="text-lg font-bold mb-3">Operating Expenses Ledger</h3>
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-950/60 border-b border-slate-800">
                      <tr>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Vehicle</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Tolls</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Maint. Cost</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Other</th>
                        <th className="p-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-4 text-sm font-mono text-slate-350">{e.vehicle_reg}</td>
                          <td className="p-4 text-sm text-slate-400 font-mono">${(e.toll || 0).toLocaleString()}</td>
                          <td className="p-4 text-sm text-slate-400 font-mono">${(e.maintenance_cost || 0).toLocaleString()}</td>
                          <td className="p-4 text-sm text-slate-400 font-mono">${(e.other || 0).toLocaleString()}</td>
                          <td className="p-4 text-sm font-bold text-rose-400 font-mono">${e.total.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= tab: DEMO DRIVER APP ================= */}
        {activeTab === 'driver-app' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-purple-950/80 text-purple-300 text-xs px-2.5 py-1 rounded font-bold uppercase tracking-wider">Driver Mobile Portal</span>
                  <h1 className="text-2xl font-bold mt-2">Active Assigned Route</h1>
                </div>
                <div className="text-right">
                  <div className="text-xs text-purple-300">Driver License Class</div>
                  <div className="text-sm font-bold text-slate-200">Heavy Transport (Valid)</div>
                </div>
              </div>

              {/* Driver Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 bg-slate-950/40 p-4 rounded-xl border border-purple-900/60">
                <div className="text-center">
                  <div className="text-xs text-purple-300 uppercase">Safety Rating</div>
                  <div className="text-lg font-extrabold text-emerald-400 mt-1">94.5 / 100</div>
                </div>
                <div className="text-center border-x border-purple-950">
                  <div className="text-xs text-purple-300 uppercase">Assigned Truck</div>
                  <div className="text-lg font-extrabold text-slate-200 mt-1">Tata Prima</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-purple-300 uppercase">Refuel Log</div>
                  <div className="text-lg font-extrabold text-slate-200 mt-1">MH12QW1234</div>
                </div>
              </div>
            </div>

            {/* Current Trip Details */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Assigned Active Dispatch</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="block text-xs text-slate-500">Route Direction</span>
                    <strong className="text-sm text-slate-200">Mumbai Depo → Delhi NCR Central</strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-slate-500">Cargo Payload</span>
                    <strong className="text-sm text-slate-250">14,200 kg</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="block text-xs text-slate-500">Trip Status Timeline</span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span className="text-xs text-emerald-400">Trip Dispatched (In Progress)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs text-slate-500 font-mono">Planned distance</span>
                    <strong className="text-sm font-mono text-slate-200">1,410 km</strong>
                  </div>
                </div>

                {/* Emergency Section */}
                <div className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-4 mt-2">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Emergency Quick Assistance SOS
                  </h4>
                  <p className="text-xs text-rose-300 mt-1">If your vehicle breaks down, meets with an accident, or requires immediate dispatcher help, click the dispatch alert below.</p>
                  <button 
                    onClick={() => alert('SOS emergency trigger dispatched to operations tower safety room.')}
                    className="bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold px-4 py-2 rounded mt-3 transition-colors"
                  >
                    Broadcast SOS Panic Button
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= tab: SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Depot Settings & Authorization Controls</h1>
              <p className="text-sm text-slate-400">Configure corporate settings and inspect active role permissions (RBAC).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Config Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow space-y-4">
                <h3 className="text-md font-semibold text-slate-200">Depot Global Configurations</h3>
                <div>
                  <label className="block text-xs text-slate-400 uppercase mb-2">Primary Depot Name</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none" defaultValue="TransitOps HQ - Terminal A" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 uppercase mb-2">Distance Unit</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-250 focus:outline-none">
                      <option>Kilometers (km)</option>
                      <option>Miles (mi)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 uppercase mb-2">Currency Symbol</label>
                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-250 focus:outline-none">
                      <option>USD ($)</option>
                      <option>INR (₹)</option>
                    </select>
                  </div>
                </div>
                <button onClick={() => alert('Global configurations updated successfully')} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors">
                  Save Configurations
                </button>
              </div>

              {/* RBAC read only matrix */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
                <h3 className="text-md font-semibold text-slate-200 mb-3">RBAC Matrix Permissions (Read-Only)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950/60 border-b border-slate-850">
                      <tr>
                        <th className="p-2.5 text-slate-400 uppercase">Role</th>
                        <th className="p-2.5 text-slate-400 uppercase">Fleet</th>
                        <th className="p-2.5 text-slate-400 uppercase">Drivers</th>
                        <th className="p-2.5 text-slate-400 uppercase">Trips</th>
                        <th className="p-2.5 text-slate-400 uppercase">Expenses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      <tr>
                        <td className="p-2.5 font-bold text-blue-400">Fleet Manager</td>
                        <td className="p-2.5 text-emerald-400">Full</td>
                        <td className="p-2.5 text-emerald-400">Full</td>
                        <td className="p-2.5 text-slate-500">—</td>
                        <td className="p-2.5 text-slate-500">—</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-blue-400">Dispatcher</td>
                        <td className="p-2.5 text-amber-400 font-medium">View</td>
                        <td className="p-2.5 text-slate-500">—</td>
                        <td className="p-2.5 text-emerald-400">Full</td>
                        <td className="p-2.5 text-slate-500">—</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-blue-400">Safety Officer</td>
                        <td className="p-2.5 text-slate-500">—</td>
                        <td className="p-2.5 text-emerald-400">Full</td>
                        <td className="p-2.5 text-amber-400 font-medium">View</td>
                        <td className="p-2.5 text-slate-500">—</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-blue-400">Financial Analyst</td>
                        <td className="p-2.5 text-amber-400 font-medium">View</td>
                        <td className="p-2.5 text-slate-500">—</td>
                        <td className="p-2.5 text-slate-500">—</td>
                        <td className="p-2.5 text-emerald-400">Full</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ================================== MODALS ================================== */}

      {/* modal: Add Vehicle */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddVehicle(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              Add New Registry Vehicle
            </h2>
            <form onSubmit={addVehicle} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Registration Number (Unique)</label>
                <input 
                  type="text" required value={vehicleForm.reg_no} 
                  onChange={(e) => setVehicleForm({ ...vehicleForm, reg_no: e.target.value })}
                  placeholder="e.g. MH12QW1234"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Name / Model</label>
                  <input 
                    type="text" required value={vehicleForm.name} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                    placeholder="Tata Prima"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Type</label>
                  <select 
                    value={vehicleForm.type}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none"
                  >
                    <option value="Heavy Truck">Heavy Truck</option>
                    <option value="Medium Truck">Medium Truck</option>
                    <option value="Pickup Van">Pickup Van</option>
                    <option value="Container Truck">Container Truck</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Capacity (kg)</label>
                  <input 
                    type="number" required value={vehicleForm.max_load_capacity} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, max_load_capacity: parseInt(e.target.value) || 0 })}
                    placeholder="12000"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Odometer (km)</label>
                  <input 
                    type="number" required value={vehicleForm.odometer} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, odometer: parseInt(e.target.value) || 0 })}
                    placeholder="45000"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Cost ($)</label>
                  <input 
                    type="number" required value={vehicleForm.acquisition_cost} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, acquisition_cost: parseFloat(e.target.value) || 0 })}
                    placeholder="3500000"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-2.5 rounded-lg text-white transition-colors mt-2">
                Register Vehicle Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Add Driver */}
      {showAddDriver && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddDriver(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Add New Dispatch Driver
            </h2>
            <form onSubmit={addDriver} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Driver Full Name</label>
                <input 
                  type="text" required value={driverForm.name} 
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">License No.</label>
                  <input 
                    type="text" required value={driverForm.license_no} 
                    onChange={(e) => setDriverForm({ ...driverForm, license_no: e.target.value })}
                    placeholder="DL-1420180099"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">License Class</label>
                  <select 
                    value={driverForm.license_category}
                    onChange={(e) => setDriverForm({ ...driverForm, license_category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none"
                  >
                    <option value="Heavy Transport">Heavy Transport</option>
                    <option value="Light Commercial">Light Commercial</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Expiry Date</label>
                  <input 
                    type="date" required value={driverForm.license_expiry_date} 
                    onChange={(e) => setDriverForm({ ...driverForm, license_expiry_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Contact Number</label>
                  <input 
                    type="text" required value={driverForm.contact_no} 
                    onChange={(e) => setDriverForm({ ...driverForm, contact_no: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-2.5 rounded-lg text-white transition-colors mt-2">
                Register Driver Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Adjust Safety Score */}
      {adjustScoreDriverId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setAdjustScoreDriverId(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Adjust Driver Safety Rating
            </h2>
            <form onSubmit={adjustSafetyScore} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">New Safety Score Points</label>
                <input 
                  type="number" step="0.1" max="100" min="0" required value={adjustScoreValue} 
                  onChange={(e) => setAdjustScoreValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 font-semibold py-2.5 text-white rounded-lg transition-colors">
                Apply Penalty / Credit Adjustment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Create Trip */}
      {showCreateTrip && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setShowCreateTrip(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-500" />
              Plan Cargo Dispatch Trip
            </h2>
            <form onSubmit={createTrip} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Source City</label>
                  <input 
                    type="text" required value={tripForm.source} 
                    onChange={(e) => setTripForm({ ...tripForm, source: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Destination City</label>
                  <input 
                    type="text" required value={tripForm.destination} 
                    onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
                    placeholder="e.g. Delhi NCR"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Cargo Weight (kg)</label>
                  <input 
                    type="number" required value={tripForm.cargo_weight} 
                    onChange={(e) => setTripForm({ ...tripForm, cargo_weight: parseFloat(e.target.value) || 0 })}
                    placeholder="12000"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Planned Distance (km)</label>
                  <input 
                    type="number" required value={tripForm.planned_distance} 
                    onChange={(e) => setTripForm({ ...tripForm, planned_distance: parseFloat(e.target.value) || 0 })}
                    placeholder="1410"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Select Vehicle (Available only)</label>
                  <select 
                    required value={tripForm.vehicle_id}
                    onChange={(e) => setTripForm({ ...tripForm, vehicle_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none"
                  >
                    <option value="">-- Choose Available --</option>
                    {vehicles.filter(v => v.status === 'Available').map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.reg_no}) [Max: {v.max_load_capacity} kg]</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Select Driver (Available & Valid only)</label>
                  <select 
                    required value={tripForm.driver_id}
                    onChange={(e) => setTripForm({ ...tripForm, driver_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none"
                  >
                    <option value="">-- Choose Available --</option>
                    {drivers.filter(d => {
                      const expired = new Date(d.license_expiry_date) < new Date();
                      return d.status === 'Available' && !expired;
                    }).map(d => (
                      <option key={d.id} value={d.id}>{d.name} (Safety: {d.safety_score})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic live capacity weight check warning */}
              {tripForm.vehicle_id && tripForm.cargo_weight && (
                (() => {
                  const selectedVehicle = vehicles.find(v => v.id.toString() === tripForm.vehicle_id.toString());
                  if (selectedVehicle && tripForm.cargo_weight > selectedVehicle.max_load_capacity) {
                    return (
                      <div className="bg-red-950/50 border border-red-800/80 rounded-lg p-3 text-red-400 text-xs flex gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span><strong>Weight Overload Alert:</strong> Cargo weight exceeds vehicle's maximum carrying capacity of {selectedVehicle.max_load_capacity} kg. This trip cannot be dispatched in this state.</span>
                      </div>
                    );
                  }
                })()
              )}

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-2.5 rounded-lg text-white transition-colors mt-2">
                Save Trip as Draft
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Log Service Record */}
      {showAddMaintenance && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddMaintenance(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-amber-500 animate-spin" />
              Log Vehicle Service Record
            </h2>
            <form onSubmit={addMaintenance} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Select Vehicle</label>
                <select 
                  required value={maintenanceForm.vehicle_id}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicle_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'Retired').map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.reg_no}) [{v.status}]</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Service Type / Work Details</label>
                <input 
                  type="text" required value={maintenanceForm.service_type} 
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, service_type: e.target.value })}
                  placeholder="e.g. Brake Replacement & Alignment"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Service Cost ($)</label>
                  <input 
                    type="number" required value={maintenanceForm.cost} 
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: parseFloat(e.target.value) || 0 })}
                    placeholder="12500"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Service Date</label>
                  <input 
                    type="date" required value={maintenanceForm.date} 
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-2.5 text-white rounded-lg transition-colors mt-2">
                Commit & Log Service
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Complete Trip Form Details */}
      {activeCompleteTripModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setActiveCompleteTripModal(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Complete Active Trip Operations
            </h2>
            <form onSubmit={completeTrip} className="space-y-4">
              <div className="bg-slate-950 border border-slate-850 rounded-lg p-3 text-xs text-slate-400 space-y-1">
                <div>Trip ID: #{activeCompleteTripModal.id} ({activeCompleteTripModal.source} → {activeCompleteTripModal.destination})</div>
                <div>Assigned Vehicle: {activeCompleteTripModal.vehicle_name} ({activeCompleteTripModal.vehicle_reg})</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium font-mono">Final Odometer Reading</label>
                  <input 
                    type="number" required value={completeTripForm.final_odometer} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, final_odometer: parseFloat(e.target.value) || '' })}
                    placeholder="Odo reading (km)"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Fuel Consumed (Liters)</label>
                  <input 
                    type="number" required value={completeTripForm.fuel_consumed} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, fuel_consumed: parseFloat(e.target.value) || '' })}
                    placeholder="Fuel liters used"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Trip Revenue Earned ($)</label>
                <input 
                  type="number" required value={completeTripForm.revenue} 
                  onChange={(e) => setCompleteTripForm({ ...completeTripForm, revenue: parseFloat(e.target.value) || '' })}
                  placeholder="Revenue amount ($)"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Highway Tolls ($)</label>
                  <input 
                    type="number" value={completeTripForm.toll_expense} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, toll_expense: e.target.value })}
                    placeholder="Toll cost ($)"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium font-mono">Other Incidentals ($)</label>
                  <input 
                    type="number" value={completeTripForm.other_expense} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, other_expense: e.target.value })}
                    placeholder="Other expense ($)"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 font-semibold py-2.5 text-white rounded-lg transition-colors mt-2">
                Log Completion & Generate Invoices
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Log Fuel Purchase */}
      {showAddFuel && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddFuel(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              Log Fuel Purchase Receipt
            </h2>
            <form onSubmit={addFuel} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Select Vehicle</label>
                <select 
                  required value={fuelForm.vehicle_id}
                  onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'Retired').map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.reg_no})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Purchase Date</label>
                  <input 
                    type="date" required value={fuelForm.date} 
                    onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Liters Refueled</label>
                  <input 
                    type="number" step="0.01" required value={fuelForm.liters} 
                    onChange={(e) => setFuelForm({ ...fuelForm, liters: parseFloat(e.target.value) || 0 })}
                    placeholder="120"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Total Cost Paid ($)</label>
                <input 
                  type="number" required value={fuelForm.cost} 
                  onChange={(e) => setFuelForm({ ...fuelForm, cost: parseFloat(e.target.value) || 0 })}
                  placeholder="11400"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-2.5 text-white rounded-lg transition-colors mt-2">
                Record Fuel Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Log General Expense */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddExpense(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              Add Incidentals / Toll Expense
            </h2>
            <form onSubmit={addExpense} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Select Vehicle</label>
                <select 
                  required value={expenseForm.vehicle_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'Retired').map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.reg_no})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Tolls Plazas Paid ($)</label>
                  <input 
                    type="number" value={expenseForm.toll} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, toll: e.target.value })}
                    placeholder="1200"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase font-medium">Other Incidentals ($)</label>
                  <input 
                    type="number" value={expenseForm.other} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, other: e.target.value })}
                    placeholder="300"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-2 focus:outline-none"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-2.5 text-white rounded-lg transition-colors mt-2">
                Record Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Vehicle History & Details */}
      {selectedVehicleHistory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setSelectedVehicleHistory(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              Vehicle Operational Log & History
            </h2>
            <div className="text-sm text-slate-450 font-mono mb-6">{selectedVehicleHistory.vehicle.name} ({selectedVehicleHistory.vehicle.reg_no})</div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Trip logs History</h3>
                {selectedVehicleHistory.trips.length === 0 ? (
                  <p className="text-xs text-slate-500">No past or active trips logged for this vehicle.</p>
                ) : (
                  <div className="bg-slate-950 border border-slate-850 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900/80 border-b border-slate-850">
                        <tr>
                          <th className="p-3 text-slate-400">Trip ID</th>
                          <th className="p-3 text-slate-400">Route</th>
                          <th className="p-3 text-slate-400">Status</th>
                          <th className="p-3 text-slate-400">Cargo Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {selectedVehicleHistory.trips.map(t => (
                          <tr key={t.id}>
                            <td className="p-3 font-mono">#{t.id}</td>
                            <td className="p-3">{t.source} → {t.destination}</td>
                            <td className="p-3">{t.status}</td>
                            <td className="p-3">{t.cargo_weight.toLocaleString()} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Service Maintenance History</h3>
                {selectedVehicleHistory.maintenance.length === 0 ? (
                  <p className="text-xs text-slate-500">No service records registered for this vehicle.</p>
                ) : (
                  <div className="bg-slate-950 border border-slate-850 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900/80 border-b border-slate-850">
                        <tr>
                          <th className="p-3 text-slate-400">Service Type</th>
                          <th className="p-3 text-slate-400">Date Logged</th>
                          <th className="p-3 text-slate-400">Cost</th>
                          <th className="p-3 text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {selectedVehicleHistory.maintenance.map(m => (
                          <tr key={m.id}>
                            <td className="p-3">{m.service_type}</td>
                            <td className="p-3">{m.date}</td>
                            <td className="p-3 font-mono">${m.cost.toLocaleString()}</td>
                            <td className="p-3">{m.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
