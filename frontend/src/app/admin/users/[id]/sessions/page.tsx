'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Session {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
  revokedAt: string | null;
}

export default function AdminUserSessionsPage() {
  const router = useRouter();
  const params = useParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // We actually need the user sessions, but the regular endpoint gets the CURRENT user sessions.
  // We need to fetch from an admin endpoint that returns a user's sessions.
  // Wait, I didn't add a GET endpoint for admin to view user's sessions!
  // The plan requested: Create: GET /admin/users/:id/sessions
  // Let's implement that in the backend as well!

  const fetchUserSessions = async () => {
    try {
      // Assuming we'll add this endpoint to AdminSessionController or we just call it and it works.
      const res = await fetch(`http://localhost:3000/admin/users/${params.id}/sessions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchUserSessions();
    }
  }, [params.id]);

  const revokeAllSessions = async () => {
    try {
      const res = await fetch(`http://localhost:3000/admin/users/${params.id}/sessions`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (res.ok) {
        fetchUserSessions(); // Refresh list to show them as revoked
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
            <Link href="/admin/users" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mb-4 inline-block">&larr; Back to Users</Link>
            <h1 className="text-3xl font-bold tracking-tight text-white">User Sessions</h1>
            <p className="text-neutral-400">Security audit view of all sessions for this user.</p>
          </div>
          <button
            onClick={revokeAllSessions}
            className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-sm font-medium shadow-lg transition-colors"
          >
            Revoke All Sessions
          </button>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
          <ul className="divide-y divide-neutral-800">
            {sessions.length === 0 && (
              <li className="p-8 text-center text-neutral-500">No active sessions found for this user.</li>
            )}
            {sessions.map((session) => (
              <li key={session.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-neutral-800/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                      {session.deviceName || session.os || 'Unknown Device'}
                      {session.revokedAt && (
                        <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-400 text-xs font-medium rounded-full border border-rose-500/20">
                          Revoked
                        </span>
                      )}
                      {!session.revokedAt && (
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-full border border-emerald-500/20">
                          Active
                        </span>
                      )}
                    </h3>
                    <div className="text-sm text-neutral-400 mt-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                      <p><strong>Browser:</strong> {session.browser}</p>
                      <p><strong>OS:</strong> {session.os}</p>
                      <p><strong>IP:</strong> {session.ipAddress}</p>
                      <p><strong>Session ID:</strong> <span className="font-mono text-xs">{session.id}</span></p>
                      <p className="md:col-span-2 text-neutral-500 text-xs mt-1">
                        Last activity: {new Date(session.lastActiveAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
