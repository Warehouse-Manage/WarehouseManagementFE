'use client';

import { Modal } from '@/components/shared';
import { Request } from '@/types';

interface RequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRequest: Request | null;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('vi-VN');
};

export default function RequestDetailModal({ isOpen, onClose, selectedRequest }: RequestDetailModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedRequest ? `Chi tiết yêu cầu #${selectedRequest.id}` : ''}
      size="3xl"
    >
      {selectedRequest && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Người đề nghị</p>
              <p className="font-semibold text-gray-900">{selectedRequest.requester}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Phòng ban</p>
              <p className="font-semibold text-gray-900">{selectedRequest.department}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ngày đề nghị</p>
              <p className="font-semibold text-gray-900">{formatDate(selectedRequest.date)}</p>
            </div>
            {selectedRequest.totalPrice && (
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Tổng tiền</p>
                <p className="font-black text-green-600">{selectedRequest.totalPrice.toLocaleString('vi-VN')} đ</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Danh mục vật tư
            </h3>
            <div className="space-y-3">
              {selectedRequest.items.map((item, index) => (
                <div key={item.id} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-gray-900">{item.name}</h5>
                        {item.note && <p className="text-xs text-gray-500 mt-1 italic">Ghi chú: {item.note}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Số lượng</p>
                        <p className="text-sm font-bold text-gray-900">{item.quantity.toLocaleString('vi-VN')} {item.unit}</p>
                      </div>
                      {selectedRequest.status === 'approved' && item.unitPrice && (
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Thành tiền</p>
                          <p className="text-sm font-bold text-green-600">{(item.unitPrice * item.quantity).toLocaleString('vi-VN')} đ</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
