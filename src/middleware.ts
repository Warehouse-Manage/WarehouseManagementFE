import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get('role')?.value;
  
  // Các route không cần authentication - cho phép truy cập tất cả các trang chính
  const publicRoutes = ['/login', '/', '/requests', '/approvals'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // Nếu là public route, cho phép truy cập
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Chặn quyền truy cập các trang bị hạn chế với role 'user' và 'approver'
  const restrictedForUserAndApprover = ['/statistics', '/brickyard'];
  const isRestrictedForUserAndApprover = restrictedForUserAndApprover.some(route => pathname.startsWith(route));
  
  if ((role === 'user' || role === 'approver') && isRestrictedForUserAndApprover) {
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }

  // Chặn quyền truy cập trang tạo người dùng - chỉ admin mới được truy cập
  if (pathname.startsWith('/create-user') && role !== 'Admin') {
    const url = new URL('/', request.url);
    return NextResponse.redirect(url);
  }

  // Cho phép truy cập tất cả các route khác
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
