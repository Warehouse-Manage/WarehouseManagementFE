'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';

interface ImportProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: { id: number; tenHang: string; soLuong: number } | null;
  formFields: FormField[];
  formData: { selectionKey: string; soLuong: string };
  submitting: boolean;
  onFormChange: (name: string, value: unknown) => void;
  onSubmit: () => void;
}

export default function ImportProductModal({
  isOpen,
  onClose,
  editingItem,
  formFields,
  formData,
  submitting,
  onFormChange,
  onSubmit
}: ImportProductModalProps) {
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
      <DynamicForm
        fields={formFields}
        values={formData}
        onChange={onFormChange}
        isSubmitting={submitting}
      />
    </Modal>
  );
}
