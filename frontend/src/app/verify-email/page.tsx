'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch('http://localhost:3000/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Your email has been successfully verified.');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed.');
        }
      } catch {
        setStatus('error');
        setMessage('Network error occurred.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl overflow-hidden p-8">
        <div className="text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center">
              <Loader2 className="h-16 w-16 text-indigo-500 animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Verifying Email...</h2>
              <p className="text-neutral-400">Please wait while we confirm your email address.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-16 w-16 text-emerald-500 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Verified!</h2>
              <p className="text-neutral-400 mb-6">{message}</p>
              <a href="/login" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white rounded-lg font-medium">
                Continue to Login
              </a>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center">
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
              <p className="text-neutral-400 mb-6">{message}</p>
              <a href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Back to Login
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
