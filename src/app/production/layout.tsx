'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Factory, Cpu, Wallet, Flame, Menu, X, ChevronLeft } from 'lucide-react';

const SIDEBAR_COOKIE = 'production_sidebar_collapsed';

function readSidebarCookie(): boolean {
  if (typeof document === 'undefined') return false;
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SIDEBAR_COOKIE}=`));
  if (!raw) return false;
  return raw.split('=')[1] === '1';
}

function writeSidebarCookie(collapsed: boolean) {
  if (typeof document === 'undefined') return;
  const value = collapsed ? '1' : '0';
  // 365 ngày, path=/ để mọi route /production/* đều dùng chung
  document.cookie = `${SIDEBAR_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export default function SanXuatLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Khởi tạo theo cookie; mặc định mở rộng (false)
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    setCollapsed(readSidebarCookie());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeSidebarCookie(collapsed);
  }, [collapsed, hydrated]);

  // Đóng drawer mobile khi đổi route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Khoá scroll nền khi mở overlay mobile
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const sidebarLinks = [
    {
      href: '/production/bricks',
      label: 'Quản lý lò gạch',
      icon: <Factory className="w-5 h-5" />,
    },
    {
      href: '/production/equipment',
      label: 'Thiết bị & IoT',
      icon: <Cpu className="w-5 h-5" />,
    },
    {
      href: '/production/kiln-system',
      label: 'Hệ thống lò gạch',
      icon: <Flame className="w-5 h-5" />,
    },
    {
      href: '/production/team-payment',
      label: 'Thanh toán tổ ra',
      icon: <Wallet className="w-5 h-5" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/production/bricks') {
      return pathname === '/production' || pathname === href;
    }
    return pathname?.startsWith(href);
  };

  const SidebarBody = (
    <div
      className={`flex flex-col bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl p-4 shadow-xl shadow-gray-200/50 h-full md:h-auto overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-3 mb-2">
        {!collapsed && (
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">
            Điều hành sản xuất
          </h2>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          className={`hidden md:inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-orange-600 transition-colors ${
            collapsed ? 'mx-auto' : ''
          }`}
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="space-y-2 flex-1 overflow-y-auto">
        {sidebarLinks.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              aria-label={collapsed ? link.label : undefined}
              className={`group flex items-center gap-4 px-4 py-3.5 text-sm font-black rounded-2xl transition-all duration-300 ${
                active
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 translate-x-1'
                  : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
              } ${collapsed ? 'md:justify-center md:gap-0 md:px-2' : ''}`}
            >
              <span
                className={`${
                  active
                    ? 'text-white'
                    : 'text-gray-400 group-hover:text-orange-500'
                } transition-colors flex-shrink-0`}
              >
                {link.icon}
              </span>
              <span className={`whitespace-nowrap ${collapsed ? 'md:hidden' : ''}`}>
                {link.label}
              </span>
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 bg-orange-300 rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer hint khi thu gọn (chỉ desktop) */}
      {collapsed && (
        <div className="hidden md:block mt-3 pt-3 border-t border-gray-100 text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
            Menu
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-120px)]">
      {/* Nút hamburger mobile - cố định góc trên-trái của khu vực content */}
      <div className="md:hidden mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Mở menu sản xuất"
          className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
          Điều hành sản xuất
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:gap-6">
        {/* Sidebar desktop - thu gọn được */}
        <aside
          className={`hidden md:block flex-shrink-0 transition-[width] duration-300 ease-in-out ${
            collapsed ? 'w-20' : 'w-72'
          }`}
        >
          <div className="sticky top-6">{SidebarBody}</div>
        </aside>

        {/* Overlay mobile */}
        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 flex"
            role="dialog"
            aria-modal="true"
            aria-label="Menu sản xuất"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <div className="relative w-72 max-w-[85vw] bg-white shadow-2xl h-full p-4 animate-in slide-in-from-left duration-300">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                  Điều hành sản xuất
                </h2>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Đóng menu"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-2">
                {sidebarLinks.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`group flex items-center gap-4 px-4 py-3.5 text-sm font-black rounded-2xl transition-all duration-300 ${
                        active
                          ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 translate-x-1'
                          : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                      }`}
                    >
                      <span
                        className={`${
                          active
                            ? 'text-white'
                            : 'text-gray-400 group-hover:text-orange-500'
                        } transition-colors flex-shrink-0`}
                      >
                        {link.icon}
                      </span>
                      <span className="whitespace-nowrap">{link.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 w-full">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
