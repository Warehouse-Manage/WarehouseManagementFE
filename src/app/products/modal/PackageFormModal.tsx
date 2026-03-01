'use client';

import { Modal } from '@/components/shared';
import { Product } from '@/types';
import { formatNumberInput, parseNumberInput } from '@/lib/ultis';

interface PackageFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPackageId: number | null;
  products: Product[];
  pkgName: string;
  pkgProductId: number | '';
  pkgUnitsPerPackage: number | '';
  pkgInitialPackages: number | '';
  error: string | null;
  loadingPackageDetail: boolean;
  submittingPackage: boolean;
  onPkgNameChange: (name: string) => void;
  onPkgProductIdChange: (id: number | '') => void;
  onPkgUnitsPerPackageChange: (value: number | '') => void;
  onPkgInitialPackagesChange: (value: number | '') => void;
  onSubmit: () => void;
}

export default function PackageFormModal({
  isOpen,
  onClose,
  editingPackageId,
  products,
  pkgName,
  pkgProductId,
  pkgUnitsPerPackage,
  pkgInitialPackages,
  error,
  loadingPackageDetail,
  submittingPackage,
  onPkgNameChange,
  onPkgProductIdChange,
  onPkgUnitsPerPackageChange,
  onPkgInitialPackagesChange,
  onSubmit
}: PackageFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingPackageId ? 'Sửa kiện' : 'Thêm kiện mới'}
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            disabled={submittingPackage || loadingPackageDetail}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {submittingPackage ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">
            {error}
          </div>
        )}
        {loadingPackageDetail && (
          <div className="text-sm font-semibold text-gray-500 bg-gray-50 p-3 rounded border border-gray-100">
            Đang tải chi tiết kiện...
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tên kiện *</label>
            <input
              type="text"
              value={pkgName}
              onChange={(e) => onPkgNameChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Nhập tên kiện..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Sản phẩm *</label>
            <select
              value={pkgProductId}
              onChange={(e) => onPkgProductIdChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 bg-white"
            >
              <option value="">Chọn sản phẩm...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Số lượng sản phẩm / kiện</label>
            <input
              type="text"
              inputMode="decimal"
              min={0}
              value={formatNumberInput(pkgUnitsPerPackage)}
              onChange={(e) => onPkgUnitsPerPackageChange(parseNumberInput(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 text-right"
              placeholder="Ví dụ: 100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Số lượng ban đầu (kiện)</label>
            <input
              type="text"
              inputMode="decimal"
              min={0}
              value={formatNumberInput(pkgInitialPackages)}
              onChange={(e) => onPkgInitialPackagesChange(parseNumberInput(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 text-right"
              placeholder="Ví dụ: 10"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
