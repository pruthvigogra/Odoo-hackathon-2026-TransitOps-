import React, { useState, useEffect } from 'react';
import { 
  Truck, Users, Navigation, DollarSign, BarChart3, Settings, 
  Plus, LogOut, ShieldAlert, CheckCircle2, AlertTriangle, X, 
  Lock, ArrowRight, Activity, Zap, FileSpreadsheet, Eye, Play, Phone, Check
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend
} from 'recharts';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  // App View Mode: 'landing' or 'app' (after login)
  const [view, setView] = useState('landing');

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

  // Active module tab inside App Console
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modals state
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showAddFuel, setShowAddFuel] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  
  // Dynamic action modals
  const [activeCompleteTripModal, setActiveCompleteTripModal] = useState(null);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState(null);

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

  // Marketing Lead Capture Form
  const [leadForm, setLeadForm] = useState({ firstName: '', lastName: '', phone: '', email: '', company: '', fleetSize: '1-10' });

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
      setView('app');
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
      setView('app');

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
    setView('landing');
  };

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

  const isLicenseExpiringSoon = (expiryStr) => {
    const today = new Date();
    const expiry = new Date(expiryStr);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  // ---------------- LANDING MARKETING PAGE ----------------
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-[#0A0E14] text-slate-100 selection:bg-blue-500 selection:text-white relative">
        {/* Tech Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20 pointer-events-none"></div>

        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 bg-[#0A0E14]/80 backdrop-blur-md border-b border-slate-900">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-cyan-400" />
              <span className="text-lg font-black tracking-widest uppercase font-mono text-white">TransitOps</span>
            </div>
            
            <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider font-mono text-slate-400">
              <a href="#platform" className="hover:text-white transition-colors">Platform</a>
              <a href="#rules" className="hover:text-white transition-colors">Safety Rules</a>
              <a href="#roles" className="hover:text-white transition-colors">Operational Seats</a>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
            </nav>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('login')}
                className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400 hover:text-white transition-colors"
              >
                Login
              </button>
              <button 
                onClick={() => setView('login')}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold uppercase tracking-wider font-mono px-5 py-2.5 rounded-full transition-all shadow-[0_4px_15px_rgba(6,182,212,0.15)]"
              >
                Get Started
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden px-6">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-r from-blue-600/10 to-cyan-500/10 rounded-full filter blur-3xl opacity-60"></div>
          <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
            <span className="text-[10px] bg-blue-950 text-cyan-400 px-3 py-1 rounded-full font-mono uppercase tracking-widest border border-blue-900/40">
              Fleet Operations Platform
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase font-mono max-w-3xl mx-auto leading-none">
              Operations that run themselves — and never let a mistake through.
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto font-mono">
              TransitOps is the only rule-enforcing transit platform that blocks capacity overloads, license compliance issues, and scheduling errors at the source.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <button 
                onClick={() => setView('login')}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider font-mono px-8 py-3.5 rounded-full transition-all shadow-[0_4px_20px_rgba(6,182,212,0.25)]"
              >
                Get Started
              </button>
              <a 
                href="#contact"
                className="border border-slate-700 hover:border-slate-500 text-slate-350 font-bold text-xs uppercase tracking-wider font-mono px-8 py-3.5 rounded-full transition-all"
              >
                Watch Demo
              </a>
            </div>

            {/* Video Placeholder / CSS Animated Mock UI */}
            <div className="mt-16 bg-slate-950/80 border border-slate-900 rounded-2xl p-4 shadow-[0_0_50px_rgba(59,130,246,0.1)] relative max-w-3xl mx-auto overflow-hidden">
              {/* Tech Corner Overlays */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>
              
              <div className="bg-[#050b14] h-72 rounded-lg border border-slate-900 flex flex-col justify-center items-center relative p-8">
                <div className="absolute top-4 left-4 flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/60"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60"></span>
                </div>
                <div className="absolute top-4 right-4 text-[9px] text-cyan-400 font-mono tracking-widest uppercase font-bold animate-pulse">
                  SYSTEM MONITOR FEED
                </div>
                
                <div className="space-y-4 text-center max-w-md">
                  <div className="w-12 h-12 bg-blue-950 border border-blue-900 rounded-full flex items-center justify-center mx-auto text-cyan-400 animate-pulse">
                    <Activity className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-200">Enforcing Compliance Rules in Real-Time</h4>
                  <p className="text-[10px] text-slate-500 font-mono">Simulated video feed of automated driver credential validations, cargo load limits, and operational cost calculations.</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Section: Hub & Spoke modules (Ivory / White background block) */}
        <section id="platform" className="bg-[#F8F9FA] text-slate-950 py-24 px-6 relative overflow-hidden">
          <div className="max-w-7xl mx-auto text-center space-y-6">
            <span className="text-[10px] bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-mono uppercase tracking-widest border border-blue-200">
              INTEGRATED OPERATIONS PLATFORM
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-950 uppercase font-mono leading-none">
              One system, six connected modules.
            </h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto font-mono">
              A unified core that orchestrates workflows and automatically syncs logs across all sectors of your transit enterprise.
            </p>

            {/* Hub-and-Spoke diagram */}
            <div className="pt-16 grid grid-cols-2 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
              {[
                { title: 'Fleet Registry', desc: 'Registry lifecycle, shop tracking, status metrics.', icon: Truck },
                { title: 'Drivers & Safety', desc: 'Safety ratings, credential checks, penalties.', icon: Users },
                { title: 'Trips Console', desc: 'Live validations, dispatch steppers, cargo metrics.', icon: Navigation },
                { title: 'Maintenance', desc: 'Log service events, auto shop lockdowns.', icon: Settings },
                { title: 'Fuel Ledger', desc: 'Fuel receipts and logs tracking.', icon: DollarSign },
                { title: 'ROI Analytics', desc: 'Auto-calculating costs and ROI cards.', icon: BarChart3 }
              ].map((mod, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setView('login')}
                  className="bg-white border border-slate-200 rounded-xl p-5 text-left shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgba(59,130,246,0.08)] hover:-translate-y-1 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-slate-950 text-white rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                    <mod.icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900">{mod.title}</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-2 leading-relaxed">{mod.desc}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* Section: Rules Highlight */}
        <section id="rules" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <span className="text-[10px] bg-red-950 text-red-400 px-3 py-1 rounded-full font-mono uppercase tracking-widest border border-red-900/40">
                Rules Enforced at Source
              </span>
              <h2 className="text-3xl font-black tracking-tight text-white uppercase font-mono">
                Catch every conflict before it happens.
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                From overloaded cargo weights to expired license compliance, TransitOps blocks operational mistakes at the source instead of just showing them in report printouts next month.
              </p>
              <ul className="space-y-3 pt-2 text-[11px] font-mono text-slate-350">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400" /> Auto-hides Retired or In-Shop vehicles from dispatch.
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400" /> Blocks trip dispatch if driver license is expired or suspended.
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-400" /> Restricts trip assignment if cargo exceeds payload capacity.
                </li>
              </ul>
              <div className="pt-4">
                <button 
                  onClick={() => setView('login')}
                  className="border border-slate-700 hover:border-slate-500 text-slate-300 text-xs font-bold uppercase tracking-wider font-mono px-6 py-2.5 rounded-full transition-all"
                >
                  Explore Compliance Rules
                </button>
              </div>
            </div>

            {/* Simulated UI Cards Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Capacity Exceeded', val: 'DISPATCH BLOCKED', status: 'overload', desc: '14,200 kg cargo exceeds maximum 10,000 kg carrying capacity of medium truck DL01AB9999.' },
                { label: 'License Expired', val: 'ASSIGNMENT BLOCKED', status: 'expired', desc: 'Robert Expired cannot be assigned. Operator license expired on 2026-06-01.' },
                { label: 'Vehicle In Shop', val: 'OMITTED FROM SELECTION', status: 'shop', desc: 'Medium Truck KA03XY5678 automatically hidden from active dispatch list while service logs are open.' },
                { label: 'Driver Suspended', val: 'ASSIGNMENT BLOCKED', status: 'suspended', desc: 'Sam Suspended disabled from duty queue. Safety score dropped below 50 points compliance limit.' }
              ].map((card, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-2xl relative">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold font-mono text-slate-300 uppercase">{card.label}</span>
                    <span className={`text-[8px] font-mono font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                      card.status === 'overload' || card.status === 'expired' || card.status === 'suspended'
                        ? 'bg-rose-950/40 border-rose-900 text-rose-400'
                        : 'bg-amber-950/40 border-amber-900 text-amber-400'
                    }`}>
                      {card.val}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-450 font-mono leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section: Role-based Value */}
        <section id="roles" className="py-24 px-6 bg-slate-950/40 border-y border-slate-900">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold font-mono">Role-Based Modules</span>
              <h2 className="text-3xl font-black text-white uppercase font-mono">Built for every seat in the operation.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { role: 'Fleet Manager', desc: 'Owns vehicle profiles, logs service orders, and monitors health states.', cta: 'Manage Fleet' },
                { role: 'Dispatcher', desc: 'Orchestrates active routes, verifies capacity limits, and records cargo states.', cta: 'Orchestrate Trips' },
                { role: 'Safety Officer', desc: 'Monitors driver credential lists, licenses, and adjusting safety ratings.', cta: 'Inspect Compliance' },
                { role: 'Financial Analyst', desc: 'Enters operational expenses and analyzes auto-calculated vehicle ROI cards.', cta: 'Audit Financials' }
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-900 rounded-xl p-6 flex flex-col justify-between hover:border-slate-800 transition-colors">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider">{item.role}</h4>
                    <p className="text-[11px] text-slate-500 font-mono leading-relaxed">{item.desc}</p>
                  </div>
                  <button 
                    onClick={() => { setRole(item.role); setView('login'); }}
                    className="text-[10px] text-cyan-400 font-mono uppercase font-bold tracking-wider mt-6 flex items-center gap-1 hover:text-cyan-300 transition-colors self-start"
                  >
                    {item.cta} <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section: Social Proof (Dark Operation BG Style) */}
        <section className="relative py-32 overflow-hidden px-6 text-center bg-[#070b10]">
          <div className="absolute inset-0 bg-slate-950/60 z-0"></div>
          <div className="max-w-4xl mx-auto relative z-10 space-y-6">
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-bold">BUILT FOR OPERATORS LIKE</span>
            <h2 className="text-3xl font-black text-white font-mono uppercase tracking-tight">The most complex fleets run on TransitOps.</h2>
            <div className="pt-8 flex flex-wrap justify-center items-center gap-12 opacity-30 select-none">
              <span className="font-mono text-xs font-black tracking-widest uppercase">ACME LOGISTICS</span>
              <span className="font-mono text-xs font-black tracking-widest uppercase">APEX CARRIERS</span>
              <span className="font-mono text-xs font-black tracking-widest uppercase">HORIZON TRANSPORT</span>
              <span className="font-mono text-xs font-black tracking-widest uppercase">VORTEX HAULING</span>
            </div>
          </div>
        </section>

        {/* Section: Lead Capture & Contact */}
        <section id="contact" className="py-24 px-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5 space-y-6">
              <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest font-bold">CONNECT WITH US</span>
              <h2 className="text-3xl font-black text-white uppercase font-mono">We'd love to show you around.</h2>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">
                Connect with our product specialist and explore how automated validation logic can secure your transport pipelines.
              </p>
              <div className="space-y-3 pt-2 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Verify operations rules.</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Prevent fleet compliance risks.</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Sync operating ledgers instantly.</div>
              </div>
            </div>

            {/* Form card */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-900 rounded-2xl p-8 shadow-2xl relative">
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-500"></div>
              <form onSubmit={(e) => { e.preventDefault(); alert('Request logged! A product specialist will contact you shortly.'); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">First Name</label>
                    <input type="text" required className="w-full bg-[#050b14] border border-slate-900 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Last Name</label>
                    <input type="text" required className="w-full bg-[#050b14] border border-slate-900 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Company Email</label>
                  <input type="email" required className="w-full bg-[#050b14] border border-slate-900 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Company Name</label>
                    <input type="text" required className="w-full bg-[#050b14] border border-slate-900 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Fleet Size</label>
                    <select className="w-full bg-[#050b14] border border-slate-900 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs text-slate-305">
                      <option>1-10 vehicles</option>
                      <option>11-50 vehicles</option>
                      <option>51-200 vehicles</option>
                      <option>200+ vehicles</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase font-mono py-3.5 rounded-full transition-all mt-4">
                  Request Private System Tour
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-950 border-t border-slate-900 py-16 px-6 relative z-10 text-xs font-mono text-slate-500">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-6 gap-8">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-cyan-400" />
                <span className="text-sm font-black tracking-widest uppercase text-white">TransitOps</span>
              </div>
              <p className="text-[11px] leading-relaxed max-w-xs">AI-assisted operational routing, compliance validation, and fleet metrics.</p>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase mb-4">Products</h5>
              <ul className="space-y-2">
                <li><a href="#platform" className="hover:text-slate-300">Fleet Management</a></li>
                <li><a href="#platform" className="hover:text-slate-300">Driver Compliance</a></li>
                <li><a href="#platform" className="hover:text-slate-300">Trip Dispatch</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase mb-4">Who We Serve</h5>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-slate-300">Logistics</a></li>
                <li><a href="#" className="hover:text-slate-300">Construction</a></li>
                <li><a href="#" className="hover:text-slate-300">Field Service</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase mb-4">Resources</h5>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-slate-300">Documentation</a></li>
                <li><a href="#" className="hover:text-slate-300">Guides & Articles</a></li>
                <li><a href="#" className="hover:text-slate-300">API Gateway</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase mb-4">Company</h5>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-slate-300">About Us</a></li>
                <li><a href="#" className="hover:text-slate-300">Leadership</a></li>
                <li><a href="#" className="hover:text-slate-300">Security Core</a></li>
              </ul>
            </div>
          </div>

          <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-slate-900 flex justify-between items-center text-[10px]">
            <span>© 2026 TransitOps Operations System.</span>
            <span>UNITED STATES (ENGLISH)</span>
          </div>
        </footer>

      </div>
    );
  }

  // ---------------- AUTHENTICATION UI (Login) ----------------
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#000000] flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Computer Vision Tech Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1524_1px,transparent_1px),linear-gradient(to_bottom,#0c1524_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500 rounded-full filter blur-3xl opacity-10"></div>

        <div className="w-full max-w-md bg-slate-950/80 border border-slate-800 rounded-2xl p-8 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative z-10 backdrop-blur-lg">
          {/* Tech Corner Overlays (Computer Vision Aesthetic) */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-blue-500"></div>
          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-blue-500"></div>
          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-blue-500"></div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-blue-500"></div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Truck className="h-7 w-7 text-cyan-400" />
            <span className="text-xl font-black tracking-tight text-white uppercase font-mono">TransitOps</span>
          </div>
          <div className="text-center mb-8">
            <span className="text-[10px] bg-blue-950 text-blue-400 px-2 py-0.5 rounded font-mono uppercase tracking-widest border border-blue-900/40">Industrial Core OS</span>
          </div>

          <h2 className="text-center text-lg font-bold text-slate-200 mb-6 uppercase tracking-wider font-mono">
            Control Tower Portal.
          </h2>

          {errorMsg && (
            <div className="bg-red-950/50 border border-red-900/60 text-red-400 px-4 py-3 rounded-lg text-xs mb-6 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Workspace Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#050b14] border border-slate-800 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm"
              >
                <option value="Fleet Manager">Fleet Manager</option>
                <option value="Dispatcher">Dispatcher</option>
                <option value="Safety Officer">Safety Officer</option>
                <option value="Financial Analyst">Financial Analyst</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Email Address</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@transitops.com"
                className="w-full bg-[#050b14] border border-slate-800 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5 font-mono">Security Password</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#050b14] border border-slate-800 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-[#050b14] border-slate-800 text-blue-500 focus:ring-0 focus:ring-offset-0" 
                />
                Remember session
              </label>
              <a href="#" onClick={() => alert('Password reset requests must go through your systems administrator.')} className="text-cyan-400 hover:underline font-mono">Forgot password?</a>
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm py-3 rounded-full shadow-[0_4px_20px_rgba(6,182,212,0.25)] flex items-center justify-center gap-2 transition-all duration-300 uppercase tracking-wider font-mono"
            >
              Sign In to System
              <ArrowRight className="h-4 w-4" />
            </button>
            
            <button 
              type="button"
              onClick={() => setView('landing')}
              className="w-full border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-bold text-xs uppercase font-mono py-3 rounded-full transition-all"
            >
              Back to Landing Page
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-900 text-center flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>SECURE GATEWAY</span>
            <span>SYSTEM v1.4.0</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- MAIN CONSOLE DASHBOARD VIEW ----------------
  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 flex flex-col md:flex-row relative">
      {/* Background machine lines and grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#080f1a_1px,transparent_1px),linear-gradient(to_bottom,#080f1a_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-25 pointer-events-none"></div>

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-900 flex flex-col justify-between shrink-0 relative z-10">
        <div>
          {/* Brand header */}
          <div className="h-16 flex items-center gap-2 px-6 border-b border-slate-900 bg-black/40">
            <Truck className="h-5 w-5 text-cyan-400" />
            <span className="text-md font-black tracking-widest uppercase font-mono text-white">TransitOps</span>
          </div>

          {/* User profile info */}
          <div className="p-4 bg-slate-900/20 border-b border-slate-900/60">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold font-mono">Operations Console</div>
            <div className="text-sm font-extrabold text-cyan-400 mt-0.5 font-mono">{user.role.toUpperCase()}</div>
            <div className="text-xs text-slate-400 mt-1 truncate font-mono">{user.name}</div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {hasAccess('analytics') && (
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-900 text-cyan-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              >
                <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                Fleet Metrics
              </button>
            )}

            {hasAccess('fleet') && (
              <button 
                onClick={() => setActiveTab('vehicles')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'vehicles' ? 'bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-900 text-cyan-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              >
                <Truck className="h-3.5 w-3.5 text-blue-500" />
                Vehicle Registry
              </button>
            )}

            {hasAccess('drivers') && (
              <button 
                onClick={() => setActiveTab('drivers')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'drivers' ? 'bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-900 text-cyan-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              >
                <Users className="h-3.5 w-3.5 text-blue-500" />
                Drivers & Safety
              </button>
            )}

            {hasAccess('trips') && (
              <button 
                onClick={() => setActiveTab('trips')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'trips' ? 'bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-900 text-cyan-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              >
                <Navigation className="h-3.5 w-3.5 text-blue-500" />
                Trips Console
              </button>
            )}

            {hasAccess('expenses') && (
              <button 
                onClick={() => setActiveTab('expenses')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'expenses' ? 'bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-900 text-cyan-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
              >
                <DollarSign className="h-3.5 w-3.5 text-blue-500" />
                Expenses & Fuel
              </button>
            )}

            {/* Driver self-service screen available to all for demo */}
            <button 
              onClick={() => setActiveTab('driver-app')} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'driver-app' ? 'bg-purple-950/60 border border-purple-900/60 text-purple-300' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Zap className="h-3.5 w-3.5 text-purple-500" />
              Demo Driver App
            </button>

            <button 
              onClick={() => setActiveTab('settings')} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'settings' ? 'bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-900 text-cyan-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <Settings className="h-3.5 w-3.5 text-blue-500" />
              Settings & RBAC
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-900">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Board Component Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen relative z-10">
        
        {/* ================= tab: DASHBOARD (Fleet Metrics) ================= */}
        {activeTab === 'dashboard' && analytics && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold font-mono">Operations Platform</span>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono">Fleet Analytics & KPIs.</h1>
              </div>
              {user.role === 'Financial Analyst' && (
                <button 
                  onClick={exportCSV} 
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-xs font-bold uppercase tracking-wider font-mono px-5 py-2.5 rounded-full flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(6,182,212,0.15)]"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Fleet ROI (CSV)
                </button>
              )}
            </div>

            {/* KPI Metrics row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-cyan-500"></div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest font-mono">Fleet Utilization</div>
                <div className="text-2xl font-black mt-2 text-white font-mono">{analytics.kpis.fleetUtilization}%</div>
                <div className="text-[10px] text-cyan-400 mt-1 font-mono">Active / Total active vehicles</div>
              </div>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest font-mono">Fuel Efficiency</div>
                <div className="text-2xl font-black mt-2 text-white font-mono">{analytics.kpis.fuelEfficiency} <span className="text-xs text-slate-450 font-normal">km/L</span></div>
                <div className="text-[10px] text-emerald-400 mt-1 font-mono">Calculated distance per liter</div>
              </div>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-rose-500"></div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest font-mono">Total Operational Cost</div>
                <div className="text-2xl font-black mt-2 text-white font-mono">${analytics.kpis.totalOpCost.toLocaleString()}</div>
                <div className="text-[10px] text-rose-450 mt-1 font-mono">Fuel + Maintenance logs</div>
              </div>
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest font-mono">Vehicle Status</div>
                <div className="flex gap-3 mt-3 text-[10px] font-mono font-bold">
                  <div className="text-emerald-400">🟢 {analytics.kpis.availableVehicles} AVAIL</div>
                  <div className="text-blue-400">🔵 {analytics.kpis.activeVehicles} TRIP</div>
                  <div className="text-amber-400">🟡 {analytics.kpis.maintenanceVehicles} SHOP</div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 font-mono">Monthly Revenue Overview</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                      <XAxis dataKey="month" stroke="#475569" className="font-mono text-[10px]" />
                      <YAxis stroke="#475569" className="font-mono text-[10px]" />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <Bar dataKey="Revenue" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 font-mono">Costliest Vehicles (Fuel + Maintenance)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topCostliestVehicles}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0f172a" />
                      <XAxis dataKey="reg_no" stroke="#475569" className="font-mono text-[10px]" />
                      <YAxis stroke="#475569" className="font-mono text-[10px]" />
                      <Tooltip contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <Bar dataKey="operational_cost" name="Op Cost ($)" fill="#dc2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ROI Formula Display Banner */}
            <div className="bg-[#050b14] border border-slate-900 rounded-xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
              <div>
                <h4 className="text-xs font-bold text-slate-350 font-mono uppercase tracking-wider">Fleet Return on Investment (ROI) Matrix.</h4>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Formula: ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost</p>
              </div>
              <div className="text-[9px] bg-slate-950 px-4 py-2 border border-slate-900 rounded-lg text-slate-500 font-mono">
                DATA SYNCHRONIZED AUTOMATICALLY
              </div>
            </div>

            {/* Vehicle Analytics ROI Table */}
            <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#050b14] border-b border-slate-900">
                  <tr>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Vehicle</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Reg No.</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Acquisition Cost</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Total Revenue</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Operational Cost</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Return (ROI)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {analytics.vehicleAnalyticsList.map(v => (
                    <tr key={v.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-200">{v.name}</td>
                      <td className="p-4 text-xs text-slate-450 font-mono">{v.reg_no}</td>
                      <td className="p-4 text-xs text-slate-400 font-mono">${v.acquisition_cost.toLocaleString()}</td>
                      <td className="p-4 text-xs text-cyan-400 font-mono">${v.revenue.toLocaleString()}</td>
                      <td className="p-4 text-xs text-rose-450 font-mono">${v.operational_cost.toLocaleString()}</td>
                      <td className="p-4 text-xs">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${v.roi >= 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-rose-950/40 text-rose-400 border border-rose-900/40'}`}>
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
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold font-mono">Logistics Assets</span>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono">Vehicle Registry.</h1>
              </div>
              <div className="flex gap-2 shrink-0">
                {hasAccess('fleet', 'write') && (
                  <>
                    <button 
                      onClick={() => setShowAddVehicle(true)} 
                      className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(6,182,212,0.15)]"
                    >
                      <Plus className="h-4 w-4" />
                      Add Vehicle
                    </button>
                    <button 
                      onClick={() => setShowAddMaintenance(true)} 
                      className="border border-slate-700 hover:border-slate-500 text-slate-200 font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full flex items-center gap-2 transition-all"
                    >
                      Log Service Record
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Rule Banner */}
            <div className="bg-[#050b14] border border-cyan-900/30 rounded-xl p-4 flex items-center gap-3 relative overflow-hidden">
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-cyan-500"></div>
              <ShieldAlert className="h-5 w-5 text-cyan-400 shrink-0" />
              <span className="text-[11px] text-slate-400 font-mono">
                <strong className="font-semibold text-white uppercase">SYSTEM POLICY:</strong> Vehicles flagged as <code className="bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded text-cyan-400">Retired</code> or <code className="bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded text-cyan-400">In Shop</code> are excluded from Dispatch options.
              </span>
            </div>

            {/* Vehicles Table */}
            <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#050b14] border-b border-slate-900">
                  <tr>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Reg. No.</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Model/Name</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Type</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Max Capacity</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Odometer</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Status</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {vehicles.map(v => (
                    <tr key={v.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 text-xs font-bold text-white font-mono">{v.reg_no}</td>
                      <td className="p-4 text-xs text-slate-300 font-bold">{v.name}</td>
                      <td className="p-4 text-xs text-slate-450 font-mono">{v.type}</td>
                      <td className="p-4 text-xs text-slate-300 font-mono">{v.max_load_capacity.toLocaleString()} kg</td>
                      <td className="p-4 text-xs text-slate-350 font-mono">{v.odometer.toLocaleString()} km</td>
                      <td className="p-4 text-xs">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          v.status === 'Available' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                          v.status === 'On Trip' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/40' :
                          v.status === 'In Shop' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' :
                          'bg-slate-800/40 text-slate-400 border border-slate-700'
                        }`}>
                          {v.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-right space-x-2">
                        <button 
                          onClick={() => {
                            const historyTrips = trips.filter(t => t.vehicle_id === v.id);
                            const historyMaint = maintenance.filter(m => m.vehicle_id === v.id);
                            setSelectedVehicleHistory({ vehicle: v, trips: historyTrips, maintenance: historyMaint });
                          }}
                          className="text-slate-400 hover:text-slate-200 text-[10px] uppercase font-bold font-mono bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-full"
                        >
                          History
                        </button>
                        {hasAccess('fleet', 'write') && v.status !== 'Retired' && (
                          <button 
                            onClick={() => retireVehicle(v.id)}
                            className="bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/60 text-rose-400 text-[10px] uppercase font-bold font-mono px-3 py-1 rounded-full"
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
              <h2 className="text-md font-bold uppercase tracking-widest text-slate-400 mb-4 font-mono">Logged Maintenance Records</h2>
              <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#050b14] border-b border-slate-900">
                    <tr>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Vehicle Reg</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Service Details</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Date Logged</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Cost</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Status</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {maintenance.map(m => (
                      <tr key={m.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 text-xs font-mono text-white">{m.vehicle_reg}</td>
                        <td className="p-4 text-xs text-slate-350 font-bold">{m.service_type}</td>
                        <td className="p-4 text-xs text-slate-500 font-mono">{m.date}</td>
                        <td className="p-4 text-xs text-slate-300 font-mono">${m.cost.toLocaleString()}</td>
                        <td className="p-4 text-xs">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${m.status === 'Open' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' : 'bg-slate-800/45 text-slate-400 border border-slate-700'}`}>
                            {m.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-right">
                          {hasAccess('fleet', 'write') && m.status === 'Open' && (
                            <button 
                              onClick={() => closeMaintenance(m.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-bold font-mono px-3.5 py-1.5 rounded-full transition-all"
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
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold font-mono">Personnel Compliance</span>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono">Drivers & Safety.</h1>
              </div>
              {hasAccess('drivers', 'write') && (
                <button 
                  onClick={() => setShowAddDriver(true)} 
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(6,182,212,0.15)]"
                >
                  <Plus className="h-4 w-4" />
                  Add Driver
                </button>
              )}
            </div>

            {/* Drivers list table */}
            <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#050b14] border-b border-slate-900">
                  <tr>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Driver Name</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">License No.</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Class</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Expiry Date</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Contact</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Safety Rating</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Duty Status</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {drivers.map(d => {
                    const expired = new Date(d.license_expiry_date) < new Date();
                    const warning = isLicenseExpiringSoon(d.license_expiry_date);

                    return (
                      <tr key={d.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 text-xs font-bold text-slate-200">{d.name}</td>
                        <td className="p-4 text-xs text-slate-450 font-mono">{d.license_no}</td>
                        <td className="p-4 text-xs text-slate-450 font-mono">{d.license_category}</td>
                        <td className="p-4 text-xs font-mono">
                          {expired ? (
                            <span className="text-red-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              {d.license_expiry_date} (Expired)
                            </span>
                          ) : warning ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              {d.license_expiry_date} (Expiring)
                            </span>
                          ) : (
                            <span className="text-slate-350">{d.license_expiry_date}</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-400 font-mono">{d.contact_no}</td>
                        <td className="p-4 text-xs">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            d.safety_score >= 85 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                            d.safety_score >= 60 ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' :
                            'bg-red-950/40 text-red-400 border border-red-900/40'
                          }`}>
                            {d.safety_score} PTS
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            d.status === 'Available' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                            d.status === 'On Trip' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/40' :
                            d.status === 'Suspended' ? 'bg-red-950/40 text-red-400 border border-red-900/40' :
                            'bg-slate-800/40 text-slate-400 border border-slate-700'
                          }`}>
                            {d.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-right space-x-2">
                          {hasAccess('drivers', 'write') && (
                            <>
                              <button 
                                onClick={() => { setAdjustScoreDriverId(d.id); setAdjustScoreValue(d.safety_score); }}
                                className="text-slate-400 hover:text-slate-200 text-[10px] uppercase font-bold font-mono bg-slate-900 border border-slate-850 px-2.5 py-1 rounded-full"
                              >
                                Adjust
                              </button>
                              <button 
                                onClick={() => toggleDriverSuspension(d.id, d.status)}
                                className={`text-[10px] uppercase font-bold font-mono px-3.5 py-1 rounded-full transition-all border ${
                                  d.status === 'Suspended' 
                                    ? 'bg-emerald-950/40 hover:bg-emerald-900/40 border-emerald-800 text-emerald-400' 
                                    : 'bg-red-950/40 hover:bg-red-900/40 border-red-800 text-red-400'
                                }`}
                              >
                                {d.status === 'Suspended' ? 'Activate' : 'Suspend'}
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
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold font-mono">Routing Tower</span>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono">Trips Console.</h1>
              </div>
              {hasAccess('trips', 'write') && (
                <button 
                  onClick={() => setShowCreateTrip(true)} 
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(6,182,212,0.15)]"
                >
                  <Plus className="h-4 w-4" />
                  Dispatch New Cargo Trip
                </button>
              )}
            </div>

            {/* List of active board trips */}
            <div className="grid grid-cols-1 gap-4">
              {trips.map(t => (
                <div key={t.id} className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t border-r border-slate-800"></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500 font-bold">ROUTE ID: #{t.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                        t.status === 'Draft' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                        t.status === 'Dispatched' ? 'bg-blue-950 text-blue-400 border border-blue-900/40' :
                        t.status === 'Completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' :
                        'bg-red-950 text-red-400 border border-red-900/40'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-md font-black text-slate-200 mt-2 flex items-center gap-2 font-mono uppercase">
                      {t.source} <ArrowRight className="h-4 w-4 text-cyan-500" /> {t.destination}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4 text-[11px] text-slate-450 font-mono">
                      <div>
                        <span className="block text-[9px] text-slate-500 uppercase font-bold">Vehicle:</span>
                        <strong className="text-slate-350">{t.vehicle_name} ({t.vehicle_reg})</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-500 uppercase font-bold">Driver Assigned:</span>
                        <strong className="text-slate-350">{t.driver_name || 'UNASSIGNED'}</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-500 uppercase font-bold">Cargo Payload:</span>
                        <strong className="text-slate-350">{t.cargo_weight.toLocaleString()} kg</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-500 uppercase font-bold">Total Distance:</span>
                        <strong className="text-slate-350">{t.planned_distance.toLocaleString()} km</strong>
                      </div>
                    </div>
                  </div>

                  {/* Trip Execution Controls */}
                  <div className="flex gap-2 self-stretch md:self-auto justify-end border-t md:border-t-0 border-slate-900 pt-3 md:pt-0">
                    {hasAccess('trips', 'write') && t.status === 'Draft' && (
                      <>
                        <button 
                          onClick={() => dispatchTrip(t.id)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase font-mono tracking-wider px-4 py-2 rounded-full transition-all"
                        >
                          Execute Dispatch
                        </button>
                        <button 
                          onClick={() => cancelTrip(t.id)}
                          className="border border-slate-700 hover:border-slate-500 text-slate-300 text-[10px] uppercase font-mono tracking-wider px-4 py-2 rounded-full transition-all"
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
                            setCompleteTripForm({
                              final_odometer: (t.final_odometer || 0) || Math.round(vehicles.find(v => v.id === t.vehicle_id)?.odometer + t.planned_distance),
                              fuel_consumed: '',
                              revenue: '',
                              toll_expense: '',
                              other_expense: ''
                            });
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase font-mono tracking-wider px-4 py-2 rounded-full transition-all"
                        >
                          Complete Trip Ops
                        </button>
                        <button 
                          onClick={() => cancelTrip(t.id)}
                          className="bg-rose-950/40 hover:bg-rose-900/40 border border-rose-900/60 text-rose-450 text-[10px] uppercase font-mono tracking-wider px-4 py-2 rounded-full transition-all"
                        >
                          Abort
                        </button>
                      </>
                    )}

                    {t.status === 'Completed' && (
                      <div className="text-[10px] font-mono text-slate-500 font-bold border border-slate-900 bg-black px-3 py-1 rounded">
                        ODO: {t.final_odometer} km | FUEL: {t.fuel_consumed} L
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
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold font-mono">Financial Ledger</span>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono">Expenses & Fuel.</h1>
              </div>
              {hasAccess('expenses', 'write') && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAddFuel(true)} 
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(6,182,212,0.15)]"
                  >
                    <Plus className="h-4 w-4" />
                    Log Fuel Purchase
                  </button>
                  <button 
                    onClick={() => setShowAddExpense(true)} 
                    className="border border-slate-700 hover:border-slate-500 text-slate-200 font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full flex items-center gap-2 transition-all"
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
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 font-mono">Refueling Logs</h3>
                <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#050b14] border-b border-slate-900">
                      <tr>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Vehicle</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Date</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Liters</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {fuelLogs.map(f => (
                        <tr key={f.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="p-4 text-xs font-mono text-white">{f.vehicle_reg}</td>
                          <td className="p-4 text-xs text-slate-450 font-mono">{f.date}</td>
                          <td className="p-4 text-xs text-slate-350 font-mono">{f.liters} L</td>
                          <td className="p-4 text-xs text-cyan-400 font-mono">${f.cost.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* General Expenses Table */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3 font-mono">Operating Expenses Ledger</h3>
                <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#050b14] border-b border-slate-900">
                      <tr>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Vehicle</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Tolls</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Maint. Cost</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Other</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="p-4 text-xs font-mono text-white">{e.vehicle_reg}</td>
                          <td className="p-4 text-xs text-slate-400 font-mono">${(e.toll || 0).toLocaleString()}</td>
                          <td className="p-4 text-xs text-slate-400 font-mono">${(e.maintenance_cost || 0).toLocaleString()}</td>
                          <td className="p-4 text-xs text-slate-400 font-mono">${(e.other || 0).toLocaleString()}</td>
                          <td className="p-4 text-xs font-bold text-rose-400 font-mono">${e.total.toLocaleString()}</td>
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
            <div className="bg-gradient-to-r from-purple-950 to-indigo-950 border border-purple-900/60 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              {/* Computer vision corners */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-purple-500"></div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-purple-500"></div>

              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-purple-900 text-purple-200 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest font-mono">Driver Portal</span>
                  <h1 className="text-xl font-black mt-2 text-white font-mono uppercase">Active Assigned Route.</h1>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-purple-300 font-mono uppercase font-bold">License class</div>
                  <div className="text-xs font-bold text-slate-200 font-mono">HEAVY TRANSPORT (VALID)</div>
                </div>
              </div>

              {/* Driver Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 bg-black/40 p-4 rounded-xl border border-purple-900/40">
                <div className="text-center">
                  <div className="text-[9px] text-purple-300 uppercase font-mono font-bold">Safety Score</div>
                  <div className="text-md font-black text-emerald-400 mt-1 font-mono">94.5 / 100</div>
                </div>
                <div className="text-center border-x border-purple-950">
                  <div className="text-[9px] text-purple-300 uppercase font-mono font-bold">Assigned Truck</div>
                  <div className="text-md font-black text-slate-200 mt-1 font-mono">Tata Prima</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-purple-300 uppercase font-mono font-bold">Plate ID</div>
                  <div className="text-md font-black text-slate-200 mt-1 font-mono">MH12QW1234</div>
                </div>
              </div>
            </div>

            {/* Current Trip Details */}
            <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-xl relative">
              <h3 className="text-xs font-bold text-slate-455 uppercase tracking-widest mb-4 font-mono">Assigned Active Dispatch</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-mono">Route Direction</span>
                    <strong className="text-xs text-slate-200 font-mono uppercase">Mumbai Depo ➔ Delhi NCR Central</strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] text-slate-500 uppercase font-mono">Cargo Payload</span>
                    <strong className="text-xs text-slate-300 font-mono">14,200 kg</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div>
                    <span className="block text-[9px] text-slate-500 uppercase font-mono">Trip Status</span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <span className="text-xs text-emerald-400 font-mono uppercase font-bold">Dispatched</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] text-slate-500 font-mono uppercase">Planned distance</span>
                    <strong className="text-xs font-mono text-slate-200">1,410 km</strong>
                  </div>
                </div>

                {/* Emergency Section */}
                <div className="bg-red-950/20 border border-red-950/40 rounded-lg p-4 mt-2">
                  <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Broadcasting Panic Alert SOS
                  </h4>
                  <p className="text-[11px] text-red-300 mt-1 font-mono">Clicking below triggers immediate alert signals at the central operations room.</p>
                  <button 
                    onClick={() => alert('SOS emergency trigger dispatched to operations tower safety room.')}
                    className="bg-red-700 hover:bg-red-600 text-white text-[10px] uppercase font-bold font-mono tracking-wider px-4 py-2 rounded-full mt-3 transition-colors"
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
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold font-mono">System Policy</span>
              <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono">Settings & Access.</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Config Form */}
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 font-mono font-bold">Depot Configurations</h3>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono mb-2">Primary Depot Name</label>
                  <input type="text" className="w-full bg-[#050b14] border border-slate-900 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none font-mono text-xs" defaultValue="TransitOps HQ - Terminal A" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-2">Distance Unit</label>
                    <select className="w-full bg-[#050b14] border border-slate-900 rounded-lg px-4 py-2.5 text-slate-300 focus:outline-none font-mono text-xs">
                      <option>Kilometers (km)</option>
                      <option>Miles (mi)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-2">Currency Symbol</label>
                    <select className="w-full bg-[#050b14] border border-slate-900 rounded-lg px-4 py-2.5 text-slate-300 focus:outline-none font-mono text-xs">
                      <option>USD ($)</option>
                      <option>INR (₹)</option>
                    </select>
                  </div>
                </div>
                <button onClick={() => alert('Global configurations updated successfully')} className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full transition-all">
                  Save Configurations
                </button>
              </div>

              {/* RBAC read only matrix */}
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 font-mono mb-3 font-bold">RBAC Matrix Permissions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead className="bg-[#050b14] border-b border-slate-900">
                      <tr>
                        <th className="p-2.5 text-slate-400 font-bold uppercase font-mono">Role</th>
                        <th className="p-2.5 text-slate-400 font-bold uppercase font-mono">Fleet</th>
                        <th className="p-2.5 text-slate-400 font-bold uppercase font-mono">Drivers</th>
                        <th className="p-2.5 text-slate-400 font-bold uppercase font-mono">Trips</th>
                        <th className="p-2.5 text-slate-400 font-bold uppercase font-mono">Expenses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/60 text-slate-300 font-mono">
                      <tr>
                        <td className="p-2.5 font-bold text-cyan-400">Fleet Manager</td>
                        <td className="p-2.5 text-emerald-400">Full</td>
                        <td className="p-2.5 text-emerald-400">Full</td>
                        <td className="p-2.5 text-slate-600">—</td>
                        <td className="p-2.5 text-slate-600">—</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-cyan-400">Dispatcher</td>
                        <td className="p-2.5 text-amber-400 font-bold">View</td>
                        <td className="p-2.5 text-slate-600">—</td>
                        <td className="p-2.5 text-emerald-400">Full</td>
                        <td className="p-2.5 text-slate-600">—</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-cyan-400">Safety Officer</td>
                        <td className="p-2.5 text-slate-600">—</td>
                        <td className="p-2.5 text-emerald-400">Full</td>
                        <td className="p-2.5 text-amber-400 font-bold">View</td>
                        <td className="p-2.5 text-slate-600">—</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-cyan-400">Financial Analyst</td>
                        <td className="p-2.5 text-amber-400 font-bold">View</td>
                        <td className="p-2.5 text-slate-600">—</td>
                        <td className="p-2.5 text-slate-600">—</td>
                        <td className="p-2.5 text-emerald-400 font-bold">Full</td>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>

            <button onClick={() => setShowAddVehicle(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-200 mb-6 font-mono flex items-center gap-2">
              <Truck className="h-5 w-5 text-cyan-500" />
              Register New Fleet Vehicle.
            </h2>
            <form onSubmit={addVehicle} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono mb-1.5">Registration Number</label>
                <input 
                  type="text" required value={vehicleForm.reg_no} 
                  onChange={(e) => setVehicleForm({ ...vehicleForm, reg_no: e.target.value })}
                  placeholder="e.g. MH12QW1234"
                  className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Model Name</label>
                  <input 
                    type="text" required value={vehicleForm.name} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                    placeholder="Tata Prima"
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Type</label>
                  <select 
                    value={vehicleForm.type}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
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
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Capacity (kg)</label>
                  <input 
                    type="number" required value={vehicleForm.max_load_capacity} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, max_load_capacity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Odometer (km)</label>
                  <input 
                    type="number" required value={vehicleForm.odometer} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, odometer: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Cost ($)</label>
                  <input 
                    type="number" required value={vehicleForm.acquisition_cost} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, acquisition_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Register Vehicle Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Add Driver */}
      {showAddDriver && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>

            <button onClick={() => setShowAddDriver(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-200 mb-6 font-mono flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-500" />
              Register Dispatch Driver.
            </h2>
            <form onSubmit={addDriver} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Driver Full Name</label>
                <input 
                  type="text" required value={driverForm.name} 
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">License Number</label>
                  <input 
                    type="text" required value={driverForm.license_no} 
                    onChange={(e) => setDriverForm({ ...driverForm, license_no: e.target.value })}
                    placeholder="DL-1420180099"
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">License Class</label>
                  <select 
                    value={driverForm.license_category}
                    onChange={(e) => setDriverForm({ ...driverForm, license_category: e.target.value })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
                  >
                    <option value="Heavy Transport">Heavy Transport</option>
                    <option value="Light Commercial">Light Commercial</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Expiry Date</label>
                  <input 
                    type="date" required value={driverForm.license_expiry_date} 
                    onChange={(e) => setDriverForm({ ...driverForm, license_expiry_date: e.target.value })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Contact Number</label>
                  <input 
                    type="text" required value={driverForm.contact_no} 
                    onChange={(e) => setDriverForm({ ...driverForm, contact_no: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Register Driver Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Adjust Safety Score */}
      {adjustScoreDriverId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setAdjustScoreDriverId(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-200 mb-6 font-mono flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Adjust Driver Safety Rating
            </h2>
            <form onSubmit={adjustSafetyScore} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono mb-1.5">New Safety Score Points</label>
                <input 
                  type="number" step="0.1" max="100" min="0" required value={adjustScoreValue} 
                  onChange={(e) => setAdjustScoreValue(e.target.value)}
                  className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all">
                Apply Safety Score Adjustment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Create Trip */}
      {showCreateTrip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>

            <button onClick={() => setShowCreateTrip(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-200 mb-6 font-mono flex items-center gap-2">
              <Navigation className="h-5 w-5 text-cyan-500" />
              Plan Cargo Dispatch Trip.
            </h2>
            <form onSubmit={createTrip} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Source City</label>
                  <input 
                    type="text" required value={tripForm.source} 
                    onChange={(e) => setTripForm({ ...tripForm, source: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Destination City</label>
                  <input 
                    type="text" required value={tripForm.destination} 
                    onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
                    placeholder="e.g. Delhi NCR"
                    className="w-full bg-[#050b14] border border-slate-905 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Cargo Weight (kg)</label>
                  <input 
                    type="number" required value={tripForm.cargo_weight} 
                    onChange={(e) => setTripForm({ ...tripForm, cargo_weight: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Planned Distance (km)</label>
                  <input 
                    type="number" required value={tripForm.planned_distance} 
                    onChange={(e) => setTripForm({ ...tripForm, planned_distance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Select Vehicle (Available)</label>
                  <select 
                    required value={tripForm.vehicle_id}
                    onChange={(e) => setTripForm({ ...tripForm, vehicle_id: e.target.value })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
                  >
                    <option value="">-- Choose Available --</option>
                    {vehicles.filter(v => v.status === 'Available').map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.reg_no}) [Max: {v.max_load_capacity} kg]</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Select Driver (Available)</label>
                  <select 
                    required value={tripForm.driver_id}
                    onChange={(e) => setTripForm({ ...tripForm, driver_id: e.target.value })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
                  >
                    <option value="">-- Choose Available --</option>
                    {drivers.filter(d => {
                      const expired = new Date(d.license_expiry_date) < new Date();
                      return d.status === 'Available' && !expired;
                    }).map(d => (
                      <option key={d.id} value={d.id}>{d.name} (Safety Score: {d.safety_score})</option>
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
                      <div className="bg-red-950/20 border border-red-900/60 rounded-lg p-3 text-red-400 text-xs flex gap-2 font-mono">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span><strong>Weight Overload Alert:</strong> Cargo weight exceeds vehicle's maximum carrying capacity of {selectedVehicle.max_load_capacity} kg. This trip cannot be dispatched.</span>
                      </div>
                    );
                  }
                })()
              )}

              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Save Trip as Draft
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Log Service Record */}
      {showAddMaintenance && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddMaintenance(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-200 mb-6 font-mono flex items-center gap-2">
              <Settings className="h-5 w-5 text-cyan-500 animate-spin" />
              Log Vehicle Service Record.
            </h2>
            <form onSubmit={addMaintenance} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Select Vehicle</label>
                <select 
                  required value={maintenanceForm.vehicle_id}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicle_id: e.target.value })}
                  className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'Retired').map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.reg_no}) [{v.status}]</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Service Details</label>
                <input 
                  type="text" required value={maintenanceForm.service_type} 
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, service_type: e.target.value })}
                  placeholder="e.g. Brake Replacement"
                  className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Service Cost ($)</label>
                  <input 
                    type="number" required value={maintenanceForm.cost} 
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Service Date</label>
                  <input 
                    type="date" required value={maintenanceForm.date} 
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Commit & Log Service
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Complete Trip Form Details */}
      {activeCompleteTripModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setActiveCompleteTripModal(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-355"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-200 mb-6 font-mono flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Complete Active Trip Operations.
            </h2>
            <form onSubmit={completeTrip} className="space-y-4">
              <div className="bg-[#050b14] border border-slate-900 rounded-lg p-3 text-[10px] text-slate-400 space-y-1 font-mono">
                <div>Trip ID: #{activeCompleteTripModal.id} ({activeCompleteTripModal.source} ➔ {activeCompleteTripModal.destination})</div>
                <div>Assigned Vehicle: {activeCompleteTripModal.vehicle_name} ({activeCompleteTripModal.vehicle_reg})</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Final Odometer (km)</label>
                  <input 
                    type="number" required value={completeTripForm.final_odometer} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, final_odometer: parseFloat(e.target.value) || '' })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Fuel Consumed (Liters)</label>
                  <input 
                    type="number" required value={completeTripForm.fuel_consumed} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, fuel_consumed: parseFloat(e.target.value) || '' })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Trip Revenue Earned ($)</label>
                <input 
                  type="number" required value={completeTripForm.revenue} 
                  onChange={(e) => setCompleteTripForm({ ...completeTripForm, revenue: parseFloat(e.target.value) || '' })}
                  className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Highway Tolls ($)</label>
                  <input 
                    type="number" value={completeTripForm.toll_expense} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, toll_expense: e.target.value })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Other Incidentals ($)</label>
                  <input 
                    type="number" value={completeTripForm.other_expense} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, other_expense: e.target.value })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Log Completion & Update Stats
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Log Fuel Purchase */}
      {showAddFuel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddFuel(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-200 mb-6 font-mono flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-cyan-500" />
              Log Fuel Purchase Receipt.
            </h2>
            <form onSubmit={addFuel} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Select Vehicle</label>
                <select 
                  required value={fuelForm.vehicle_id}
                  onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })}
                  className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'Retired').map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.reg_no})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Purchase Date</label>
                  <input 
                    type="date" required value={fuelForm.date} 
                    onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Liters Refueled</label>
                  <input 
                    type="number" step="0.01" required value={fuelForm.liters} 
                    onChange={(e) => setFuelForm({ ...fuelForm, liters: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Total Cost Paid ($)</label>
                <input 
                  type="number" required value={fuelForm.cost} 
                  onChange={(e) => setFuelForm({ ...fuelForm, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Record Fuel Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Log General Expense */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddExpense(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-200 mb-6 font-mono flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-cyan-500" />
              Add Incidentals / Toll Expense.
            </h2>
            <form onSubmit={addExpense} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Select Vehicle</label>
                <select 
                  required value={expenseForm.vehicle_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}
                  className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'Retired').map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.reg_no})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Toll Cost ($)</label>
                  <input 
                    type="number" value={expenseForm.toll} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, toll: e.target.value })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono mb-1.5">Other Incidentals ($)</label>
                  <input 
                    type="number" value={expenseForm.other} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, other: e.target.value })}
                    className="w-full bg-[#050b14] border border-slate-900 text-slate-200 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Record Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Vehicle History & Details */}
      {selectedVehicleHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-900 rounded-xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setSelectedVehicleHistory(null)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-350"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-200 mb-2 font-mono flex items-center gap-2">
              <Truck className="h-5 w-5 text-cyan-500" />
              Vehicle Operational Log & History.
            </h2>
            <div className="text-xs text-slate-450 font-mono mb-6">{selectedVehicleHistory.vehicle.name} ({selectedVehicleHistory.vehicle.reg_no})</div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">Trip logs History</h3>
                {selectedVehicleHistory.trips.length === 0 ? (
                  <p className="text-[10px] text-slate-500 font-mono">No past or active trips logged for this vehicle.</p>
                ) : (
                  <div className="bg-black border border-slate-900 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#050b14] border-b border-slate-900">
                        <tr>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Trip ID</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Route</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Status</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Cargo Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 font-mono text-[11px]">
                        {selectedVehicleHistory.trips.map(t => (
                          <tr key={t.id}>
                            <td className="p-3 font-mono">#{t.id}</td>
                            <td className="p-3 uppercase">{t.source} ➔ {t.destination}</td>
                            <td className="p-3">{t.status.toUpperCase()}</td>
                            <td className="p-3">{t.cargo_weight.toLocaleString()} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">Service Maintenance History</h3>
                {selectedVehicleHistory.maintenance.length === 0 ? (
                  <p className="text-[10px] text-slate-500 font-mono">No service records registered for this vehicle.</p>
                ) : (
                  <div className="bg-black border border-slate-900 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#050b14] border-b border-slate-900">
                        <tr>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Service Type</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Date Logged</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Cost</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 font-mono text-[11px]">
                        {selectedVehicleHistory.maintenance.map(m => (
                          <tr key={m.id}>
                            <td className="p-3">{m.service_type}</td>
                            <td className="p-3">{m.date}</td>
                            <td className="p-3 font-mono">${m.cost.toLocaleString()}</td>
                            <td className="p-3">{m.status.toUpperCase()}</td>
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
