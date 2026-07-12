'use client';

import { useState, useEffect } from 'react';
import { Play, Square, AlertOctagon, Send, Check } from 'lucide-react';
import { api } from '@/utils/api';

interface SimulatorPanelProps {
  vehicles: any[];
  drivers: any[];
  routes: any[];
  onSimulationStart: () => void;
  onSimulationStop: () => void;
  simStatus: any;
  setSimStatus: (status: any) => void;
  activeTolls: any[];
}

export default function SimulatorPanel({
  vehicles,
  drivers,
  routes,
  onSimulationStart,
  onSimulationStop,
  simStatus,
  setSimStatus,
  activeTolls
}: SimulatorPanelProps) {
  const [selectedRoute, setSelectedRoute] = useState('1');
  const [selectedVehicle, setSelectedVehicle] = useState('1');
  const [selectedDriver, setSelectedDriver] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [deviateChecked, setDeviateChecked] = useState(false);
  const [crossedTolls, setCrossedTolls] = useState<Record<string, boolean>>({});

  // Sync internal state with backend status
  useEffect(() => {
    if (simStatus) {
      setDeviateChecked(simStatus.isDeviated ?? false);
    }
  }, [simStatus]);

  // Start Simulation
  const handleStartSim = async () => {
    setIsLoading(true);
    try {
      await api.post('/simulator/start', {
        routeId: selectedRoute,
        vehicleId: selectedVehicle,
        driverId: selectedDriver
      });
      setCrossedTolls({});
      onSimulationStart();
    } catch (err) {
      console.error(err);
      alert('Failed to start simulation');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop Simulation
  const handleStopSim = async () => {
    setIsLoading(true);
    try {
      await api.post('/simulator/stop');
      onSimulationStop();
      setDeviateChecked(false);
      setCrossedTolls({});
    } catch (err) {
      console.error(err);
      alert('Failed to stop simulation');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Route Deviation
  const handleDeviateToggle = async (checked: boolean) => {
    setDeviateChecked(checked);
    try {
      const res = await api.post('/simulator/deviate', { deviate: checked });
      setSimStatus((prev: any) => ({ ...prev, isDeviated: res.isDeviated }));
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger FASTag Crossing
  const handleTriggerFastag = async (plazaId: string) => {
    try {
      await api.post('/simulator/fastag', { fastagPlazaId: plazaId });
      setCrossedTolls(prev => ({ ...prev, [plazaId]: true }));
    } catch (err) {
      console.error(err);
      alert('Failed to simulate FASTag transaction');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-150">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-sky-600 rounded-full animate-ping"></span>
            Live Route & Audit Simulator
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Control live GPS tracking ticks and FASTag checkpoints.</p>
        </div>
        <div>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
            simStatus?.isActive 
              ? 'bg-emerald-55 text-emerald-700 border-emerald-200' 
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            {simStatus?.isActive ? 'SIMULATOR ACTIVE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {!simStatus?.isActive ? (
        // Start Controls
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 gap-2.5">
            <div>
              <label className="text-[10px] text-slate-400 font-bold block mb-1">APPROVED CORRIDOR ROUTE</label>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {routes.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.distance} km)</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">VEHICLE ASSIGNMENT</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {vehicles.filter(v => v.status === 'Available').map(v => (
                    <option key={v.id} value={v.id}>{v.registration_number}</option>
                  ))}
                  {vehicles.filter(v => v.status === 'Available').length === 0 && (
                    <option value="1">DL-01-MA-1234 (Tata)</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">DRIVER ASSIGNMENT</label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {drivers.filter(d => d.status === 'Available').map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                  {drivers.filter(d => d.status === 'Available').length === 0 && (
                    <option value="1">Amit Sharma</option>
                  )}
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartSim}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-600/50 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Launch Simulated Trip
          </button>
        </div>
      ) : (
        // Active Simulation Controls
        <div className="space-y-4">
          {/* Progress Indicators */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">GPS Stream Ticks:</span>
            <span className="text-slate-800 font-bold">{simStatus.currentIndex} / {simStatus.totalSteps}</span>
          </div>

          {/* Route Deviation Trigger */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className={`w-4 h-4 ${deviateChecked ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Force Route Deviation</h4>
                <p className="text-[9px] text-slate-500">Drifts GPS points off approved corridor.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={deviateChecked} 
                onChange={(e) => handleDeviateToggle(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 peer-checked:after:bg-white"></div>
            </label>
          </div>

          {/* Toll Plazas triggers */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold block mb-1">TRIGGER INDEPENDENT FASTAG CROSSING</label>
            <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
              {activeTolls.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[11px]">
                  <span className="text-slate-700 font-medium truncate max-w-[170px]">{t.name} (Seq {t.sequence})</span>
                  <button
                    onClick={() => handleTriggerFastag(t.fastag_plaza_id)}
                    className={`flex items-center gap-1 font-bold text-[9px] px-2 py-1 rounded transition-colors ${
                      crossedTolls[t.fastag_plaza_id]
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-sky-600 text-white hover:bg-sky-700'
                    }`}
                  >
                    {crossedTolls[t.fastag_plaza_id] ? (
                      <>
                        <Check className="w-2.5 h-2.5 stroke-[3px]" />
                        Crossed
                      </>
                    ) : (
                      <>
                        <Send className="w-2.5 h-2.5" />
                        Cross
                      </>
                    )}
                  </button>
                </div>
              ))}
              {activeTolls.length === 0 && (
                <p className="text-[10px] text-slate-400 text-center py-2">Loading toll plazas...</p>
              )}
            </div>
          </div>

          {/* Stop Button */}
          <button
            onClick={handleStopSim}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-600/50 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Terminate Trip & Reset
          </button>
        </div>
      )}
    </div>
  );
}
