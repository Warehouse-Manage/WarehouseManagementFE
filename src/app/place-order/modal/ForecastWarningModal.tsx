'use client';

import { Modal } from '@/components/shared';
import { InventoryForecastResponse } from '@/types';

interface ForecastWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  forecastData: InventoryForecastResponse | null;
  onConfirm: () => void;
}

export default function ForecastWarningModal({
  isOpen,
  onClose,
  forecastData,
  onConfirm
}: ForecastWarningModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cảnh báo thiếu hàng"
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 cursor-pointer transition-colors"
          >
            Tiếp tục
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-2">
            Có thể không đủ hàng cho đơn đặt hàng này. Bạn có muốn tiếp tục không?
          </p>
        </div>
        
        {forecastData && forecastData.forecasts && (
          <div className="space-y-3">
            {forecastData.forecasts
              .filter((f) => f.hasShortage)
              .map((forecast, idx: number) => (
                <div key={idx} className="border border-red-200 rounded-lg p-3 bg-red-50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{forecast.productName}</span>
                    <span className="text-red-600 font-black">
                      Thiếu {forecast.shortage.toLocaleString()} {forecast.packageProductId ? 'kiện' : 'sản phẩm'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    <div>Yêu cầu: {forecast.requiredQuantity.toLocaleString()}</div>
                    <div>Dự tính có: {forecast.estimatedQuantity.toLocaleString()}</div>
                    <div>Hiện tại: {forecast.currentQuantity.toLocaleString()}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
