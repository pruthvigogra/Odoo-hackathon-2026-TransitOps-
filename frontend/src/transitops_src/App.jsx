import React, { useState, useEffect } from 'react';
import { 
  Truck, Users, Navigation, DollarSign, BarChart3, Settings, 
  Plus, LogOut, ShieldAlert, CheckCircle2, AlertTriangle, X, 
  Lock, ArrowRight, Activity, Zap, FileSpreadsheet, Eye, Play, Phone, Check, Search, Bell
} from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000/api';
const socket = io('http://localhost:5000');

export default function App() {
  // App View Mode: 'landing', 'login', or 'app' (after login)
  const [view, setView] = useState('landing');

  // Authentication State (disabled for embedded view)
  const [token, setToken] = useState('');
  const [user, setUser] = useState({ role: 'Fleet Manager' });
  
  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Fleet Manager');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Core Platform Data State
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [deviationAlerts, setDeviationAlerts] = useState([]);
  const [idleEvents, setIdleEvents] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);

  // Live GPS tracking coordinates map (tripId => coordinates object)
  const [liveLocations, setLiveLocations] = useState({});

  // Active tab inside app dashboard
  const [activeTab, setActiveTab] = useState('dashboard');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

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

  // Fleet Manager vehicle edit state
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Dashboard KPI filters
  const [kpiFilterType, setKpiFilterType] = useState('All');
  const [kpiFilterStatus, setKpiFilterStatus] = useState('All');
  const [kpiFilterRegion, setKpiFilterRegion] = useState('All');

  // Fetch initial system data
  const fetchData = async () => {
    try {
      const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

      const vRes = await fetch(`${API_BASE}/vehicles`, { headers: authHeader });
      setVehicles(await vRes.json());

      const dRes = await fetch(`${API_BASE}/drivers`, { headers: authHeader });
      setDrivers(await dRes.json());

      const tRes = await fetch(`${API_BASE}/trips`, { headers: authHeader });
      setTrips(await tRes.json());

      const mRes = await fetch(`${API_BASE}/maintenance`, { headers: authHeader });
      setMaintenance(await mRes.json());

      const fRes = await fetch(`${API_BASE}/fuel`, { headers: authHeader });
      setFuelLogs(await fRes.json());

      const eRes = await fetch(`${API_BASE}/expenses`, { headers: authHeader });
      setExpenses(await eRes.json());

      const aRes = await fetch(`${API_BASE}/reports/analytics`, { headers: authHeader });
      setAnalytics(await aRes.json());

      const rRes = await fetch(`${API_BASE}/routes`, { headers: authHeader });
      setRoutes(await rRes.json());

      const devRes = await fetch(`${API_BASE}/deviation-alerts`, { headers: authHeader });
      setDeviationAlerts(await devRes.json());

      const idlRes = await fetch(`${API_BASE}/idle-events`, { headers: authHeader });
      setIdleEvents(await idlRes.json());

      const altRes = await fetch(`${API_BASE}/alerts?role=${user?.role || ''}`, { headers: authHeader });
      setSystemAlerts(await altRes.json());
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

  // Real-time Socket.IO subscriptions
  useEffect(() => {
    socket.on('alert:new', (newAlert) => {
      // Role filtering client-side
      const role = user?.role;
      let shouldAdd = false;
      if (role === 'Financial Analyst' && ['fuel_theft', 'missed_toll'].includes(newAlert.type)) shouldAdd = true;
      else if (role === 'Safety Officer' && ['route_deviation', 'driver_sos'].includes(newAlert.type)) shouldAdd = true;
      else if (role === 'Fleet Manager' && ['route_deviation', 'long_idle', 'maintenance_due'].includes(newAlert.type)) shouldAdd = true;
      else if (role === 'Dispatcher') shouldAdd = true;

      if (shouldAdd) {
        setSystemAlerts(prev => [newAlert, ...prev]);
      }
      fetchData(); // Trigger background sync to keep tables in check
    });

    socket.on('trip:dispatched', () => {
      fetchData();
    });

    socket.on('trip:completed', () => {
      fetchData();
    });

    socket.on('vehicles:changed', () => {
      fetchData();
    });

    socket.on('drivers:changed', () => {
      fetchData();
    });

    socket.on('trips:changed', () => {
      fetchData();
    });

    socket.on('maintenance:changed', () => {
      fetchData();
    });

    return () => {
      socket.off('alert:new');
      socket.off('trip:dispatched');
      socket.off('trip:completed');
      socket.off('vehicles:changed');
      socket.off('drivers:changed');
      socket.off('trips:changed');
      socket.off('maintenance:changed');
    };
  }, [user]);

  // Dynamic Live GPS map update binding
  useEffect(() => {
    trips.forEach(t => {
      if (t.status === 'In Progress') {
        socket.on(`gps:${t.id}`, (ping) => {
          setLiveLocations(prev => ({
            ...prev,
            [t.id]: ping
          }));
        });
      }
    });

    return () => {
      trips.forEach(t => {
        socket.off(`gps:${t.id}`);
      });
    };
  }, [trips]);

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
        setErrorMsg(data.error || 'Authentication failed');
        return;
      }

      setToken(data.token);
      setUser(data.user);
      if (rememberMe) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      setView('app');

      // Set default tabs based on roles
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

  const editVehicle = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editingVehicle)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingVehicle(null);
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

  const acknowledgeAlert = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/deviation-alerts/${id}/acknowledge`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to acknowledge alert');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const escalateIdle = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/idle-events/${id}/escalate`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to escalate idle event');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const isLicenseExpiringSoon = (expiryStr) => {
    const today = new Date();
    const expiry = new Date(expiryStr);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const getFilteredVehicles = () => {
    return vehicles.filter(v => {
      const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.reg_no.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All Statuses' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
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
                <a href="#contact" className="border border-gray-655 text-white px-8 py-3.5 rounded-full font-medium text-base hover:bg-white/5 transition flex items-center space-x-2">
                  <span>Watch demo</span>
                </a>
              </div>
            </div>

            {/* Right Dashboard Column */}
            <div className="lg:col-span-6 w-full flex justify-center items-center relative">
              <div className="relative p-3 w-full max-w-lg aspect-[4/3] rounded-sm">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400"></div>
                
                <div className="w-full h-full rounded-md overflow-hidden relative shadow-2xl bg-zinc-900">
                  <img 
                    src="/motive_hero_vehicles.png" 
                    alt="Operational site view" 
                    className="w-full h-full object-cover filter brightness-75 contrast-125" 
                  />
                  <div className="absolute top-1/4 left-1/3 w-32 h-24 border-2 border-blue-500/80 bg-blue-500/10"></div>
                  
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

          <div className="w-full pb-8"></div>
        </div>
      </div>
    );
  }

  // ---------------- AUTHENTICATION UI (Split Screen 40/60) ----------------
  if (view === 'login') {
    return (
      <div className="min-h-screen w-full flex flex-col md:flex-row antialiased font-sans bg-white overflow-hidden">
        
        {/* Left Panel: 40% Width - Signature deep dark mode (#090A0C) */}
        <div className="w-full md:w-[40%] bg-[#090A0C] text-white p-12 lg:p-16 flex flex-col justify-between shrink-0 relative text-left">
          <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="space-y-8 relative z-10">
            <div className="w-12 h-12 bg-gradient-to-b from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              <svg className="w-6 h-6 text-white opacity-95" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
              </svg>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold tracking-[-0.04em] text-white uppercase">
                Transit<span className="text-blue-500">ops</span>
              </h1>
            </div>
          </div>

          <div className="my-auto py-16 space-y-6 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 block">
              Scoped Workspace Portals
            </span>
            <ul className="space-y-4 text-sm font-medium">
              <li className="flex items-center space-x-3 group cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                <span className="text-zinc-300 transition duration-200">Fleet Manager</span>
              </li>
              <li className="flex items-center space-x-3 group cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                <span className="text-zinc-300 transition duration-200">Dispatcher</span>
              </li>
              <li className="flex items-center space-x-3 group cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                <span className="text-zinc-300 transition duration-200">Safety Officer</span>
              </li>
              <li className="flex items-center space-x-3 group cursor-default">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                <span className="text-zinc-300 transition duration-200">Financial Analyst</span>
              </li>
            </ul>
          </div>

          <div className="text-[10px] font-medium tracking-[0.05em] text-zinc-600 uppercase relative z-10">
            &copy; 2026 TransitOps Operations Core. Secured by TLS 1.3
          </div>
        </div>

        {/* Right Panel: 60% Width - Apple-inspired minimalist light background (#FFFFFF) */}
        <div className="w-full md:w-[60%] bg-white p-8 lg:p-16 flex items-center justify-center overflow-y-auto relative text-left">
          
          <div className="max-w-md w-full space-y-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Sign in to control tower</h2>
              <p className="text-xs font-medium text-gray-400 mt-1">Enter credentials below to access security module workspace.</p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-755 px-4 py-3 rounded-xl text-xs flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="role" className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block font-mono">Role (RBAC)</label>
                <div className="relative">
                  <select 
                    id="role"
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition appearance-none cursor-pointer"
                  >
                    <option value="Fleet Manager">Fleet Manager</option>
                    <option value="Dispatcher">Dispatcher</option>
                    <option value="Safety Officer">Safety Officer</option>
                    <option value="Financial Analyst">Financial Analyst</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block font-mono">Email Address</label>
                <input 
                  type="email" 
                  id="email"
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@transitops.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 bg-white placeholder-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block font-mono">Security Password</label>
                <input 
                  type="password" 
                  id="password"
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 bg-white placeholder-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500/20 cursor-pointer" 
                  />
                  <label htmlFor="remember" className="text-xs font-medium text-gray-500 select-none cursor-pointer">Remember session</label>
                </div>
                <a href="#" onClick={() => alert('Credential reset must go through HQ.')} className="text-xs font-semibold text-blue-600 hover:underline transition">Forgot password?</a>
              </div>

              <div className="space-y-3 pt-2">
                <button 
                  type="submit" 
                  className="w-full bg-[#F59E0B] hover:bg-[#E08E00] text-white font-bold tracking-wider text-xs uppercase py-3.5 px-4 rounded-full transition shadow-md shadow-amber-500/10 flex items-center justify-center space-x-2"
                >
                  <span>Sign In To System</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>

                <button 
                  type="button"
                  onClick={() => setView('landing')}
                  className="w-full border border-gray-200 hover:bg-gray-50 text-gray-650 font-bold tracking-wider text-xs uppercase py-3.5 px-4 rounded-full transition"
                >
                  Return To Landing
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    );
  }

  const getFilteredDashboardKPIs = () => {
    if (!analytics) return null;
    
    const filteredVehicles = vehicles.filter(v => {
      const matchType = kpiFilterType === 'All' || v.type === kpiFilterType;
      const matchStatus = kpiFilterStatus === 'All' || v.status === kpiFilterStatus;
      
      let regionName = 'Other';
      if (v.reg_no.startsWith('MH')) regionName = 'West (MH)';
      else if (v.reg_no.startsWith('DL')) regionName = 'North (DL)';
      else if (v.reg_no.startsWith('KA')) regionName = 'South (KA)';
      else if (v.reg_no.startsWith('HR')) regionName = 'East (HR)';
      const matchRegion = kpiFilterRegion === 'All' || regionName === kpiFilterRegion;
      
      return matchType && matchStatus && matchRegion;
    });

    const activeVehicles = filteredVehicles.filter(v => v.status === 'On Trip').length;
    const availableVehicles = filteredVehicles.filter(v => v.status === 'Available').length;
    const maintenanceVehicles = filteredVehicles.filter(v => v.status === 'In Shop').length;
    const totalVehicles = filteredVehicles.filter(v => v.status !== 'Retired').length;
    const utilization = totalVehicles > 0 ? ((activeVehicles / totalVehicles) * 100).toFixed(1) : 0;

    const vehicleIds = filteredVehicles.map(v => v.id);
    const filteredMaint = maintenance.filter(m => vehicleIds.includes(m.vehicle_id));
    const maintCost = filteredMaint.reduce((sum, m) => sum + m.cost, 0);

    const filteredFuel = fuelLogs.filter(f => vehicleIds.includes(f.vehicle_id));
    const fuelCost = filteredFuel.reduce((sum, f) => sum + f.cost, 0);
    const opCost = maintCost + fuelCost;

    const filteredTrips = trips.filter(t => vehicleIds.includes(t.vehicle_id) && t.status === 'Completed');
    const totalDist = filteredTrips.reduce((sum, t) => sum + t.planned_distance, 0);
    const totalLiters = filteredFuel.reduce((sum, f) => sum + f.liters, 0);
    const efficiency = totalLiters > 0 ? (totalDist / totalLiters).toFixed(2) : 0;

    return {
      activeVehicles,
      availableVehicles,
      maintenanceVehicles,
      fleetUtilization: utilization,
      fuelEfficiency: efficiency,
      totalOpCost: opCost
    };
  };

  const kpiData = getFilteredDashboardKPIs() || (analytics?.kpis || {
    activeVehicles: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    fleetUtilization: 0,
    fuelEfficiency: 0,
    totalOpCost: 0
  });

  // ---------------- MAIN CONSOLE DASHBOARD VIEW (Apple-Style Light Dashboard Workspace) ----------------
  return (
    <div className="min-h-screen bg-[#F9FAFC] text-gray-900 antialiased flex flex-col md:flex-row relative transition-all duration-300 ease-in-out font-sans">
      
      {/* 1. SIDEBAR NAVIGATION (LEFT PANEL) */}
      <aside className="w-full md:w-64 bg-[#FFFFFF] text-gray-700 flex flex-col justify-between border-r border-[#E5E7EB] shrink-0 relative z-20 shadow-sm">
        <div>
          {/* Top Branding Section */}
          <div className="px-6 py-6 border-b border-[#E5E7EB] flex items-center space-x-3 bg-white">
            <div className="w-10 h-10 bg-gradient-to-b from-[#0084E6] to-[#0070C9] rounded-xl flex items-center justify-center shadow-md shadow-blue-500/10">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold tracking-tight text-gray-900 font-sans uppercase">TRANSITOPS</span>
              <span className="text-[9px] font-bold text-[#0084E6] tracking-wider uppercase font-mono">FLEET PORTAL</span>
            </div>
          </div>

          {/* Menu Styling Section */}
          <div className="px-4 py-6">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 px-3 block mb-3 font-mono">Operations Console</span>
            <nav className="space-y-1.5">
              {user?.role === 'Fleet Manager' ? (
                <>
                  <button 
                    onClick={() => setActiveTab('dashboard')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'dashboard' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <BarChart3 className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Dashboard</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('vehicles')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'vehicles' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <Truck className={`w-4 h-4 ${activeTab === 'vehicles' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Fleet</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('maintenance')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'maintenance' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'maintenance' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Maintenance</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('drivers')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'drivers' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <Users className={`w-4 h-4 ${activeTab === 'drivers' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Drivers</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('reports')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'reports' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <Activity className={`w-4 h-4 ${activeTab === 'reports' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Analytics</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('settings')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'settings' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Settings</span>
                  </button>
                </>
              ) : user?.role === 'Dispatcher' ? (
                <>
                  <button 
                    onClick={() => setActiveTab('dashboard')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'dashboard' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <BarChart3 className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Dashboard</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('trips')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'trips' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <Navigation className={`w-4 h-4 ${activeTab === 'trips' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Trips</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('vehicles')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'vehicles' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <Truck className={`w-4 h-4 ${activeTab === 'vehicles' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Fleet (View-only)</span>
                  </button>
                </>
              ) : user?.role === 'Safety Officer' ? (
                <>
                  <button 
                    onClick={() => setActiveTab('dashboard')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'dashboard' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <BarChart3 className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Dashboard</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('drivers')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'drivers' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <Users className={`w-4 h-4 ${activeTab === 'drivers' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Drivers & Safety</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('trips')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'trips' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <Navigation className={`w-4 h-4 ${activeTab === 'trips' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Trips (View-only)</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setActiveTab('dashboard')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'dashboard' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <BarChart3 className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Dashboard</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('expenses')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'expenses' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <DollarSign className={`w-4 h-4 ${activeTab === 'expenses' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Expenses & Fuel</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('vehicles')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'vehicles' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <Truck className={`w-4 h-4 ${activeTab === 'vehicles' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Fleet Registry</span>
                  </button>

                  <button 
                    onClick={() => setActiveTab('reports')} 
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left font-medium text-xs transition-all duration-300 uppercase tracking-wider font-mono ${
                      activeTab === 'reports' 
                        ? 'bg-gradient-to-r from-[#0084E6] to-[#0070C9] text-white shadow-md shadow-blue-500/10' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/60'
                    }`}
                  >
                    <Activity className={`w-4 h-4 ${activeTab === 'reports' ? 'text-white' : 'text-gray-400'}`} />
                    <span>Financial Reports</span>
                  </button>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Footer Segment */}
        <div className="p-4 border-t border-[#E5E7EB] bg-white space-y-4">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
            <span className="font-semibold">Compliance Alerts</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-650"></span>
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#0084E6] rounded-full flex items-center justify-center font-bold text-xs uppercase text-white font-mono">
                {user.name ? user.name.slice(0, 2) : 'OP'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-gray-800 block truncate w-24">{user.name}</span>
                <span className="text-[10px] text-gray-400 truncate w-24">{user.role}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="text-red-555 hover:text-red-700 transition duration-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN DATA CANVAS (RIGHT PANEL WORKSPACE) */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen relative text-left bg-[#F9FAFC]">
        {/* Subtle Low-Opacity Blueprints sketch watermark */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' stroke='%23000' stroke-width='1.5' fill='none'/%3E%3Cpath d='M50 0 v100 M0 50 h100 M18 18 l64 64 M18 82 l64 -64' stroke='%23000' stroke-width='1'/%3E%3Ccircle cx='50' cy='50' r='20' stroke='%23000' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '300px 300px'
        }}></div>

        <div className="relative z-10 space-y-6">
          
          {/* Top Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200/60 pb-6">
            <div className="text-left">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">+ Fleet Vehicle Configuration</h2>
              <p className="text-sm text-gray-400 mt-1">Configure GPS tracking, FASTag IDs, and audit expiration logs for all trucks.</p>
            </div>
            {hasAccess('fleet', 'write') && (
              <button 
                onClick={() => setShowAddVehicle(true)}
                className="bg-[#0084E6] hover:bg-[#0070C9] text-white font-bold text-xs uppercase tracking-wider font-mono px-5 py-2.5 rounded-full shadow-md shadow-blue-500/10 transition-all duration-300 hover:scale-102 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Register Vehicle
              </button>
            )}
          </div>

          {/* Expiry Warning Banner */}
          <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-2xl p-4 flex items-start gap-3 relative overflow-hidden shadow-sm">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 font-mono leading-relaxed text-left w-full">
              <strong className="font-bold uppercase block mb-1">SYSTEM AUDIT NOTICE:</strong>
              1 driver license document is expiring within 30 days. Please inspect personnel profiles under the Drivers tab to ensure compliance updates.
            </div>
          </div>

          {/* ================= TAB WORKSPACES ================= */}
          
          {/* Dashboard Metrics */}
          {activeTab === 'dashboard' && analytics && (
            <div className="space-y-6">
              
              {user?.role === 'Dispatcher' ? (
                <>
                  {/* Dispatcher Dashboard Panel */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                    <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-t-4 border-blue-500 flex flex-col justify-between min-h-[120px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Today's Trips</span>
                      <span className="text-2xl font-black text-gray-950 font-mono mt-1">{trips.length}</span>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-t-4 border-amber-500 flex flex-col justify-between min-h-[120px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Pending Trips</span>
                      <span className="text-2xl font-black text-gray-950 font-mono mt-1">{trips.filter(t => t.status === 'Draft').length}</span>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-t-4 border-emerald-500 flex flex-col justify-between min-h-[120px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Active Trips</span>
                      <span className="text-2xl font-black text-gray-950 font-mono mt-1">{trips.filter(t => t.status === 'In Progress').length}</span>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-t-4 border-purple-500 flex flex-col justify-between min-h-[120px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Drivers On Duty</span>
                      <span className="text-2xl font-black text-gray-950 font-mono mt-1">{drivers.filter(d => d.status === 'On Trip').length}</span>
                    </div>
                  </div>

                  {/* Quick Active Trips Live Board */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm text-left">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono block mb-4">Dispatcher Operations Board</span>
                    <div className="space-y-3">
                      {trips.filter(t => t.status === 'In Progress').map(t => (
                        <div key={t.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono text-slate-800">
                          <div>
                            <span className="font-bold text-gray-900">Trip #{t.id}</span>: {t.source} ➔ {t.destination} ({t.vehicle_reg})
                          </div>
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold font-mono">ON ROAD</span>
                        </div>
                      ))}
                      {trips.filter(t => t.status === 'In Progress').length === 0 && (
                        <p className="text-xs text-gray-400 py-3">No active freight trips on road currently.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Filter Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-250/60 text-xs">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-1.5">Vehicle Type</label>
                      <select 
                        value={kpiFilterType}
                        onChange={(e) => setKpiFilterType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none"
                      >
                        <option value="All">All Types</option>
                        <option value="Heavy Truck">Heavy Truck</option>
                        <option value="Medium Truck">Medium Truck</option>
                        <option value="Pickup Van">Pickup Van</option>
                        <option value="Container Truck">Container Truck</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-1.5">Vehicle Status</label>
                      <select 
                        value={kpiFilterStatus}
                        onChange={(e) => setKpiFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Available">Available</option>
                        <option value="On Trip">On Trip</option>
                        <option value="In Shop">In Shop</option>
                        <option value="Retired">Retired</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-1.5">Operating Region</label>
                      <select 
                        value={kpiFilterRegion}
                        onChange={(e) => setKpiFilterRegion(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700 focus:outline-none"
                      >
                        <option value="All">All Regions</option>
                        <option value="West (MH)">West (MH)</option>
                        <option value="North (DL)">North (DL)</option>
                        <option value="South (KA)">South (KA)</option>
                        <option value="East (HR)">East (HR)</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-t-4 border-blue-500 flex flex-col justify-between min-h-[120px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Utilization</span>
                  <span className="text-2xl font-black text-gray-950 font-mono mt-1">{kpiData.fleetUtilization}%</span>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-t-4 border-cyan-500 flex flex-col justify-between min-h-[120px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Fuel Efficiency</span>
                  <span className="text-2xl font-black text-gray-950 font-mono mt-1">{kpiData.fuelEfficiency} km/L</span>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-t-4 border-red-500 flex flex-col justify-between min-h-[120px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Operating Cost</span>
                  <span className="text-2xl font-black text-gray-950 font-mono mt-1">${kpiData.totalOpCost.toLocaleString()}</span>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-t-4 border-purple-500 flex flex-col justify-between min-h-[120px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Operational State</span>
                  <span className="text-xs font-mono font-bold text-gray-800 mt-2 block">
                    🟢 {kpiData.availableVehicles} AV | 🔵 {kpiData.activeVehicles} TRIP | 🟡 {kpiData.maintenanceVehicles} SHOP
                  </span>
                </div>
              </div>

              {/* Alerts Inbox Section */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60 text-left">
                <div className="flex items-center space-x-2 mb-4">
                  <Bell className="h-5 w-5 text-rose-500 shrink-0" />
                  <span className="text-sm font-bold uppercase tracking-widest text-gray-900 font-mono">Real-Time Operations Alerts Queue</span>
                </div>
                {systemAlerts.length === 0 ? (
                  <div className="text-xs text-gray-400 font-mono py-4">No active alerts logs for your workspace role.</div>
                ) : (
                  <div className="space-y-2">
                    {systemAlerts.map(a => (
                      <div key={a.id} className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between text-xs font-mono text-rose-700">
                        <span>[{a.severity.toUpperCase()}] {a.message}</span>
                        <span className="text-[10px] text-gray-400">{a.created_at.slice(11, 19)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Incidents Tables for Safety Officer */}
              {(user?.role === 'Safety Officer' || user?.role === 'Fleet Manager') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
                  
                  {/* Deviation Alerts */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono block mb-3">Compliance Deviation Records</span>
                    <div className="space-y-3">
                      {deviationAlerts.map(d => (
                        <div key={d.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                          <div>Trip ID: #{d.trip_id} | Dist: {d.deviation_distance_km.toFixed(1)} km</div>
                          <div className="text-gray-500 font-mono">Location: {d.actual_location}</div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-gray-200/60">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${d.status === 'open' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                              {d.status.toUpperCase()}
                            </span>
                            {d.status === 'open' && (
                              <button onClick={() => acknowledgeAlert(d.id)} className="bg-slate-700 text-white text-[9px] uppercase px-3 py-1 rounded font-mono">
                                Acknowledge
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Idle Stop Events */}
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono block mb-3">Unauthorized Stop Events</span>
                    <div className="space-y-3">
                      {idleEvents.map(i => (
                        <div key={i.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                          <div>Trip ID: #{i.trip_id} | Duration: {i.duration_minutes} mins</div>
                          <div className="text-gray-500 font-mono">Coord: {i.stop_latitude.toFixed(4)}, {i.stop_longitude.toFixed(4)}</div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-gray-200/60">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${i.status === 'open' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                              {i.status.toUpperCase()}
                            </span>
                            {i.status === 'open' && (
                              <button onClick={() => escalateIdle(i.id)} className="bg-rose-600 text-white text-[9px] uppercase px-3 py-1 rounded font-mono">
                                Escalate
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* Vehicle Registry Module */}
          {activeTab === 'vehicles' && (
            <div className="space-y-6">
              
              {/* Search & Filter Row */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400 pointer-events-none" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search vehicle name or reg..." 
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-full text-xs text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-full text-xs text-gray-700 bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="Available">Available</option>
                    <option value="On Trip">On Trip</option>
                    <option value="In Shop">In Shop</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
              </div>

              {/* Structured Registry Table Grid */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200/60">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">REG. NO</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">MODEL/NAME</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">TYPE</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">GPS/FASTAG ID</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">MAX CAPACITY</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">STATUS AUDIT</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {getFilteredVehicles().map(v => (
                      <tr key={v.id} className="hover:bg-gray-50/60 transition-colors duration-300">
                        <td className="p-4 text-xs font-bold text-gray-900 font-mono">{v.reg_no}</td>
                        <td className="p-4 text-xs text-gray-800 font-bold">{v.name}</td>
                        <td className="p-4 text-xs text-gray-500 font-mono">{v.type}</td>
                        <td className="p-4 text-xs text-gray-400 font-mono">
                          {v.gps_device_id || 'GPS-N/A'} | {v.fastag_id || 'FT-N/A'}
                        </td>
                        <td className="p-4 text-xs text-gray-800 font-mono">{v.max_load_capacity.toLocaleString()} kg</td>
                        <td className="p-4 text-xs">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold font-mono ${
                            v.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            v.status === 'On Trip' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            v.status === 'In Shop' ? 'bg-amber-50 text-amber-705 border border-amber-100' :
                            'bg-gray-105 text-gray-600 border border-gray-200'
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
                            className="text-gray-655 hover:text-gray-900 text-[10px] uppercase font-bold font-mono bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full duration-300"
                          >
                            History
                          </button>
                          {hasAccess('fleet', 'write') && v.status !== 'Retired' ? (
                            <>
                              <button 
                                onClick={() => setEditingVehicle({ ...v })}
                                className="text-blue-650 hover:text-blue-800 text-[10px] uppercase font-bold font-mono bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full duration-300"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => retireVehicle(v.id)}
                                className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 text-[10px] uppercase font-bold font-mono px-3 py-1 rounded-full duration-300"
                              >
                                Retire
                              </button>
                            </>
                          ) : (
                            v.status !== 'Retired' && (
                              <>
                                <button 
                                  disabled
                                  className="text-gray-300 border border-gray-100 text-[10px] uppercase font-bold font-mono bg-gray-50 px-2.5 py-1 rounded-full cursor-not-allowed select-none"
                                >
                                  Edit
                                </button>
                                <button 
                                  disabled
                                  className="text-gray-300 border border-gray-100 text-[10px] uppercase font-bold font-mono bg-gray-50 px-2.5 py-1 rounded-full cursor-not-allowed select-none"
                                >
                                  Retire
                                </button>
                              </>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Maintenance Workspace Module */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 font-mono">Service log Dashboard</h3>
                  <p className="text-xs text-gray-400 mt-1">Submit new maintenance entries to automatically route trucks to maintenance bays.</p>
                </div>
                <button 
                  onClick={() => {
                    setMaintenanceForm({ vehicle_id: vehicles[0]?.id || '', service_type: 'Engine Tune-up', cost: '', date: new Date().toISOString().split('T')[0] });
                    setShowAddMaintenance(true);
                  }}
                  className="bg-[#0084E6] text-white text-xs font-bold uppercase font-mono py-2.5 px-6 rounded-full transition-all hover:bg-[#0070C9]"
                >
                  + Log Service Record
                </button>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200/60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 font-mono text-[10px] text-gray-400">
                    <tr>
                      <th className="p-4 uppercase">Vehicle</th>
                      <th className="p-4 uppercase">Service Type</th>
                      <th className="p-4 uppercase">Date Logged</th>
                      <th className="p-4 uppercase">Cost ($)</th>
                      <th className="p-4 uppercase">Status</th>
                      <th className="p-4 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {maintenance.map(m => {
                      const veh = vehicles.find(v => v.id === m.vehicle_id);
                      return (
                        <tr key={m.id} className="hover:bg-gray-50/60">
                          <td className="p-4 font-bold text-gray-900">{veh ? `${veh.name} (${veh.reg_no})` : 'Unknown'}</td>
                          <td className="p-4 text-gray-800">{m.service_type}</td>
                          <td className="p-4 text-gray-500">{m.date}</td>
                          <td className="p-4 font-bold text-gray-800">${m.cost.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${
                              m.status === 'open' ? 'bg-amber-50 text-amber-705 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              {m.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {m.status === 'open' && (
                              <button 
                                onClick={() => closeMaintenance(m.id)}
                                className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-[10px] uppercase font-bold px-3 py-1 rounded-full duration-300"
                              >
                                Close & Release
                              </button>
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

          {/* Reports & Analytics View-Only Module */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Fuel Efficiency</span>
                  <span className="text-xl font-bold text-gray-900 font-mono mt-2 block">{kpiData.fuelEfficiency} km/L</span>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Fleet Utilization</span>
                  <span className="text-xl font-bold text-gray-900 font-mono mt-2 block">{kpiData.fleetUtilization}%</span>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Operating Cost</span>
                  <span className="text-xl font-bold text-gray-900 font-mono mt-2 block">${kpiData.totalOpCost.toLocaleString()}</span>
                </div>
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono block">Mock Vehicle ROI</span>
                  <span className="text-xl font-bold text-gray-900 font-mono mt-2 block">
                    {(() => {
                      const totalCost = vehicles.reduce((sum, v) => sum + v.acquisition_cost, 0);
                      const totalRev = trips.filter(t => t.status === 'Completed').reduce((sum, t) => sum + (t.revenue || 0), 0);
                      return totalCost > 0 ? `${((totalRev / totalCost) * 100).toFixed(1)}%` : '0%';
                    })()}
                  </span>
                </div>
              </div>

              {/* Vehicle ROI Breakdown Table */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono block mb-4">Vehicle Capital ROI Performance</span>
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 font-mono text-[10px] text-gray-400">
                    <tr>
                      <th className="p-3 uppercase">Vehicle Name</th>
                      <th className="p-3 uppercase">Acquisition Cost</th>
                      <th className="p-3 uppercase">Trips Completed</th>
                      <th className="p-3 uppercase">Revenue Earned</th>
                      <th className="p-3 uppercase">ROI %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {vehicles.filter(v => v.status !== 'Retired').map(v => {
                      const vehTrips = trips.filter(t => t.vehicle_id === v.id && t.status === 'Completed');
                      const revenue = vehTrips.reduce((sum, t) => sum + (t.revenue || 0), 0);
                      const roi = v.acquisition_cost > 0 ? ((revenue / v.acquisition_cost) * 100).toFixed(1) : 0;
                      return (
                        <tr key={v.id}>
                          <td className="p-3 font-bold text-gray-900">{v.name} ({v.reg_no})</td>
                          <td className="p-3">${v.acquisition_cost.toLocaleString()}</td>
                          <td className="p-3">{vehTrips.length}</td>
                          <td className="p-3 text-emerald-600 font-bold">${revenue.toLocaleString()}</td>
                          <td className="p-3 font-bold text-gray-800">{roi}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Drivers Compliance Module */}
          {activeTab === 'drivers' && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200/60">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">Driver Name</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">License No</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">Expiry Check</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">Safety Score</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono">Duty Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {drivers.map(d => {
                    const expired = new Date(d.license_expiry_date) < new Date();
                    return (
                      <tr key={d.id} className="hover:bg-gray-50/60">
                        <td className="p-4 text-xs font-bold text-gray-900">{d.name}</td>
                        <td className="p-4 text-xs text-gray-500 font-mono">{d.license_no}</td>
                        <td className="p-4 text-xs font-mono">
                          {expired ? (
                            <span className="text-red-650 font-bold">Expired</span>
                          ) : (
                            <span className="text-gray-700">{d.license_expiry_date}</span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-mono">{d.safety_score} PTS</td>
                        <td className="p-4 text-xs">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold font-mono ${
                            d.status === 'Available' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {d.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Trips Console */}
          {activeTab === 'trips' && (
            <div className="space-y-6">
              
              {/* Dispatch trigger form */}
              {hasAccess('trips', 'write') && (
                <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-4 font-mono">Dispatch Workspace Control</h3>
                  <button 
                    onClick={() => setShowCreateTrip(true)}
                    className="bg-[#0084E6] text-white text-xs font-bold uppercase font-mono py-2.5 px-6 rounded-full"
                  >
                    + Create New Trip Request
                  </button>
                </div>
              )}

              {/* Trip Cards */}
              <div className="space-y-4">
                {trips.map(t => {
                  const hasLiveUpdate = liveLocations[t.id];
                  
                  return (
                    <div key={t.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono text-gray-400 font-bold">ROUTE ID: #{t.id}</span>
                          <h4 className="text-md font-bold uppercase text-gray-900 font-mono mt-1">{t.source} ➔ {t.destination}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                          t.status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                          t.status === 'In Progress' ? 'bg-blue-50 text-blue-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {t.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-gray-500">
                        <div>
                          <span className="block text-[9px] text-gray-400 uppercase">Assigned Truck</span>
                          <strong className="text-gray-800">{t.vehicle_name} ({t.vehicle_reg})</strong>
                        </div>
                        <div>
                          <span className="block text-[9px] text-gray-400 uppercase">Driver</span>
                          <strong className="text-gray-800">{t.driver_name}</strong>
                        </div>
                        <div>
                          <span className="block text-[9px] text-gray-400 uppercase">Payload Weight</span>
                          <strong className="text-gray-800">{t.cargo_weight} kg</strong>
                        </div>
                        <div>
                          <span className="block text-[9px] text-gray-400 uppercase">Status</span>
                          <strong className="text-gray-850">{t.status}</strong>
                        </div>
                      </div>

                      {/* Live GPS locator emulator feed */}
                      {t.status === 'In Progress' && (
                        <div className="bg-slate-900 text-emerald-400 rounded-xl p-4 font-mono text-[11px] space-y-1.5 relative overflow-hidden border border-emerald-500/20">
                          <div className="absolute top-2 right-2 flex items-center space-x-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                            <span className="text-[9px] font-bold uppercase">Live GPS Feed</span>
                          </div>
                          <div>Coordinates: {hasLiveUpdate ? `${hasLiveUpdate.latitude.toFixed(4)}, ${hasLiveUpdate.longitude.toFixed(4)}` : 'Waiting for ping...'}</div>
                          <div>Speed: {hasLiveUpdate ? `${hasLiveUpdate.speed} km/h` : '65 km/h'}</div>
                          <div>Device status: ONLINE (TLS Secured)</div>
                        </div>
                      )}

                      {/* Dispatch controls */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                        {t.status === 'Draft' && hasAccess('trips', 'write') && (
                          <button onClick={() => dispatchTrip(t.id)} className="bg-blue-600 text-white text-[10px] uppercase font-mono font-bold px-4 py-2 rounded-full">
                            Execute Dispatch
                          </button>
                        )}
                        {t.status === 'In Progress' && hasAccess('trips', 'write') && (
                          <button 
                            onClick={() => {
                              setActiveCompleteTripModal(t);
                              setCompleteTripForm({
                                final_odometer: t.planned_distance + (vehicles.find(v => v.id === t.vehicle_id)?.odometer || 45000),
                                fuel_consumed: '150',
                                revenue: '120000',
                                toll_expense: '1350',
                                other_expense: '250'
                              });
                            }}
                            className="bg-emerald-650 text-white text-[10px] uppercase font-mono font-bold px-4 py-2 rounded-full"
                          >
                            Complete Trip
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* Expenses Module */}
          {activeTab === 'expenses' && (
            <div className="space-y-6">
              
              {/* Costs Ledger Tables */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200/60">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono block mb-4">Financial Ledger Expenses</span>
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 font-mono text-[10px] text-gray-400">
                    <tr>
                      <th className="p-3 uppercase">Vehicle</th>
                      <th className="p-3 uppercase">Tolls</th>
                      <th className="p-3 uppercase">Maintenance</th>
                      <th className="p-3 uppercase">Other</th>
                      <th className="p-3 uppercase">Total Expense</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {expenses.map(e => (
                      <tr key={e.id}>
                        <td className="p-3 font-bold">{e.vehicle_reg}</td>
                        <td className="p-3">${e.toll}</td>
                        <td className="p-3">${e.maintenance_cost}</td>
                        <td className="p-3">${e.other}</td>
                        <td className="p-3 font-bold text-rose-600">${e.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* Operator Demo Simulator */}
          {activeTab === 'driver-app' && (
            <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
              <span className="bg-purple-100 text-purple-700 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-widest font-mono">Driver Operator simulator</span>
              <h2 className="text-lg font-bold text-gray-900 mt-2 font-mono">Central Console Status</h2>
              <p className="text-xs text-gray-400">Triggers emergency broadcast pings to dispatcher centers instantly.</p>
              <button 
                onClick={() => alert('SOS Signal Transmitted')}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase font-mono py-3 rounded-full mt-4"
              >
                Broadcast EMERGENCY SOS Alert
              </button>
            </div>
          )}

          {/* Configuration Settings */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/60 max-w-lg text-left">
              <h3 className="text-xs font-bold text-[#0084E6] uppercase tracking-widest font-mono block mb-4">Operations Config</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono mb-2">Base Depot Terminal</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-xs font-mono text-gray-800 focus:outline-none" defaultValue="TransitOps HQ - Terminal A" />
                </div>
                <button onClick={() => alert('Global configurations saved successfully.')} className="bg-[#0084E6] text-white text-xs font-mono font-bold py-2.5 px-6 rounded-full uppercase">
                  Save Changes
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ================================== MODALS ================================== */}

      {/* modal: Add Vehicle */}
      {showAddVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button onClick={() => setShowAddVehicle(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
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
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Model Name</label>
                  <input 
                    type="text" required value={vehicleForm.name} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })}
                    placeholder="Tata Prima"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Type</label>
                  <select 
                    value={vehicleForm.type}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
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
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Capacity (kg)</label>
                  <input 
                    type="number" required value={vehicleForm.max_load_capacity} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, max_load_capacity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Odometer (km)</label>
                  <input 
                    type="number" required value={vehicleForm.odometer} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, odometer: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-808 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Cost ($)</label>
                  <input 
                    type="number" required value={vehicleForm.acquisition_cost} 
                    onChange={(e) => setVehicleForm({ ...vehicleForm, acquisition_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#0084E6] hover:bg-[#0070C9] text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all duration-300 mt-4 shadow-sm">
                Register Vehicle Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Add Driver */}
      {showAddDriver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button onClick={() => setShowAddDriver(false)} className="absolute top-4 right-4 text-slate-405 hover:text-slate-600"><X className="h-5 w-5" /></button>
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
                  className="w-full bg-slate-50 border border-slate-200 text-slate-808 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">License Number</label>
                  <input 
                    type="text" required value={driverForm.license_no} 
                    onChange={(e) => setDriverForm({ ...driverForm, license_no: e.target.value })}
                    placeholder="DL-1420180099"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-808 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">License Class</label>
                  <select 
                    value={driverForm.license_category}
                    onChange={(e) => setDriverForm({ ...driverForm, license_category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
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
                    className="w-full bg-slate-50 border border-slate-200 text-slate-808 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-widest font-mono mb-1.5">Contact Number</label>
                  <input 
                    type="text" required value={driverForm.contact_no} 
                    onChange={(e) => setDriverForm({ ...driverForm, contact_no: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-808 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all duration-300 mt-4 shadow-sm">
                Register Driver Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Create Trip */}
      {showCreateTrip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative text-left">
            <button onClick={() => setShowCreateTrip(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-900 mb-6 font-mono flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              Plan Cargo Dispatch Trip.
            </h2>
            <form onSubmit={createTrip} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Source City</label>
                  <input 
                    type="text" required value={tripForm.source} 
                    onChange={(e) => setTripForm({ ...tripForm, source: e.target.value })}
                    placeholder="e.g. Ahmedabad"
                    className="w-full bg-slate-55 border border-slate-200 rounded-lg px-4 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Destination City</label>
                  <input 
                    type="text" required value={tripForm.destination} 
                    onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })}
                    placeholder="e.g. Mumbai"
                    className="w-full bg-slate-55 border border-slate-200 rounded-lg px-4 py-2 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-widest font-mono mb-1.5">Cargo Weight (kg)</label>
                  <input 
                    type="number" required value={tripForm.cargo_weight} 
                    onChange={(e) => setTripForm({ ...tripForm, cargo_weight: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-55 border border-slate-200 rounded-lg px-4 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-widest font-mono mb-1.5">Planned Distance (km)</label>
                  <input 
                    type="number" required value={tripForm.planned_distance} 
                    onChange={(e) => setTripForm({ ...tripForm, planned_distance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-55 border border-slate-200 rounded-lg px-4 py-2 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-505 uppercase tracking-widest font-mono mb-1.5">Select Vehicle (Available)</label>
                  <select 
                    required value={tripForm.vehicle_id}
                    onChange={(e) => setTripForm({ ...tripForm, vehicle_id: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 text-xs focus:outline-none"
                  >
                    <option value="">-- Choose Available --</option>
                    {vehicles.filter(v => v.status === 'Available').map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.reg_no}) [Max: {v.max_load_capacity} kg]</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Select Driver (Available)</label>
                  <select 
                    required value={tripForm.driver_id}
                    onChange={(e) => setTripForm({ ...tripForm, driver_id: e.target.value })}
                    className="w-full bg-slate-55 border border-slate-200 text-slate-700 rounded-lg px-4 py-2.5 text-xs focus:outline-none"
                  >
                    <option value="">-- Choose Available --</option>
                    {drivers.filter(d => d.status === 'Available').map(d => (
                      <option key={d.id} value={d.id}>{d.name} (Safety Score: {d.safety_score})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all duration-300 mt-4 shadow-sm">
                Save Trip as Draft
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Complete Trip Form Details */}
      {activeCompleteTripModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button onClick={() => setActiveCompleteTripModal(null)} className="absolute top-4 right-4 text-slate-455"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-900 mb-6 font-mono flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
              Complete Active Trip Operations.
            </h2>
            <form onSubmit={completeTrip} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Final Odometer (km)</label>
                  <input 
                    type="number" required value={completeTripForm.final_odometer} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, final_odometer: parseFloat(e.target.value) || '' })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-808 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Fuel Consumed (Liters)</label>
                  <input 
                    type="number" required value={completeTripForm.fuel_consumed} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, fuel_consumed: parseFloat(e.target.value) || '' })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-808 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Trip Revenue Earned ($)</label>
                <input 
                  type="number" required value={completeTripForm.revenue} 
                  onChange={(e) => setCompleteTripForm({ ...completeTripForm, revenue: parseFloat(e.target.value) || '' })}
                  className="w-full bg-slate-50 border border-slate-208 text-slate-808 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Highway Tolls ($)</label>
                  <input 
                    type="number" value={completeTripForm.toll_expense} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, toll_expense: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Other Incidentals ($)</label>
                  <input 
                    type="number" value={completeTripForm.other_expense} 
                    onChange={(e) => setCompleteTripForm({ ...completeTripForm, other_expense: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-650 hover:bg-blue-750 text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all duration-300 mt-4 shadow-sm">
                Log Completion & Update Stats
              </button>
            </form>
          </div>
        </div>
      )}

      {editingVehicle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-left">
            <button onClick={() => setEditingVehicle(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-slate-905 mb-6 font-mono flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Modify Fleet Vehicle Details
            </h2>
            <form onSubmit={editVehicle} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1.5">Registration Number (Static)</label>
                <input 
                  type="text" disabled value={editingVehicle.reg_no} 
                  className="w-full bg-gray-105 border border-slate-200 text-gray-400 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs cursor-not-allowed font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Model Name</label>
                  <input 
                    type="text" required value={editingVehicle.name} 
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-808 rounded-lg px-4 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Type</label>
                  <select 
                    value={editingVehicle.type}
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-705 rounded-lg px-4 py-2.5 focus:outline-none font-mono text-xs"
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
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Capacity (kg)</label>
                  <input 
                    type="number" required value={editingVehicle.max_load_capacity} 
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, max_load_capacity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-808 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Odometer (km)</label>
                  <input 
                    type="number" required value={editingVehicle.odometer} 
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, odometer: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-808 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-555 uppercase tracking-widest font-mono mb-1.5">Cost ($)</label>
                  <input 
                    type="number" required value={editingVehicle.acquisition_cost} 
                    onChange={(e) => setEditingVehicle({ ...editingVehicle, acquisition_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#0084E6] hover:bg-[#0070C9] text-white font-bold text-xs uppercase font-mono py-3 rounded-full transition-all duration-300 mt-4 shadow-sm">
                Commit Modifications
              </button>
            </form>
          </div>
        </div>
      )}

      {/* modal: Vehicle History & Details */}
      {selectedVehicleHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] overflow-y-auto text-left">
            <button onClick={() => setSelectedVehicleHistory(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-655"><X className="h-5 w-5" /></button>
            <h2 className="text-md font-bold uppercase tracking-widest text-[#111827] mb-2 font-mono flex items-center gap-2 font-bold">
              <Truck className="h-5 w-5 text-blue-600" />
              Vehicle Operational Log & History.
            </h2>
            <div className="text-xs text-slate-505 font-mono mb-6">{selectedVehicleHistory.vehicle.name} ({selectedVehicleHistory.vehicle.reg_no})</div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-555 uppercase tracking-widest mb-2 font-mono">Trip logs History</h3>
                {selectedVehicleHistory.trips.length === 0 ? (
                  <p className="text-[10px] text-slate-405 font-mono">No past or active trips logged for this vehicle.</p>
                ) : (
                  <div className="bg-slate-50 border border-slate-202 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Trip ID</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-555 font-mono font-bold">Route</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-555 font-mono font-bold">Status</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-555 font-mono font-bold">Cargo Weight</th>
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
                <h3 className="text-xs font-bold text-slate-555 uppercase tracking-widest mb-2 font-mono">Service Maintenance History</h3>
                {selectedVehicleHistory.maintenance.length === 0 ? (
                  <p className="text-[10px] text-slate-450 font-mono">No service records registered for this vehicle.</p>
                ) : (
                  <div className="bg-slate-50 border border-slate-205 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-505 font-mono">Service Type</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-505 font-mono">Date Logged</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-505 font-mono">Cost</th>
                          <th className="p-3 text-[10px] font-bold uppercase tracking-widest text-slate-505 font-mono">Status</th>
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
