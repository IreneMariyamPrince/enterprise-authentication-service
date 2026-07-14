'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Globe, Monitor, MapPin } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  category: string;
  status: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  createdAt: string;
}

export default function SecurityActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyLogs();
  }, []);

  const fetchMyLogs = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:3000/audit-logs/me?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data);
      } else {
        setError('Failed to load activity logs.');
      }
    } catch (err) {
      setError('Network error while fetching logs.');
    } finally {
      setLoading(false);
    }
  };

  const getIconForAction = (action: string) => {
    if (action.includes('LOGIN')) return <Globe className="w-5 h-5 text-blue-400" />;
    if (action.includes('MFA')) return <Shield className="w-5 h-5 text-emerald-400" />;
    if (action.includes('SESSION')) return <Monitor className="w-5 h-5 text-indigo-400" />;
    return <Smartphone className="w-5 h-5 text-neutral-400" />;
  };

  const formatAction = (action: string) => {
    return action.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Security Activity</h1>
        <p className="text-neutral-400 mt-2">
          Review recent security events on your account. If you see something unfamiliar, change your password immediately.
        </p>
      </div>

      {error ? (
        <div className="bg-rose-900/20 border border-rose-900 text-rose-400 p-4 rounded-lg">
          {error}
        </div>
      ) : loading ? (
        <div className="text-neutral-500 text-center py-10">Loading your activity...</div>
      ) : (
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-800 before:to-transparent">
          {logs.map((log) => (
            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              {/* Icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-neutral-700 bg-neutral-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                {getIconForAction(log.action)}
              </div>
              
              {/* Card */}
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900 transition-colors shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-white text-sm">{formatAction(log.action)}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${log.status === 'SUCCESS' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' : 'text-rose-400 border-rose-400/20 bg-rose-400/10'}`}>
                    {log.status}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 mb-3">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-neutral-400">
                  {log.ipAddress && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {log.ipAddress}
                    </div>
                  )}
                  {log.browser && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {log.browser} on {log.os}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center text-neutral-500 py-10 relative z-10">
              No recent security activity.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
