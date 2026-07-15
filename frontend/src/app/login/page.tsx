'use client';

import { useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // MFA States
  const [showMfaScreen, setShowMfaScreen] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.mfaRequired) {
          setMfaToken(data.mfaToken);
          setShowMfaScreen(true);
          setStatus('idle');
          return;
        }

        setStatus('success');
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setMessage('Successfully logged in! Redirecting...');
        setTimeout(() => {
          window.location.href = '/admin/users';
        }, 1500);
      } else {
        setStatus('error');
        setMessage(data.message || 'Invalid credentials.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error occurred.');
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    const endpoint = useRecoveryCode ? 'http://localhost:3000/mfa/recovery' : 'http://localhost:3000/mfa/verify';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mfaToken}`
        },
        body: JSON.stringify({ code: mfaCode }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setMessage('Successfully verified! Redirecting...');
        setTimeout(() => {
          window.location.href = '/admin/users';
        }, 1500);
      } else {
        setStatus('error');
        setMessage(data.message || 'Invalid code.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
            {showMfaScreen ? <ShieldCheck className="w-6 h-6 text-white" /> : <Lock className="w-6 h-6 text-white" />}
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {showMfaScreen ? 'Two-Factor Auth' : 'Welcome back'}
          </h2>
          <p className="text-neutral-400 mt-2">
            {showMfaScreen 
              ? (useRecoveryCode ? 'Enter one of your 10-character backup codes.' : 'Enter the 6-digit code from your authenticator app.')
              : 'Sign in to your account to continue'}
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden p-8">
          {status === 'success' ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-emerald-400 text-center animate-pulse">
              {message}
            </div>
          ) : (
            !showMfaScreen ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-neutral-500" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-neutral-700 rounded-lg bg-neutral-950 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="password" className="block text-sm font-medium text-neutral-300">Password</label>
                    <Link href="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-neutral-500" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-neutral-700 rounded-lg bg-neutral-950 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {status === 'error' && (
                  <p className="text-red-400 text-sm">{message}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-neutral-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMfaSubmit} className="space-y-6">
                <div>
                  <input
                    type="text"
                    required
                    maxLength={useRecoveryCode ? 10 : 6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.toUpperCase())}
                    className="block w-full px-4 py-4 border border-neutral-700 rounded-lg bg-neutral-950 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors text-center text-2xl tracking-[0.5em] font-mono uppercase"
                    placeholder={useRecoveryCode ? "ABCDE12345" : "000000"}
                  />
                </div>

                {status === 'error' && (
                  <p className="text-red-400 text-sm text-center">{message}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-all disabled:opacity-50"
                >
                  {status === 'loading' ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verify Code'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecoveryCode(!useRecoveryCode);
                      setMfaCode('');
                      setMessage('');
                    }}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {useRecoveryCode ? 'Use authenticator app instead' : 'Use a recovery code'}
                  </button>
                </div>
              </form>
            )
          )}
        </div>

        {!showMfaScreen && (
          <p className="text-center mt-8 text-neutral-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
