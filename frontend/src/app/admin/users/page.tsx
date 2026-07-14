'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Shield, X, Key } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  isSystem: boolean;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  emailVerified: boolean;
  roles: Array<{ role: Role }>;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showEdit, setShowEdit] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:3000/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setUsers(await res.json());
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

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch('http://localhost:3000/roles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAllRoles(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const toggleUserRole = async (userId: string, roleId: string, hasRole: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      
      if (hasRole) {
        // Revoke
        const res = await fetch(`http://localhost:3000/users/${userId}/roles/${roleId}`, {
          method: 'DELETE',
          headers
        });
        if (res.ok) {
          // Update local edit state
          setShowEdit(prev => prev ? {
            ...prev,
            roles: prev.roles.filter(r => r.role.id !== roleId)
          } : null);
          fetchUsers();
        } else {
          const d = await res.json();
          alert(d.message || 'Failed to remove role');
        }
      } else {
        // Assign
        const res = await fetch(`http://localhost:3000/users/${userId}/roles`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ roleId })
        });
        if (res.ok) {
          const addedRole = allRoles.find(r => r.id === roleId);
          if (addedRole) {
            setShowEdit(prev => prev ? {
              ...prev,
              roles: [...prev.roles, { role: addedRole }]
            } : null);
          }
          fetchUsers();
        } else {
          const d = await res.json();
          alert(d.message || 'Failed to add role');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Users</h2>
          <p className="text-neutral-400 mt-1">Manage system users, roles, and access.</p>
        </div>
        <button 
          onClick={() => alert("Add User modal is part of standard User Management, coming soon!")}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
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
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-center">
          {error}
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
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
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((r) => (
                        <span key={r.role.id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
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
                      <a href={`/admin/users/${user.id}/mfa`} className="text-amber-400 hover:text-amber-300 text-sm font-medium">
                        MFA
                      </a>
                      <button 
                        onClick={() => setShowEdit(user)}
                        className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                      >
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

      {/* EDIT MODAL for ROLES */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800 shrink-0">
              <div>
                <h3 className="text-xl font-semibold text-white">Manage User Roles</h3>
                <p className="text-neutral-400 text-sm mt-1">Assign or revoke roles for <strong className="text-indigo-400">{showEdit.firstName} {showEdit.lastName}</strong></p>
              </div>
              <button onClick={() => setShowEdit(null)} className="text-neutral-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-neutral-950/30">
              {allRoles.map(role => {
                const hasRole = showEdit.roles.some(r => r.role.id === role.id);
                return (
                  <div key={role.id} className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${role.isSystem ? 'text-indigo-400' : 'text-emerald-400'}`}>{role.name}</p>
                        <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full border border-neutral-700">Lvl {role.level}</span>
                      </div>
                      <p className="text-sm text-neutral-500 mt-1">{role.description}</p>
                    </div>
                    <button
                      onClick={() => toggleUserRole(showEdit.id, role.id, hasRole)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasRole ? 'bg-indigo-600' : 'bg-neutral-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasRole ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
            
            <div className="p-6 border-t border-neutral-800 shrink-0 bg-neutral-900">
              <button 
                onClick={() => setShowEdit(null)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
