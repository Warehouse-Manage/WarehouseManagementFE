'use client';

import { Modal } from '@/components/shared';
import { formatNumberInput, parseNumberInput } from '@/lib/ultis';
import { useState, useEffect } from 'react';

interface ImportRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRawMaterialImport: { id: number } | null;
  nguyenLieuFormData: {
    rawMaterialId: string;
    quantity: string | number;
    unitPrice: string | number;
    discount: string | number;
    paidAmount: string | number;
    partnerId: string;
  };
  submittingNguyenLieu: boolean;
  onFormChange: (name: string, value: unknown) => void;
  onSubmit: () => void;
  calculateTotalAmount: () => number;
  onAddRawMaterial: () => void;
  rawMaterialOptions: { value: number; label: string }[];
  partnerOptions: { value: number; label: string }[];
  selectedUnit: string;
}

const inputClass = 'w-full rounded-lg border-2 border-gray-100 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all';
const selectClass = 'w-full rounded-lg border-2 border-gray-100 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all';
const labelClass = 'text-xs font-black uppercase tracking-wider text-gray-500';

function NumberField({
  name,
  label,
  required,
  placeholder,
  value,
  onChange,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  value: string | number;
  onChange: (name: string, value: unknown) => void;
}) {
  const [raw, setRaw] = useState('');

  useEffect(() => {
    const formatted = formatNumberInput(value as number | '' | null | undefined);
    if (raw !== formatted && !raw.endsWith('.')) {
      setRaw(formatted);
    }
  }, [value]);

  return (
    <div className="space-y-1">
      <label className={labelClass}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={(e) => {
          const inputVal = e.target.value;
          setRaw(inputVal);

          if (inputVal.endsWith('.') && inputVal.split('.').length === 2) {
            const beforeDot = inputVal.slice(0, -1);
            onChange(name, parseNumberInput(beforeDot));
          } else {
            const parsed = parseNumberInput(inputVal);
            onChange(name, parsed);
            if (parsed !== '' && !inputVal.endsWith('.')) {
              setRaw(formatNumberInput(parsed));
            }
          }
        }}
        onBlur={() => {
          const parsed = parseNumberInput(raw);
          setRaw(formatNumberInput(parsed));
        }}
        placeholder={placeholder}
        className={inputClass + ' text-right font-semibold'}
      />
    </div>
  );
}

export default function ImportRawMaterialModal({
  isOpen,
  onClose,
  editingRawMaterialImport,
  nguyenLieuFormData,
  submittingNguyenLieu,
  onFormChange,
  onSubmit,
  calculateTotalAmount,
  onAddRawMaterial,
  rawMaterialOptions,
  partnerOptions,
  selectedUnit,
}: ImportRawMaterialModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRawMaterialImport ? 'Sửa nhập nguyên liệu' : 'Nhập nguyên liệu'}
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
            onClick={onSubmit}
            disabled={submittingNguyenLieu}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submittingNguyenLieu ? 'Đang lưu...' : editingRawMaterialImport ? 'Cập nhật' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nguyên liệu - with + button */}
          <div className="space-y-1">
            <label className={labelClass}>
              Nguyên liệu <span className="text-red-500">*</span>
            </label>
            <div className="flex items-stretch gap-2">
              <select
                value={nguyenLieuFormData.rawMaterialId}
                onChange={(e) => onFormChange('rawMaterialId', e.target.value)}
                className={selectClass}
              >
                <option value="">Chọn nguyên liệu...</option>
                {rawMaterialOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddRawMaterial();
                }}
                className="shrink-0 w-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors font-bold text-xl leading-none flex items-center justify-center cursor-pointer"
                title="Thêm nguyên liệu mới"
              >
                +
              </button>
            </div>
          </div>

          {/* Số lượng */}
          <NumberField
            name="quantity"
            label={selectedUnit ? `Số lượng (${selectedUnit})` : 'Số lượng (đơn vị)'}
            required
            placeholder="Nhập số lượng..."
            value={nguyenLieuFormData.quantity}
            onChange={onFormChange}
          />

          {/* Giá thành */}
          <NumberField
            name="unitPrice"
            label={selectedUnit ? `Giá thành (/${selectedUnit})` : 'Giá thành (/đơn vị)'}
            required
            placeholder="Nhập giá thành..."
            value={nguyenLieuFormData.unitPrice}
            onChange={onFormChange}
          />

          {/* Giảm giá */}
          <NumberField
            name="discount"
            label="Giảm giá"
            placeholder="Nhập giảm giá..."
            value={nguyenLieuFormData.discount}
            onChange={onFormChange}
          />

          {/* Đối tác */}
          <div className="space-y-1">
            <label className={labelClass}>
              Đối tác <span className="text-red-500">*</span>
            </label>
            <select
              value={nguyenLieuFormData.partnerId}
              onChange={(e) => onFormChange('partnerId', e.target.value)}
              className={selectClass}
            >
              <option value="">Chọn đối tác...</option>
              {partnerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Đã trả */}
          <NumberField
            name="paidAmount"
            label="Đã trả"
            placeholder="Nhập số tiền đã trả..."
            value={nguyenLieuFormData.paidAmount}
            onChange={onFormChange}
          />
        </div>

        <div className="rounded-lg bg-gray-50 p-4 border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Tổng tiền:</span>
            <span className="text-xl font-bold text-blue-600">{calculateTotalAmount().toLocaleString('en-US')} đ</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            (Giá thành × Số lượng - Giảm giá)
          </div>
        </div>
      </div>
    </Modal>
  );
}
