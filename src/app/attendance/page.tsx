'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';

type Worker = {
  id: number;
  name: string;
  salary: number;
  phoneNumber: string;
  age: number;
  userId?: number | null;
};

type Attendance = {
  id: number;
  workerId: number;
  daysOff: string[];
  monthlySalary: number;
  calculationMonth: string;
  worker?: Worker;
};

type ToastState = {
  type: 'success' | 'error' | 'info';
  message: string;
};

const getCurrentMonthValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const normalizeDateString = (dateValue: string) => {
  if (!dateValue) return '';
  return dateValue.split('T')[0];
};

const formatDateLabel = (value: string) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return value;
  }
};

const formatCurrency = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '0 VNĐ';
  }
  return `${value.toLocaleString('vi-VN')} VNĐ`;
};

const dateMatchesMonth = (dateValue: string, monthValue: string) => {
  if (!dateValue || !monthValue) return false;
  const [year, month] = monthValue.split('-').map(Number);
  const date = new Date(dateValue);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
};

const toMonthIsoString = (monthValue: string) => {
  if (!monthValue) return new Date().toISOString();
  return new Date(`${monthValue}-01T00:00:00Z`).toISOString();
};

const toDateIsoString = (dateValue: string) => {
  if (!dateValue) return new Date().toISOString();
  return new Date(`${dateValue}T00:00:00Z`).toISOString();
};

const getDaysInMonth = (monthValue: string) => {
  if (!monthValue) return 30;
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return 30;
  return new Date(year, month, 0).getDate();
};

const weekDayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

type CalendarDay = {
  label: string;
  dateValue: string;
  inMonth: boolean;
};

