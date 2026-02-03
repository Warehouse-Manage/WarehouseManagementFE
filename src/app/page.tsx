'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getCookie, formatNumberInput, parseNumberInput } from '@/lib/ultis';
import { Material } from '@/types';
import { materialApi } from '@/api/materialApi';
import { DataTable, Modal } from '@/components/shared';
import { Package, Search, Plus, Activity, AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function MaterialsPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [requestQuantity, setRequestQuantity] = useState<number>(1);
  const [requestNote, setRequestNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Check authentication status
  useEffect(() => {
    const userId = getCookie('userId');
    const userName = getCookie('userName');

    if (!userId || !userName) {
      router.push('/login');
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  // Fetch materials from API
  useEffect(() => {
    if (isCheckingAuth) return;

    const fetchMaterials = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await materialApi.getMaterials();
        setMaterials(data);
      } catch (err: unknown) {
        console.error('Lỗi khi tải danh sách vật tư:', err);
        const errorMessage = err instanceof Error ? err.message : '';
        if (errorMessage.includes('401')) {
          router.push('/login');
          return;
        }
        setError('Không thể tải danh sách vật tư. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [isCheckingAuth, router]);



  const handleRequestUsage = (material: Material) => {
    setSelectedMaterial(material);
    setRequestQuantity(1);
    setRequestNote('');
    setShowConfirmModal(true);
  };

  const handleConfirmRequest = async () => {
    if (!selectedMaterial) return;

    const userId = getCookie('userId');
    const department = getCookie('department') || 'Kho';

    if (!userId) {
      toast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    setIsSubmitting(true);
    try {
      await materialApi.createMaterialRequest({
        requesterId: Number(userId),
        department: department,
        requestDate: new Date().toISOString(),
        description: requestNote || 'Yêu cầu từ trang chủ',
        items: [
          {
            materialId: selectedMaterial.id,
            requestedQuantity: requestQuantity,
            note: requestNote,
          },
        ],
      });

      toast.success('Yêu cầu sử dụng đã được gửi thành công!');
      setShowConfirmModal(false);
      setSelectedMaterial(null);
    } catch (error) {
      console.error('Lỗi khi tạo yêu cầu:', error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-gray-600">Đang kiểm tra xác thực...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Tổng quan */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50/50">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 ring-4 ring-orange-50">
            <Package className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight text-center lg:text-left">Danh Mục Vật Tư</h1>
            <p className="text-gray-500 font-medium text-center lg:text-left hidden sm:block">Quản lý kho và yêu cầu vật tư hệ thống</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <Link
            href="/vat-tu/yeu-cau"
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-black text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Lịch sử yêu cầu</span>
            <span className="sm:hidden">Lịch sử</span>
          </Link>
          <button
            onClick={() => router.push('/vat-tu/yeu-cau')}
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-orange-600 rounded-xl text-white text-xs sm:text-sm font-black hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 active:scale-95"
          >
            <Plus className="h-4 sm:h-5 w-4 sm:w-5" />
            <span className="hidden sm:inline">Tạo yêu cầu mới</span>
            <span className="sm:hidden">Thêm</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 font-bold shadow-sm animate-in slide-in-from-top duration-300">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Danh sách vật tư */}
      <div className="rounded-3xl border border-gray-100 bg-white overflow-hidden shadow-xl shadow-gray-50/50">
        <div className="bg-gray-50/50 px-8 py-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Tồn kho hiện tại</h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm vật tư..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all font-medium"
            />
          </div>
        </div>

        <div className="p-4">
          <DataTable
            data={materials}
            isLoading={loading}
            emptyMessage="Không có vật tư nào trong kho."
            columns={[
              {
                key: 'id',
                header: 'Mã VT',
                className: 'font-black text-gray-400 w-20',
                render: (it) => `#${it.id}`
              },
              {
                key: 'image',
                header: 'Hình ảnh',
                render: (it) => (
                  <div className="h-12 w-12 rounded-xl bg-gray-100 border border-gray-100 flex items-center justify-center overflow-hidden">
                    {it.imageUrl ? (
                      <Image src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-gray-300" />
                    )}
                  </div>
                )
              },
              {
                key: 'name',
                header: 'Tên vật tư',
                className: 'font-bold text-gray-900',
                render: (it) => it.name
              },
              {
                key: 'type',
                header: 'ĐVT',
                render: (it) => (
                  <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-black text-gray-600 uppercase">
                    {it.type}
                  </span>
                )
              },
              {
                key: 'amount',
                header: 'Số lượng khả dụng',
                render: (it) => (
                  <div className="flex flex-col">
                    <span className={`text-base font-black ${it.amount < 10 ? 'text-red-600' : 'text-green-600'}`}>
                      {it.amount.toLocaleString('vi-VN')}
                    </span>
                    {it.amount < 10 && (
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">Sắp hết hàng</span>
                    )}
                  </div>
                )
              },
              {
                key: 'actions',
                header: 'Thao tác',
                render: (it) => (
                  <button
                    onClick={() => handleRequestUsage(it)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-black hover:bg-orange-700 transition-all shadow-md shadow-orange-100 active:scale-95"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="sm:hidden">Yêu cầu</span>
                    <span className="hidden sm:inline">Yêu cầu sử dụng</span>
                  </button>

                )
              }
            ]}
          />
        </div>
      </div>

      {/* Modal xác nhận yêu cầu */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Yêu Cầu Sử Dụng Vật Tư"
        size="md"
        footer={
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95 shadow-sm"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleConfirmRequest}
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all active:scale-95 shadow-lg shadow-orange-100 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : 'Xác nhận gửi'}
            </button>
          </div>
        }
      >
        {selectedMaterial && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-2xl border border-orange-100">
              <div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Package className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h4 className="font-black text-gray-900">{selectedMaterial.name}</h4>
                <p className="text-sm text-gray-500 font-medium">Hiện có: {selectedMaterial.amount} {selectedMaterial.unit}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="h-3 w-3" />
                  Số lượng yêu cầu
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRequestQuantity(Math.max(1, requestQuantity - 1))}
                    className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center font-black text-xl hover:bg-gray-200 transition-all"
                  >-</button>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatNumberInput(requestQuantity)}
                    onChange={(e) => {
                      const parsed = parseNumberInput(e.target.value);
                      const normalized = parsed === '' ? 1 : Math.max(1, Number(parsed));
                      setRequestQuantity(normalized);
                    }}
                    className="flex-1 h-12 bg-white border border-gray-200 rounded-xl px-4 text-center font-black text-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                  />
                  <button
                    onClick={() => setRequestQuantity(requestQuantity + 1)}
                    className="h-12 w-12 bg-orange-600 rounded-xl flex items-center justify-center font-black text-xl text-white hover:bg-orange-700 transition-all shadow-md shadow-orange-100"
                  >+</button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Ghi chú sử dụng
                </label>
                <textarea
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="Vật tư này dùng cho việc gì? (Có thể bỏ trống)"
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all placeholder:text-gray-400 resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
              <Activity className="h-4 w-4 text-blue-500 mt-0.5" />
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                Yêu cầu này sẽ được gửi đến bộ phận quản lý kho để phê duyệt. Bạn có thể theo dõi trạng thái tại mục Lịch sử yêu cầu.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
