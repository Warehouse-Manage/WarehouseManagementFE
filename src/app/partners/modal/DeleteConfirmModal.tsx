'use client';

import { Modal } from '@/components/shared';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerName: string;
  error: string | null;
  submitting: boolean;
  onConfirm: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  partnerName,
  error,
  submitting,
  onConfirm
}: DeleteConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận xóa"
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
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang xóa...' : 'Xóa'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
        <p className="text-sm text-gray-700">
          Bạn có chắc chắn muốn xóa đối tác{' '}
          <span className="font-bold text-gray-900">{partnerName}</span>
          ? Hành động này không thể hoàn tác.
        </p>
      </div>
    </Modal>
  );
}
