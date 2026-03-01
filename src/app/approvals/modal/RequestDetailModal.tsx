'use client';

import { Modal, DataTable } from '@/components/shared';
import { Request, RequestItem } from '@/types';
import { Calendar, User, Building2 } from 'lucide-react';

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
      title={`Chi tiết yêu cầu #${selectedRequest?.id}`}
      size="4xl"
    >
      {selectedRequest && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Người đề nghị</p>
                <p className="font-black text-gray-900">{selectedRequest.requester}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Phòng ban</p>
                <p className="font-black text-gray-900">{selectedRequest.department}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Ngày đề nghị</p>
                <p className="font-black text-gray-900">{formatDate(selectedRequest.date)}</p>
              </div>
            </div>
          </div>

          <DataTable
            data={selectedRequest.items}
            columns={[
              {
                key: 'name',
                header: 'Vật tư',
                render: (it) => <span className="font-bold text-gray-900">{(it as RequestItem).name}</span>
              },
              {
                key: 'unit',
                header: 'ĐVT',
                className: 'w-24 text-center text-gray-500 font-bold',
                render: (it) => (it as RequestItem).unit
              },
              {
                key: 'quantity',
                header: 'Số lượng',
                className: 'w-24 text-center font-black text-orange-600',
                render: (it) => (it as RequestItem).quantity.toLocaleString('vi-VN')
              },
              {
                key: 'unitPrice',
                header: 'Đơn giá',
                className: 'w-32 text-right',
                render: (it) => {
                  const price = (it as RequestItem).unitPrice;
                  return price ? <span className="text-gray-600 font-bold">{price.toLocaleString('vi-VN')} đ</span> : <span className="text-gray-300">---</span>;
                }
              },
              {
                key: 'total',
                header: 'Thành tiền',
                className: 'w-32 text-right',
                render: (it) => {
                  const item = it as RequestItem;
                  const total = (item.unitPrice ?? 0) * item.quantity;
                  return total > 0 ? <span className="text-green-600 font-black">{total.toLocaleString('vi-VN')} đ</span> : <span className="text-gray-300">---</span>;
                }
              }
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
