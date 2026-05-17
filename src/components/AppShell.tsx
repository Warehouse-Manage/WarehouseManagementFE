'use client';

import { usePathname } from 'next/navigation';
import NavbarContainer from '@/components/NavbarContainer';
import ChatBot from '@/components/shared/ChatBot';

function isLoginRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/login' || pathname.startsWith('/login/');
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isLoginRoute(pathname)) {
    return <div className="min-h-[100dvh] w-full bg-gray-50">{children}</div>;
  }

  return (
    <>
      <NavbarContainer />
      <main className="mx-auto max-w-[1440px] w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>
      <ChatBot />
    </>
  );
}
