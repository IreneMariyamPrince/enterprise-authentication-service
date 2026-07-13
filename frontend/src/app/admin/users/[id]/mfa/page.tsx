'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

interface UserMfaStatus {
  enabled: boolean;
  emailOtpEnabled: boolean;
  lastVerifiedAt: string | null;
  failedAttempts: number;
  lockedUntil: string | null;
}

export default function AdminUserMfaPage() {
  const params = useParams();
  const [status, setStatus] = useState<UserMfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const fetchUserMfa = async () => {
    try {
      const res = await fetch(`http://localhost:3000/admin/users/${params.id}/mfa`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (res.ok) {
        setStatus(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchUserMfa();
    }
  }, [params.id]);

  const resetUserMfa = async () => {
    if (!confirm('Are you absolutely sure you want to disable MFA for this user? They will be able to log in with only their password.')) return;
    
    setResetting(true);
    try {
      const res = await fetch(`http://localhost:3000/admin/users/${params.id}/mfa/reset`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (res.ok) {
        fetchUserMfa(); // Refresh
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">Loading...</div>;

  const isLocked = status?.lockedUntil && new Date(status.lockedUntil) > new Date();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans">
      <div className="max-w-5xl mx-auto py-12 px-6">
        <div className="mb-8">
          <Link href="/admin/users" className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mb-4 inline-block">&larr; Back to Users</Link>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            User MFA Status
          </h1>
          <p className="text-neutral-400 mt-2">View and manage Multi-Factor Authentication settings for this user.</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl p-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {status?.enabled ? (
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
                ) : (
                  <ShieldAlert className="w-8 h-8 text-neutral-500" />
                )}
                <h2 className="text-2xl font-semibold text-white">
                  {status?.enabled ? 'MFA is Enabled' : 'MFA is Disabled'}
                </h2>
              </div>
              <p className="text-neutral-400 mb-6">
                {status?.enabled ? 'The user requires a TOTP code to log in.' : 'The user only needs their password to log in.'}
              </p>
              
              <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
                <div>
                  <span className="text-neutral-500 block mb-1">Failed Attempts</span>
                  <span className="text-white font-mono text-lg">{status?.failedAttempts || 0}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block mb-1">Lockout Status</span>
                  {isLocked ? (
                    <span className="text-rose-400 font-medium">Locked until {new Date(status!.lockedUntil!).toLocaleTimeString()}</span>
                  ) : (
                    <span className="text-emerald-400 font-medium">Not locked</span>
                  )}
                </div>
                <div className="col-span-2">
                  <span className="text-neutral-500 block mb-1">Last Verified At</span>
                  <span className="text-neutral-300">
                    {status?.lastVerifiedAt ? new Date(status.lastVerifiedAt).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 max-w-sm">
              <h3 className="text-white font-medium mb-2 text-rose-400">Emergency Access</h3>
              <p className="text-neutral-400 text-sm mb-4">
                If the user has lost access to their authenticator app and recovery codes, you can force-disable their MFA.
              </p>
              <button
                onClick={resetUserMfa}
                disabled={!status?.enabled || resetting}
                className="w-full py-2 bg-rose-600/10 text-rose-500 hover:bg-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors border border-rose-600/20 flex items-center justify-center gap-2"
              >
                {resetting && <Loader2 className="w-4 h-4 animate-spin" />}
                Force Disable MFA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
