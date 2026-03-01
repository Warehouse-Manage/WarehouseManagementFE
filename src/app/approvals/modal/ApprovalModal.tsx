'use client';

import { Modal, DataTable } from '@/components/shared';
import { Request, RequestItem } from '@/types';
import { formatNumberInput, parseNumberInput } from '@/lib/ultis';
import { Check, X, Calendar, User, Building2 } from 'lucide-react';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRequest: Request | null;
  editedItems: RequestItem[];
  isSubmitting: boolean;
  totalDiscountAmount: number | '';
  onItemChange: (itemId: number, field: keyof RequestItem, value: string | number) => void;
  onRemoveItem: (itemId: number) => void;
  onConfirm: () => void;
  calculateSubtotal: () => number;
  calculateTotal: () => number;
  setTotalDiscountAmount: (value: number | '') => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('vi-VN');
};

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
      title={`Duyệt và mua yêu cầu #${editingRequest?.id}`}
      size="full"
      footer={(
        <>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting || editedItems.length === 0}
            className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl bg-orange-600 font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Xác nhận duyệt
              </>
            )}
          </button>
        </>
      )}
    >
      {editingRequest && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Người đề nghị</p>
                <p className="font-black text-gray-900">{editingRequest.requester}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Phòng ban</p>
                <p className="font-black text-gray-900">{editingRequest.department}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Ngày đề nghị</p>
                <p className="font-black text-gray-900">{formatDate(editingRequest.date)}</p>
              </div>
            </div>
          </div>

          <DataTable
            data={editedItems}
            emptyMessage="Không có vật tư nào"
            columns={[
              {
                key: 'name',
                header: 'Tên vật tư',
                render: (it) => <span className="font-bold text-gray-900">{(it as RequestItem).name}</span>
              },
              {
                key: 'unit',
                header: 'ĐVT',
                className: 'w-24 text-center font-bold text-gray-500',
                render: (it) => (it as RequestItem).unit
              },
              {
                key: 'quantity',
                header: 'Số lượng mua',
                className: 'w-32',
                render: (it) => {
                  const item = it as RequestItem;
                  return (
                    <input
                      type="text"
                      inputMode="decimal"
                      min="1"
                      value={formatNumberInput(item.quantity)}
                      onChange={(e) => {
                        const parsed = parseNumberInput(e.target.value);
                        onItemChange(item.id, 'quantity', parsed === '' ? 0 : Number(parsed));
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-black text-gray-800 text-right focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                    />
                  );
                }
              },
              {
                key: 'unitPrice',
                header: 'Đơn giá mua (đ)',
                className: 'w-48',
                render: (it) => {
                  const item = it as RequestItem;
                  return (
                    <input
                      type="text"
                      inputMode="decimal"
                      min="0"
                      value={formatNumberInput(item.unitPrice || 0)}
                      onChange={(e) => {
                        const parsed = parseNumberInput(e.target.value);
                        onItemChange(item.id, 'unitPrice', parsed === '' ? 0 : Number(parsed));
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-black text-gray-800 text-right focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                      placeholder="Nhập giá..."
                    />
                  );
                }
              },
              {
                key: 'total',
                header: 'Thành tiền',
                className: 'w-40 text-right',
                render: (it) => {
                  const item = it as RequestItem;
                  const total = (item.unitPrice || 0) * item.quantity;
                  return <span className="font-black text-green-600">{total.toLocaleString('vi-VN')} đ</span>;
                }
              },
              {
                key: 'actions',
                header: '',
                className: 'w-16 text-center',
                render: (it) => (
                  <button
                    onClick={() => onRemoveItem((it as RequestItem).id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa vật tư"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )
              }
            ]}
          />

          <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 flex flex-col items-end gap-3 max-w-md ml-auto">
            <div className="w-full flex justify-between items-center text-orange-900 opacity-60">
              <span className="font-bold text-sm uppercase">Tổng chưa giảm:</span>
              <span className="font-black">{calculateSubtotal().toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="w-full flex justify-between items-center bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
              <span className="font-bold text-sm text-gray-500 uppercase">Giảm giá:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  min="0"
                  max={calculateSubtotal()}
                  value={formatNumberInput(totalDiscountAmount as number | '' | null | undefined)}
                  onChange={(e) => setTotalDiscountAmount(parseNumberInput(e.target.value))}
                  className="w-32 text-right font-black text-red-600 focus:outline-none"
                />
                <span className="font-bold text-red-300">đ</span>
              </div>
            </div>
            <div className="w-full h-px bg-orange-200 my-1" />
            <div className="w-full flex justify-between items-center">
              <span className="font-black text-orange-900 text-lg uppercase">Tổng cộng:</span>
              <span className="text-3xl font-black text-orange-600 tracking-tighter">
                {calculateTotal().toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
