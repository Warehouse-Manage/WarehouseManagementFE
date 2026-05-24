'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { companyApi } from '@/api/companyApi';

const PERSISTENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10;

export default function CreateCompanyPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const n = name.trim();
        if (!n) {
            toast.error('Vui lòng nhập tên công ty');
            return;
        }

        setIsLoading(true);
        try {
            const data = await companyApi.create(n);
            document.cookie = `companyId=${data.id}; path=/; max-age=${PERSISTENT_MAX_AGE_SECONDS}`;
            document.cookie = `companyName=${encodeURIComponent(data.name)}; path=/; max-age=${PERSISTENT_MAX_AGE_SECONDS}`;
            toast.success('Đã tạo công ty thành công');
            router.push('/login');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Không thể tạo công ty';
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-4 py-8 sm:py-12">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 sm:p-8">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow">
                            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">Tạo công ty mới</h1>
                        <p className="text-gray-600 text-sm mt-1">Chỉ cần tên công ty để bắt đầu sử dụng hệ thống</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                                Tên công ty
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 text-black placeholder-gray-400 bg-white"
                                    placeholder="Nhập tên công ty"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow text-sm font-bold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Đang tạo...
                                </span>
                            ) : (
                                'Tạo công ty'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center border-t border-gray-100 pt-6">
                        <Link href="/login/company" className="text-sm font-semibold text-orange-600 hover:text-orange-500 hover:underline">
                            ← Quay lại chọn công ty
                        </Link>
                    </div>
                </div>

                <div className="flex justify-center mt-8">
                    <Image src="/logo.png" alt="" width={48} height={48} className="h-12 w-12 object-contain rounded-full border border-gray-200 opacity-90" />
                </div>
                <p className="text-center text-xs text-gray-500 mt-3">© Quản lý kho nội bộ</p>
            </div>
        </div>
    );
}
