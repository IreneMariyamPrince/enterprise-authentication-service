'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Shield } from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  emailVerified: boolean;
  roles: Array<{ role: { name: string; level: number } }>;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://localhost:3000/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        } else if (res.status === 403) {
          setError('You do not have permission to view users.');
        } else {
          setError('Failed to fetch users.');
        }
      } catch (e) {
        setError('Network error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-neutral-400 mt-1">Manage system users, roles, and access.</p>
        </div>
        <button className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 border border-neutral-800 rounded-2xl bg-neutral-900/50 border-dashed">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-neutral-400">Loading users...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
          {error}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Roles</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-800/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300 font-bold uppercase mr-4 border border-neutral-700">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div>
                        <div className="font-medium text-white">{user.firstName} {user.lastName}</div>
                        <div className="text-neutral-500 text-xs mt-0.5">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      user.status === 'INACTIVE' ? 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20' :
                      'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((r) => (
                        <span key={r.role.name} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {r.role.level >= 80 && <Shield className="w-3 h-3 mr-1" />}
                          {r.role.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={`/admin/users/${user.id}/sessions`} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                        Sessions
                      </a>
                      <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="p-12 text-center text-neutral-500">
              No users found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
