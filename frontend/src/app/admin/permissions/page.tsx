'use client';

import { Key } from 'lucide-react';

export default function PermissionsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Permissions</h2>
          <p className="text-neutral-400 mt-1">View all available system permissions.</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center h-64 border border-neutral-800 rounded-2xl bg-neutral-900/50 border-dashed">
        <Key className="w-12 h-12 text-neutral-700 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Permissions Directory Coming Soon</h3>
        <p className="text-neutral-400 text-center max-w-sm">
          Placeholder page for the permissions directory. System permissions are immutable and managed via codebase.
        </p>
      </div>
    </div>
  );
}
