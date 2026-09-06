'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getCookie } from '@/lib/ultis';
import { taxApi } from '@/api';

/**
 * Nút hình tròn to đùng, màu đỏ, **không có nội dung** để toggle chế độ thuế.
 *
 * Theo yêu cầu:
 *   - Nút đỏ thuần, không text, không icon
 *   - Chỉ hiện ở giữa trang chủ (page.tsx)
 *
 * Logic hiển thị:
 *   - Ẩn nếu không có companyId / super admin
 *   - Gọi GET /api/taxes/by-company/{companyId} để lấy isTax hiện tại
 *   - Ẩn nếu record tồn tại VÀ isTaxMode = true
 *   - Hiện nếu record chưa tồn tại HOẶC isTaxMode = false
 *
 * Khi nhấn → POST /api/taxes/toggle → nếu bật thành công → nút tự ẩn.
 */
export default function TaxCircleButton() {
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true); // loading lúc đầu load isTax
    const [companyId, setCompanyId] = useState<number | null>(null);
    const [shouldShow, setShouldShow] = useState(false);

    useEffect(() => {
        const cid = getCookie('companyId');
        const role = getCookie('role');

        if (!cid || cid === '0' || cid === 'null') {
            setShouldShow(false);
            setPageLoading(false);
            return;
        }

        const parsed = Number(cid);
        if (!parsed || parsed <= 0) {
            setShouldShow(false);
            setPageLoading(false);
            return;
        }

        if (role === 'admin') {
            setShouldShow(false);
            setPageLoading(false);
            return;
        }

        setCompanyId(parsed);

        // Lấy trạng thái isTax hiện tại của công ty
        const fetchTax = async () => {
            try {
                const tax = await taxApi.getByCompany(parsed);
                if (tax) {
                    // Nếu record tồn tại và isTaxMode = true → ẨN
                    // Ngược lại (null hoặc isTaxMode = false) → HIỆN
                    setShouldShow(!tax.isTaxMode);
                } else {
                    // Chưa có record → HIỆN
                    setShouldShow(true);
                }
            } catch (err) {
                console.warn('Failed to fetch tax state:', err);
                // Nếu lỗi thì mặc định HIỆN (để user vẫn có thể toggle)
                setShouldShow(true);
            } finally {
                setPageLoading(false);
            }
        };

        fetchTax();
    }, []);

    const handleToggle = async () => {
        if (!companyId || loading) return;

        setLoading(true);
        try {
            const result = await taxApi.toggle(companyId);

            if (result.isTaxMode) {
                // Vừa bật → ẩn nút (theo yêu cầu)
                toast.success('✅ Đã bật chế độ thuế. Nút sẽ được ẩn.');
                setShouldShow(false);
            } else {
                // Vừa tắt → giữ nút hiển thị
                toast.info('Đã tắt chế độ thuế.');
                setShouldShow(true);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Không thể toggle thuế';
            toast.error('Lỗi: ' + message);
        } finally {
            setLoading(false);
        }
    };

    // Ẩn hoàn toàn nếu không thỏa điều kiện
    if (pageLoading || !shouldShow || !companyId) return null;

    return (
        <div className="w-full flex justify-center my-8 sm:my-10 lg:my-12">
            <button
                type="button"
                onClick={handleToggle}
                disabled={loading}
                aria-label="Bật chế độ thuế"
                title="Nhấn để bật/tắt chế độ thuế"
                className={`
                    group relative
                    /* Hình tròn đỏ thuần, không nội dung */
                    rounded-full
                    bg-red-500 hover:bg-red-600 active:bg-red-700
                    shadow-lg shadow-red-300/60 hover:shadow-red-400/80
                    transition-all duration-200
                    active:scale-95 cursor-pointer
                    disabled:cursor-not-allowed disabled:opacity-70
                    /* Kích thước to đùng, responsive */
                    h-20 w-20 sm:h-28 sm:w-28 lg:h-36 lg:w-36
                    flex items-center justify-center
                    focus:outline-none focus:ring-4 focus:ring-red-200
                `}
            >
                {loading ? (
                    <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-white animate-spin" />
                ) : null}

                {/* Hiệu ứng hover overlay */}
                <span className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200 pointer-events-none" />
            </button>
        </div>
    );
}
