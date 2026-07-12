'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Bell, Truck, Users, Map, Navigation, Compass, Landmark, AlertCircle, 
  BarChart3, Wrench, Fuel, FileText, Settings, ShieldCheck, LogOut, 
  LayoutDashboard, HeartHandshake, CircleDot
} from 'lucide-react';
import { api, clearToken, getUser } from '@/utils/api';
import { io } from 'socket.io-client';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const activeUser = getUser();
    if (!activeUser) {
      router.push('/');
    } else {
      setUser(activeUser);
      fetchNotifications();
    }

    const socket = io('http://localhost:5000');
    const handleNewAlert = () => {
      fetchNotifications();
    };
    socket.on('new_alert', handleNewAlert);
    socket.on('notification_update', handleNewAlert);

    return () => {
      socket.disconnect();
    };
  }, [router]);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(data);
      const unreads = data.filter((n: any) => n.read === 0).length;
      setUnreadCount(unreads);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.push('/');
  };

  // The Dashboard points based on role:
  const isDriver = user?.role === 'Driver';

  const navItems = isDriver ? [
    { name: 'My Driver Dashboard', href: `/drivers/${user.id}`, icon: LayoutDashboard },
    { name: 'Notifications', href: '/alerts', icon: AlertCircle, badgeKey: 'alerts' },
    { name: 'Settings', href: '/settings', icon: Settings },
  ] : [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vehicle Management', href: '/vehicles', icon: Truck },
    { name: 'Driver Management', href: '/drivers', icon: Users },
    { name: 'Route Management', href: '/routes', icon: Map },
    { name: 'Trip Management', href: '/trips', icon: Navigation },
    { name: 'Live GPS Tracking', href: '/tracking', icon: Compass },
    { name: 'Toll Verification', href: '/toll-verification', icon: Landmark },
    { name: 'Alerts & Notifications', href: '/alerts', icon: AlertCircle, badgeKey: 'alerts' },
    { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench },
    { name: 'Fuel Management', href: '/fuel', icon: Fuel },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
    { name: 'User Management', href: '/users', icon: ShieldCheck },
  ];

  if (!user) return null;

  return (
    <aside className="w-16 md:w-64 h-screen bg-white/90 backdrop-blur-md border-r border-slate-200 sticky top-0 flex flex-col py-6 px-3 md:px-4 shadow-sm z-30 transition-all duration-300">
      
      {/* Top Section: Brand Logo */}
      <div className="flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 select-none group px-1 md:px-2">
          <div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center shadow-md shadow-sky-600/10 group-hover:scale-105 transition-transform flex-shrink-0">
            <Truck className="w-5 h-5 text-white stroke-[2.5px]" />
          </div>
          <div className="hidden md:block leading-none">
            <span className="text-sm font-black text-slate-800 tracking-wider">TransitOps</span>
            <span className="text-[8px] text-sky-600 block font-bold tracking-widest mt-0.5 leading-none">SMART TRANSPORT</span>
          </div>
        </Link>
      </div>

      {/* Middle Section: Scrollable Nav Items list */}
      <div className="flex-1 overflow-y-auto my-5 pr-1 space-y-1 scrollbar-thin">
        {navItems.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isAlertsItem = item.badgeKey === 'alerts';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/10'
                  : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="hidden md:inline whitespace-nowrap">{item.name}</span>
              </div>
              {isAlertsItem && unreadCount > 0 && (
                <span className="hidden md:flex h-4.5 px-1.5 min-w-4.5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white leading-none">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Section: Support Card, Profile & Footer */}
      <div className="space-y-4 pt-4 border-t border-slate-150 flex-shrink-0">
        
        {/* Alerts Bell notification popover */}
        <div className="relative px-1">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications && unreadCount > 0) {
                markAllAsRead();
              }
            }}
            className="w-full flex items-center justify-center md:justify-start gap-3 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 transition-colors"
          >
            <div className="relative flex items-center justify-center">
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[8px] font-black text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-slate-600">Quick Notifications</span>
          </button>

          {showNotifications && (
            <div className="absolute left-12 md:left-full bottom-0 ml-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-scale-in">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CircleDot className="w-3.5 h-3.5 text-rose-500" />
                  Live Compliance Alerts
                </span>
                <button
                  onClick={fetchNotifications}
                  className="text-[10px] text-sky-600 font-bold hover:underline"
                >
                  Reload
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-150">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-500">
                    No recent alerts recorded.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-3 text-[11px] flex gap-2.5 transition-colors ${
                        n.read === 0 ? 'bg-sky-50/40' : 'bg-white'
                      }`}
                    >
                      <CircleDot className="w-2 h-2 text-rose-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-slate-700 leading-normal">{n.message}</p>
                        <span className="text-[9px] text-slate-400 block mt-1.5">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 24/7 Support Box (From screenshot) */}
        <div className="hidden md:block bg-sky-50/50 border border-sky-100 p-3 rounded-2xl">
          <div className="flex items-start gap-2.5">
            <div className="p-1 bg-sky-100 rounded-lg text-sky-650 mt-0.5">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-800 block">24/7 Support</span>
              <span className="text-[9px] text-slate-500 block">Need help with dispatch?</span>
            </div>
          </div>
          <button 
            onClick={() => alert('Support helpline initiated. Calling dispatch officer...')}
            className="w-full mt-2.5 bg-sky-600 hover:bg-sky-750 text-white font-bold text-[9px] py-1.5 px-3 rounded-lg transition-colors text-center"
          >
            Contact Support
          </button>
        </div>

        {/* User Card & Logout Button */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="hidden md:block flex-1 min-w-0 select-none">
            <span className="text-xs font-bold text-slate-800 block truncate">{user?.name || 'Fleet Manager'}</span>
            <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest truncate block">{user?.role || 'Admin'}</span>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl border border-slate-200 hover:border-rose-200 transition-all flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Footer copyright (From screenshot) */}
        <div className="hidden md:block text-[8px] text-slate-400 select-none text-center">
          &copy; 2024 TransitOps. All rights reserved.
        </div>

      </div>

    </aside>
  );
}
