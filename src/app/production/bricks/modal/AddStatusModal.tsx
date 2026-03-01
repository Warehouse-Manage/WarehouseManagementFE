'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';

interface AddStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  newStatus: { packageQuantity: number; dateTime: string };
  error: string | null;
  onStatusChange: (field: string, value: unknown) => void;
  onAdd: () => void;
}

const brickYardFormFields: FormField[] = [
  { name: 'packageQuantity', label: 'Số lượng gói', type: 'number', required: true, placeholder: 'Nhập số lượng...' },
  { name: 'dateTime', label: 'Thời gian', type: 'datetime-local', required: true },
];

export default function AddStatusModal({
  isOpen,
  onClose,
  newStatus,
  error,
  onStatusChange,
  onAdd
}: AddStatusModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm dữ liệu tình trạng lò gạch"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={onAdd}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 transition-colors cursor-pointer"
          >
            Thêm dữ liệu
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
        <DynamicForm
          fields={brickYardFormFields}
          values={newStatus}
          onChange={onStatusChange}
          columns={1}
        />
      </div>
    </Modal>
  );
}
