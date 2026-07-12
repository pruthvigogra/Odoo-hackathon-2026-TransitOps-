'use client';

import { useState } from 'react';
import { ShieldCheck, Plus, Search, UserCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function UsersPage() {
  const [users, setUsers] = useState([
    { id: 1, name: 'Operations Manager', email: 'manager@transitops.com', role: 'Fleet Manager', phone: '+91 99999 11111', status: 'Active' },
    { id: 2, name: 'System Administrator', email: 'admin@transitops.com', role: 'Admin', phone: '+91 99999 22222', status: 'Active' },
    { id: 3, name: 'Tanisha Sharma', email: 'tanisha@transitops.com', role: 'Dispatcher Officer', phone: '+91 99999 33333', status: 'Active' },
    { id: 4, name: 'Rahul Sen', email: 'rahul@transitops.com', role: 'Driver Auditor', phone: '+91 99999 44444', status: 'Restricted' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex text-slate-800 custom-page-bg">
      <Navbar />

      <main className="flex-1 p-6 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-600" />
                Fleet Portal User Accounts
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Control dispatcher sign-in authorizations, dashboard roles, and system permission overrides.</p>
            </div>
            <button 
              onClick={() => alert('New user registration flow initiated.')}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-750 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-600/10"
            >
              <Plus className="w-4 h-4 stroke-[2.5px]" />
              Add User
            </button>
          </div>

          {/* Search bar */}
          <div className="relative bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
            <input
              type="text"
              placeholder="Search user registry by name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none"
            />
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase select-none">
                    <th className="px-5 py-3.5">User Details</th>
                    <th className="px-5 py-3.5">Email Address</th>
                    <th className="px-5 py-3.5">Portal Role</th>
                    <th className="px-5 py-3.5">Mobile Phone</th>
                    <th className="px-5 py-3.5">Access Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-extrabold text-slate-800 text-sm block">{u.name}</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Console Access Granted</span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">{u.email}</td>
                      <td className="px-5 py-4 text-sky-650 font-bold">{u.role}</td>
                      <td className="px-5 py-4 text-slate-500">{u.phone}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase border flex items-center gap-1 w-max ${
                          u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <UserCheck className="w-3.5 h-3.5" />
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
