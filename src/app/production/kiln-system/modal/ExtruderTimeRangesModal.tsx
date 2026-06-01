'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/shared';
import { productionApi } from '@/api';
import { ExtruderTimeRange } from '@/types';
import { toast } from 'sonner';
import { Clock, Trash2, Plus, AlertCircle } from 'lucide-react';

interface ExtruderTimeRangesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExtruderTimeRangesModal({
  isOpen,
  onClose,
}: ExtruderTimeRangesModalProps) {
  const [ranges, setRanges] = useState<ExtruderTimeRange[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');

  const fetchRanges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productionApi.getExtruderTimeRanges();
      setRanges(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được danh sách khung giờ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchRanges();
    }
  }, [isOpen, fetchRanges]);

  const handleAdd = async () => {
    try {
      setAdding(true);
      setError(null);

      if (!startTime || !endTime) {
        toast.error('Vui lòng chọn đầy đủ giờ bắt đầu và kết thúc');
        return;
      }

      await productionApi.createExtruderTimeRange({
        startTime,
        endTime,
      });

      toast.success('Đã thêm khung giờ giám sát');
      await fetchRanges();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể thêm khung giờ');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setError(null);
      await productionApi.deleteExtruderTimeRange(id);
      toast.success('Đã xóa khung giờ giám sát');
      await fetchRanges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa khung giờ');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài đặt khung giờ giám sát máy đùn"
      size="md"
      footer={
        <button
          onClick={onClose}
          className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-black text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer"
        >
          Đóng
        </button>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-semibold text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50/60 to-orange-50/60 p-4">
          <p className="text-xs font-medium leading-relaxed text-amber-800">
            <strong>Hệ thống giám sát ngầm:</strong> Trong các khung giờ được cài đặt bên dưới, 
            nếu máy đùn ngừng hoạt động liên tục từ <strong>10 phút</strong> trở lên, 
            hệ thống sẽ phát thông báo cảnh báo trực quan trên màn hình điều khiển.
          </p>
        </div>

        {/* List of current ranges */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Khung giờ đang áp dụng</h3>
          
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600" />
            </div>
          ) : ranges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
              <Clock className="mx-auto mb-2 h-6 w-6 text-gray-300" />
              <p className="text-xs font-semibold text-gray-400">Chưa cấu hình khung giờ giám sát nào</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {ranges.map((range) => (
                <div
                  key={range.id}
                  className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                      <Clock className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-gray-900">
                        {range.startTime} — {range.endTime}
                      </p>
                      <p className="text-[10px] font-medium text-gray-400">Giám sát tự động</p>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleDelete(range.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                    title="Xóa khung giờ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new range form */}
        <div className="rounded-2xl border border-gray-100 bg-gray-50/30 p-4 space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Thêm khung giờ giám sát mới</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="w-full space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Giờ bắt đầu</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-orange-500 focus:outline-none transition-colors"
              />
            </div>
            <div className="w-full space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Giờ kết thúc</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-orange-500 focus:outline-none transition-colors"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-black text-white hover:bg-orange-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{adding ? 'Đang thêm...' : 'Thêm'}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
