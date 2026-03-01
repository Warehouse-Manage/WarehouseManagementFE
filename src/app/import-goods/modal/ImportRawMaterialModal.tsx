'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';

interface ImportRawMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRawMaterialImport: { id: number } | null;
  nguyenLieuFormFields: FormField[];
  nguyenLieuFormData: {
    rawMaterialId: string;
    quantity: string;
    unitPrice: string;
    discount: string;
    paidAmount: string;
    partnerId: string;
  };
  submittingNguyenLieu: boolean;
  onFormChange: (name: string, value: unknown) => void;
  onSubmit: () => void;
  calculateTotalAmount: () => number;
}

export default function ImportRawMaterialModal({
  isOpen,
  onClose,
  editingRawMaterialImport,
  nguyenLieuFormFields,
  nguyenLieuFormData,
  submittingNguyenLieu,
  onFormChange,
  onSubmit,
  calculateTotalAmount
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
        <DynamicForm
          fields={nguyenLieuFormFields}
          values={nguyenLieuFormData}
          onChange={onFormChange}
          isSubmitting={submittingNguyenLieu}
          columns={2}
        />
        <div className="rounded-lg bg-gray-50 p-4 border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Tổng tiền:</span>
            <span className="text-xl font-bold text-blue-600">{calculateTotalAmount().toLocaleString('vi-VN')} đ</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            (Giá thành × Số lượng - Giảm giá)
          </div>
        </div>
      </div>
    </Modal>
  );
}
