'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    Home,
    Package,
    ClipboardCheck,
    Factory,
    Calculator,
    X,
    ChevronRight,
} from 'lucide-react';
import { getCookie } from '@/lib/ultis';

type KeToanKey = 'nhap-hang' | 'nguyen-lieu' | 'doi-tac' | 'san-pham' | 'dat-hang' | 'khach-hang' | 'giao-hang' | 'so-quy';

const KE_TOAN_ITEMS: { key: KeToanKey; label: string; href: string }[] = [
    { key: 'nhap-hang', label: 'Nhập hàng', href: '/import-goods' },
    { key: 'nguyen-lieu', label: 'Nguyên liệu', href: '/raw-materials' },
    { key: 'doi-tac', label: 'Đối tác', href: '/partners' },
    { key: 'san-pham', label: 'Sản phẩm', href: '/products' },
    { key: 'dat-hang', label: 'Đặt hàng', href: '/place-order' },
    { key: 'khach-hang', label: 'Khách hàng', href: '/customers' },
    { key: 'giao-hang', label: 'Giao hàng', href: '/delivers' },
    { key: 'so-quy', label: 'Sổ quỹ', href: '/funds' },
];

export default function MobileBottomTabs() {
    const pathname = usePathname() ?? '';
    const [role, setRole] = useState<string | null>(null);
    const [keToanOpen, setKeToanOpen] = useState(false);

    useEffect(() => {
        setRole(getCookie('role'));
    }, []);

    const isWarehouseManager = role === 'warehouse manager';
    const isKeToanActive = KE_TOAN_ITEMS.some((i) => pathname.startsWith(i.href));

    // Khoá scroll khi mở bottom sheet
    useEffect(() => {
        if (!keToanOpen) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [keToanOpen]);

    // Đóng sheet khi đổi route
    useEffect(() => {
        setKeToanOpen(false);
    }, [pathname]);

    // Role warehouse manager: chỉ thấy Nhập hàng, gọn thành 1 tab
    if (isWarehouseManager) {
        const active = pathname.startsWith('/import-goods');
        return (
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-stretch justify-around h-16">
                    <MobileTabLink href="/import-goods" icon={Package} label="Nhập hàng" active={active} />
                </div>
            </nav>
        );
    }

    return (
        <>
            <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-stretch justify-around h-16">
                    <MobileTabLink href="/" icon={Home} label="Trang chủ" active={pathname === '/'} />
                    <MobileTabLink href="/supplies" icon={Package} label="Vật tư" active={pathname.startsWith('/supplies')} />
                    <MobileTabLink href="/attendance" icon={ClipboardCheck} label="Chấm công" active={pathname.startsWith('/attendance')} />
                    <MobileTabLink href="/production" icon={Factory} label="Sản xuất" active={pathname.startsWith('/production')} />
                    <MobileTabButton
                        icon={Calculator}
                        label="Kế toán"
                        active={isKeToanActive}
                        onClick={() => setKeToanOpen(true)}
                    />
                </div>
            </nav>

            {keToanOpen && (
                <div
                    className="md:hidden fixed inset-0 z-50 flex items-end"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Danh mục kế toán"
                >
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setKeToanOpen(false)}
                        aria-label="Đóng"
                    />
                    <div className="relative w-full bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-base font-black text-gray-900">Kế toán</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Chọn mục để xem</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setKeToanOpen(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-200"
                                aria-label="Đóng"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-3 grid grid-cols-2 gap-2">
                            {KE_TOAN_ITEMS.map((item) => {
                                const active = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        onClick={() => setKeToanOpen(false)}
                                        className={`flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                                            active
                                                ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                                                : 'bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-700'
                                        }`}
                                    >
                                        <span>{item.label}</span>
                                        <ChevronRight className={`h-4 w-4 ${active ? 'text-white' : 'text-gray-400'}`} />
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="border-t border-gray-100 p-3">
                            <button
                                type="button"
                                onClick={() => setKeToanOpen(false)}
                                className="w-full py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function MobileTabLink({
    href,
    icon: Icon,
    label,
    active,
}: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active: boolean;
}) {
    return (
        <Link
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-w-0 px-1 transition-colors ${
                active ? 'text-orange-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-current={active ? 'page' : undefined}
        >
            <Icon className={`h-5 w-5 ${active ? 'text-orange-600' : 'text-gray-500'}`} />
            <span className={`text-[11px] font-bold leading-none truncate ${active ? 'text-orange-600' : 'text-gray-600'}`}>
                {label}
            </span>
        </Link>
    );
}

function MobileTabButton({
    icon: Icon,
    label,
    active,
    onClick,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-w-0 px-1 transition-colors ${
                active ? 'text-orange-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-current={active ? 'page' : undefined}
            aria-haspopup="dialog"
        >
            <Icon className={`h-5 w-5 ${active ? 'text-orange-600' : 'text-gray-500'}`} />
            <span className={`text-[11px] font-bold leading-none truncate ${active ? 'text-orange-600' : 'text-gray-600'}`}>
                {label}
            </span>
        </button>
    );
}