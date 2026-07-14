'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface MfaStatus {
  enabled: boolean;
  emailOtpEnabled: boolean;
  lastVerifiedAt: string | null;
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Setup Flow
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState('');

  // Password confirmation
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<{ action: 'disable' | 'regenerate', visible: boolean }>({ action: 'disable', visible: false });
  const [password, setPassword] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:3000/mfa/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
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
    fetchStatus();
  }, []);

  const initiateSetup = async () => {
    setError('');
    try {
      const res = await fetch('http://localhost:3000/mfa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (res.ok) {
        setSetupData(await res.json());
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to start setup');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  const enableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:3000/mfa/enable', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
        },
        body: JSON.stringify({ code: setupCode })
      });
      
      const data = await res.json();
      if (res.ok) {
        setRecoveryCodes(data.recoveryCodes);
        setSetupData(null);
        setSetupCode('');
        fetchStatus();
      } else {
        setError(data.message || 'Invalid code');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  const handlePasswordConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const action = showPasswordPrompt.action;
    const url = action === 'disable' ? 'http://localhost:3000/mfa/disable' : 'http://localhost:3000/mfa/regenerate-backup-codes';
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
        },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      if (res.ok) {
        setShowPasswordPrompt({ ...showPasswordPrompt, visible: false });
        setPassword('');
        if (action === 'disable') {
          fetchStatus();
        } else {
          setRecoveryCodes(data.recoveryCodes);
        }
      } else {
        setError(data.message || 'Incorrect password');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  if (loading) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-neutral-800 p-6 hidden md:block">
        <h2 className="text-xl font-bold text-white mb-8">Settings</h2>
        <nav className="space-y-2">
          <Link href="/settings/sessions" className="block px-4 py-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors">My Devices</Link>
          <Link href="/settings/security" className="block px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all">Security & MFA</Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl p-8 md:p-12">
        <h1 className="text-3xl font-bold text-white mb-2">Two-Factor Authentication</h1>
        <p className="text-neutral-400 mb-10">Add an extra layer of security to your account. We recommend using a TOTP app like Google Authenticator or Authy.</p>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/50 text-rose-400 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Status Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Authenticator App</h3>
            <p className="text-sm text-neutral-400">
              {status?.enabled ? 'MFA is currently active on your account.' : 'Not configured. Your account is vulnerable.'}
            </p>
            {status?.lastVerifiedAt && (
              <p className="text-xs text-neutral-500 mt-2">Last verified: {new Date(status.lastVerifiedAt).toLocaleString()}</p>
            )}
          </div>
          <div>
            {status?.enabled ? (
              <button 
                onClick={() => setShowPasswordPrompt({ action: 'disable', visible: true })}
                className="px-4 py-2 bg-rose-600/10 text-rose-500 hover:bg-rose-600/20 rounded-lg text-sm font-medium transition-colors border border-rose-600/20"
              >
                Disable MFA
              </button>
            ) : (
              <button 
                onClick={initiateSetup}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors shadow-lg"
              >
                Enable MFA
              </button>
            )}
          </div>
        </div>

        {/* Setup Wizard */}
        {setupData && !status?.enabled && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 mb-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-xl font-bold text-white mb-6">Setup Authenticator App</h3>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="bg-white p-4 rounded-xl flex-shrink-0">
                <Image src={setupData.qrCode} alt="QR Code" width={180} height={180} />
              </div>
              <div className="flex-1">
                <p className="text-neutral-300 mb-4">
                  1. Install an authenticator app (Google Authenticator, Authy, etc.) on your phone. <br/>
                  2. Scan the QR code to the left with your app. <br/>
                  3. Enter the 6-digit code generated by your app below.
                </p>
                <form onSubmit={enableMfa} className="flex gap-4">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 px-4 py-3 bg-neutral-950 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-center text-xl tracking-[0.5em]"
                  />
                  <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg">
                    Verify
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Recovery Codes */}
        {status?.enabled && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Recovery Codes</h3>
                <p className="text-sm text-neutral-400">Recovery codes can be used to access your account if you lose your device.</p>
              </div>
              <button 
                onClick={() => setShowPasswordPrompt({ action: 'regenerate', visible: true })}
                className="px-4 py-2 bg-neutral-800 text-white hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors border border-neutral-700"
              >
                Regenerate Codes
              </button>
            </div>
            
            {recoveryCodes ? (
              <div className="mt-6 p-6 bg-neutral-950 border border-neutral-800 rounded-lg">
                <div className="flex items-center gap-3 mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-sm">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <strong>Important:</strong> Save these codes in a secure location (like a password manager). This is the ONLY time they will be displayed. Each code can only be used once.
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
                  {recoveryCodes.map((c, i) => (
                    <div key={i} className="font-mono text-sm bg-neutral-900 p-2 rounded text-center text-indigo-300 border border-neutral-800">
                      {c}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-neutral-950 rounded-lg border border-neutral-800 text-neutral-500 text-sm flex items-center justify-between">
                <span>Backup codes are hidden for security.</span>
              </div>
            )}
          </div>
        )}

        {/* Password Prompt Modal */}
        {showPasswordPrompt.visible && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-white mb-2">Confirm your password</h3>
              <p className="text-neutral-400 text-sm mb-6">
                Please enter your password to {showPasswordPrompt.action === 'disable' ? 'disable MFA' : 'regenerate backup codes'}.
              </p>
              <form onSubmit={handlePasswordConfirm}>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all mb-6"
                />
                <div className="flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => { setShowPasswordPrompt({ ...showPasswordPrompt, visible: false }); setPassword(''); setError(''); }}
                    className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={`px-6 py-2 text-white rounded-lg font-medium shadow-lg transition-colors ${showPasswordPrompt.action === 'disable' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
