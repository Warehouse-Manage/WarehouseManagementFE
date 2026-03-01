'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';

interface DeliverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingDeliver: { id: number; name: string } | null;
  deliverFormFields: FormField[];
  formValues: { name: string; phoneNumber: string; plateNumber: string };
  error: string | null;
  submitting: boolean;
  onFieldChange: (field: string, value: unknown) => void;
  onSubmit: () => void;
}

export default function DeliverFormModal({
  isOpen,
  onClose,
  editingDeliver,
  deliverFormFields,
  formValues,
  error,
  submitting,
  onFieldChange,
  onSubmit
}: DeliverFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingDeliver ? 'Cập nhật người giao hàng' : 'Thêm người giao hàng mới'}
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
          fields={deliverFormFields}
          values={formValues}
          onChange={onFieldChange}
          columns={1}
        />
      </div>
    </Modal>
  );
}
