'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/shared';
import { PackageProduct, Product } from '@/types';
import { Search } from 'lucide-react';

interface SelectChartProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageProducts: PackageProduct[];
  products: Product[];
  selectedPackageIds: number[];
  onSave: (selectedIds: number[]) => Promise<void>;
  submitting: boolean;
}

export default function SelectChartProductsModal({
  isOpen,
  onClose,
  packageProducts,
  products,
  selectedPackageIds,
  onSave,
  submitting
}: SelectChartProductsModalProps) {
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>(selectedPackageIds);
  const [searchTerm, setSearchTerm] = useState('');

  // Sincronize tempSelectedIds when modal opens
  useMemo(() => {
    if (isOpen) {
      setTempSelectedIds(selectedPackageIds);
    }
  }, [isOpen, selectedPackageIds]);

  const filteredPackages = useMemo(() => {
    return packageProducts.filter(pkg => {
      const product = products.find(p => p.id === pkg.productId);
      const searchStr = `${pkg.name} ${product?.name || ''}`.toLowerCase();
      return searchStr.includes(searchTerm.toLowerCase());
    });
  }, [packageProducts, products, searchTerm]);

  const toggleSelection = (id: number) => {
    setTempSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    await onSave(tempSelectedIds);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thiết lập biểu đồ hiển thị"
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? 'Đang lưu...' : 'Lưu thiết lập'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 italic">
          Chọn các kiện hàng bạn muốn hiển thị chi tiết trên biểu đồ nhập hàng.
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm kiện hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border-2 border-gray-100 py-2 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all"
          />
        </div>

        <div className="grid max-h-[400px] grid-cols-1 gap-2 overflow-y-auto pr-2 sm:grid-cols-2">
          {filteredPackages.length > 0 ? (
            filteredPackages.map((pkg) => {
              const isSelected = tempSelectedIds.includes(pkg.id);
              const product = products.find(p => p.id === pkg.productId);
              
              return (
                <div
                  key={pkg.id}
                  onClick={() => toggleSelection(pkg.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                    isSelected 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-50 hover:border-orange-200 hover:bg-white shadow-sm'
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
                    isSelected ? 'border-orange-600 bg-orange-600' : 'border-gray-300 bg-white'
                  }`}>
                    {isSelected && (
                      <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-bold ${isSelected ? 'text-orange-900' : 'text-gray-900'}`}>
                      {pkg.name}
                    </p>
                    <p className={`truncate text-xs ${isSelected ? 'text-orange-700' : 'text-gray-500'}`}>
                      {product?.name || 'Sản phẩm không xác định'}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-8 text-center text-sm text-gray-500">
              Không tìm thấy kiện hàng nào khớp với từ khóa.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