const buildCalendarDays = (monthValue: string): CalendarDay[] => {
  if (!monthValue) return [];
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return [];

  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: CalendarDay[] = [];

  const leadingEmpty = firstDay.getDay();
  for (let i = 0; i < leadingEmpty; i++) {
    days.push({ label: '', dateValue: '', inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateValue = `${monthValue}-${String(day).padStart(2, '0')}`;
    days.push({ label: String(day), dateValue, inMonth: true });
  }

  while (days.length % 7 !== 0) {
    days.push({ label: '', dateValue: '', inMonth: false });
  }

  return days;
};

const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const formatMonthTitle = (monthValue: string) => {
  if (!monthValue) return '';
  try {
    return new Date(`${monthValue}-01T00:00:00Z`).toLocaleDateString('vi-VN', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return monthValue;
  }
};

const buildAuthHeaders = () => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (typeof window === 'undefined') return headers;
  try {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Không thể truy cập localStorage:', error);
  }
  return headers;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return fallback;
};

export default function AttendancePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'create' | 'mark' | 'worker'>('create');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    selectedDate: '',
    month: getCurrentMonthValue(),
  });
  const [createToast, setCreateToast] = useState<ToastState | null>(null);
  const [workerAttendances, setWorkerAttendances] = useState<Map<number, Attendance>>(new Map());
  const [isLoadingAttendances, setIsLoadingAttendances] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState<number | null>(null);

  const [markForm, setMarkForm] = useState({
    workerId: '',
    month: getCurrentMonthValue(),
  });
  const [markDayInput, setMarkDayInput] = useState('');
  const [markDaysOff, setMarkDaysOff] = useState<string[]>([]);
  const [markToast, setMarkToast] = useState<ToastState | null>(null);
  const [markAttendance, setMarkAttendance] = useState<Attendance | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSavingMark, setIsSavingMark] = useState(false);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerForm, setWorkerForm] = useState({
    name: '',
    age: '',
    phoneNumber: '',
    salary: '',
    userId: '',
  });
  const [workerToast, setWorkerToast] = useState<ToastState | null>(null);
  const [isSavingWorker, setIsSavingWorker] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [workerSearchCrud, setWorkerSearchCrud] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [viewingSalaryWorker, setViewingSalaryWorker] = useState<Worker | null>(null);
  const [salaryViewMonth, setSalaryViewMonth] = useState(getCurrentMonthValue());
  const [workerAttendanceView, setWorkerAttendanceView] = useState<Attendance | null>(null);
  const [isLoadingWorkerAttendance, setIsLoadingWorkerAttendance] = useState(false);

  useEffect(() => {
    const userId = getCookie('userId');
    const userName = getCookie('userName');
    const role = getCookie('role');

    if (!userId || !userName) {
      router.push('/login');
      return;
    }

    // Limit access to non-basic roles (allow approver and above)
    if (role === 'user') {
      window.location.replace('/');
      return;
    }

    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (isCheckingAuth) return;

    const fetchWorkers = async () => {
      setLoadingWorkers(true);
      setGlobalError(null);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/workers`, {
          method: 'GET',
          headers: buildAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setWorkers(data);
      } catch (error) {
        console.error('Không thể tải danh sách công nhân:', error);
        setGlobalError('Không thể tải danh sách công nhân. Vui lòng thử lại sau.');
      } finally {
        setLoadingWorkers(false);
      }
    };

    fetchWorkers();
  }, [isCheckingAuth]);

  useEffect(() => {
    if (!createForm.month || workers.length === 0) {
      setWorkerAttendances(new Map());
      return;
    }

    let cancelled = false;

    const fetchAllAttendances = async () => {
      setIsLoadingAttendances(true);
      const [year, month] = createForm.month.split('-');
      const attendanceMap = new Map<number, Attendance>();

      try {
        const fetchPromises = workers.map(async (worker) => {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_HOST}/api/attendances/worker/${worker.id}/month/${year}/${Number(month)}`,
              {
                method: 'GET',
                headers: buildAuthHeaders(),
              }
            );

            if (!response.ok) {
              return null;
            }

            const data: Attendance = await response.json();
            return { workerId: worker.id, attendance: data };
          } catch (error) {
            console.error(`Không thể tải chấm công cho công nhân ${worker.id}:`, error);
            return null;
          }
        });

        const results = await Promise.all(fetchPromises);
        if (!cancelled) {
          results.forEach((result) => {
            if (result) {
              attendanceMap.set(result.workerId, result.attendance);
            }
          });
          setWorkerAttendances(attendanceMap);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải chấm công:', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAttendances(false);
        }
      }
    };

    fetchAllAttendances();

    return () => {
      cancelled = true;
    };
  }, [createForm.month, workers]);

  const selectedMarkWorker = useMemo(
    () => workers.find((worker) => worker.id === Number(markForm.workerId)),
    [workers, markForm.workerId]
  );

  const markPreviewSalary = useMemo(() => {
    if (!selectedMarkWorker) return null;
    const daysInMonth = getDaysInMonth(markForm.month);
    const dailySalary = selectedMarkWorker.salary / daysInMonth;
    const deducted = dailySalary * markDaysOff.length;
    return selectedMarkWorker.salary - deducted;
  }, [selectedMarkWorker, markForm.month, markDaysOff.length]);

  const calendarDays = useMemo(() => buildCalendarDays(createForm.month), [createForm.month]);

  const calendarRows = useMemo(() => chunkArray(calendarDays, 7), [calendarDays]);

  const filteredWorkers = useMemo(() => {
    if (!workerSearch.trim()) return workers;
    return workers.filter((worker) => worker.name.toLowerCase().includes(workerSearch.toLowerCase()));
  }, [workers, workerSearch]);

  const toggleCalendarDaySelection = (dateValue: string) => {
    if (!dateValue) return;
    setCreateForm((prev) => ({
      ...prev,
      selectedDate: prev.selectedDate === dateValue ? '' : dateValue,
    }));
  };

  const isWorkerAttended = (workerId: number, dateValue: string): boolean => {
    if (!dateValue) return false;
    const attendance = workerAttendances.get(workerId);
    if (!attendance || !attendance.daysOff) return false; // Default to unchecked (absent)
    const normalizedDaysOff = (attendance.daysOff || []).map(normalizeDateString);
    // Checked (attended) means the date is NOT in daysOff
    return !normalizedDaysOff.includes(dateValue);
  };

  const toggleWorkerAttendance = async (workerId: number, dateValue: string) => {
    if (!dateValue || !createForm.month) {
      setCreateToast({ type: 'error', message: 'Vui lòng chọn ngày.' });
      return;
    }

    setIsSavingAttendance(workerId);
    setCreateToast(null);

    try {
      const attendance = workerAttendances.get(workerId);
      const normalizedDaysOff = attendance
        ? (attendance.daysOff || []).map(normalizeDateString)
        : [];
      // Checked means attended (date NOT in daysOff), unchecked means absent (date IN daysOff)
      const isCurrentlyAttended = !normalizedDaysOff.includes(dateValue);
      // Toggle: if currently attended, mark as absent; if currently absent, mark as attended
      const newIsAttended = !isCurrentlyAttended;

      const payload = {
        workerId,
        attendanceDate: toDateIsoString(dateValue),
        isAttended: newIsAttended,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/attendances/mark`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `HTTP ${response.status}`);
      }

      const updated: Attendance = await response.json();
      setWorkerAttendances((prev) => {
        const next = new Map(prev);
        next.set(workerId, updated);
        return next;
      });

      setCreateToast({
        type: 'success',
        message: `Đã ${newIsAttended ? 'đánh dấu có mặt' : 'đánh dấu vắng mặt'} cho ${workers.find((w) => w.id === workerId)?.name || 'công nhân'}.`,
      });
    } catch (error: unknown) {
      console.error('Không thể cập nhật chấm công:', error);
      setCreateToast({
        type: 'error',
        message: getErrorMessage(error, 'Không thể cập nhật chấm công.'),
      });
    } finally {
      setIsSavingAttendance(null);
    }
  };

  const addDayOffToMark = () => {
    if (!markForm.workerId || !markForm.month) {
      setMarkToast({ type: 'error', message: 'Vui lòng chọn công nhân và tháng.' });
      return;
    }
    if (!markDayInput) {
      setMarkToast({ type: 'error', message: 'Vui lòng chọn ngày nghỉ.' });
      return;
    }
    if (!dateMatchesMonth(markDayInput, markForm.month)) {
      setMarkToast({
        type: 'error',
        message: 'Ngày nghỉ phải thuộc tháng đang xem.',
      });
      return;
    }
    setMarkDaysOff((prev) => Array.from(new Set([...prev, markDayInput])).sort());
    setMarkDayInput('');
    setMarkToast(null);
  };

  const removeMarkDay = (day: string) => {
    setMarkDaysOff((prev) => prev.filter((d) => d !== day));
  };

  const fetchAttendanceForMarking = async () => {
    if (!markForm.workerId || !markForm.month) {
      setMarkToast({ type: 'error', message: 'Vui lòng chọn công nhân và tháng.' });
      return;
    }

    setIsLoadingAttendance(true);
    setMarkToast(null);
    const [year, month] = markForm.month.split('-');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_HOST}/api/attendances/worker/${markForm.workerId}/month/${year}/${Number(month)}`,
        {
          method: 'GET',
          headers: buildAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `HTTP ${response.status}`);
      }

      const data: Attendance = await response.json();
      setMarkAttendance(data);
      setMarkDaysOff((data.daysOff || []).map(normalizeDateString));
      
      // Check if it's a default record (Id is 0 or monthlySalary is 0 with all days off)
      const daysInMonth = getDaysInMonth(markForm.month);
      const isDefault = data.id === 0 || (data.monthlySalary === 0 && (data.daysOff?.length || 0) === daysInMonth);
      
      setMarkToast({
        type: isDefault ? 'info' : 'success',
        message: isDefault 
          ? 'Chưa có dữ liệu chấm công cho công nhân này trong tháng đã chọn. Tất cả các ngày được tính là ngày nghỉ.'
          : 'Đã tải chấm công hiện tại.',
      });
    } catch (error: unknown) {
      console.error('Không thể tải chấm công:', error);
      setMarkToast({
        type: 'error',
        message: getErrorMessage(error, 'Không thể tải chấm công.'),
      });
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const saveMarkedAttendance = async () => {
    if (!markForm.workerId || !markForm.month) {
      setMarkToast({ type: 'error', message: 'Vui lòng chọn công nhân và tháng.' });
      return;
    }

    setIsSavingMark(true);
    setMarkToast(null);
    try {
      const payload = {
        workerId: Number(markForm.workerId),
        calculationMonth: toMonthIsoString(markForm.month),
        daysOff: markDaysOff.map(toDateIsoString),
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/attendances`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `HTTP ${response.status}`);
      }

      const updated: Attendance = await response.json();
      setMarkAttendance(updated);
      setMarkDaysOff((updated.daysOff || []).map(normalizeDateString));
      setMarkToast({ type: 'success', message: 'Đã cập nhật chấm công.' });
    } catch (error: unknown) {
      console.error('Không thể cập nhật chấm công:', error);
      setMarkToast({
        type: 'error',
        message: getErrorMessage(error, 'Không thể cập nhật chấm công.'),
      });
    } finally {
      setIsSavingMark(false);
    }
  };

  const resetWorkerForm = () => {
    setWorkerForm({
      name: '',
      age: '',
      phoneNumber: '',
      salary: '',
      userId: '',
    });
    setEditingWorker(null);
  };

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setWorkerForm({
      name: worker.name,
      age: String(worker.age),
      phoneNumber: worker.phoneNumber,
      salary: String(worker.salary),
      userId: worker.userId ? String(worker.userId) : '',
    });
  };

  const handleDeleteWorker = async (workerId: number) => {
    setIsSavingWorker(true);
    setWorkerToast(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/workers/${workerId}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `HTTP ${response.status}`);
      }

      setWorkers((prev) => prev.filter((w) => w.id !== workerId));
      setWorkerToast({ type: 'success', message: 'Đã xóa công nhân.' });
      setShowDeleteConfirm(null);
    } catch (error: unknown) {
      console.error('Không thể xóa công nhân:', error);
      setWorkerToast({
        type: 'error',
        message: getErrorMessage(error, 'Không thể xóa công nhân.'),
      });
    } finally {
      setIsSavingWorker(false);
    }
  };

  const submitCreateWorker = async () => {
    if (!workerForm.name || !workerForm.phoneNumber || !workerForm.salary) {
      setWorkerToast({ type: 'error', message: 'Vui lòng nhập đủ tên, lương và số điện thoại.' });
      return;
    }

    const payload = {
      name: workerForm.name,
      age: workerForm.age ? Number(workerForm.age) : 0,
      phoneNumber: workerForm.phoneNumber,
      salary: Number(workerForm.salary),
      userId: workerForm.userId ? Number(workerForm.userId) : null,
    };

    if (Number.isNaN(payload.salary) || payload.salary <= 0) {
      setWorkerToast({ type: 'error', message: 'Lương phải lớn hơn 0.' });
      return;
    }

    setIsSavingWorker(true);
    setWorkerToast(null);
    try {
      const url = editingWorker
        ? `${process.env.NEXT_PUBLIC_API_HOST}/api/workers/${editingWorker.id}`
        : `${process.env.NEXT_PUBLIC_API_HOST}/api/workers`;
      const method = editingWorker ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: buildAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `HTTP ${response.status}`);
      }

      const result: Worker = await response.json();
      if (editingWorker) {
        setWorkers((prev) => prev.map((w) => (w.id === editingWorker.id ? result : w)));
        setWorkerToast({ type: 'success', message: 'Đã cập nhật công nhân.' });
      } else {
        setWorkers((prev) => [...prev, result]);
        setWorkerToast({ type: 'success', message: 'Đã tạo công nhân mới.' });
      }
      resetWorkerForm();
    } catch (error: unknown) {
      console.error('Không thể lưu công nhân:', error);
      setWorkerToast({
        type: 'error',
        message: getErrorMessage(error, 'Không thể lưu công nhân.'),
      });
    } finally {
      setIsSavingWorker(false);
    }
  };

  const filteredWorkersCrud = useMemo(() => {
    if (!workerSearchCrud.trim()) return workers;
    return workers.filter(
      (worker) =>
        worker.name.toLowerCase().includes(workerSearchCrud.toLowerCase()) ||
        worker.phoneNumber.includes(workerSearchCrud)
    );
  }, [workers, workerSearchCrud]);

  const fetchWorkerAttendanceForSalary = useCallback(async (workerId: number, month: string) => {
    setIsLoadingWorkerAttendance(true);
    setWorkerAttendanceView(null);
    try {
      const [year, monthNum] = month.split('-');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_HOST}/api/attendances/worker/${workerId}/month/${year}/${Number(monthNum)}`,
        {
          method: 'GET',
          headers: buildAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: Attendance = await response.json();
      setWorkerAttendanceView(data);
    } catch (error) {
      console.error('Không thể tải chấm công:', error);
      setWorkerAttendanceView(null);
    } finally {
      setIsLoadingWorkerAttendance(false);
    }
  }, []);

  useEffect(() => {
    if (viewingSalaryWorker && salaryViewMonth) {
      fetchWorkerAttendanceForSalary(viewingSalaryWorker.id, salaryViewMonth);
    } else {
      setWorkerAttendanceView(null);
    }
  }, [viewingSalaryWorker, salaryViewMonth, fetchWorkerAttendanceForSalary]);

  const handleViewSalary = (worker: Worker) => {
    setViewingSalaryWorker(worker);
    setSalaryViewMonth(getCurrentMonthValue());
  };

  const salaryViewCalendarDays = useMemo(() => buildCalendarDays(salaryViewMonth), [salaryViewMonth]);
  const salaryViewCalendarRows = useMemo(() => chunkArray(salaryViewCalendarDays, 7), [salaryViewCalendarDays]);

  const isDayOffInSalaryView = (dateValue: string): boolean => {
    if (!workerAttendanceView || !workerAttendanceView.daysOff) return false;
    const normalizedDaysOff = (workerAttendanceView.daysOff || []).map(normalizeDateString);
    return normalizedDaysOff.includes(dateValue);
  };

  const calculateDaysWorked = (): number => {
    if (!viewingSalaryWorker || !salaryViewMonth) return 0;
    const daysInMonth = getDaysInMonth(salaryViewMonth);
    const daysOffCount = workerAttendanceView?.daysOff?.length || 0;
    return daysInMonth - daysOffCount;
  };

  const isDefaultAttendanceRecord = (): boolean => {
    if (!workerAttendanceView) return false;
    // Check if it's a default record (Id is 0 or monthlySalary is 0 with all days off)
    const daysInMonth = getDaysInMonth(salaryViewMonth);
    const daysOffCount = workerAttendanceView.daysOff?.length || 0;
    return workerAttendanceView.id === 0 || 
           (workerAttendanceView.monthlySalary === 0 && daysOffCount === daysInMonth);
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-lg text-gray-600">Đang kiểm tra xác thực...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Chấm công công nhân</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Tạo hoặc cập nhật bảng chấm công và đánh dấu ngày nghỉ cho từng công nhân.
          </p>
        </div>
      </div>

      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row">
          <button
            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === 'create'
                ? 'bg-orange-600 text-white'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('create')}
          >
            Tạo bảng chấm công
          </button>
          <button
            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === 'mark'
                ? 'bg-orange-600 text-white'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('mark')}
          >
            Đánh dấu ngày nghỉ
          </button>
          <button
            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === 'worker'
                ? 'bg-orange-600 text-white'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('worker')}
          >
            Quản lý công nhân
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'create' ? (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Tháng chấm công</label>
                <input
                  type="month"
                  value={createForm.month}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, month: e.target.value, selectedDate: '' }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Chọn ngày trong lịch bên trái, sau đó đánh dấu chấm công cho từng công nhân bên phải.
                </p>
              </div>

              <div className="flex flex-col gap-6 lg:flex-row">
                <div className="lg:w-1/2">
                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-black text-gray-900">
                          {formatMonthTitle(createForm.month) || 'Chọn tháng'}
                        </p>
                        {createForm.selectedDate && (
                          <p className="text-xs text-orange-600 font-semibold mt-1">
                            Đã chọn: {formatDateLabel(createForm.selectedDate)}
                          </p>
                        )}
                      </div>
                      {isLoadingAttendances && (
                        <span className="text-xs font-semibold text-orange-600">Đang tải...</span>
                      )}
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500 mb-2">
                      {weekDayLabels.map((day) => (
                        <span key={day}>{day}</span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center text-sm">
                      {calendarRows.map((row, rowIndex) =>
                        row.map((day, colIndex) =>
                          day.inMonth ? (
                            <button
                              key={`${day.dateValue}-${rowIndex}-${colIndex}`}
                              onClick={() => toggleCalendarDaySelection(day.dateValue)}
                              className={`rounded-md px-0 py-2 font-semibold transition ${
                                createForm.selectedDate === day.dateValue
                                  ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-300'
                                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {day.label}
                            </button>
                          ) : (
                            <span key={`empty-${rowIndex}-${colIndex}`} className="text-gray-300">
                              &nbsp;
                            </span>
                          )
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 lg:w-1/2">
                  <div>
                    <label className="text-sm font-bold text-gray-700 block mb-2">Danh sách công nhân</label>
                    <input
                      type="text"
                      placeholder="Tìm theo tên..."
                      value={workerSearch}
                      onChange={(e) => setWorkerSearch(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                  {!createForm.selectedDate && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                      Vui lòng chọn một ngày trong lịch để bắt đầu chấm công.
                    </div>
                  )}
                  <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                    {loadingWorkers ? (
                      <p className="text-sm text-gray-500">Đang tải danh sách công nhân...</p>
                    ) : filteredWorkers.length === 0 ? (
                      <p className="text-sm text-gray-500">Không tìm thấy công nhân phù hợp.</p>
                    ) : (
                      filteredWorkers.map((worker) => {
                        const attended = createForm.selectedDate
                          ? isWorkerAttended(worker.id, createForm.selectedDate)
                          : false;
                        const isSaving = isSavingAttendance === worker.id;
                        const attendance = workerAttendances.get(worker.id);
                        const daysOffCount = attendance?.daysOff?.length || 0;

                        return (
                          <div
                            key={worker.id}
                            className="w-full rounded-lg border border-gray-200 bg-white p-3 transition hover:border-orange-300"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-black text-gray-900">{worker.name}</p>
                                  <span className="text-xs font-semibold text-orange-600">
                                    {formatCurrency(worker.salary)}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                  <p>SĐT: {worker.phoneNumber}</p>
                                  {attendance && (
                                    <p className="text-orange-600 font-semibold">
                                      {daysOffCount} ngày nghỉ trong tháng
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center">
                                {createForm.selectedDate ? (
                                  <label className="flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={attended}
                                      onChange={() => toggleWorkerAttendance(worker.id, createForm.selectedDate)}
                                      disabled={isSaving}
                                      className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500 disabled:opacity-50"
                                    />
                                    <span className="ml-2 text-xs font-semibold text-gray-700">
                                      {isSaving ? 'Đang lưu...' : attended ? 'Có mặt' : 'Vắng mặt'}
                                    </span>
                                  </label>
                                ) : (
                                  <span className="text-xs text-gray-400">Chọn ngày</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {createToast && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm font-semibold ${
                    createToast.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : createToast.type === 'info'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {createToast.message}
                </div>
              )}
            </div>
          ) : activeTab === 'mark' ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-sm font-bold text-gray-700 block mb-2">Công nhân</label>
                  <select
                    value={markForm.workerId}
                    onChange={(e) => {
                      setMarkForm((prev) => ({ ...prev, workerId: e.target.value }));
                      setMarkAttendance(null);
                      setMarkDaysOff([]);
                      setMarkToast(null);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="">{loadingWorkers ? 'Đang tải...' : 'Chọn công nhân'}</option>
                    {workers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.name} • {formatCurrency(worker.salary)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="text-sm font-bold text-gray-700 block mb-2">Tháng chấm công</label>
                  <input
                    type="month"
                    value={markForm.month}
                    onChange={(e) => {
                      setMarkForm((prev) => ({ ...prev, month: e.target.value }));
                      setMarkAttendance(null);
                      setMarkDaysOff([]);
                      setMarkToast(null);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    onClick={fetchAttendanceForMarking}
                    className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                    disabled={!markForm.workerId || !markForm.month || isLoadingAttendance}
                  >
                    {isLoadingAttendance ? 'Đang tải...' : 'Tải bảng chấm công'}
                  </button>
                </div>
              </div>

              {markAttendance && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-semibold text-gray-700">
                  <div>
                    Công nhân: <span className="text-gray-900">{markAttendance.worker?.name || selectedMarkWorker?.name}</span>
                  </div>
                  <div>
                    Lương tháng hiện tại: <span className="text-green-600">{formatCurrency(markAttendance.monthlySalary)}</span>
                  </div>
                  <div>
                    Ngày nghỉ đã lưu: <span className="text-gray-900">{markAttendance.daysOff?.length || 0}</span>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-dashed border-gray-300 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="date"
                    value={markDayInput}
                    onChange={(e) => setMarkDayInput(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    max={`${markForm.month}-31`}
                    min={`${markForm.month}-01`}
                    disabled={!markForm.month}
                  />
                  <button
                    onClick={addDayOffToMark}
                    className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-700 disabled:opacity-50"
                    disabled={!markForm.workerId || !markForm.month}
                  >
                    Thêm ngày nghỉ
                  </button>
                </div>
                {markDaysOff.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {markDaysOff.map((day) => (
                      <span
                        key={day}
                        className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                      >
                        {formatDateLabel(day)}
                        <button
                          className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-blue-600 hover:bg-blue-200"
                          onClick={() => removeMarkDay(day)}
                          aria-label={`Xóa ${day}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Chưa có ngày nghỉ nào trong danh sách.</p>
                )}
              </div>

              {selectedMarkWorker && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 flex flex-wrap gap-4 text-sm font-semibold text-gray-700">
                  <div>
                    Lương cơ bản: <span className="text-gray-900">{formatCurrency(selectedMarkWorker.salary)}</span>
                  </div>
                  <div>
                    Số ngày nghỉ: <span className="text-gray-900">{markDaysOff.length}</span>
                  </div>
                  <div>
                    Lương dự kiến: <span className="text-green-600">{formatCurrency(markPreviewSalary)}</span>
                  </div>
                </div>
              )}

              {markToast && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm font-semibold ${
                    markToast.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : markToast.type === 'info'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {markToast.message}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={saveMarkedAttendance}
                  className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold uppercase tracking-wide text-white shadow hover:bg-orange-700 disabled:opacity-50"
                  disabled={isSavingMark || !markForm.workerId || !markForm.month}
                >
                  {isSavingMark ? 'Đang lưu...' : 'Cập nhật chấm công'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-gray-900">
                  {editingWorker ? 'Sửa công nhân' : 'Tạo công nhân mới'}
                </h2>
                {editingWorker && (
                  <button
                    onClick={resetWorkerForm}
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900"
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-2">Tên công nhân</label>
                  <input
                    type="text"
                    value={workerForm.name}
                    onChange={(e) => setWorkerForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    placeholder="Ví dụ: Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-2">Tuổi</label>
                  <input
                    type="number"
                    min="18"
                    value={workerForm.age}
                    onChange={(e) => setWorkerForm((prev) => ({ ...prev, age: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-2">Số điện thoại</label>
                  <input
                    type="tel"
                    value={workerForm.phoneNumber}
                    onChange={(e) =>
                      setWorkerForm((prev) => ({ ...prev, phoneNumber: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    placeholder="0901..."
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-2">Lương cơ bản</label>
                  <input
                    type="number"
                    min="0"
                    value={workerForm.salary}
                    onChange={(e) => setWorkerForm((prev) => ({ ...prev, salary: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    placeholder="10000000"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 block mb-2">User ID (tùy chọn)</label>
                  <input
                    type="number"
                    min="1"
                    value={workerForm.userId}
                    onChange={(e) => setWorkerForm((prev) => ({ ...prev, userId: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    placeholder="Liên kết tài khoản người dùng"
                  />
                </div>
              </div>

              {workerToast && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm font-semibold ${
                    workerToast.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : workerToast.type === 'info'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {workerToast.message}
                </div>
              )}

              <div className="flex justify-end gap-3">
                {editingWorker && (
                  <button
                    onClick={resetWorkerForm}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-bold uppercase tracking-wide text-gray-700 shadow hover:bg-gray-50 disabled:opacity-50"
                    disabled={isSavingWorker}
                  >
                    Hủy
                  </button>
                )}
                <button
                  onClick={submitCreateWorker}
                  className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold uppercase tracking-wide text-white shadow hover:bg-orange-700 disabled:opacity-50"
                  disabled={isSavingWorker}
                >
                  {isSavingWorker
                    ? 'Đang lưu...'
                    : editingWorker
                    ? 'Cập nhật công nhân'
                    : 'Tạo công nhân'}
                </button>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-black text-gray-900">Danh sách công nhân</h2>
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc số điện thoại..."
                    value={workerSearchCrud}
                    onChange={(e) => setWorkerSearchCrud(e.target.value)}
                    className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {loadingWorkers ? (
                    <p className="text-sm text-gray-500 text-center py-4">Đang tải danh sách công nhân...</p>
                  ) : filteredWorkersCrud.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Không tìm thấy công nhân phù hợp.</p>
                  ) : (
                    filteredWorkersCrud.map((worker) => (
                      <div
                        key={worker.id}
                        className="rounded-lg border border-gray-200 bg-white p-4 hover:border-orange-300 transition"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-black text-gray-900">{worker.name}</p>
                              <span className="text-xs font-semibold text-orange-600">
                                {formatCurrency(worker.salary)}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                              <p>SĐT: {worker.phoneNumber}</p>
                              <p>Tuổi: {worker.age}</p>
                              {worker.userId && <p>User ID: {worker.userId}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewSalary(worker)}
                              className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                              disabled={isSavingWorker}
                            >
                              Xem lương
                            </button>
                            <button
                              onClick={() => handleEditWorker(worker)}
                              className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                              disabled={isSavingWorker || editingWorker?.id === worker.id}
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(worker.id)}
                              className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                              disabled={isSavingWorker}
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {viewingSalaryWorker && (
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-xl font-black text-gray-900">
                        Xem lương: {viewingSalaryWorker.name}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Lương cơ bản: {formatCurrency(viewingSalaryWorker.salary)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="month"
                        value={salaryViewMonth}
                        onChange={(e) => setSalaryViewMonth(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      />
                      <button
                        onClick={() => setViewingSalaryWorker(null)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>

                  {isLoadingWorkerAttendance ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-sm text-gray-500">Đang tải dữ liệu chấm công...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <div className="rounded-lg border border-gray-200 p-4">
                          <div className="mb-4">
                            <p className="text-sm font-black text-gray-900">
                              {formatMonthTitle(salaryViewMonth) || 'Chọn tháng'}
                            </p>
                          </div>

                          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500 mb-2">
                            {weekDayLabels.map((day) => (
                              <span key={day}>{day}</span>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-2 text-center text-sm">
                            {salaryViewCalendarRows.map((row, rowIndex) =>
                              row.map((day, colIndex) =>
                                day.inMonth ? (
                                  <div
                                    key={`${day.dateValue}-${rowIndex}-${colIndex}`}
                                    className={`rounded-md px-0 py-2 font-semibold ${
                                      isDayOffInSalaryView(day.dateValue)
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-green-50 text-green-700'
                                    }`}
                                  >
                                    {day.label}
                                  </div>
                                ) : (
                                  <span key={`empty-${rowIndex}-${colIndex}`} className="text-gray-300">
                                    &nbsp;
                                  </span>
                                )
                              )
                            )}
                          </div>

                          <div className="mt-4 flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-50 border border-green-300"></div>
                              <span className="text-gray-600">Có mặt</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                              <span className="text-gray-600">Vắng mặt</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                          <h3 className="text-sm font-black text-gray-900 mb-3">Thông tin lương tháng</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Lương cơ bản:</span>
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(viewingSalaryWorker.salary)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Số ngày trong tháng:</span>
                              <span className="font-semibold text-gray-900">
                                {getDaysInMonth(salaryViewMonth)} ngày
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Số ngày nghỉ:</span>
                              <span className="font-semibold text-red-600">
                                {workerAttendanceView?.daysOff?.length || 0} ngày
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Số ngày làm việc:</span>
                              <span className="font-semibold text-green-600">
                                {calculateDaysWorked()} ngày
                              </span>
                            </div>
                            <div className="border-t border-gray-300 pt-2 mt-2">
                              <div className="flex justify-between">
                                <span className="text-gray-900 font-bold">Lương thực nhận:</span>
                                <span className="font-black text-lg text-orange-600">
                                  {formatCurrency(
                                    workerAttendanceView?.monthlySalary ?? (viewingSalaryWorker?.salary || 0)
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {workerAttendanceView && workerAttendanceView.daysOff && workerAttendanceView.daysOff.length > 0 && (
                          <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <h3 className="text-sm font-black text-gray-900 mb-2">Danh sách ngày nghỉ</h3>
                            <div className="flex flex-wrap gap-2">
                              {workerAttendanceView.daysOff.map((day, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700"
                                >
                                  {formatDateLabel(normalizeDateString(day))}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {!workerAttendanceView && (
                          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                            Không thể tải dữ liệu chấm công. Vui lòng thử lại sau.
                          </div>
                        )}
                        {workerAttendanceView && isDefaultAttendanceRecord() && (
                          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                            Chưa có dữ liệu chấm công cho tháng này. Tất cả các ngày được tính là ngày nghỉ. Lương thực nhận: 0 VNĐ.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showDeleteConfirm !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-lg font-black text-gray-900 mb-2">Xác nhận xóa</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Bạn có chắc chắn muốn xóa công nhân{' '}
                      <span className="font-semibold">
                        {workers.find((w) => w.id === showDeleteConfirm)?.name}
                      </span>
                      ? Hành động này không thể hoàn tác.
                    </p>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleDeleteWorker(showDeleteConfirm)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


