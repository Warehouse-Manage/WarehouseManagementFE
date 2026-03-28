'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/shared';
import { formatNumberInput, parseNumberInput } from '@/lib/ultis';

type ItemMode = 'package' | 'product';

interface OptionItem {
  label: string;
  value: string;
}

interface ImportProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: { id: number; tenHang: string; soLuong: number } | null;
  initialMode: ItemMode;
  formFields?: unknown;
  formData: { selectionKey: string; soLuong: string };
  productOptions: OptionItem[];
  packageOptions: OptionItem[];
  submitting: boolean;
  onFormChange: (name: string, value: unknown) => void;
  onSubmit: () => void;
}

export default function ImportProductModal({
  isOpen,
  onClose,
  editingItem,
  initialMode,
  formData,
  productOptions,
  packageOptions,
  submitting,
  onFormChange,
  onSubmit
}: ImportProductModalProps) {
  const [mode, setMode] = useState<ItemMode>('package');

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
  }, [initialMode, isOpen]);

  const isPackageMode = mode === 'package';
  const currentOptions = isPackageMode ? packageOptions : productOptions;
  const selectionLabel = isPackageMode ? 'Kiện' : 'Sản phẩm';
  const selectionPlaceholder = isPackageMode ? 'Chọn kiện...' : 'Chọn sản phẩm...';

  const formattedQuantity = formData.soLuong === '' ? '' : formatNumberInput(Number(formData.soLuong));

  const handleModeChange = (nextMode: ItemMode) => {
    setMode(nextMode);

    const expectedPrefix = nextMode === 'package' ? 'k:' : 'p:';
    if (!formData.selectionKey.startsWith(expectedPrefix)) {
      onFormChange('selectionKey', '');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Sửa nhập hàng' : 'Thêm nhập hàng'}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? 'Đang lưu...' : editingItem ? 'Cập nhật' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-gray-500">Loại nhập</label>
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => handleModeChange('package')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                isPackageMode ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'
              }`}
            >
              Kiện
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('product')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                !isPackageMode ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'
              }`}
            >
              Sản phẩm
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-gray-500">
            {selectionLabel} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.selectionKey}
            onChange={(e) => onFormChange('selectionKey', e.target.value)}
            disabled={submitting}
            className={`w-full rounded-lg border-2 border-gray-100 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all ${
              submitting ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            <option value="">{selectionPlaceholder}</option>
            {currentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-gray-500">
            Số lượng <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={formattedQuantity}
            onChange={(e) => onFormChange('soLuong', parseNumberInput(e.target.value))}
            placeholder="Nhập số lượng..."
            disabled={submitting}
            className={`w-full rounded-lg border-2 border-gray-100 bg-white px-3 py-2 text-sm font-semibold text-right text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all ${
              submitting ? 'cursor-not-allowed opacity-50' : ''
            }`}
          />
        </div>
      </div>
    </Modal>
  );
}
