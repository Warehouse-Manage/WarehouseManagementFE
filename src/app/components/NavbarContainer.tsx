'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function NavbarContainer() {
  const pathname = usePathname();
  if (pathname === '/login') {
    return null;
  }
  return <Navbar />;
}


