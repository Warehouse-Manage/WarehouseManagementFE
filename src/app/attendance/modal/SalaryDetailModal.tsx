'use client';

import { Modal } from '@/components/shared';
import { Worker, Attendance } from '@/types';

interface SalaryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewingSalaryWorker: Worker | null;
  workerAttendanceView: Attendance | null;
  isLoadingWorkerAttendance: boolean;
  overviewMonth: string;
  calculateTotalWorkQuantity: () => number;
  calculateTotalOvertime: () => number;
  formatCurrency: (value?: number | null) => string;
  formatDateLabel: (value: string) => string;
  normalizeDateString: (dateValue: string) => string;
}

export default function SalaryDetailModal({
  isOpen,
  onClose,
  viewingSalaryWorker,
  workerAttendanceView,
  isLoadingWorkerAttendance,
  overviewMonth,
  calculateTotalWorkQuantity,
  calculateTotalOvertime,
  formatCurrency,
  formatDateLabel,
  normalizeDateString
}: SalaryDetailModalProps) {
  if (!viewingSalaryWorker) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi tiết lương - ${viewingSalaryWorker.name}`}
      size="lg"
      footer={
        <button
          onClick={onClose}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 cursor-pointer transition-colors"
        >
          Đóng
        </button>
      }
    >
      {isLoadingWorkerAttendance ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-100 border-t-orange-600"></div>
          <p className="text-sm font-semibold text-gray-500 animate-pulse">Đang tải dữ liệu chấm công...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 scale-in-center">
          <div className="space-y-4">
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 shadow-sm">
              <h4 className="text-xs font-black uppercase tracking-wider text-orange-600 mb-3">Thông tin cơ bản</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Họ và tên:</span>
                  <span className="font-bold text-gray-900">{viewingSalaryWorker.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Số điện thoại:</span>
                  <span className="font-bold text-gray-900">{viewingSalaryWorker.phoneNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Lương cơ bản:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(viewingSalaryWorker.salary || 0)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 mb-3">Tổng hợp tháng {overviewMonth}</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tổng ngày công:</span>
                  <span className="font-bold text-gray-900">{calculateTotalWorkQuantity()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tổng giờ làm thêm:</span>
                  <span className="font-semibold text-orange-600">{calculateTotalOvertime()} giờ</span>
                </div>
                <div className="border-t border-blue-200 pt-3 flex justify-between items-center">
                  <span className="text-gray-900 font-bold">Lương thực nhận:</span>
                  <span className="font-black text-xl text-orange-600">
                    {formatCurrency(workerAttendanceView?.monthlySalary ?? (viewingSalaryWorker.salary || 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-black text-gray-900">Danh sách ngày làm việc</h4>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {workerAttendanceView && workerAttendanceView.daysOff && workerAttendanceView.daysOff.length > 0 ? (
                workerAttendanceView.daysOff
                  .filter(wd => wd.workQuantity > 0)
                  .map((workDate, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <span className="text-xs font-semibold text-gray-700">
                        {formatDateLabel(normalizeDateString(workDate.workDate))}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-green-600 font-bold">Công: {workDate.workQuantity}</span>
                        {workDate.workOvertime > 0 && (
                          <span className="text-orange-600 font-bold">OT: {workDate.workOvertime}h</span>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  Chưa có dữ liệu chấm công cho tháng này
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
