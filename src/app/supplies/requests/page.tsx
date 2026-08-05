'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestsRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/supplies');
    }, [router]);
    return (
        <div className="flex items-center justify-center min-h-[40vh] text-gray-500">Đang chuyển hướng...</div>
    );
}