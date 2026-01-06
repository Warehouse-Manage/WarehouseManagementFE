'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import NotificationRequest from './Notification';
import { getCookie } from '@/lib/ultis';

export default function Navbar() {
  const pathname = usePathname();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userInitial, setUserInitial] = useState('U');
  const [role, setRole] = useState<string | null>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  
  // Lấy userName và role từ cookie khi component mount
  useEffect(() => {
    const userName = getCookie('userName') || 'U';
    setUserInitial(userName.charAt(0).toUpperCase());
    const r = getCookie('role');
    setRole(r);
  }, []);

  const isMaterials = pathname === '/' || pathname === '/';
  const isVatTu = pathname?.startsWith('/vat-tu');
  const isAttendance = pathname?.startsWith('/attendance');
  const isProduction = pathname?.startsWith('/san-xuat');
  const isProducts = pathname?.startsWith('/products');
  const isNguyenLieu = pathname?.startsWith('/nguyen-lieu');
  const isCustomers = pathname?.startsWith('/customers');
  const isDelivers = pathname?.startsWith('/delivers');
  const isOrders = pathname?.startsWith('/orders');
  const isFunds = pathname?.startsWith('/funds');

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is on mobile menu button - if so, don't close
      const mobileMenuButton = (event.target as HTMLElement)?.closest('button[aria-label="Toggle mobile menu"]');
      if (mobileMenuButton) {
        return;
      }
      
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setIsUserDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const baseLink = 'transition-colors px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 rounded-none';
  const linkSize = 'text-sm md:text-base';
  const active = 'bg-orange-600 text-white font-black';
  const inactive = 'bg-gray-400 text-white hover:bg-gray-500 font-bold';

  const handleUserAction = async (action: string) => {
    setIsUserDropdownOpen(false);
    setIsMobileMenuOpen(false);
    switch (action) {
      case 'view-requests':
        console.log('Xem yêu cầu');
        // TODO: Navigate to user requests page
        break;
      case 'change-password':
        console.log('Đổi mật khẩu');
        // TODO: Open change password modal
        break;
      case 'create-user':
        window.location.href = '/create-user';
        break;
      case 'logout':
        try {
          if (true) {
            // Xóa cookies
            document.cookie = 'role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'userName=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            
            // Redirect to login page
            window.location.href = '/login';
          } else {
            console.error('Lỗi đăng xuất');
            alert('Có lỗi xảy ra khi đăng xuất');
          }
        } catch (error) {
          console.error('Lỗi kết nối:', error);
          // Vẫn xóa cookies và redirect ngay cả khi có lỗi
          document.cookie = 'role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'userName=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          window.location.href = '/login';
        }
        break;
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-white shadow-sm">
      <div className="h-14 flex items-center justify-between px-4">
        {/* Logo/Brand - left side */}
        <div className="flex items-center">
          <Link href="/" aria-label="Trang chủ">
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-full border border-gray-200"
              priority
            />
          </Link>
        </div>

        {/* Desktop Navigation - hidden on mobile */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="inline-flex items-center overflow-hidden rounded-lg">
            <Link
              href="/"
              aria-current={isMaterials ? 'page' : undefined}
              className={`${baseLink} ${linkSize} ${isMaterials ? active : inactive}`}
            >
              Trang chủ
            </Link>
            <Link
              href="/vat-tu"
              aria-current={isVatTu ? 'page' : undefined}
              className={`${baseLink} ${linkSize} ${isVatTu ? active : inactive}`}
            >
              Vật tư
            </Link>
            <Link
              href="/attendance"
              aria-current={isAttendance ? 'page' : undefined}
              className={`${baseLink} ${linkSize} ${isAttendance ? active : inactive}`}
            >
              Chấm công
            </Link>
             {(role === 'Admin' || role === 'accountance') && (
               <>
            <Link
              href="/products"
              aria-current={isProducts ? 'page' : undefined}
              className={`${baseLink} ${linkSize} ${isProducts ? active : inactive}`}
            >
              Sản phẩm
            </Link>
                 <Link
                   href="/nguyen-lieu"
                   aria-current={isNguyenLieu ? 'page' : undefined}
                   className={`${baseLink} ${linkSize} ${isNguyenLieu ? active : inactive}`}
                 >
                   Nguyên liệu
                 </Link>
            <Link
              href="/customers"
              aria-current={isCustomers ? 'page' : undefined}
              className={`${baseLink} ${linkSize} ${isCustomers ? active : inactive}`}
            >
              Khách hàng
            </Link>
            <Link
              href="/delivers"
              aria-current={isDelivers ? 'page' : undefined}
              className={`${baseLink} ${linkSize} ${isDelivers ? active : inactive}`}
            >
              Giao hàng
            </Link>
            <Link
              href="/orders"
              aria-current={isOrders ? 'page' : undefined}
              className={`${baseLink} ${linkSize} ${isOrders ? active : inactive}`}
            >
              Đơn hàng
            </Link>
                 <Link
                   href="/funds"
                   aria-current={isFunds ? 'page' : undefined}
                   className={`${baseLink} ${linkSize} ${isFunds ? active : inactive}`}
                 >
                   Sổ quỹ
                 </Link>
               </>
             )}
             {(role === 'Admin' || role === 'accountance') && (
              <>
                <Link
                  href="/san-xuat"
                  aria-current={isProduction ? 'page' : undefined}
                  className={`${baseLink} ${linkSize} ${isProduction ? active : inactive}`}
                >
                  Sản xuất
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right side - User avatar and mobile menu button */}
        <div className="flex items-center space-x-2">
          {/* Mobile menu button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-200"
            aria-label="Toggle mobile menu"
          >
            <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Notification component */}
          <div className="flex items-center">
            <NotificationRequest />
          </div>

          {/* User avatar */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center space-x-1 rounded-full p-1 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
                <span className="text-sm font-semibold text-white">{userInitial}</span>
              </div>
              <svg className="h-4 w-4 text-gray-600 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* User dropdown menu */}
            {isUserDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <button
                    onClick={() => handleUserAction('view-requests')}
                    className="flex w-full items-center px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <svg className="mr-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Xem yêu cầu
                  </button>
                  <button
                    onClick={() => handleUserAction('change-password')}
                    className="flex w-full items-center px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <svg className="mr-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                    </svg>
                    Đổi mật khẩu
                  </button>
                  {role === 'Admin' && (
                    <button
                      onClick={() => handleUserAction('create-user')}
                      className="flex w-full items-center px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <svg className="mr-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Tạo người dùng
                    </button>
                  )}
                  <div className="border-t border-gray-100"></div>
                  <button
                    onClick={() => handleUserAction('logout')}
                    className="flex w-full items-center px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-900"
                  >
                    <svg className="mr-3 h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white" ref={mobileMenuRef}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isMaterials 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Trang chủ
            </Link>
            <Link
              href="/vat-tu"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isVatTu 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Vật tư
            </Link>
            <Link
              href="/attendance"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isAttendance 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Chấm công
            </Link>
             {(role === 'Admin' || role === 'accountance') && (
               <>
            <Link
              href="/products"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isProducts 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Sản phẩm
            </Link>
                 <Link
                   href="/nguyen-lieu"
                   onClick={() => setIsMobileMenuOpen(false)}
                   className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                     isNguyenLieu 
                       ? 'bg-orange-100 text-orange-700' 
                       : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                   }`}
                 >
                   Nguyên liệu
                 </Link>
            <Link
              href="/customers"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isCustomers 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Khách hàng
            </Link>
            <Link
              href="/delivers"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isDelivers 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Giao hàng
            </Link>
            <Link
              href="/orders"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isOrders 
                  ? 'bg-orange-100 text-orange-700' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Đơn hàng
            </Link>
                 <Link
                   href="/funds"
                   onClick={() => setIsMobileMenuOpen(false)}
                   className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                     isFunds 
                       ? 'bg-orange-100 text-orange-700' 
                       : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                   }`}
                 >
                   Sổ quỹ
                 </Link>
               </>
             )}
             {(role === 'Admin' || role === 'accountance') && (
              <>
                <Link
                  href="/san-xuat"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isProduction 
                      ? 'bg-orange-100 text-orange-700' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  Sản xuất
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}


