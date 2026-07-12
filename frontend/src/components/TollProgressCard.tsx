'use client';

import { Phone, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

interface TollProgressCardProps {
  trip: {
    id: number;
    registration_number: string;
    driver_name: string;
    route_name: string;
    current_toll_status: string;
  } | null;
  routeTolls: any[];
  clearanceLogs: any[];
  onCallDriver?: () => void;
  onViewAlert?: (message: string) => void;
}

export default function TollProgressCard({
  trip,
  routeTolls = [],
  clearanceLogs = [],
  onCallDriver,
  onViewAlert
}: TollProgressCardProps) {
  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 shadow-sm">
        <Clock className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
        <p className="text-sm font-semibold text-slate-700">No Active Trip Selected</p>
        <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-normal">Select a moving vehicle or trip from the map or dashboard to inspect its FASTag audit logs.</p>
      </div>
    );
  }

  // Count cleared tolls
  const clearedCount = clearanceLogs.filter(log => log.status === 'Cleared').length;
  const totalCount = routeTolls.length;
  const progressPercent = totalCount > 0 ? (clearedCount / totalCount) * 100 : 0;

  // Build list of tolls with statuses
  const tollList = routeTolls.map(plaza => {
    const log = clearanceLogs.find(l => l.toll_plaza_id === plaza.id);
    
    let status = 'Pending';
    let actualTime = null;
    let deviation = 0;
    let expectedTimeStr = '';

    if (log) {
      status = log.status; // Cleared, Skipped, Out-of-sequence
      actualTime = log.actual_crossing_time;
      deviation = log.time_deviation;
      expectedTimeStr = log.expected_arrival;
    }

    return {
      ...plaza,
      status,
      actualTime,
      deviation,
      expectedTimeStr
    };
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Cleared':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Skipped':
        return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
      case 'Out-of-sequence':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-650 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col bg-white border border-slate-200 rounded-2xl p-5 shadow-sm max-h-[600px] overflow-hidden">
      {/* Header Info */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-150">
        <div>
          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(trip.current_toll_status)}`}>
            FASTag Verification: {trip.current_toll_status}
          </span>
          <h3 className="text-base font-bold text-slate-800 mt-2">{trip.registration_number}</h3>
          <p className="text-xs text-slate-600">{trip.route_name}</p>
          <p className="text-xs text-slate-500 mt-0.5">Driver: {trip.driver_name}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block">Trip ID</span>
          <span className="text-xs font-bold text-slate-700">#00{trip.id}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="py-4">
        <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5">
          <span className="font-semibold">Toll Verification Progress</span>
          <span className="text-slate-800 font-bold">{clearedCount} of {totalCount} Plazas Verified</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div 
            style={{ width: `${progressPercent}%` }} 
            className="bg-sky-500 h-full rounded-full transition-all duration-500 ease-out"
          />
        </div>
      </div>

      {/* Chronological Tolls List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-2">
        {tollList.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No configured toll plazas for this route.</p>
        ) : (
          tollList.map((t) => {
            const isCleared = t.status === 'Cleared';
            const isSkipped = t.status === 'Skipped';
            const isOut = t.status === 'Out-of-sequence';
            
            const actualTimeFormatted = t.actualTime 
              ? new Date(t.actualTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
              : '';

            return (
              <div 
                key={t.id} 
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  isSkipped 
                    ? 'bg-rose-50 border-rose-200 text-rose-900' 
                    : isCleared 
                    ? 'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/50 text-slate-800' 
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {isCleared && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    {isSkipped && <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />}
                    {isOut && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                    {t.status === 'Pending' && <Clock className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{t.name}</span>
                      <span className="text-[9px] text-slate-500 bg-slate-200/80 px-1 py-0.2 rounded font-normal">Seq {t.sequence}</span>
                    </h4>
                    {isCleared && (
                      <p className="text-[10px] text-emerald-600 font-medium">
                        Cleared at {actualTimeFormatted} ({t.deviation > 0 ? `+${t.deviation}m delay` : `${t.deviation}m early`})
                      </p>
                    )}
                    {isSkipped && (
                      <p className="text-[10px] text-rose-650 font-bold">
                        MISSING & SKIPPED — Verification alert triggered
                      </p>
                    )}
                    {isOut && (
                      <p className="text-[10px] text-amber-600 font-medium">
                        OUT OF SEQUENCE — Crossing detected at {actualTimeFormatted}
                      </p>
                    )}
                    {t.status === 'Pending' && (
                      <p className="text-[10px] text-slate-400">
                        Expected crossing ETA: pending update
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                    isCleared ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    isSkipped ? 'bg-rose-50 text-rose-700 border-rose-105 font-extrabold' :
                    isOut ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-slate-150 mt-2">
        <button
          onClick={onCallDriver}
          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 rounded-xl border border-slate-200 transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          Call Driver
        </button>
        {trip.current_toll_status !== 'Cleared' && trip.current_toll_status !== 'Pending' && (
          <button
            onClick={() => onViewAlert && onViewAlert(`FASTag verification failed for vehicle ${trip.registration_number}. Skipped/Out-of-sequence toll detected!`)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 rounded-xl transition-colors shadow-sm shadow-rose-600/10"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            View Alert
          </button>
        )}
      </div>
    </div>
  );
}
