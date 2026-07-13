'use client';

import { Users, Shield, Key, LogOut, MonitorSmartphone } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  };

  const navItems = [
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Roles', href: '/admin/roles', icon: Shield },
    { name: 'Permissions', href: '/admin/permissions', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 flex text-white font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Admin<span className="text-indigo-400">Sphere</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                  isActive ? 'bg-indigo-600/10 text-indigo-400 font-medium' : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                }`}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-800 space-y-2">
          <Link href="/settings/sessions">
            <div className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-neutral-400 hover:bg-neutral-800/50 hover:text-white transition-colors cursor-pointer">
              <MonitorSmartphone className="w-5 h-5" />
              <span>My Devices</span>
            </div>
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-neutral-400 hover:bg-neutral-800/50 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm flex items-center px-8">
          <h1 className="text-lg font-medium text-neutral-200">Admin Dashboard</h1>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
