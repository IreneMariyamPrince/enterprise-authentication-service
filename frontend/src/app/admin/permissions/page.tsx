'use client';

import { useState, useEffect } from 'react';
import { Key, ShieldAlert } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://localhost:3000/permissions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setPermissions(data);
        } else if (res.status === 403) {
          setError('You do not have permission to view the permissions directory.');
        } else {
          setError('Failed to fetch permissions.');
        }
      } catch (err) {
        setError('A network error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Permissions</h2>
          <p className="text-neutral-400 mt-1">View all available system permissions.</p>
        </div>
      </div>

      {error ? (
        <div className="bg-rose-900/20 border border-rose-900 rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <ShieldAlert className="w-10 h-10 text-rose-500 mb-3" />
          <p className="text-rose-400 font-medium">{error}</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading permissions...</p>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-950/50 text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium">Added On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {permissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-neutral-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                          <Key className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-mono text-indigo-400 font-medium">{perm.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-neutral-300">{perm.description}</span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(perm.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {permissions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-neutral-500">
                      No permissions found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
