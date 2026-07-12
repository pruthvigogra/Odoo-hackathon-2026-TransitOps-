'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { api, setToken, setUser, getToken } from '@/utils/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('manager@transitops.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (getToken()) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await api.post('/auth/login', { email, password });
      setToken(data.token);
      setUser(data.user);
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid email or password.');
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
      <div className="w-full max-w-[440px] z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-2 select-none">
          <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-600/10 mb-2">
            <Truck className="w-7 h-7 text-white stroke-[2.5px]" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-slate-800">TRANSITOPS</h1>
          <p className="text-xs text-slate-500 font-medium">Smart Transport Compliance & Verification System</p>
        </div>

        {/* Login Form Panel */}
        <div className="glass-panel rounded-3xl p-8 shadow-xl space-y-6 bg-white/90 border border-slate-200">
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-800">Sign In</h2>
            <p className="text-xs text-slate-500">Access your fleet manager dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 tracking-wider">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 text-xs rounded-xl pl-11 pr-4 py-3 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 tracking-wider">PASSWORD</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-800 text-xs rounded-xl pl-11 pr-4 py-3 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs leading-normal">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-600/50 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-sky-600/10"
            >
              {isLoading ? 'Verifying Credentials...' : 'Sign In to Operations'}
              {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>

        {/* Credentials Sandbox Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-650 leading-normal space-y-2 shadow-sm">
          <div className="font-bold text-slate-800">Default Demo Credentials:</div>
          <div className="flex items-center justify-between">
            <span>Fleet Manager:</span>
            <code className="text-sky-600 font-bold">manager@transitops.com</code>
          </div>
          <div className="flex items-center justify-between">
            <span>Administrator:</span>
            <code className="text-sky-600 font-bold">admin@transitops.com</code>
          </div>
          <div className="flex items-center justify-between">
            <span>Password (Both):</span>
            <code className="text-emerald-600 font-bold">admin123</code>
          </div>
        </div>

      </div>
    </div>
  );
}
