'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings, FileText, LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('hotel_user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserEmail(userData.email || '');
      } catch (e) {
        setUserEmail('User');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('hotel_token');
    localStorage.removeItem('hotel_user');
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/users', label: 'Brugere', icon: Users },
    { href: '/mews', label: 'Mews Config', icon: Settings },
    { href: '/gdpr', label: 'GDPR Logs', icon: FileText },
  ];

  const getPageTitle = () => {
    if (pathname.includes('dashboard')) return 'Dashboard';
    if (pathname.includes('users')) return 'Brugere';
    if (pathname.includes('mews')) return 'Mews Configuration';
    if (pathname.includes('gdpr')) return 'GDPR Audit Logs';
    return 'Hotel Viking Admin';
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar Header - Hotel Viking Logo */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-gray-100">
          <Image
            src="/hotel-viking-logo.png"
            alt="Hotel Viking"
            width={160}
            height={78}
            className="object-contain"
            priority
            unoptimized
          />
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                pathname === href
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-100 p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden">
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
          </div>
          <div className="text-sm text-gray-600 font-medium">{userEmail}</div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="p-6 max-w-7xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
