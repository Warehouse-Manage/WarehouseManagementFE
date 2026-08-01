'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/shared';
import { Worker } from '@/types';
import { attendanceApi } from '@/api/attendanceApi';
import { printHtmlContent } from '@/lib/ultis';

interface PrintAttendanceSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: Worker[];
  defaultMonth: string; // YYYY-MM (tháng đang xem ở tổng quan)
  defaultTeam: string | null; // team của user role (approver -> "Tổ máy")
}

const TEAM_OPTIONS = [
  { label: 'Tất cả', value: '' },
  { label: 'Tổ máy', value: 'Tổ máy' },
  { label: 'Tổ đốt', value: 'Tổ đốt' },
];

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const getCurrentDateDefaults = (inputMonth: string) => {
  // inputMonth: YYYY-MM
  const [y, m] = inputMonth.split('-').map(Number);
  // Theo yêu cầu: mặc định lấy thời điểm hiện tại. Nếu tháng đang xem là tháng
  // hiện tại, lấy khoảng [1..today]; ngược lại lấy cả tháng [1..endOfMonth].
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
  const endDay = isCurrentMonth ? now.getDate() : getDaysInMonth(y, m);
  return {
    year: y,
    month: m,
    startDay: 1,
    endDay,
  };
};

export default function PrintAttendanceSheetModal({
  isOpen,
  onClose,
  workers,
  defaultMonth,
  defaultTeam,
}: PrintAttendanceSheetModalProps) {
  const initial = useMemo(() => getCurrentDateDefaults(defaultMonth), [defaultMonth]);

  const [year, setYear] = useState<number>(initial.year);
  const [month, setMonth] = useState<number>(initial.month);
  const [startDay, setStartDay] = useState<number>(initial.startDay);
  const [endDay, setEndDay] = useState<number>(initial.endDay);
  const [team, setTeam] = useState<string>(defaultTeam ?? '');
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nhóm theo tổ có sẵn trong workers để gợi ý
  const availableTeams = useMemo(() => {
    const set = new Set<string>();
    workers.forEach((w) => {
      if (w.team) set.add(w.team);
    });
    return Array.from(set);
  }, [workers]);

  useEffect(() => {
    if (isOpen) {
      const init = getCurrentDateDefaults(defaultMonth);
      setYear(init.year);
      setMonth(init.month);
      setStartDay(init.startDay);
      setEndDay(init.endDay);
      setError(null);
    }
  }, [isOpen, defaultMonth]);

  // Nếu defaultTeam thay đổi (khác ''), cố định team mặc định
  useEffect(() => {
    if (isOpen && defaultTeam) {
      setTeam(defaultTeam);
    }
  }, [isOpen, defaultTeam]);

  const handlePrint = async () => {
    setError(null);
    if (!year || !month || month < 1 || month > 12) {
      setError('Vui lòng chọn tháng/năm hợp lệ.');
      return;
    }
    if (startDay < 1 || endDay < startDay) {
      setError('Ngày đầu phải nhỏ hơn hoặc bằng ngày cuối và >= 1.');
      return;
    }
    const maxDay = getDaysInMonth(year, month);
    if (endDay > maxDay) {
      setError(`Ngày cuối vượt quá số ngày của tháng (${maxDay}).`);
      return;
    }

    setIsPrinting(true);
    try {
      const html = await attendanceApi.printAttendanceSheet({
        year,
        month,
        startDay,
        endDay,
        team: team || null,
      });
      if (html) {
        printHtmlContent(html);
      } else {
        setError('Không nhận được HTML từ máy chủ.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Không thể in bảng chấm công.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="In bảng chấm công"
      size="md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isPrinting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            )}
            {isPrinting ? 'Đang in...' : 'In bảng chấm công'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Chọn khoảng thời gian và tổ để in bảng chấm công cho tháng đang xem. Mặc định lấy thời điểm hiện tại.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
              Ngày đầu
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={startDay}
              onChange={(e) => setStartDay(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
              Ngày cuối
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={endDay}
              onChange={(e) => setEndDay(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
              Tháng
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
              Năm
            </label>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
            Tổ
          </label>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            disabled={!!defaultTeam}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            {TEAM_OPTIONS.map((opt) => {
              if (opt.value && !availableTeams.includes(opt.value) && opt.value !== defaultTeam) {
                return null;
              }
              return (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              );
            })}
            {!availableTeams.includes('Tổ đốt') && (
              <option value="Tổ đốt">Tổ đốt</option>
            )}
            {!availableTeams.includes('Tổ máy') && (
              <option value="Tổ máy">Tổ máy</option>
            )}
          </select>
          {defaultTeam && (
            <p className="mt-1 text-[10px] text-gray-400">
              Bạn đang xem với vai trò hạn chế: chỉ in được nhân viên của <strong>{defaultTeam}</strong>.
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
