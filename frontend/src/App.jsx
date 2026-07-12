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
  // App View Mode: 'landing', 'login', or 'app' (after login)
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

  // Active tab inside app dashboard
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
      <div className="bg-black text-white antialiased selection:bg-blue-600 selection:text-white relative font-sans">
        
        {/* Full Screen Viewport Wrapper */}
        <div className="h-screen flex flex-col justify-between relative overflow-hidden bg-black">
          
          {/* 1. NAVIGATION BAR */}
          <header className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between z-10">
            <div className="text-2xl font-bold tracking-tight text-white cursor-pointer" onClick={() => setView('landing')}>
              transit<span className="text-blue-500">ops</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-400">
              <a href="#platform" className="hover:text-white transition">Products</a>
              <a href="#rules" className="hover:text-white transition">Solutions</a>
              <a href="#roles" className="hover:text-white transition">Resources</a>
              <a href="#contact" className="hover:text-white transition">Company</a>
              <span onClick={() => setView('login')} className="hover:text-white transition cursor-pointer">Customers</span>
            </nav>
            
            <div className="flex items-center space-x-6 text-sm font-medium">
              <a href="#contact" className="text-gray-400 hover:text-white flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                <span>Contact</span>
              </a>
              <button onClick={() => setView('login')} className="text-gray-400 hover:text-white transition">Login</button>
              <button 
                onClick={() => setView('login')}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-5 py-2.5 rounded-full hover:opacity-90 transition shadow-lg shadow-blue-500/20"
              >
                Get started
              </button>
            </div>
          </header>

          {/* 2. MAIN HERO SECTION */}
          <main className="flex-grow max-w-7xl w-full mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-6 relative z-10">
            
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-8 flex flex-col justify-center text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold tracking-tight text-white leading-[1.1]">
                AI that makes your operations safer and more efficient.
              </h1>
              
              <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
                One platform to help improve the 
                <span className="text-white border-b-2 border-red-500 pb-0.5 font-medium ml-1.5 mr-1.5">Safety</span>, 
                <span className="text-white border-b-2 border-blue-400 pb-0.5 font-medium mr-1.5">Productivity</span>, and 
                <span className="text-white border-b-2 border-gray-400 pb-0.5 font-medium">Profitability</span> 
                of your operations.
              </p>
              
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <button 
                  onClick={() => setView('login')}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-3.5 rounded-full font-medium text-base hover:opacity-90 transition shadow-xl shadow-blue-600/10"
                >
                  Get started
                </button>
                <a href="#contact" className="border border-gray-600 text-white px-8 py-3.5 rounded-full font-medium text-base hover:bg-white/5 transition flex items-center space-x-2">
                  <span>Watch demo</span>
                </a>
              </div>
            </div>

            {/* Right Dashboard Column */}
            <div className="lg:col-span-6 w-full flex justify-center items-center relative">
              <div className="relative p-3 w-full max-w-lg aspect-[4/3] rounded-sm">
                {/* Tactical Camera Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400"></div>
                
                {/* Image box frame */}
                <div className="w-full h-full rounded-md overflow-hidden relative shadow-2xl bg-zinc-900">
                  <img 
                    src="/motive_hero_vehicles.png" 
                    alt="Operational site view" 
                    className="w-full h-full object-cover filter brightness-75 contrast-125" 
                  />
                  
                  {/* Bounding box computer vision overlay */}
                  <div className="absolute top-1/4 left-1/3 w-32 h-24 border-2 border-blue-500/80 bg-blue-500/10"></div>
                  
                  {/* Floating geofence box */}
                  <div className="absolute top-6 left-6 backdrop-blur-md bg-black/60 border border-white/20 px-4 py-3 rounded-xl max-w-[180px] shadow-lg text-left">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Alert Trigger</span>
                    <div className="flex items-center space-x-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="text-sm font-bold text-white tracking-tight">Geofence Alert</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </main>

          {/* Bottom spacing for aesthetics */}
          <div className="w-full pb-8"></div>
        </div>

        {/* Section 2 — Integrated platform (Alternating Stark White Section) */}
        <section id="platform" className="bg-[#FFFFFF] text-slate-955 py-28 px-6 relative border-y border-slate-200 text-left">
          <div className="max-w-7xl mx-auto text-center space-y-4">
            <span className="text-[12px] bg-slate-100 text-[#5B6270] px-3 py-1 rounded-full font-mono font-bold uppercase tracking-widest border border-slate-200">
              INTEGRATED OPERATIONS PLATFORM
            </span>
            <h2 className="text-3xl md:text-[46px] font-extrabold tracking-tight text-[#111111] leading-none">
              One system, six connected modules.
            </h2>
            <p className="text-[16px] text-[#5B6270] max-w-xl mx-auto font-sans leading-[1.65]">
              Fleet, drivers, trips, maintenance, fuel, and analytics — working off the same source of truth.
            </p>

            {/* Hub-and-Spoke diagram */}
            <div className="relative pt-16 max-w-4xl mx-auto">
              <svg className="absolute inset-0 w-full h-32 text-[#1E6FEB]/15 pointer-events-none hidden lg:block" fill="none">
                <path d="M400,0 C400,60 100,60 100,120" stroke="currentColor" strokeWidth="2" />
                <path d="M400,0 C400,60 250,60 250,120" stroke="currentColor" strokeWidth="2" />
                <path d="M400,0 C400,60 400,60 400,120" stroke="currentColor" strokeWidth="2" />
                <path d="M400,0 C400,60 550,60 550,120" stroke="currentColor" strokeWidth="2" />
                <path d="M400,0 C400,60 700,60 700,120" stroke="currentColor" strokeWidth="2" />
              </svg>
              
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 relative z-10">
                {[
                  { title: 'Fleet', desc: 'Registry lifecycle, shop tracking, status metrics.', icon: Truck },
                  { title: 'Drivers', desc: 'Safety ratings, credential checks, compliance tracking.', icon: Users },
                  { title: 'Trips', desc: 'Live capacity checks, dispatch logs, revenue stats.', icon: Navigation },
                  { title: 'Maintenance', desc: 'Record log entries, automatic shop lockouts.', icon: Settings },
                  { title: 'Expenses', desc: 'Track fuel cost receipts, tolls plazas, other logs.', icon: DollarSign },
                  { title: 'Analytics', desc: 'Auto-calculates vehicle ROI and fleet cost trends.', icon: BarChart3 }
                ].map((mod, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setView('login')}
                    className="bg-[#FFFFFF] border border-slate-200 rounded-2xl p-6 text-left shadow-[0_4px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgba(30,111,235,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="w-10 h-10 bg-[#0a0d14] text-white rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#1E6FEB] transition-colors duration-300">
                      <mod.icon className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900">{mod.title}</h4>
                    <p className="text-[11px] text-[#5B6270] font-sans mt-2 leading-relaxed">{mod.desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Section 3 — Rules enforcement feature */}
        <section id="rules" className="bg-[#FFFFFF] text-slate-955 py-28 px-6 border-b border-slate-200">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Mock Camera View Quadrants Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Cargo Payload', val: 'OVERLOAD DISPATCH BLOCKED', status: 'blocked', desc: '14,200 kg cargo exceeds maximum 10,000 kg carrying capacity of DL01AB9999.' },
                { label: 'License Verification', val: 'ASSIGNMENT BLOCKED', status: 'blocked', desc: 'Robert Expired cannot be assigned. Driver license expired on 2026-06-01.' },
                { label: 'Vehicle State Lock', val: 'OMITTED FROM POOL', status: 'neutral', desc: 'Medium Truck KA03XY5678 automatically hidden from active dispatch list while service logs are open.' },
                { label: 'Compliance Lockout', val: 'ASSIGNMENT BLOCKED', status: 'blocked', desc: 'Sam Suspended disabled from duty queue. Safety score dropped below 50 points compliance limit.' }
              ].map((card, idx) => (
                <div key={idx} className="bg-[#12151C] border border-white/5 rounded-xl p-5 shadow-2xl relative text-left">
                  {/* Viewfinder brackets */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#1E6FEB]"></div>
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#1E6FEB]"></div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-bold font-mono text-[#A3A9B5] uppercase tracking-widest">{card.label}</span>
                    <span className={`text-[8px] font-mono font-black px-2.5 py-0.5 rounded border uppercase tracking-widest ${
                      card.status === 'blocked'
                        ? 'bg-rose-955/40 border-rose-900/60 text-rose-455'
                        : 'bg-amber-955/40 border-amber-900/60 text-amber-455'
                    }`}>
                      {card.val}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Left side text column */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <span className="text-[12px] bg-slate-100 text-[#5B6270] px-3 py-1 rounded-full font-mono font-bold uppercase tracking-widest border border-slate-200">
                SMART VALIDATION
              </span>
              
              <h2 className="text-3xl font-extrabold tracking-tight text-[#111111] leading-tight">
                The system stops the mistake. You never have to.
              </h2>
              
              <p className="text-[15px] text-[#5B6270] leading-[1.65] font-sans">
                From overloaded cargo to expired licenses, TransitOps blocks the mistake at the source instead of surfacing it in a report next month.
              </p>
              
              <div className="pt-2">
                <button 
                  onClick={() => setView('login')}
                  className="border border-slate-800 hover:border-slate-600 text-slate-900 text-xs font-bold uppercase tracking-widest font-mono px-8 py-3 rounded-full transition-all duration-300 hover:scale-105"
                >
                  Learn more
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* Section 4 — Role-based value */}
        <section id="roles" className="py-28 px-6 bg-[#000000] border-b border-[#FFFFFF]/8 text-left">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <span className="text-[12px] text-[#4FA8FF] uppercase tracking-[0.15em] font-bold font-mono">Role-Based Modules</span>
              <h2 className="text-3xl font-extrabold text-white uppercase font-mono tracking-wider">Built for every seat in the operation.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { role: 'Fleet Manager', desc: 'Full visibility into every vehicle\'s status, cost, and lifecycle.', cta: 'Manage Fleet' },
                { role: 'Dispatcher', desc: 'Dispatch with confidence — the system won\'t let a conflict through.', cta: 'Orchestrate Trips' },
                { role: 'Safety Officer', desc: 'License checks and safety scores, enforced automatically.', cta: 'Inspect Compliance' },
                { role: 'Financial Analyst', desc: 'Real operational cost, calculated the moment it happens.', cta: 'Audit Financials' }
              ].map((item, idx) => (
                <div key={idx} className="bg-[#12151C] border border-[#FFFFFF]/8 rounded-2xl p-6 flex flex-col justify-between hover:border-white/15 transition-all duration-300 hover:-translate-y-1">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">{item.role}</h4>
                    <p className="text-[11px] text-[#A3A9B5] font-mono leading-relaxed">{item.desc}</p>
                  </div>
                  <button 
                    onClick={() => { setRole(item.role); setView('login'); }}
                    className="text-[10px] text-[#4FA8FF] font-mono uppercase font-bold tracking-widest mt-6 flex items-center gap-1 hover:text-[#6EC1FF] transition-colors self-start"
                  >
                    {item.cta} ➔
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5 — Social Proof */}
        <section className="relative py-32 overflow-hidden px-6 text-center bg-[#0c0d14] border-b border-[#FFFFFF]/8">
          <div className="absolute inset-0 bg-black/60 z-0"></div>
          <div className="max-w-4xl mx-auto relative z-10 space-y-6">
            <span className="text-[12px] text-[#A3A9B5]/60 font-mono uppercase tracking-[0.15em] font-bold">BUILT FOR OPERATORS LIKE YOU</span>
            <h2 className="text-3xl font-extrabold text-white leading-tight font-sans">The most complex fleets deserve the simplest system.</h2>
            <div className="pt-4">
              <button 
                onClick={() => setView('login')}
                className="text-[#4FA8FF] hover:text-[#6EC1FF] text-xs font-bold font-mono uppercase tracking-widest"
              >
                Explore how it works ➔
              </button>
            </div>
          </div>
        </section>

        {/* Section 6 — CTA / Lead Capture */}
        <section id="contact" className="py-28 px-6 max-w-7xl mx-auto text-left">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Details */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-[12px] text-[#4FA8FF] font-mono uppercase tracking-[0.15em] font-bold">CONNECT WITH US</span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-[1.1] font-sans">
                We'd love to show you around.
              </h2>
              
              <div className="space-y-3 pt-2 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#4FA8FF] shrink-0" /> Comply with dispatch and compliance rules automatically.
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#4FA8FF] shrink-0" /> Catch license, capacity, and cost issues before they escalate.
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#4FA8FF] shrink-0" /> See fleet-wide status in one dashboard — always up to date.
                </div>
              </div>

              {/* Trust badges strip */}
              <div className="pt-8 border-t border-[#FFFFFF]/8">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#A3A9B5]/50 mb-4 font-bold">Voted best in class across the board</div>
                <div className="flex flex-wrap gap-3">
                  {['Top 100 System', 'Best Est. ROI', 'Most Implementable', 'Best Relationship', 'Buyer\'s Choice 2026'].map((badge, idx) => (
                    <div key={idx} className="bg-[#12151C] border border-[#FFFFFF]/8 rounded px-3 py-2 text-[10px] font-mono font-bold text-[#A3A9B5] flex items-center justify-center uppercase">
                      {badge}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right floating form card */}
            <div className="lg:col-span-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-2xl relative text-slate-955">
                <h3 className="text-lg font-extrabold tracking-tight text-center mb-6 font-sans">Schedule a tour</h3>
                <form onSubmit={(e) => { e.preventDefault(); alert('Request logged! A product specialist will contact you shortly.'); }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#5B6270] uppercase tracking-widest font-mono mb-1.5">First Name</label>
                      <input type="text" required className="w-full bg-[#FFFFFF] border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:outline-none focus:border-[#1E6FEB] transition-colors font-sans text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#5B6270] uppercase tracking-widest font-mono mb-1.5">Last Name</label>
                      <input type="text" required className="w-full bg-[#FFFFFF] border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:outline-none focus:border-[#1E6FEB] transition-colors font-sans text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#5B6270] uppercase tracking-widest font-mono mb-1.5">Company Email</label>
                    <input type="email" required className="w-full bg-[#FFFFFF] border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:outline-none focus:border-[#1E6FEB] transition-colors font-sans text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-[#5B6270] uppercase tracking-widest font-mono mb-1.5">Company Name</label>
                      <input type="text" required className="w-full bg-[#FFFFFF] border border-slate-200 text-slate-900 rounded-lg px-4 py-2 focus:outline-none focus:border-[#1E6FEB] transition-colors font-sans text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-[#5B6270] uppercase tracking-widest font-mono mb-1.5">Fleet Size</label>
                      <select className="w-full bg-[#FFFFFF] border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#1E6FEB] transition-colors font-sans text-xs">
                        <option>1-10 vehicles</option>
                        <option>11-50 vehicles</option>
                        <option>51-200 vehicles</option>
                        <option>200+ vehicles</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-gradient-to-r from-[#1E6FEB] to-[#2F7FF0] hover:brightness-110 text-white font-bold text-xs uppercase font-mono py-3.5 rounded-full transition-all duration-300 shadow-[0_4px_15px_rgba(30,111,235,0.3)] hover:scale-102">
                    Get a tour
                  </button>
                </form>
              </div>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#000000] border-t border-[#FFFFFF]/8 py-16 px-6 relative z-10 text-xs font-mono text-slate-505 text-left">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-6 gap-8">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-[#4FA8FF]" />
                <span className="text-sm font-black tracking-widest uppercase text-white">TransitOps</span>
              </div>
              <p className="text-[11px] leading-relaxed max-w-xs">AI-assisted operational routing, compliance validation, and fleet metrics.</p>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase mb-4">Products</h5>
              <ul className="space-y-2">
                <li><a href="#platform" className="hover:text-slate-350">Platform Overview</a></li>
                <li><a href="#platform" className="hover:text-slate-350">Fleet Management</a></li>
                <li><a href="#platform" className="hover:text-slate-350">Driver Safety</a></li>
                <li><a href="#platform" className="hover:text-slate-350">Trip Dispatch</a></li>
                <li><a href="#platform" className="hover:text-slate-350">Maintenance</a></li>
                <li><a href="#platform" className="hover:text-slate-350">Analytics</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase mb-4">Who We Serve</h5>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-slate-350">Logistics</a></li>
                <li><a href="#" className="hover:text-slate-350">Construction</a></li>
                <li><a href="#" className="hover:text-slate-350">Field Service</a></li>
                <li><a href="#" className="hover:text-slate-350">Public Sector</a></li>
                <li><a href="#" className="hover:text-slate-350">Delivery</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase mb-4">Resources</h5>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-slate-350">Blog</a></li>
                <li><a href="#" className="hover:text-slate-350">Guides</a></li>
                <li><a href="#" className="hover:text-slate-350">ROI Calculator</a></li>
                <li><a href="#" className="hover:text-slate-350">Content Library</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold text-white uppercase mb-4 font-bold">Company</h5>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-slate-350">Leadership</a></li>
                <li><a href="#" className="hover:text-slate-350">Careers</a></li>
                <li><a href="#" className="hover:text-slate-350">Contact Us</a></li>
                <li><a href="#" className="hover:text-slate-350">Partners</a></li>
              </ul>
            </div>
          </div>

          <div className="max-w-7xl mx-auto pt-12 mt-12 border-t border-[#FFFFFF]/8 flex justify-between items-center text-[10px]">
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
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161a24_1px,transparent_1px),linear-gradient(to_bottom,#161a24_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25"></div>
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-500 rounded-full filter blur-3xl opacity-10"></div>

        <div className="w-full max-w-md bg-[#12151C] border border-[#FFFFFF]/8 rounded-2xl p-8 shadow-[0_0_60px_rgba(30,111,235,0.12)] relative z-10 backdrop-blur-lg">
          {/* Viewfinder corner brackets */}
          <div className="viewfinder-bracket-tl"></div>
          <div className="viewfinder-bracket-tr"></div>
          <div className="viewfinder-bracket-bl"></div>
          <div className="viewfinder-bracket-br"></div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Truck className="h-7 w-7 text-[#4FA8FF]" />
            <span className="text-xl font-black tracking-tight text-white uppercase font-mono">TransitOps</span>
          </div>
          <div className="text-center mb-8">
            <span className="text-[10px] bg-[#0A0D14] text-[#4FA8FF] px-2.5 py-1 rounded border border-[#FFFFFF]/5 font-mono uppercase tracking-widest">Industrial Core OS</span>
          </div>

          <h2 className="text-center text-lg font-bold text-slate-202 mb-6 uppercase tracking-wider font-mono">
            Control Tower Portal.
          </h2>

          {errorMsg && (
            <div className="bg-red-955/50 border border-red-900/60 text-red-450 px-4 py-3 rounded-lg text-xs mb-6 flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-[#A3A9B5] uppercase tracking-widest mb-1.5 font-mono">Workspace Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#0A0D14] border border-[#FFFFFF]/8 text-slate-202 px-4 py-3 rounded-lg focus:outline-none focus:border-[#1E6FEB] transition-colors text-sm"
              >
                <option value="Fleet Manager">Fleet Manager</option>
                <option value="Dispatcher">Dispatcher</option>
                <option value="Safety Officer">Safety Officer</option>
                <option value="Financial Analyst">Financial Analyst</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A3A9B5] uppercase tracking-widest mb-1.5 font-mono">Email Address</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@transitops.com"
                className="w-full bg-[#0A0D14] border border-[#FFFFFF]/8 text-slate-202 px-4 py-3 rounded-lg focus:outline-none focus:border-[#1E6FEB] transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#A3A9B5] uppercase tracking-widest mb-1.5 font-mono">Security Password</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0A0D14] border border-[#FFFFFF]/8 text-slate-202 px-4 py-3 rounded-lg focus:outline-none focus:border-[#1E6FEB] transition-colors text-sm"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-[#A3A9B5] cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-[#0A0D14] border-slate-900 text-[#1E6FEB] focus:ring-0 focus:ring-offset-0" 
                />
                Remember session
              </label>
              <a href="#" onClick={() => alert('Password reset requests must go through your systems administrator.')} className="text-[#4FA8FF] hover:underline font-mono">Forgot password?</a>
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-br from-[#1E6FEB] to-[#2F7FF0] hover:brightness-110 text-white font-bold text-sm py-3 rounded-full shadow-[0_4px_20px_rgba(30,111,235,0.3)] flex items-center justify-center gap-2 transition-all duration-300 uppercase tracking-wider font-mono"
            >
              Sign In to System
              <ArrowRight className="h-4 w-4" />
            </button>
            
            <button 
              type="button"
              onClick={() => setView('landing')}
              className="w-full border border-[#FFFFFF]/10 hover:border-white/20 text-[#A3A9B5] hover:text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all"
            >
              Back to Landing Page
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#FFFFFF]/8 text-center flex justify-between items-center text-[10px] text-[#A3A9B5]/40 font-mono">
            <span>SECURE GATEWAY</span>
            <span>SYSTEM v1.4.0</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- MAIN CONSOLE DASHBOARD VIEW (Light Theme Applied) ----------------
  return (
    <div className="min-h-screen bg-slate-55 text-slate-700 flex flex-col md:flex-row relative text-left">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 relative z-10 shadow-sm">
        <div>
          {/* Brand header */}
          <div className="h-20 flex items-center gap-2.5 px-6 border-b border-slate-200 bg-slate-50/50">
            <Truck className="h-5 w-5 text-blue-600" />
            <span className="text-md font-extrabold tracking-widest uppercase font-mono text-slate-905 font-bold">TransitOps</span>
          </div>

          {/* User profile info */}
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">Operations Console</div>
            <div className="text-[14px] font-extrabold text-blue-600 mt-0.5 font-mono">{user.role.toUpperCase()}</div>
            <div className="text-xs text-slate-605 mt-1 truncate font-mono">{user.name}</div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {hasAccess('analytics') && (
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-605 border border-blue-200/50' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                Fleet Metrics
              </button>
            )}

            {hasAccess('fleet') && (
              <button 
                onClick={() => setActiveTab('vehicles')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'vehicles' ? 'bg-blue-50 text-blue-605 border border-blue-200/50' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Truck className="h-3.5 w-3.5 text-blue-600" />
                Vehicle Registry
              </button>
            )}

            {hasAccess('drivers') && (
              <button 
                onClick={() => setActiveTab('drivers')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'drivers' ? 'bg-blue-50 text-blue-605 border border-blue-200/50' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Users className="h-3.5 w-3.5 text-blue-600" />
                Drivers & Safety
              </button>
            )}

            {hasAccess('trips') && (
              <button 
                onClick={() => setActiveTab('trips')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'trips' ? 'bg-blue-50 text-blue-605 border border-blue-200/50' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Navigation className="h-3.5 w-3.5 text-blue-600" />
                Trips Console
              </button>
            )}

            {hasAccess('expenses') && (
              <button 
                onClick={() => setActiveTab('expenses')} 
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'expenses' ? 'bg-blue-50 text-blue-605 border border-blue-200/50' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                Expenses & Fuel
              </button>
            )}

            <button 
              onClick={() => setActiveTab('driver-app')} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'driver-app' ? 'bg-purple-50 border border-purple-200 text-purple-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Zap className="h-3.5 w-3.5 text-purple-650" />
              Demo Driver App
            </button>

            <button 
              onClick={() => setActiveTab('settings')} 
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono transition-all ${activeTab === 'settings' ? 'bg-blue-50 text-blue-605 border border-blue-200/50' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Settings className="h-3.5 w-3.5 text-blue-600" />
              Settings & RBAC
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider font-mono text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout Session
          </button>
        </div>
      </aside>

      {/* Main Board Component Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen relative z-10 text-left">
        
        {/* ================= tab: DASHBOARD (Fleet Metrics) ================= */}
        {activeTab === 'dashboard' && analytics && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] text-blue-600 uppercase tracking-widest font-bold font-mono">Operations Platform</span>
                <h1 className="text-2xl font-black tracking-tight text-slate-905 uppercase font-mono font-bold">Fleet Analytics & KPIs.</h1>
              </div>
              {user.role === 'Financial Analyst' && (
                <button 
                  onClick={exportCSV} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full flex items-center gap-2 transition-all shadow-[0_4px_15px_rgba(37,99,235,0.15)]"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Fleet ROI (CSV)
                </button>
              )}
            </div>

            {/* KPI Metrics row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-blue-500"></div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-mono">Fleet Utilization</div>
                <div className="text-2xl font-black mt-2 text-slate-900 font-mono">{analytics.kpis.fleetUtilization}%</div>
                <div className="text-[10px] text-blue-600 mt-1 font-mono">Active / Total active vehicles</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-blue-600"></div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-mono">Fuel Efficiency</div>
                <div className="text-2xl font-black mt-2 text-slate-900 font-mono">{analytics.kpis.fuelEfficiency} <span className="text-xs text-slate-500 font-normal">km/L</span></div>
                <div className="text-[10px] text-emerald-600 mt-1 font-mono">Calculated distance per liter</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-rose-500"></div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-mono">Total Operational Cost</div>
                <div className="text-2xl font-black mt-2 text-slate-900 font-mono">${analytics.kpis.totalOpCost.toLocaleString()}</div>
                <div className="text-[10px] text-rose-600 mt-1 font-mono">Fuel + Maintenance logs</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest font-mono">Vehicle Status</div>
                <div className="flex gap-3 mt-3 text-[10px] font-mono font-bold">
                  <div className="text-emerald-605">🟢 {analytics.kpis.availableVehicles} AVAIL</div>
                  <div className="text-blue-650">🔵 {analytics.kpis.activeVehicles} TRIP</div>
                  <div className="text-amber-600">🟡 {analytics.kpis.maintenanceVehicles} SHOP</div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 font-mono">Monthly Revenue Overview</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" stroke="#475569" className="font-mono text-[10px]" />
                      <YAxis stroke="#475569" className="font-mono text-[10px]" />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <Bar dataKey="Revenue" fill="#1E6FEB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 font-mono">Costliest Vehicles</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.topCostliestVehicles}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="reg_no" stroke="#475569" className="font-mono text-[10px]" />
                      <YAxis stroke="#475569" className="font-mono text-[10px]" />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                      <Bar dataKey="operational_cost" name="Op Cost ($)" fill="#E8453C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ROI Formula Display Banner */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-500"></div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider font-bold">Fleet Return on Investment (ROI) Matrix.</h4>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Formula: ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost</p>
              </div>
              <div className="text-[9px] bg-slate-55 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-mono font-bold">
                DATA SYNCHRONIZED AUTOMATICALLY
              </div>
            </div>

            {/* Vehicle Analytics ROI Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Vehicle</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Reg No.</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Acquisition Cost</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Total Revenue</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Operational Cost</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Return (ROI)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {analytics.vehicleAnalyticsList.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-900">{v.name}</td>
                      <td className="p-4 text-xs text-slate-600 font-mono">{v.reg_no}</td>
                      <td className="p-4 text-xs text-slate-500 font-mono">${v.acquisition_cost.toLocaleString()}</td>
                      <td className="p-4 text-xs text-blue-600 font-mono">${v.revenue.toLocaleString()}</td>
                      <td className="p-4 text-xs text-rose-605 font-mono">${v.operational_cost.toLocaleString()}</td>
                      <td className="p-4 text-xs">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${v.roi >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-205' : 'bg-rose-50 text-rose-700 border border-rose-205'}`}>
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
                <span className="text-[10px] text-blue-600 uppercase tracking-widest font-bold font-mono">Logistics Assets</span>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase font-mono">Vehicle Registry.</h1>
              </div>
              <div className="flex gap-2 shrink-0">
                {hasAccess('fleet', 'write') && (
                  <>
                    <button 
                      onClick={() => setShowAddVehicle(true)} 
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest font-mono px-5 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_15px_rgba(37,99,235,0.15)] hover:scale-105"
                    >
                      <Plus className="h-4 w-4" />
                      Add Vehicle
                    </button>
                    <button 
                      onClick={() => setShowAddMaintenance(true)} 
                      className="border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs uppercase tracking-widest font-mono px-5 py-2.5 rounded-full flex items-center gap-2 transition-all duration-300"
                    >
                      Log Service Record
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Rule Banner */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 relative overflow-hidden shadow-sm">
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-blue-500"></div>
              <ShieldAlert className="h-5 w-5 text-blue-600 shrink-0" />
              <span className="text-[11px] text-slate-650 font-mono">
                <strong className="font-semibold text-slate-900 uppercase">SYSTEM POLICY:</strong> Vehicles flagged as <code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-blue-600">Retired</code> or <code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-blue-600">In Shop</code> are excluded from Dispatch options.
              </span>
            </div>

            {/* Vehicles Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Reg. No.</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Model/Name</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Type</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Max Capacity</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Odometer</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Status</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {vehicles.map(v => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-905 font-mono">{v.reg_no}</td>
                      <td className="p-4 text-xs text-slate-800 font-bold">{v.name}</td>
                      <td className="p-4 text-xs text-slate-500 font-mono">{v.type}</td>
                      <td className="p-4 text-xs text-slate-800 font-mono">{v.max_load_capacity.toLocaleString()} kg</td>
                      <td className="p-4 text-xs text-slate-500 font-mono">{v.odometer.toLocaleString()} km</td>
                      <td className="p-4 text-xs">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          v.status === 'Available' ? 'bg-emerald-50 text-emerald-705 border border-emerald-200' :
                          v.status === 'On Trip' ? 'bg-blue-50 text-blue-750 border border-blue-200' :
                          v.status === 'In Shop' ? 'bg-amber-50 text-amber-705 border border-amber-200' :
                          'bg-slate-105 text-slate-600 border border-slate-200'
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
                          className="text-slate-650 hover:text-slate-900 text-[10px] uppercase font-bold font-mono bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full"
                        >
                          History
                        </button>
                        {hasAccess('fleet', 'write') && v.status !== 'Retired' && (
                          <button 
                            onClick={() => retireVehicle(v.id)}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] uppercase font-bold font-mono px-3 py-1 rounded-full"
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
              <h2 className="text-md font-bold uppercase tracking-widest text-slate-500 mb-4 font-mono">Logged Maintenance Records</h2>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Vehicle Reg</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Service Details</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Date Logged</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Cost</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Status</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {maintenance.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-xs font-mono text-slate-900">{m.vehicle_reg}</td>
                        <td className="p-4 text-xs text-slate-800 font-bold">{m.service_type}</td>
                        <td className="p-4 text-xs text-slate-550 font-mono">{m.date}</td>
                        <td className="p-4 text-xs text-slate-800 font-mono">${m.cost.toLocaleString()}</td>
                        <td className="p-4 text-xs">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${m.status === 'Open' ? 'bg-amber-50 text-amber-705 border border-amber-200' : 'bg-slate-105 text-slate-600 border border-slate-200'}`}>
                            {m.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-right">
                          {hasAccess('fleet', 'write') && m.status === 'Open' && (
                            <button 
                              onClick={() => closeMaintenance(m.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-bold font-mono px-3.5 py-1.5 rounded-full transition-all duration-300 hover:scale-105"
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
                <span className="text-[10px] text-blue-600 uppercase tracking-widest font-bold font-mono">Personnel Compliance</span>
                <h1 className="text-2xl font-black tracking-tight text-slate-905 uppercase font-mono font-bold">Drivers & Safety.</h1>
              </div>
              {hasAccess('drivers', 'write') && (
                <button 
                  onClick={() => setShowAddDriver(true)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_15px_rgba(37,99,235,0.15)] hover:scale-105"
                >
                  <Plus className="h-4 w-4" />
                  Add Driver
                </button>
              )}
            </div>

            {/* Drivers list table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Driver Name</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">License No.</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Class</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Expiry Date</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Contact</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Safety Rating</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Duty Status</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {drivers.map(d => {
                    const expired = new Date(d.license_expiry_date) < new Date();
                    const warning = isLicenseExpiringSoon(d.license_expiry_date);

                    return (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-xs font-bold text-slate-905">{d.name}</td>
                        <td className="p-4 text-xs text-slate-505 font-mono">{d.license_no}</td>
                        <td className="p-4 text-xs text-slate-505 font-mono">{d.license_category}</td>
                        <td className="p-4 text-xs font-mono">
                          {expired ? (
                            <span className="text-red-600 font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              {d.license_expiry_date} (Expired)
                            </span>
                          ) : warning ? (
                            <span className="text-amber-600 font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              {d.license_expiry_date} (Expiring)
                            </span>
                          ) : (
                            <span className="text-slate-705">{d.license_expiry_date}</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-605 font-mono">{d.contact_no}</td>
                        <td className="p-4 text-xs">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            d.safety_score >= 85 ? 'bg-emerald-50 text-emerald-705 border border-emerald-200' :
                            d.safety_score >= 60 ? 'bg-amber-50 text-amber-705 border border-amber-200' :
                            'bg-rose-50 text-rose-705 border border-rose-200'
                          }`}>
                            {d.safety_score} PTS
                          </span>
                        </td>
                        <td className="p-4 text-xs">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            d.status === 'Available' ? 'bg-emerald-50 text-emerald-705 border border-emerald-200' :
                            d.status === 'On Trip' ? 'bg-blue-50 text-blue-750 border border-blue-200' :
                            d.status === 'Suspended' ? 'bg-rose-50 text-rose-705 border border-rose-200' :
                            'bg-slate-105 text-slate-600 border border-slate-200'
                          }`}>
                            {d.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-right space-x-2">
                          {hasAccess('drivers', 'write') && (
                            <>
                              <button 
                                onClick={() => { setAdjustScoreDriverId(d.id); setAdjustScoreValue(d.safety_score); }}
                                className="text-slate-650 hover:text-slate-900 text-[10px] uppercase font-bold font-mono bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full"
                              >
                                Adjust
                              </button>
                              <button 
                                onClick={() => toggleDriverSuspension(d.id, d.status)}
                                className={`text-[10px] uppercase font-bold font-mono px-3.5 py-1 rounded-full transition-all border ${
                                  d.status === 'Suspended' 
                                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-750' 
                                    : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
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
                <span className="text-[10px] text-blue-600 uppercase tracking-widest font-bold font-mono">Routing Tower</span>
                <h1 className="text-2xl font-black tracking-tight text-slate-905 uppercase font-mono font-bold">Trips Console.</h1>
              </div>
              {hasAccess('trips', 'write') && (
                <button 
                  onClick={() => setShowCreateTrip(true)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_15px_rgba(37,99,235,0.15)] hover:scale-105"
                >
                  <Plus className="h-4 w-4" />
                  Dispatch New Cargo Trip
                </button>
              )}
            </div>

            {/* List of active board trips */}
            <div className="grid grid-cols-1 gap-4">
              {trips.map(t => (
                <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                  <div className="absolute -top-1 -right-1 w-3 h-3 border-t border-r border-slate-200"></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 font-bold">ROUTE ID: #{t.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                        t.status === 'Draft' ? 'bg-slate-105 text-slate-600 border border-slate-200' :
                        t.status === 'Dispatched' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-md font-black text-slate-900 mt-2 flex items-center gap-2 font-mono uppercase">
                      {t.source} <ArrowRight className="h-4 w-4 text-blue-600" /> {t.destination}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4 text-[11px] text-slate-600 font-mono">
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">Vehicle:</span>
                        <strong className="text-slate-800">{t.vehicle_name} ({t.vehicle_reg})</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">Driver Assigned:</span>
                        <strong className="text-slate-800">{t.driver_name || 'UNASSIGNED'}</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">Cargo Payload:</span>
                        <strong className="text-slate-800">{t.cargo_weight.toLocaleString()} kg</strong>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase font-bold">Total Distance:</span>
                        <strong className="text-slate-800">{t.planned_distance.toLocaleString()} km</strong>
                      </div>
                    </div>
                  </div>

                  {/* Trip Execution Controls */}
                  <div className="flex gap-2 self-stretch md:self-auto justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                    {hasAccess('trips', 'write') && t.status === 'Draft' && (
                      <>
                        <button 
                          onClick={() => dispatchTrip(t.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase font-mono tracking-wider px-4 py-2 rounded-full transition-all"
                        >
                          Execute Dispatch
                        </button>
                        <button 
                          onClick={() => cancelTrip(t.id)}
                          className="border border-slate-300 hover:border-slate-400 text-slate-700 text-[10px] uppercase font-mono tracking-wider px-4 py-2 rounded-full transition-all"
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
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-705 text-[10px] uppercase font-mono tracking-wider px-4 py-2 rounded-full transition-all"
                        >
                          Abort
                        </button>
                      </>
                    )}

                    {t.status === 'Completed' && (
                      <div className="text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded">
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
                <span className="text-[10px] text-blue-600 uppercase tracking-widest font-bold font-mono">Financial Ledger</span>
                <h1 className="text-2xl font-black tracking-tight text-slate-905 uppercase font-mono font-bold">Expenses & Fuel.</h1>
              </div>
              {hasAccess('expenses', 'write') && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAddFuel(true)} 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_15px_rgba(37,99,235,0.15)] hover:scale-105"
                  >
                    <Plus className="h-4 w-4" />
                    Log Fuel Purchase
                  </button>
                  <button 
                    onClick={() => setShowAddExpense(true)} 
                    className="border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full flex items-center gap-2 transition-all duration-305"
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
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3 font-mono">Refueling Logs</h3>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Vehicle</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Date</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Liters</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {fuelLogs.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 text-xs font-mono text-slate-900">{f.vehicle_reg}</td>
                          <td className="p-4 text-xs text-slate-500 font-mono">{f.date}</td>
                          <td className="p-4 text-xs text-slate-805 font-mono">{f.liters} L</td>
                          <td className="p-4 text-xs text-blue-600 font-mono">${f.cost.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* General Expenses Table */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3 font-mono">Operating Expenses Ledger</h3>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Vehicle</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Tolls</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Maint. Cost</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Other</th>
                        <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 text-xs font-mono text-slate-900">{e.vehicle_reg}</td>
                          <td className="p-4 text-xs text-slate-505 font-mono">${(e.toll || 0).toLocaleString()}</td>
                          <td className="p-4 text-xs text-slate-505 font-mono">${(e.maintenance_cost || 0).toLocaleString()}</td>
                          <td className="p-4 text-xs text-slate-505 font-mono">${(e.other || 0).toLocaleString()}</td>
                          <td className="p-4 text-xs font-bold text-rose-600 font-mono">${e.total.toLocaleString()}</td>
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
          <div className="max-w-2xl mx-auto space-y-6 text-left">
            <div className="bg-gradient-to-r from-purple-100 to-indigo-50 border border-purple-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-purple-400"></div>
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-purple-400"></div>

              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-purple-600 text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest font-mono">Driver Portal</span>
                  <h1 className="text-xl font-black mt-2 text-purple-950 font-mono uppercase font-bold">Active Assigned Route.</h1>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-purple-605 font-mono uppercase font-bold">License class</div>
                  <div className="text-xs font-bold text-slate-800 font-mono">HEAVY TRANSPORT (VALID)</div>
                </div>
              </div>

              {/* Driver Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 bg-white p-4 rounded-xl border border-purple-100">
                <div className="text-center">
                  <div className="text-[9px] text-purple-600 uppercase font-mono font-bold">Safety Score</div>
                  <div className="text-md font-black text-emerald-600 mt-1 font-mono">94.5 / 100</div>
                </div>
                <div className="text-center border-x border-purple-105">
                  <div className="text-[9px] text-purple-600 uppercase font-mono font-bold">Assigned Truck</div>
                  <div className="text-md font-black text-slate-800 mt-1 font-mono">Tata Prima</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-purple-600 uppercase font-mono font-bold">Plate ID</div>
                  <div className="text-md font-black text-slate-800 mt-1 font-mono">MH12QW1234</div>
                </div>
              </div>
            </div>

            {/* Current Trip Details */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 font-mono">Assigned Active Dispatch</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-mono">Route Direction</span>
                    <strong className="text-xs text-slate-800 font-mono uppercase">Mumbai Depo ➔ Delhi NCR Central</strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] text-slate-400 uppercase font-mono">Cargo Payload</span>
                    <strong className="text-xs text-slate-800 font-mono">14,200 kg</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="block text-[9px] text-slate-400 uppercase font-mono">Trip Status</span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <span className="text-xs text-emerald-605 font-mono uppercase font-bold">Dispatched</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] text-slate-400 font-mono uppercase">Planned distance</span>
                    <strong className="text-xs font-mono text-slate-800">1,410 km</strong>
                  </div>
                </div>

                {/* Emergency Section */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-2">
                  <h4 className="text-xs font-bold text-rose-605 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Broadcasting Panic Alert SOS
                  </h4>
                  <p className="text-[11px] text-rose-805 mt-1 font-mono">Clicking below triggers immediate alert signals at the central operations room.</p>
                  <button 
                    onClick={() => alert('SOS emergency trigger dispatched to operations tower safety room.')}
                    className="bg-red-600 hover:bg-red-700 text-white text-[10px] uppercase font-bold font-mono tracking-wider px-4 py-2 rounded-full mt-3 transition-colors"
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
          <div className="space-y-6 max-w-4xl text-left">
            <div>
              <span className="text-[10px] text-blue-605 uppercase tracking-widest font-bold font-mono">System Policy</span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase font-mono">Settings & Access.</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Config Form */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 font-mono font-bold">Depot Configurations</h3>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-2">Primary Depot Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 focus:outline-none font-mono text-xs" defaultValue="TransitOps HQ - Terminal A" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-2">Distance Unit</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none font-mono text-xs">
                      <option>Kilometers (km)</option>
                      <option>Miles (mi)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-2">Currency Symbol</label>
                    <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none font-mono text-xs">
                      <option>USD ($)</option>
                      <option>INR (₹)</option>
                    </select>
                  </div>
                </div>
                <button onClick={() => alert('Global configurations updated successfully')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest font-mono px-5 py-2.5 rounded-full transition-all">
                  Save Configurations
                </button>
              </div>

              {/* RBAC read only matrix */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 font-mono mb-3 font-bold">RBAC Matrix Permissions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-slate-400 font-bold uppercase font-mono">Role</th>
                        <th className="p-2.5 text-slate-400 font-bold uppercase font-mono">Fleet</th>
                        <th className="p-2.5 text-slate-400 font-bold uppercase font-mono">Drivers</th>
                        <th className="p-2.5 text-slate-400 font-bold uppercase font-mono">Trips</th>
                        <th className="p-2.5 text-slate-400 font-bold uppercase font-mono">Expenses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-mono bg-white">
                      <tr>
                        <td className="p-2.5 font-bold text-blue-600">Fleet Manager</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Full</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Full</td>
                        <td className="p-2.5 text-slate-300">—</td>
                        <td className="p-2.5 text-slate-300">—</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-blue-600">Dispatcher</td>
                        <td className="p-2.5 text-amber-600 font-bold">View</td>
                        <td className="p-2.5 text-slate-300">—</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Full</td>
                        <td className="p-2.5 text-slate-300">—</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-blue-600">Safety Officer</td>
                        <td className="p-2.5 text-slate-300">—</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Full</td>
                        <td className="p-2.5 text-amber-600 font-bold">View</td>
                        <td className="p-2.5 text-slate-300">—</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-blue-600">Financial Analyst</td>
                        <td className="p-2.5 text-amber-605 font-bold">View</td>
                        <td className="p-2.5 text-slate-300">—</td>
                        <td className="p-2.5 text-slate-300">—</td>
                        <td className="p-2.5 text-emerald-600 font-bold">Full</td>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-600"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-600"></div>

            <button onClick={() => setShowAddVehicle(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-900 mb-6 font-mono flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Register New Fleet Vehicle.
            </h2>
            <form onSubmit={addVehicle} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Registration Number</label>
                <input 
                  type="text" required value={vehicleForm.reg_no} 
                  onChange={(e) => setVehicleForm({ ...vehicleForm, reg_no: e.target.value })}
                  placeholder="e.g. MH12QW1234"
                  className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Model Name</label>
                  <input 
                    type="text" required value={vehicleForm.name} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                    placeholder="Tata Prima"
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Type</label>
                  <select 
                    value={vehicleForm.type}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
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
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Capacity (kg)</label>
                  <input 
                    type="number" required value={vehicleForm.max_load_capacity} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, max_load_capacity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Odometer (km)</label>
                  <input 
                    type="number" required value={vehicleForm.odometer} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, odometer: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Cost ($)</label>
                  <input 
                    type="number" required value={vehicleForm.acquisition_cost} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, acquisition_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Register Vehicle Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Add Driver */}
      {showAddDriver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-600"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-600"></div>

            <button onClick={() => setShowAddDriver(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-900 mb-6 font-mono flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Register Dispatch Driver.
            </h2>
            <form onSubmit={addDriver} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Driver Full Name</label>
                <input 
                  type="text" required value={driverForm.name} 
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  placeholder="John Smith"
                  className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">License Number</label>
                  <input 
                    type="text" required value={driverForm.license_no} 
                    onChange={(e) => setDriverForm({ ...driverForm, license_no: e.target.value })}
                    placeholder="DL-1420180099"
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">License Class</label>
                  <select 
                    value={driverForm.license_category}
                    onChange={(e) => setDriverForm({ ...driverForm, license_category: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
                  >
                    <option value="Heavy Transport">Heavy Transport</option>
                    <option value="Light Commercial">Light Commercial</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Expiry Date</label>
                  <input 
                    type="date" required value={driverForm.license_expiry_date} 
                    onChange={(e) => setDriverForm({ ...driverForm, license_expiry_date: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-805 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Contact Number</label>
                  <input 
                    type="text" required value={driverForm.contact_no} 
                    onChange={(e) => setDriverForm({ ...driverForm, contact_no: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Register Driver Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Adjust Safety Score */}
      {adjustScoreDriverId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-sm shadow-2xl relative text-left">
            <button onClick={() => setAdjustScoreDriverId(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-700 mb-6 font-mono flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Adjust Driver Safety Rating
            </h2>
            <form onSubmit={adjustSafetyScore} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">New Safety Score Points</label>
                <input 
                  type="number" step="0.1" max="100" min="0" required value={adjustScoreValue} 
                  onChange={(e) => setAdjustScoreValue(e.target.value)}
                  className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-lg shadow-2xl relative text-left">
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-600"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-600"></div>

            <button onClick={() => setShowCreateTrip(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-900 mb-6 font-mono flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              Plan Cargo Dispatch Trip.
            </h2>
            <form onSubmit={createTrip} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Source City</label>
                  <input 
                    type="text" required value={tripForm.source} 
                    onChange={(e) => setTripForm({ ...tripForm, source: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Destination City</label>
                  <input 
                    type="text" required value={tripForm.destination} 
                    onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
                    placeholder="e.g. Delhi NCR"
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Cargo Weight (kg)</label>
                  <input 
                    type="number" required value={tripForm.cargo_weight} 
                    onChange={(e) => setTripForm({ ...tripForm, cargo_weight: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-850 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Planned Distance (km)</label>
                  <input 
                    type="number" required value={tripForm.planned_distance} 
                    onChange={(e) => setTripForm({ ...tripForm, planned_distance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-850 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Select Vehicle (Available)</label>
                  <select 
                    required value={tripForm.vehicle_id}
                    onChange={(e) => setTripForm({ ...tripForm, vehicle_id: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
                  >
                    <option value="">-- Choose Available --</option>
                    {vehicles.filter(v => v.status === 'Available').map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.reg_no}) [Max: {v.max_load_capacity} kg]</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Select Driver (Available)</label>
                  <select 
                    required value={tripForm.driver_id}
                    onChange={(e) => setTripForm({ ...tripForm, driver_id: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
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
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-650 text-xs flex gap-2 font-mono">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span><strong>Weight Overload Alert:</strong> Cargo weight exceeds vehicle's maximum carrying capacity of {selectedVehicle.max_load_capacity} kg. This trip cannot be dispatched.</span>
                      </div>
                    );
                  }
                })()
              )}

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Save Trip as Draft
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Log Service Record */}
      {showAddMaintenance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button onClick={() => setShowAddMaintenance(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-900 mb-6 font-mono flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600 animate-spin" />
              Log Vehicle Service Record.
            </h2>
            <form onSubmit={addMaintenance} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Select Vehicle</label>
                <select 
                  required value={maintenanceForm.vehicle_id}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicle_id: e.target.value })}
                  className="w-full bg-slate-55 border border-slate-200 text-slate-705 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'Retired').map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.reg_no}) [{v.status}]</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Service Details</label>
                <input 
                  type="text" required value={maintenanceForm.service_type} 
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, service_type: e.target.value })}
                  placeholder="e.g. Brake Replacement"
                  className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Service Cost ($)</label>
                  <input 
                    type="number" required value={maintenanceForm.cost} 
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Service Date</label>
                  <input 
                    type="date" required value={maintenanceForm.date} 
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Commit & Log Service
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Complete Trip Form Details */}
      {activeCompleteTripModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button onClick={() => setActiveCompleteTripModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-900 mb-6 font-mono flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Complete Active Trip Operations.
            </h2>
            <form onSubmit={completeTrip} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px] text-slate-550 space-y-1 font-mono">
                <div>Trip ID: #{activeCompleteTripModal.id} ({activeCompleteTripModal.source} ➔ {activeCompleteTripModal.destination})</div>
                <div>Assigned Vehicle: {activeCompleteTripModal.vehicle_name} ({activeCompleteTripModal.vehicle_reg})</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Final Odometer (km)</label>
                  <input 
                    type="number" required value={completeTripForm.final_odometer} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, final_odometer: parseFloat(e.target.value) || '' })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Fuel Consumed (Liters)</label>
                  <input 
                    type="number" required value={completeTripForm.fuel_consumed} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, fuel_consumed: parseFloat(e.target.value) || '' })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Trip Revenue Earned ($)</label>
                <input 
                  type="number" required value={completeTripForm.revenue} 
                  onChange={(e) => setCompleteTripForm({ ...completeTripForm, revenue: parseFloat(e.target.value) || '' })}
                  className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Highway Tolls ($)</label>
                  <input 
                    type="number" value={completeTripForm.toll_expense} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, toll_expense: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Other Incidentals ($)</label>
                  <input 
                    type="number" value={completeTripForm.other_expense} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, other_expense: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-750 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Log Completion & Update Stats
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Log Fuel Purchase */}
      {showAddFuel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button onClick={() => setShowAddFuel(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-700 mb-6 font-mono flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Log Fuel Purchase Receipt.
            </h2>
            <form onSubmit={addFuel} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Select Vehicle</label>
                <select 
                  required value={fuelForm.vehicle_id}
                  onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })}
                  className="w-full bg-slate-55 border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'Retired').map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.reg_no})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Purchase Date</label>
                  <input 
                    type="date" required value={fuelForm.date} 
                    onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-205 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Liters Refueled</label>
                  <input 
                    type="number" step="0.01" required value={fuelForm.liters} 
                    onChange={(e) => setFuelForm({ ...fuelForm, liters: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-805 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Total Cost Paid ($)</label>
                <input 
                  type="number" required value={fuelForm.cost} 
                  onChange={(e) => setFuelForm({ ...fuelForm, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-55 border border-slate-200 text-slate-700 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Record Fuel Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Log General Expense */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button onClick={() => setShowAddExpense(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-655"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-705 mb-6 font-mono flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Add Incidentals / Toll Expense.
            </h2>
            <form onSubmit={addExpense} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Select Vehicle</label>
                <select 
                  required value={expenseForm.vehicle_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })}
                  className="w-full bg-slate-55 border border-slate-200 text-slate-750 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter(v => v.status !== 'Retired').map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.reg_no})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Toll Cost ($)</label>
                  <input 
                    type="number" value={expenseForm.toll} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, toll: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Other Incidentals ($)</label>
                  <input 
                    type="number" value={expenseForm.other} 
                    onChange={(e) => setExpenseForm({ ...expenseForm, other: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-805 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all mt-4">
                Record Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Vehicle History & Details */}
      {selectedVehicleHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] overflow-y-auto text-left">
            <button onClick={() => setSelectedVehicleHistory(null)} className="absolute top-4 right-4 text-slate-405 hover:text-slate-655"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-900 mb-2 font-mono flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Vehicle Operational Log & History.
            </h2>
            <div className="text-xs text-slate-505 font-mono mb-6">{selectedVehicleHistory.vehicle.name} ({selectedVehicleHistory.vehicle.reg_no})</div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-550 uppercase tracking-widest mb-2 font-mono">Trip logs History</h3>
                {selectedVehicleHistory.trips.length === 0 ? (
                  <p className="text-[10px] text-slate-405 font-mono">No past or active trips logged for this vehicle.</p>
                ) : (
                  <div className="bg-slate-50 border border-slate-205 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Trip ID</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-550 font-mono font-bold">Route</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-550 font-mono font-bold">Status</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-550 font-mono font-bold">Cargo Weight</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[11px] bg-white">
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
                <h3 className="text-xs font-bold text-slate-550 uppercase tracking-widest mb-2 font-mono">Service Maintenance History</h3>
                {selectedVehicleHistory.maintenance.length === 0 ? (
                  <p className="text-[10px] text-slate-450 font-mono">No service records registered for this vehicle.</p>
                ) : (
                  <div className="bg-slate-50 border border-slate-205 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-205">
                        <tr>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Service Type</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Date Logged</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Cost</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-205 font-mono text-[11px] bg-white">
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
