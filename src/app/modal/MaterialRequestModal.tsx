'use client';

import { Modal } from '@/components/shared';
import { Material } from '@/types';
import { formatNumberInput, parseNumberInput } from '@/lib/ultis';
import { Package, Activity, FileText } from 'lucide-react';

interface MaterialRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterial: Material | null;
  requestQuantity: number;
  requestNote: string;
  isSubmitting: boolean;
  onQuantityChange: (quantity: number) => void;
  onNoteChange: (note: string) => void;
  onConfirm: () => void;
}

export default function MaterialRequestModal({
  isOpen,
  onClose,
  selectedMaterial,
  requestQuantity,
  requestNote,
  isSubmitting,
  onQuantityChange,
  onNoteChange,
  onConfirm
}: MaterialRequestModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yêu Cầu Sử Dụng Vật Tư"
      size="md"
      footer={
        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 font-black rounded-2xl hover:bg-gray-200 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 px-6 py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all active:scale-95 shadow-lg shadow-orange-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : 'Xác nhận gửi'}
          </button>
        </div>
      }
    >
      {selectedMaterial && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-2xl border border-orange-100">
            <div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Package className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h4 className="font-black text-gray-900">{selectedMaterial.name}</h4>
              <p className="text-sm text-gray-500 font-medium">Hiện có: {selectedMaterial.amount} {selectedMaterial.unit}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-3 w-3" />
                Số lượng yêu cầu
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onQuantityChange(Math.max(1, requestQuantity - 1))}
                  className="h-12 w-12 bg-gray-100 rounded-xl flex items-center justify-center font-black text-xl hover:bg-gray-200 transition-all cursor-pointer"
                >-</button>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNumberInput(requestQuantity)}
                  onChange={(e) => {
                    const parsed = parseNumberInput(e.target.value);
                    const normalized = parsed === '' ? 1 : Math.max(1, Number(parsed));
                    onQuantityChange(normalized);
                  }}
                  className="flex-1 h-12 bg-white border border-gray-200 rounded-xl px-4 text-center font-black text-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                />
                <button
                  onClick={() => onQuantityChange(requestQuantity + 1)}
                  className="h-12 w-12 bg-orange-600 rounded-xl flex items-center justify-center font-black text-xl text-white hover:bg-orange-700 transition-all shadow-md shadow-orange-100 cursor-pointer"
                >+</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Ghi chú sử dụng
              </label>
              <textarea
                value={requestNote}
                onChange={(e) => onNoteChange(e.target.value)}
                placeholder="Vật tư này dùng cho việc gì? (Có thể bỏ trống)"
                rows={3}
                className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all placeholder:text-gray-400 resize-none"
              />
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
            <Activity className="h-4 w-4 text-blue-500 mt-0.5" />
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              Yêu cầu này sẽ được gửi đến bộ phận quản lý kho để phê duyệt. Bạn có thể theo dõi trạng thái tại mục Lịch sử yêu cầu.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
