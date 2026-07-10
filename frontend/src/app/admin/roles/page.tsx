'use client';

import { Shield, Plus } from 'lucide-react';

export default function RolesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles</h2>
          <p className="text-neutral-400 mt-1">Manage role definitions and access levels.</p>
        </div>
        <button className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          <span>Create Role</span>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center h-64 border border-neutral-800 rounded-2xl bg-neutral-900/50 border-dashed">
        <Shield className="w-12 h-12 text-neutral-700 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Roles Management Coming Soon</h3>
        <p className="text-neutral-400 text-center max-w-sm">
          Placeholder page for RBAC roles management. You will be able to create roles and assign permissions here.
        </p>
      </div>
    </div>
  );
}
