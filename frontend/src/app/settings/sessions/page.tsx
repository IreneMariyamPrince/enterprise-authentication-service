'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Session {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export default function SessionsSettingsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:3000/sessions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const revokeSession = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3000/sessions/${id}/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (res.ok) fetchSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const revokeAll = async () => {
    try {
      const res = await fetch(`http://localhost:3000/sessions/revoke-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (res.ok) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        router.push('/login');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans">
      <div className="max-w-5xl mx-auto py-12 px-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Device Activity</h1>
            <p className="text-neutral-400">Manage the devices that are signed in to your account.</p>
          </div>
          <button
            onClick={revokeAll}
            className="px-4 py-2 bg-rose-600/10 text-rose-500 hover:bg-rose-600/20 border border-rose-600/20 rounded-lg text-sm font-medium transition-colors"
          >
            Logout From All Devices
          </button>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
          <ul className="divide-y divide-neutral-800">
            {sessions.map((session) => (
              <li key={session.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-neutral-800/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-neutral-800 rounded-lg shrink-0">
                    {session.deviceName?.toLowerCase().includes('iphone') || session.os?.toLowerCase().includes('ios') || session.os?.toLowerCase().includes('android') ? (
                      <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                      {session.deviceName || session.os || 'Unknown Device'}
                      {session.isCurrent && (
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                          Current Session
                        </span>
                      )}
                    </h3>
                    <div className="text-sm text-neutral-400 mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                      <p><strong>Browser:</strong> {session.browser || 'Unknown'}</p>
                      <p><strong>OS:</strong> {session.os || 'Unknown'}</p>
                      <p><strong>IP:</strong> {session.ipAddress || 'Unknown'}</p>
                      <p><strong>Signed in:</strong> {new Date(session.createdAt).toLocaleDateString()}</p>
                      <p className="md:col-span-2 text-neutral-500 text-xs mt-1">
                        Last activity: {new Date(session.lastActiveAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    className="shrink-0 px-4 py-2 bg-neutral-800 text-white hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Revoke Access
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-8 text-center">
          <Link href="/admin/users" className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
