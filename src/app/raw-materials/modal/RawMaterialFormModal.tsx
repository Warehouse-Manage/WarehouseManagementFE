'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';
import { Partner } from '@/types';

interface RawMaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: Partner[];
  formValues: {
    name: string;
    unit: string;
    quantity: number | '';
    description: string;
    partnerId: number | '';
  };
  error: string | null;
  submitting: boolean;
  onFieldChange: (field: string, value: unknown) => void;
  onSubmit: () => void;
}

const getFormFields = (partners: Partner[]): FormField[] => [
  { name: 'name', label: 'Tên nguyên liệu', type: 'text', required: true, placeholder: 'Nhập tên...' },
  {
    name: 'unit',
    label: 'Đơn vị',
    type: 'select',
    required: true,
    options: [
      { value: 'Cây', label: 'Cây' },
      { value: 'Bao', label: 'Bao' },
      { value: 'Viên', label: 'Viên' },
      { value: 'm³', label: 'm³' },
      { value: 'Kg', label: 'Kg' },
      { value: 'Tấn', label: 'Tấn' },
      { value: 'Lít', label: 'Lít' },
    ]
  },
  { name: 'quantity', label: 'Số lượng', type: 'number', required: true, placeholder: 'Nhập số lượng...' },
  {
    name: 'partnerId',
    label: 'Đối tác',
    type: 'select',
    required: false,
    options: partners.map(p => ({ value: p.id, label: p.name })),
    placeholder: 'Chọn đối tác (không bắt buộc)'
  },
  { name: 'description', label: 'Mô tả', type: 'textarea', placeholder: 'Nhập mô tả...' },
];

export default function RawMaterialFormModal({
  isOpen,
  onClose,
  partners,
  formValues,
  error,
  submitting,
  onFieldChange,
  onSubmit
}: RawMaterialFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm nguyên liệu mới"
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
            disabled={submitting}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
        <DynamicForm
          fields={getFormFields(partners)}
          values={formValues}
          onChange={onFieldChange}
          columns={2}
        />
      </div>
    </Modal>
  );
}
