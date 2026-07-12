'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  ArrowLeft, Users, ShieldAlert, CheckCircle2, Navigation, MapPin, 
  Activity, Calendar, Phone, Mail, Award, Clock, HeartHandshake, AlertTriangle, Play
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { api, getUser } from '@/utils/api';

// Dynamically import Leaflet Map to avoid SSR errors
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function DriverDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const driverId = params?.id ? Number(params.id) : null;

  const [driver, setDriver] = useState<any>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [tolls, setTolls] = useState<any[]>([]);

  // Local Attendance State
  const [attendanceStatus, setAttendanceStatus] = useState('Checked Out');
  const [workingHours, setWorkingHours] = useState('0.0 hrs');
  const [shiftStart, setShiftStart] = useState<number | null>(null);

  // Success / Alert banner notification state
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getUser());
    if (driverId) {
      fetchDriverDetails();
    }
  }, [driverId]);

  const fetchDriverDetails = async () => {
    try {
      // 1. Fetch all drivers and find the one matching parameter ID
      const driversData = await api.get('/drivers');
      const matchedDriver = driversData.find((d: any) => d.id === driverId);
      if (!matchedDriver) {
        setNotification({ message: 'Driver record not found in system database.', type: 'error' });
        return;
      }
      setDriver(matchedDriver);
      setAttendanceStatus(matchedDriver.status === 'Driving' || matchedDriver.status === 'Available' ? 'Checked In' : 'Checked Out');
      if (matchedDriver.status === 'Driving') {
        setWorkingHours('4.5 hrs');
      }

      // 2. Fetch all trips and look for active trip assigned to this driver
      const tripsData = await api.get('/trips');
      const matchedTrip = tripsData.find((t: any) => t.driver_id === driverId && t.status !== 'Completed');
      if (matchedTrip) {
        setActiveTrip(matchedTrip);

        // Fetch route checkpoints & tolls if active trip exists
        const tollsData = await api.get(`/routes/${matchedTrip.route_id}/tolls`);
        setTolls(tollsData);
        setCheckpoints(checkpointsFilter(matchedTrip.route_id));

        // 3. Fetch vehicle assigned to this trip
        const vehiclesData = await api.get('/vehicles');
        const matchedVehicle = vehiclesData.find((v: any) => v.id === matchedTrip.vehicle_id);
        if (matchedVehicle) {
          setVehicle(matchedVehicle);
        }
      } else {
        // Find default associated standby vehicle
        const vehiclesData = await api.get('/vehicles');
        const matchedVehicle = vehiclesData.find((v: any) => v.current_driver_id === driverId);
        if (matchedVehicle) {
          setVehicle(matchedVehicle);
        }
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Failed to load driver dashboard data.', type: 'error' });
    }
  };

  const showNotificationBanner = (message: string, type: string) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleCheckIn = () => {
    setAttendanceStatus('Checked In');
    setShiftStart(Date.now());
    setWorkingHours('0.1 hrs');
    showNotificationBanner('Attendance recorded. Shift logged successfully.', 'success');
  };

  const handleCheckOut = () => {
    setAttendanceStatus('Checked Out');
    setShiftStart(null);
    setWorkingHours('0.0 hrs');
    showNotificationBanner('Logged checkout time. Working hours finalized.', 'info');
  };

  const triggerSOS = async () => {
    try {
      showNotificationBanner('EMERGENCY SOS BROADCASTED! Dispatch alerted. Calling security...', 'error');
      if (activeTrip) {
        // Create an alert on the server database
        await api.post('/alerts', {
          vehicle_id: activeTrip.vehicle_id,
          message: `CRITICAL SOS ALARM manually triggered by Driver: ${driver.name} at coordinates!`,
          severity: 'Critical'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartTrip = () => {
    showNotificationBanner('Trip Dispatch Started. Route tracking online.', 'success');
    if (activeTrip) {
      setActiveTrip((prev: any) => ({ ...prev, status: 'Started' }));
    }
  };

  if (!driver) {
    return (
      <div className="min-h-screen flex text-slate-800 custom-page-bg">
        <Navbar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center space-y-3 bg-white/90 backdrop-blur border border-slate-200 p-8 rounded-2xl shadow-md">
            <Users className="w-8 h-8 text-sky-600 animate-pulse mx-auto" />
            <h3 className="font-bold text-slate-800">Loading Driver Dashboard...</h3>
            <p className="text-xs text-slate-500">Connecting dispatch keys and loading satellite profiles.</p>
          </div>
        </main>
      </div>
    );
  }

  // Visual status timelines steps
  const steps = ['Pending', 'Assigned', 'Started', 'In Progress', 'Completed'];
  const getStepIndex = (status: string) => {
    if (status === 'Completed') return 4;
    if (status === 'In Progress') return 3;
    if (status === 'Started') return 2;
    if (status === 'Assigned') return 1;
    return 0;
  };
  const activeStepIdx = activeTrip ? getStepIndex(activeTrip.status) : 0;

  return (
    <div className="min-h-screen flex text-slate-800 custom-page-bg">
      <Navbar />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          
          {/* Header Action Back */}
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            {user?.role !== 'Driver' ? (
              <Link 
                href="/dashboard" 
                className="flex items-center gap-1.5 text-xs font-bold text-slate-650 hover:text-slate-900 transition-colors bg-white/90 border border-slate-200 px-3 py-2 rounded-xl shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                ← Back to Fleet Dashboard
              </Link>
            ) : (
              <div className="text-xs font-bold text-slate-500">
                Driver Portal Mode
              </div>
            )}

            <span className="text-[10px] font-bold text-slate-400">DRIVER DETAILS CONSOLE</span>
          </div>

          {/* Success Alerts Notification Bar */}
          {notification && (
            <div className={`flex items-center gap-2 rounded-2xl p-4 text-xs font-semibold animate-scale-in border shadow-sm ${
              notification.type === 'error' ? 'bg-rose-50 border-rose-250 text-rose-800' :
              notification.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
              'bg-white border-slate-250 text-slate-800'
            }`}>
              {notification.type === 'error' ? <ShieldAlert className="w-5 h-5 text-rose-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              <span>{notification.message}</span>
            </div>
          )}

          {/* Core Profile Context Widget */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-sky-100 rounded-2xl flex items-center justify-center text-sky-700 font-extrabold text-xl shadow-inner border border-sky-200">
                {driver.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-800 leading-none">{driver.name}</h2>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                    driver.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    driver.status === 'Driving' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                    'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {driver.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-450 mt-1.5 font-medium">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Driver ID: #{100 + driver.id}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {driver.phone}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 block">SAFETY RATING</span>
                <span className="text-sm font-black text-slate-800 flex items-center justify-end gap-0.5 mt-0.5">
                  ⭐ {driver.rating?.toFixed(1) || '5.0'}
                </span>
              </div>
            </div>
          </div>

          {/* Widgets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Trip Details and Timeline */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Assigned Trip Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-150 flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-sky-600" />
                    Currently Assigned Dispatch Run
                  </h3>
                  {activeTrip && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100 uppercase">
                      {activeTrip.status}
                    </span>
                  )}
                </div>

                {activeTrip ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block">TRIP TRACKING KEY</span>
                        <span className="font-mono font-bold text-slate-800 block mt-0.5">TRP-{1000 + activeTrip.id}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block">CARGO TYPE</span>
                        <span className="font-bold text-slate-800 block mt-0.5">Industrial Parts</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block">DISPATCH DATE</span>
                        <span className="font-bold text-slate-800 block mt-0.5">Today</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="text-[9px] font-bold text-slate-450 block">START</span>
                          <span className="font-bold text-slate-800">{activeTrip.route_name?.split('➔')[0] || 'Delhi'}</span>
                        </div>
                      </div>
                      <span className="text-slate-350">➔</span>
                      <div className="flex items-center gap-2 text-right">
                        <MapPin className="w-4 h-4 text-rose-600" />
                        <div>
                          <span className="text-[9px] font-bold text-slate-450 block">DESTINATION</span>
                          <span className="font-bold text-slate-800">{activeTrip.route_name?.split('➔')[1] || 'Mumbai'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Timeline */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[9px] font-bold text-slate-400 block">TRIP TIMELINE PROGRESS</span>
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 relative">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-150 -translate-y-1/2 -z-10" />
                        {steps.map((step, idx) => {
                          const isPast = idx <= activeStepIdx;
                          return (
                            <div key={step} className="flex flex-col items-center gap-1.5 bg-white px-2">
                              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 ${
                                isPast ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-300'
                              }`}>
                                {isPast && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </span>
                              <span className={isPast ? 'text-sky-700 font-extrabold' : 'text-slate-400'}>{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Start Action buttons */}
                    {activeTrip.status === 'Assigned' && (
                      <div className="pt-2 border-t border-slate-150 flex gap-2">
                        <button
                          onClick={handleStartTrip}
                          className="flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Start Trip Dispatch
                        </button>
                        <button
                          onClick={() => alert('Dispatch coordinator notified.')}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl border border-slate-250 transition-colors"
                        >
                          Decline / Request Change
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400 font-semibold bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                    No active dispatched trips assigned to this driver scorecard.
                  </div>
                )}
              </div>

              {/* Map Routing Widget */}
              {activeTrip && (
                <div className="h-96 relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
                  <Map 
                    vehicles={vehicle ? [{ ...vehicle, lat: vehicle.lat || 22.5, lng: vehicle.lng || 78.0, heading: vehicle.heading || 0, statusColor: 'Green' }] : []}
                    activeRoute={activeTrip}
                    checkpoints={checkpoints}
                    tolls={tolls}
                    onSelectVehicle={() => {}}
                  />
                </div>
              )}

            </div>

            {/* Right Col: Attendance, Vehicle details, emergency */}
            <div className="space-y-6">
              
              {/* Attendance Tracker */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <span className="text-[10px] font-bold text-slate-400 block mb-1">ATTENDANCE & DUTY HOUR LOGS</span>
                
                <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-150 p-3 rounded-2xl">
                  <div>
                    <span className="text-[9px] font-bold text-slate-450 block">SHIFT STATUS</span>
                    <span className={`font-bold block mt-0.5 ${attendanceStatus === 'Checked In' ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {attendanceStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-450 block">TODAY WORKING TIME</span>
                    <span className="font-bold text-slate-800 block mt-0.5">{workingHours}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    disabled={attendanceStatus === 'Checked In'}
                    onClick={handleCheckIn}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    Check In Shift
                  </button>
                  <button
                    disabled={attendanceStatus === 'Checked Out'}
                    onClick={handleCheckOut}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 font-bold text-xs py-2 px-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Check Out Shift
                  </button>
                </div>
              </div>

              {/* Vehicle Details */}
              {vehicle ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3.5">
                  <span className="text-[10px] font-bold text-slate-450 block">ASSIGNED FLEET VEHICLE</span>
                  
                  <div className="pb-2 border-b border-slate-150">
                    <h4 className="text-sm font-black text-slate-800">{vehicle.registration_number}</h4>
                    <p className="text-[10px] text-slate-450 mt-0.5">{vehicle.manufacturer} {vehicle.model} ({vehicle.type})</p>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current Odometer:</span>
                      <span className="font-bold text-slate-800">{vehicle.odometer} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Fuel Type:</span>
                      <span className="font-bold text-slate-800">{vehicle.fuel_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Insurance Status:</span>
                      <span className="font-bold text-emerald-600">Valid</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Emission Certificate (PUC):</span>
                      <span className="font-bold text-emerald-600">Valid</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-center py-6 text-xs text-slate-400 font-semibold">
                  No vehicle registered or assigned to this driver slot.
                </div>
              )}

              {/* Emergency Large Red SOS Card */}
              <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-5 shadow-sm space-y-4 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-2xl animate-pulse">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-slate-800">Critical Emergency Actions</h4>
                  <p className="text-[10px] text-slate-500 max-w-xs leading-normal">
                    Manually alert dispatchers and broadcast satellite warnings in the event of an accident or breakdown.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <button 
                    onClick={() => alert('Accident log page launched. Capture photo evidence.')}
                    className="py-2 px-2 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-xl"
                  >
                    Report Accident
                  </button>
                  <button 
                    onClick={() => alert('Vehicle breakdown alert sent. Mechanic dispatched.')}
                    className="py-2 px-2 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-xl"
                  >
                    Report Breakdown
                  </button>
                </div>

                <button
                  onClick={triggerSOS}
                  className="w-full bg-rose-650 hover:bg-rose-700 text-white font-black text-xs py-3 rounded-2xl transition-all shadow-md shadow-rose-600/10"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  BROADCAST EMERGENCY SOS
                </button>
              </div>

            </div>

          </div>

          {/* Notification List Widget */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-bold text-slate-400 block mb-1">RECENT ASSIGNED SYSTEM UPDATES</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                <span className="font-bold text-slate-805 block">Important Dispatch Announcement</span>
                <p className="text-[10px] text-slate-500 leading-normal mt-1">High winds forecast along Rajasthan corridors. Maintain caution at flyovers.</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                <span className="font-bold text-slate-805 block">Vehicle Service Reminder</span>
                <p className="text-[10px] text-slate-500 leading-normal mt-1">Scheduled filter tune-up is due for your vehicle in 3 days.</p>
              </div>
            </div>
          </div>

          {/* Footer details */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-400">
            <span>App Version: v2.4.0</span>
            <div className="flex gap-3">
              <a href="#" className="hover:underline">Help & Support</a>
              <span>•</span>
              <a href="#" className="hover:underline">Privacy Policy</a>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function checkpointsFilter(routeId: number) {
  if (routeId === 1) {
    return [
      { name: 'Delhi Exit Geofence', lat: 28.5200, lng: 77.1500, sequence: 1 },
      { name: 'Jaipur Bypass Checkpoint', lat: 26.9500, lng: 75.8500, sequence: 2 },
      { name: 'Udaipur Transit Station', lat: 24.5800, lng: 73.7100, sequence: 3 },
      { name: 'Ahmedabad Outer Ring', lat: 23.0500, lng: 72.6500, sequence: 4 },
      { name: 'Surat Security Plaza', lat: 21.1700, lng: 72.8300, sequence: 5 },
      { name: 'Mumbai Entrance Gate', lat: 19.1500, lng: 72.9500, sequence: 6 }
    ];
  } else {
    return [
      { name: 'Kalamboli Entry Geofence', lat: 19.0200, lng: 73.1000, sequence: 1 },
      { name: 'Khalapur Food Mall Checkpoint', lat: 18.8200, lng: 73.3000, sequence: 2 },
      { name: 'Talegaon Exit Checkpoint', lat: 18.7200, lng: 73.6800, sequence: 3 }
    ];
  }
}
