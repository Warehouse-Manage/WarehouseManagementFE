'use client';

import { Modal } from '@/components/shared';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  newCustomerName: string;
  newCustomerAddress: string;
  newCustomerPhone: string;
  error: string | null;
  submitting: boolean;
  onNameChange: (name: string) => void;
  onAddressChange: (address: string) => void;
  onPhoneChange: (phone: string) => void;
  onSubmit: () => void;
}

export default function CustomerModal({
  isOpen,
  onClose,
  newCustomerName,
  newCustomerAddress,
  newCustomerPhone,
  error,
  submitting,
  onNameChange,
  onAddressChange,
  onPhoneChange,
  onSubmit
}: CustomerModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm khách hàng mới"
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
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Tên khách hàng *</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            placeholder="Nhập tên khách hàng..."
            value={newCustomerName}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Địa chỉ *</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            placeholder="Nhập địa chỉ..."
            value={newCustomerAddress}
            onChange={(e) => onAddressChange(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Số điện thoại *</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            placeholder="Nhập số điện thoại..."
            value={newCustomerPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
