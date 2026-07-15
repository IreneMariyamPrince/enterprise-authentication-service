'use client';

import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Key, X, Check, Loader2 } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  isSystem: boolean;
  permissions?: { permission: Permission }[];
}

interface Permission {
  id: string;
  name: string;
  description: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals state
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Role | null>(null);
  const [showDelete, setShowDelete] = useState<Role | null>(null);
  const [showPerms, setShowPerms] = useState<Role | null>(null);

  // Form states
  const [formData, setFormData] = useState({ name: '', description: '', level: 0 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    'Content-Type': 'application/json'
  });

  const fetchRoles = async () => {
    try {
      const res = await fetch('http://localhost:3000/roles', { headers: getAuthHeaders() });
      if (res.ok) {
        setRoles(await res.json());
      } else {
        setError('Failed to fetch roles.');
      }
    } catch (err) {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await fetch('http://localhost:3000/permissions', { headers: getAuthHeaders() });
      if (res.ok) setPermissions(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:3000/roles', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowCreate(false);
        fetchRoles();
        setFormData({ name: '', description: '', level: 0 });
      } else {
        const d = await res.json();
        alert(d.message || 'Failed to create role');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:3000/roles/${showEdit.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowEdit(null);
        fetchRoles();
      } else {
        alert('Failed to update role');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:3000/roles/${showDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setShowDelete(null);
        fetchRoles();
      } else {
        alert('Failed to delete role');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePermission = async (roleId: string, permissionId: string, hasIt: boolean) => {
    try {
      if (hasIt) {
        // Remove
        const res = await fetch(`http://localhost:3000/roles/${roleId}/permissions/${permissionId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          // Update local state for immediate feedback
          setShowPerms(prev => prev ? {
            ...prev,
            permissions: prev.permissions?.filter(p => p.permission.id !== permissionId)
          } : null);
          fetchRoles(); // Sync background
        }
      } else {
        // Add
        const res = await fetch(`http://localhost:3000/roles/${roleId}/permissions`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ permissionId })
        });
        if (res.ok) {
          const addedPerm = permissions.find(p => p.id === permissionId);
          if (addedPerm) {
            setShowPerms(prev => prev ? {
              ...prev,
              permissions: [...(prev.permissions || []), { permission: addedPerm }]
            } : null);
          }
          fetchRoles(); // Sync background
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
          <h2 className="text-2xl font-bold tracking-tight text-white">Roles</h2>
          <p className="text-neutral-400 mt-1">Manage role definitions and access levels.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ name: '', description: '', level: 0 });
            setShowCreate(true);
          }}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Role</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading roles...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-900/20 border border-rose-900 rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <p className="text-rose-400 font-medium">{error}</p>
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-950/50 text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Role Name</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium text-center">Level</th>
                  <th className="px-6 py-4 font-medium text-center">Type</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-neutral-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role.isSystem ? 'bg-indigo-500/10' : 'bg-emerald-500/10'}`}>
                          <Shield className={`w-4 h-4 ${role.isSystem ? 'text-indigo-400' : 'text-emerald-400'}`} />
                        </div>
                        <div>
                          <p className={`font-medium ${role.isSystem ? 'text-indigo-400' : 'text-emerald-400'}`}>{role.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-neutral-300">{role.description}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-neutral-400">{role.level}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {role.isSystem ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">System</span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Custom</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setShowPerms(role)}
                          className="text-amber-400 hover:text-amber-300 text-sm font-medium flex items-center gap-1"
                        >
                          <Key className="w-4 h-4" /> Perms
                        </button>
                        <button 
                          onClick={() => {
                            setFormData({ name: role.name, description: role.description, level: role.level });
                            setShowEdit(role);
                          }}
                          className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1"
                        >
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        {!role.isSystem && (
                          <button 
                            onClick={() => setShowDelete(role)}
                            className="text-rose-400 hover:text-rose-300 text-sm font-medium flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
              <h3 className="text-xl font-semibold text-white">Create New Role</h3>
              <button onClick={() => setShowCreate(false)} className="text-neutral-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Role Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Support Agent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Description</label>
                <input 
                  type="text" 
                  required 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Can assist users"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Access Level (0-100)</label>
                <input 
                  type="number" 
                  required 
                  min="0" max="100"
                  value={formData.level}
                  onChange={e => setFormData({...formData, level: parseInt(e.target.value)})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg mt-4 disabled:opacity-50">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Role'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
              <h3 className="text-xl font-semibold text-white">Edit Role: {showEdit.name}</h3>
              <button onClick={() => setShowEdit(null)} className="text-neutral-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Role Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Description</label>
                <input 
                  type="text" 
                  required 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Access Level (0-100)</label>
                <input 
                  type="number" 
                  required 
                  min="0" max="100"
                  value={formData.level}
                  onChange={e => setFormData({...formData, level: parseInt(e.target.value)})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg mt-4 disabled:opacity-50">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Delete Role</h3>
            <p className="text-neutral-400 mb-6">Are you sure you want to delete the role <strong className="text-white">{showDelete.name}</strong>? This action cannot be undone.</p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDelete(null)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-medium py-2 rounded-lg transition-colors flex justify-center"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMISSIONS MANAGER MODAL */}
      {showPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800 shrink-0">
              <div>
                <h3 className="text-xl font-semibold text-white">Manage Permissions</h3>
                <p className="text-neutral-400 text-sm mt-1">Assign or revoke permissions for <strong className="text-indigo-400">{showPerms.name}</strong></p>
              </div>
              <button onClick={() => setShowPerms(null)} className="text-neutral-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-neutral-950/30">
              {permissions.map(perm => {
                const hasIt = showPerms.permissions?.some(p => p.permission.id === perm.id);
                return (
                  <div key={perm.id} className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors">
                    <div>
                      <p className="font-mono text-sm text-neutral-200">{perm.name}</p>
                      <p className="text-xs text-neutral-500 mt-1">{perm.description}</p>
                    </div>
                    <button
                      onClick={() => togglePermission(showPerms.id, perm.id, !!hasIt)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasIt ? 'bg-indigo-600' : 'bg-neutral-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasIt ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                );
              })}
            </div>
            
            <div className="p-6 border-t border-neutral-800 shrink-0 bg-neutral-900">
              <button 
                onClick={() => setShowPerms(null)}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
