'use client';

import { Modal } from '@/components/shared';
import { Partner } from '@/types';
import { formatNumberInput, parseNumberInput } from '@/lib/ultis';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPartner: Partner | null;
  paymentAmount: number | '';
  selectedMonth: string;
  monthlyTotal: number | null;
  loadingMonthlyTotal: boolean;
  error: string | null;
  submitting: boolean;
  onPaymentAmountChange: (amount: number | '') => void;
  onMonthChange: (month: string) => void;
  onLoadMonthlyTotal: (partnerId: number, month: string) => void;
  onSubmit: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  selectedPartner,
  paymentAmount,
  selectedMonth,
  monthlyTotal,
  loadingMonthlyTotal,
  error,
  submitting,
  onPaymentAmountChange,
  onMonthChange,
  onLoadMonthlyTotal,
  onSubmit
}: PaymentModalProps) {
  if (!selectedPartner) return null;

  const maxAmount = (selectedPartner.amountMoneyTotal || 0) - (selectedPartner.amountMoneyPaid || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Thanh toán - ${selectedPartner.name}`}
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
            disabled={submitting || !paymentAmount || Number(paymentAmount) <= 0}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
            <div className="text-[10px] uppercase font-black text-gray-400 mb-1">Tổng chi phí</div>
            <div className="text-sm font-bold text-gray-900">{(selectedPartner.amountMoneyTotal || 0).toLocaleString('vi-VN')}đ</div>
          </div>
          <div className="bg-green-50 p-3 rounded-xl border border-green-100 shadow-sm">
            <div className="text-[10px] uppercase font-black text-green-400 mb-1">Đã trả</div>
            <div className="text-sm font-bold text-green-600">{(selectedPartner.amountMoneyPaid || 0).toLocaleString('vi-VN')}đ</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 shadow-sm">
            <div className="text-[10px] uppercase font-black text-orange-400 mb-1">Còn nợ</div>
            <div className="text-sm font-black text-orange-600">
              {maxAmount.toLocaleString('vi-VN')}đ
            </div>
          </div>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-blue-600">Chi phí theo tháng</h4>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                onMonthChange(e.target.value);
                if (e.target.value) {
                  onLoadMonthlyTotal(selectedPartner.id, e.target.value);
                }
              }}
              className="rounded-lg border border-blue-200 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
            />
          </div>
          {loadingMonthlyTotal ? (
            <div className="text-xs text-blue-400 italic">Đang tính toán...</div>
          ) : monthlyTotal !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-sm text-blue-700">Chi phí tháng {selectedMonth}:</span>
              <span className="text-lg font-black text-blue-800">{monthlyTotal.toLocaleString('vi-VN')}đ</span>
            </div>
          ) : (
            <div className="text-xs text-blue-400">Chọn tháng để xem chi tiết chi phí phát sinh</div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase text-gray-500">Số tiền muốn thanh toán</label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              className="w-full rounded-xl border border-gray-200 p-4 text-2xl font-black text-orange-600 placeholder:text-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all text-right"
              placeholder="0"
              value={formatNumberInput(paymentAmount)}
              onChange={(e) => onPaymentAmountChange(parseNumberInput(e.target.value))}
              min={0}
              max={maxAmount}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">VNĐ</div>
          </div>
          <div className="text-[10px] font-bold text-gray-400 text-right uppercase italic">
            Tối đa: {maxAmount.toLocaleString('vi-VN')}đ
          </div>
        </div>
      </div>
    </Modal>
  );
}
