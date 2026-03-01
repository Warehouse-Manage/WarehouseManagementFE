'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';
import { Request, RequestItem } from '@/types';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRequest: Request | null;
  editedItems: RequestItem[];
  isSubmitting: boolean;
  totalDiscountAmount: number;
  onItemChange: (itemId: number, field: keyof RequestItem, value: string | number) => void;
  onRemoveItem: (itemId: number) => void;
  onConfirm: () => void;
  calculateSubtotal: () => number;
  calculateTotal: () => number;
  setTotalDiscountAmount: (value: number) => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('vi-VN');
};

const approvalFormFields: FormField[] = [
  { name: 'discountAmount', label: 'Giảm giá tiền mặt', type: 'number', placeholder: 'Nhập số tiền giảm giá...' },
];

export default function ApprovalModal({
  isOpen,
  onClose,
  editingRequest,
  editedItems,
  isSubmitting,
  totalDiscountAmount,
  onItemChange,
  onRemoveItem,
  onConfirm,
  calculateSubtotal,
  calculateTotal,
  setTotalDiscountAmount
}: ApprovalModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRequest ? `Duyệt và mua yêu cầu #${editingRequest.id}` : ''}
      size="4xl"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting || editedItems.length === 0}
            className="inline-flex items-center justify-center rounded-lg bg-green-600 px-6 py-2 text-sm font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận duyệt và mua'}
          </button>
        </>
      }
    >
      {editingRequest && (
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-sm font-medium">
            <span className="text-gray-600">Người đề nghị: <span className="text-gray-900 font-bold">{editingRequest.requester}</span></span>
            <span className="text-gray-600">Ngày: <span className="text-gray-900 font-bold">{formatDate(editingRequest.date)}</span></span>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-gray-800">Thông tin mua hàng chi tiết</h3>
            <div className="space-y-3">
              {editedItems.map((item, index) => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-xs">
                      {index + 1}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{item.name} ({item.unit})</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-24">
                      <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Số lượng</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => onItemChange(item.id, 'quantity', Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Đơn giá (đ)</label>
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice || 0}
                        onChange={(e) => onItemChange(item.id, 'unitPrice', Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                      />
                    </div>
                    <div className="w-32 text-right">
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Thành tiền</p>
                      <p className="text-sm font-black text-green-600">{((item.unitPrice || 0) * item.quantity).toLocaleString('vi-VN')} đ</p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-orange-50 rounded-xl border border-orange-100 p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">Tổng phụ:</span>
              <span className="text-sm font-bold text-gray-900">{calculateSubtotal().toLocaleString('vi-VN')} đ</span>
            </div>
            <DynamicForm
              fields={approvalFormFields}
              values={{ discountAmount: totalDiscountAmount }}
              onChange={(_, val) => setTotalDiscountAmount(Number(val))}
              columns={1}
            />
            <div className="pt-3 border-t border-orange-200 flex justify-between items-center">
              <span className="text-lg font-black text-gray-900">TỔNG CỘNG:</span>
              <span className="text-2xl font-black text-orange-600">{calculateTotal().toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
