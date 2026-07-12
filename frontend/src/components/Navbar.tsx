'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Truck, Users, BarChart3, LogOut, ShieldAlert, CircleDot } from 'lucide-react';
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
    socket.on('new_alert', () => {
      fetchNotifications();
    });
    socket.on('notification_update', () => {
      fetchNotifications();
    });

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

  const navItems = [
    { name: 'Live Operations', href: '/dashboard', icon: Truck },
    { name: 'Vehicles', href: '/vehicles', icon: Truck },
    { name: 'Drivers', href: '/drivers', icon: Users },
    { name: 'Analytics & Reports', href: '/reports', icon: BarChart3 },
  ];

  if (!user) return null;

  return (
    <aside className="w-16 md:w-64 h-screen bg-white/90 backdrop-blur-md border-r border-slate-200 sticky top-0 flex flex-col justify-between py-6 px-3 md:px-4 shadow-sm z-30 transition-all duration-300">
      
      {/* Top Section: Brand & Nav Links */}
      <div className="space-y-8">
        
        {/* Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 select-none group px-1 md:px-2">
          <div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center shadow-md shadow-sky-600/10 group-hover:scale-105 transition-transform flex-shrink-0">
            <Truck className="w-5 h-5 text-white stroke-[2.5px]" />
          </div>
          <div className="hidden md:block leading-none">
            <span className="text-sm font-black text-slate-800 tracking-wider">TRANSITOPS</span>
            <span className="text-[9px] text-sky-600 block font-bold tracking-widest mt-0.5 leading-none">FLEET PORTAL</span>
          </div>
        </Link>

        {/* Navigation Stack */}
        <div className="flex flex-col gap-1.5">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/10'
                    : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                <span className="hidden md:inline">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Alerts Bell & Profile */}
      <div className="space-y-4">
        
        {/* Notification Bell */}
        <div className="relative px-1 md:px-2">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications && unreadCount > 0) {
                markAllAsRead();
              }
            }}
            className="w-full flex items-center justify-center md:justify-start gap-3 p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 transition-colors"
          >
            <div className="relative flex items-center justify-center">
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[8px] font-black text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-slate-600">Compliance Alerts</span>
          </button>

          {/* Notifications Dropdown (Opens relative to sidebar button) */}
          {showNotifications && (
            <div className="absolute left-12 md:left-full bottom-0 ml-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-scale-in">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
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

        {/* User Card & Logout Button */}
        <div className="border-t border-slate-200 pt-4 flex flex-col md:flex-row items-center gap-3 px-1 md:px-2">
          <div className="hidden md:block flex-1 min-w-0 select-none">
            <span className="text-xs font-bold text-slate-800 block truncate">{user.name}</span>
            <span className="text-[9px] font-bold text-sky-600 uppercase tracking-widest truncate block">{user.role}</span>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl border border-slate-200 hover:border-rose-200 transition-all flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

    </aside>
  );
}
