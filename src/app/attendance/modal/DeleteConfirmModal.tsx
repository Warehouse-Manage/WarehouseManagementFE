'use client';

import { Modal } from '@/components/shared';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerName: string;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  workerName,
  onConfirm
}: DeleteConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận xóa"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer transition-colors"
          >
            Xóa
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">
        Bạn có chắc chắn muốn xóa nhân viên{' '}
        <span className="font-semibold text-gray-900">{workerName}</span>
        ? Hành động này không thể hoàn tác.
      </p>
    </Modal>
  );
}
