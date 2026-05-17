'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Super Admin đăng nhập qua chọn công ty → /login (không dùng trang riêng). */
export default function LoginAdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login/company');
  }, [router]);

  return null;
}
