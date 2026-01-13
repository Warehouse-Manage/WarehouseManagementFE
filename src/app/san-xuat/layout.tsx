'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Factory, Cpu } from 'lucide-react';

export default function SanXuatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const sidebarLinks = [
    {
      href: '/san-xuat/lo-gach',
      label: 'Quản lý lò gạch',
      icon: <Factory className="w-5 h-5" />,
    },
    {
      href: '/san-xuat/thiet-bi',
      label: 'Thiết bị & IoT',
      icon: <Cpu className="w-5 h-5" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/san-xuat/lo-gach') {
      return pathname === '/san-xuat' || pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] gap-6">
      {/* Sidebar - Modern Floating Design */}
      <aside className="w-full md:w-72 flex-shrink-0">
        <div className="sticky top-6 flex flex-col bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl p-4 shadow-xl shadow-gray-200/50">
          <div className="px-4 py-4 mb-2">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Điều hành sản xuất</h2>
          </div>

          <nav className="space-y-2">
            {sidebarLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center gap-4 px-4 py-3.5 text-sm font-black rounded-2xl transition-all duration-300 ${active
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 translate-x-1'
                    : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                >
                  <span className={`${active ? 'text-white' : 'text-gray-400 group-hover:text-orange-500'} transition-colors`}>
                    {link.icon}
                  </span>
                  {link.label}
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 bg-orange-300 rounded-full animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
          {children}
        </div>
      </main>
    </div>
  );
}

