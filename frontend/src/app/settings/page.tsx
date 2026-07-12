'use client';

import { useState } from 'react';
import { Settings, Save, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function SettingsPage() {
  const [geofenceRadius, setGeofenceRadius] = useState('25.0');
  const [idleTimeLimit, setIdleTimeLimit] = useState('15');
  const [enableEmailAlerts, setEnableEmailAlerts] = useState(true);
  const [enableSMSAlerts, setEnableSMSAlerts] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen flex text-slate-800 custom-page-bg">
      <Navbar />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          
          {/* Header */}
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-sky-600" />
              Fleet Operations Settings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Configure compliance engine variables, alerts channels, and dispatcher thresholds.</p>
          </div>

          {/* Success Banner */}
          {saved && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-250 text-emerald-805 rounded-2xl p-4 text-xs font-semibold animate-scale-in">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>Configurations updated and synced with backend verification state machines.</span>
            </div>
          )}

          {/* Configuration Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-2xl">
            <form onSubmit={handleSave} className="space-y-6">
              
              {/* Parameter Settings */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-sky-600 block">COMPLIANCE STATE ENGINE VARIABLES</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">GEOFENCE CORRIDOR WIDTH (KM)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={geofenceRadius}
                      onChange={(e) => setGeofenceRadius(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-850 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 block">Max deviation distance allowed before trigger</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 block">IDLE DURATION ALARM LIMIT (MINUTES)</label>
                    <input
                      type="number"
                      value={idleTimeLimit}
                      onChange={(e) => setIdleTimeLimit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-850 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-400 block">Stationary vehicle time trigger</span>
                  </div>
                </div>
              </div>

              {/* Notification Toggles */}
              <div className="border-t border-slate-150 pt-5 space-y-3">
                <span className="text-[10px] font-bold text-sky-600 block">ALERT DISPATCH CHANNELS</span>
                
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Email Notifications</span>
                    <span className="text-[10px] text-slate-450 block">Forward critical route deviations to dispatch managers</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableEmailAlerts}
                    onChange={(e) => setEnableEmailAlerts(e.target.checked)}
                    className="w-4 h-4 text-sky-600 border-slate-300 rounded"
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">SMS SOS Alerts</span>
                    <span className="text-[10px] text-slate-450 block">Send immediate text dispatch to drivers on critical path loss</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableSMSAlerts}
                    onChange={(e) => setEnableSMSAlerts(e.target.checked)}
                    className="w-4 h-4 text-sky-600 border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4 border-t border-slate-150 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-750 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
                >
                  <Save className="w-4 h-4" />
                  Save Settings
                </button>
              </div>

            </form>
          </div>

        </div>
      </main>
    </div>
  );
}
