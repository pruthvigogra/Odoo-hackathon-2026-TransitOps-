'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Lock, Mail, AlertCircle, ArrowRight, User, Key, UserPlus } from 'lucide-react';
import { api, setToken, setUser, getToken } from '@/utils/api';

export default function LoginPage() {
  const router = useRouter();

  // Mode Selection: 'manager' | 'driver'
  const [authMode, setAuthMode] = useState<'manager' | 'driver'>('manager');
  // Driver Sub-mode: 'signin' | 'register'
  const [driverMode, setDriverMode] = useState<'signin' | 'register'>('signin');

  // Manager Credentials State
  const [managerEmail, setManagerEmail] = useState('manager@transitops.com');
  const [managerPassword, setManagerPassword] = useState('admin123');

  // Driver Login State
  const [driverIdOrEmail, setDriverIdOrEmail] = useState('');

  // Driver Register State
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerLicense, setRegisterLicense] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (token && user) {
      const role = user.role;
      if (role === 'Safety Officer') {
        router.push('/safety');
      } else if (['Financial Analyst', 'Local Analyst', 'Senior Analyst'].includes(role)) {
        router.push('/finance');
      } else if (role === 'Driver') {
        router.push(`/drivers/${user.id}`);
      } else {
        router.push('/dashboard');
      }
    }
  }, [router]);

  // Handle Fleet Manager Login
  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await api.post('/auth/login', { email: managerEmail, password: managerPassword });
      setToken(data.token);
      setUser(data.user);
      
      const role = data.user.role;
      if (role === 'Safety Officer') {
        router.push('/safety');
      } else if (['Financial Analyst', 'Local Analyst', 'Senior Analyst'].includes(role)) {
        router.push('/finance');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Driver Login/Sign In
  const handleDriverSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await api.post('/auth/driver-login', { identifier: driverIdOrEmail });
      
      setToken(data.token);
      setUser(data.user);
      router.push(`/drivers/${data.user.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not verify driver account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Driver Registration Onboarding
  const handleDriverRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        name: registerName,
        email: registerEmail,
        phone: registerPhone,
        license_number: registerLicense,
        license_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year default
        status: 'Available',
        rating: 5.0,
        accident_history: 0
      };

      const newDriverRes = await api.post('/auth/driver-register', payload);
      setToken(newDriverRes.token);
      setUser(newDriverRes.user);
      router.push(`/drivers/${newDriverRes.user.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registration failed. Try checking values.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center p-6 relative overflow-hidden custom-page-bg">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-sky-400/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-15%] w-[600px] h-[600px] rounded-full bg-emerald-400/5 blur-[150px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[460px] z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2 select-none">
          <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-600/10 mb-2">
            <Truck className="w-7 h-7 text-white stroke-[2.5px]" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-slate-800">TransitOps</h1>
          <p className="text-xs text-slate-500 font-medium">Smart Transport Compliance & Dispatcher System</p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-200/80 border border-slate-300 rounded-2xl">
          <button
            onClick={() => {
              setAuthMode('manager');
              setError('');
            }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
              authMode === 'manager' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-550 hover:text-slate-850'
            }`}
          >
            Fleet Manager
          </button>
          <button
            onClick={() => {
              setAuthMode('driver');
              setError('');
            }}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all ${
              authMode === 'driver' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-550 hover:text-slate-850'
            }`}
          >
            Driver Portal
          </button>
        </div>

        {/* 1. Fleet Manager Form */}
        {authMode === 'manager' && (
          <div className="glass-panel rounded-3xl p-8 shadow-xl space-y-6 bg-white/90 border border-slate-200">
            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-800">Fleet Operations Sign In</h2>
              <p className="text-xs text-slate-500 font-medium">Access dispatch monitors and verification maps</p>
            </div>

            <form onSubmit={handleManagerLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-450 tracking-wider">EMAIL ADDRESS</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    disabled={isLoading}
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="manager@transitops.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 text-xs rounded-xl pl-11 pr-4 py-2.5 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-450 tracking-wider">PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    disabled={isLoading}
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 text-xs rounded-xl pl-11 pr-4 py-2.5 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-150 rounded-xl p-3 text-xs leading-normal font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-600/50 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
              >
                {isLoading ? 'Verifying Dispatch...' : 'Sign In to Operations'}
                {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        )}

        {/* 2. Driver Portal Form (Login or Register) */}
        {authMode === 'driver' && (
          <div className="glass-panel rounded-3xl p-8 shadow-xl space-y-5 bg-white/90 border border-slate-200">
            
            {/* Driver Login/Register sub tabs */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-150">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-800">
                  {driverMode === 'signin' ? 'Driver Sign In' : 'Driver Registration'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {driverMode === 'signin' ? 'Access your dispatcher timeline' : 'Onboard your commercial permit account'}
                </p>
              </div>
              <button
                onClick={() => {
                  setDriverMode(driverMode === 'signin' ? 'register' : 'signin');
                  setError('');
                }}
                className="text-[10px] text-sky-600 font-extrabold flex items-center gap-1 hover:underline"
              >
                {driverMode === 'signin' ? <UserPlus className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
                {driverMode === 'signin' ? 'Register' : 'Sign In'}
              </button>
            </div>

            {/* Driver Sign In Form */}
            {driverMode === 'signin' && (
              <form onSubmit={handleDriverSignIn} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-455 tracking-wider">DRIVER ID / REGISTERED EMAIL</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={driverIdOrEmail}
                      onChange={(e) => setDriverIdOrEmail(e.target.value)}
                      placeholder="e.g. 1 or rajesh@transitops.com"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 text-xs rounded-xl pl-11 pr-4 py-2.5 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-150 rounded-xl p-3 text-xs leading-normal font-medium">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-600/50 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md"
                >
                  {isLoading ? 'Searching Record...' : 'Sign In to Driver Portal'}
                  {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </form>
            )}

            {/* Driver Registration Form */}
            {driverMode === 'register' && (
              <form onSubmit={handleDriverRegister} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450">DRIVER FULL NAME</label>
                  <input
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="e.g. Ramesh Sen"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-450">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="e.g. ramesh@transitops.com"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-450">MOBILE PHONE</label>
                    <input
                      type="text"
                      required
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      placeholder="+91 99999 XXXXX"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-450">COMMERCIAL DL NO.</label>
                    <input
                      type="text"
                      required
                      value={registerLicense}
                      onChange={(e) => setRegisterLicense(e.target.value)}
                      placeholder="DL-XXXXXXXXXXXXX"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-150 rounded-xl p-3 text-xs leading-normal font-medium">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md"
                >
                  {isLoading ? 'Creating Account...' : 'Complete Onboarding & Enter'}
                  {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </form>
            )}

          </div>
        )}

        {/* Credentials Sandbox Box */}
        {authMode === 'manager' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-655 leading-normal space-y-2 shadow-sm">
            <div className="font-bold text-slate-800">Default Manager Credentials:</div>
            <div className="flex items-center justify-between">
              <span>Fleet Manager:</span>
              <code className="text-sky-600 font-bold font-mono">manager@transitops.com</code>
            </div>
            <div className="flex items-center justify-between">
              <span>Password:</span>
              <code className="text-emerald-600 font-bold font-mono">admin123</code>
            </div>
          </div>
        )}

        {authMode === 'driver' && driverMode === 'signin' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-655 leading-normal space-y-2 shadow-sm">
            <div className="font-bold text-slate-800">Demo Driver Credentials:</div>
            <div className="flex items-center justify-between">
              <span>Driver ID:</span>
              <code className="text-sky-600 font-bold font-mono">1</code>
            </div>
            <div className="flex items-center justify-between">
              <span>Email:</span>
              <code className="text-sky-600 font-bold font-mono">rajesh@transitops.com</code>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
