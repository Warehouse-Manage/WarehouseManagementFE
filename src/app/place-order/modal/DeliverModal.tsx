'use client';

import { Modal } from '@/components/shared';

interface DeliverModalProps {
  isOpen: boolean;
  onClose: () => void;
  newDeliverName: string;
  newDeliverPhone: string;
  newDeliverPlate: string;
  error: string | null;
  submitting: boolean;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onPlateChange: (plate: string) => void;
  onSubmit: () => void;
}

export default function DeliverModal({
  isOpen,
  onClose,
  newDeliverName,
  newDeliverPhone,
  newDeliverPlate,
  error,
  submitting,
  onNameChange,
  onPhoneChange,
  onPlateChange,
  onSubmit
}: DeliverModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm người giao hàng mới"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 disabled:opacity-60 cursor-pointer transition-colors disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Tên người giao hàng *</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            placeholder="Nhập tên..."
            value={newDeliverName}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Số điện thoại *</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            placeholder="Nhập số điện thoại..."
            value={newDeliverPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Biển số xe *</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            placeholder="Nhập biển số xe..."
            value={newDeliverPlate}
            onChange={(e) => onPlateChange(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
