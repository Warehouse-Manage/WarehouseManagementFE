'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type WorkDate = {
  id?: number;
  workDate: string;
  workQuantity: number;
  workOvertime: number;
};

type Attendance = {
  id: number;
  workerId: number;
  daysOff: WorkDate[]; // Backend still uses DaysOff property name but contains WorkDate objects
  monthlySalary: number;
  salaryPaid: number;
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

const getCurrentDateValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

// Helper function to get salary period (from 15th of previous month to 14th of current month)
const getSalaryPeriod = (monthValue: string) => {
  if (!monthValue) return { startDate: '', endDate: '' };
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return { startDate: '', endDate: '' };
  
  const now = new Date();
  let startDate: string;
  let endDate: string;
  
  if (now.getDate() > 15) {
    // Start date: 16th of current month
    startDate = `${year}-${String(month).padStart(2, '0')}-16`;
    // End date: 15th of next month
    const nextMonth = new Date(year, month, 15); // month is 1-indexed in Date constructor
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    endDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-15`;
  } else {
    // Start date: 16th of previous month
    const prevMonth = new Date(year, month - 2, 16); // month - 2 because month is 1-indexed in Date constructor
    startDate = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-16`;
    // End date: 15th of current month
    endDate = `${year}-${String(month).padStart(2, '0')}-15`;
  }
  
  return { startDate, endDate };
};

// Helper function to check if a date is within salary period
const isDateInSalaryPeriod = (dateValue: string, monthValue: string) => {
  if (!dateValue || !monthValue) return false;
  const { startDate, endDate } = getSalaryPeriod(monthValue);
  return dateValue >= startDate && dateValue <= endDate;
};

// Helper function to get the 16th of the nearest previous month
const getNearest16thDate = () => {
  const today = new Date();
  const currentDay = today.getDate();
  
  if (currentDay >= 16) {
    // If today is 16th or later, return 16th of current month
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-16`;
  } else {
    // If today is before 16th, return 16th of previous month
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 16);
    return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-16`;
  }
};

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
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
  const [activeTab, setActiveTab] = useState<'create' | 'mark' | 'worker' | 'overview'>('overview');
  const [overviewMonth, setOverviewMonth] = useState(getCurrentMonthValue());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserWorker, setCurrentUserWorker] = useState<Worker | null>(null);
  const [loadingCurrentUserWorker, setLoadingCurrentUserWorker] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    selectedDate: getCurrentDateValue(),
    month: getCurrentMonthValue(),
  });
  const prevMonthRef = useRef<string>(getCurrentMonthValue());
  const [createToast, setCreateToast] = useState<ToastState | null>(null);
  const [workerAttendances, setWorkerAttendances] = useState<Map<number, Attendance>>(new Map());
  const [isLoadingAttendances, setIsLoadingAttendances] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState<number | null>(null);

  const [markForm, setMarkForm] = useState({
    month: getCurrentMonthValue(),
  });
  const [markDayInput, setMarkDayInput] = useState('');
  const [markWorkDates, setMarkWorkDates] = useState<WorkDate[]>([]);
  const [markToast, setMarkToast] = useState<ToastState | null>(null);
  const [markAttendance, setMarkAttendance] = useState<Attendance | null>(null);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSavingMark, setIsSavingMark] = useState(false);
  const [salaryPaymentAmount, setSalaryPaymentAmount] = useState('');
  const [isPayingSalary, setIsPayingSalary] = useState(false);
  const [allAttendances, setAllAttendances] = useState<Attendance[]>([]);
  const [isLoadingAllAttendances, setIsLoadingAllAttendances] = useState(false);
  const [selectedWorkerForDetail, setSelectedWorkerForDetail] = useState<number | null>(null);
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
  const [overviewAttendance, setOverviewAttendance] = useState<Attendance | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [overviewAttendances, setOverviewAttendances] = useState<Map<number, Attendance>>(new Map());
  const [isLoadingOverviewAll, setIsLoadingOverviewAll] = useState(false);

  useEffect(() => {
    const userId = getCookie('userId');
    const userName = getCookie('userName');
    const role = getCookie('role');

    if (!userId || !userName) {
      router.push('/login');
      return;
    }

    setCurrentUserId(userId);
    setUserRole(role || null);
    setIsCheckingAuth(false);
  }, [router]);

  // Fetch current user's worker for user role
  useEffect(() => {
    if (isCheckingAuth || !currentUserId || userRole !== 'user') return;

    const fetchCurrentUserWorker = async () => {
      setLoadingCurrentUserWorker(true);
      setGlobalError(null);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_HOST}/api/workers?userId=${currentUserId}`,
          {
            method: 'GET',
            headers: buildAuthHeaders(),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: Worker[] = await response.json();
        if (data && data.length > 0) {
          const worker = data[0];
          setCurrentUserWorker(worker);
          setWorkers(data); // Set workers for consistency
          // Auto-set markForm workerId for user role
          const currentMonth = getCurrentMonthValue();
          setMarkForm((prev) => ({ ...prev, workerId: String(worker.id), month: currentMonth }));
          // Auto-load attendance for current month
          const [year, month] = currentMonth.split('-');
          try {
            const attendanceResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_HOST}/api/attendances/worker/${worker.id}/month/${year}/${Number(month)}`,
              {
                method: 'GET',
                headers: buildAuthHeaders(),
              }
            );
            if (attendanceResponse.ok) {
              const attendanceData: Attendance = await attendanceResponse.json();
              setMarkAttendance(attendanceData);
              setMarkWorkDates((attendanceData.daysOff || []).map(wd => ({
                id: wd.id,
                workDate: wd.workDate,
                workQuantity: wd.workQuantity,
                workOvertime: wd.workOvertime,
              })));
            }
          } catch (error) {
            // Silently fail - attendance will be loaded when user clicks "Tải bảng chấm công"
            console.log('Could not auto-load attendance:', error);
          }
        } else {
          setGlobalError('Không tìm thấy thông tin nhân viên cho tài khoản của bạn.');
        }
      } catch (error) {
        console.error('Không thể tải thông tin nhân viên:', error);
        setGlobalError('Không thể tải thông tin nhân viên. Vui lòng thử lại sau.');
      } finally {
        setLoadingCurrentUserWorker(false);
      }
    };

    fetchCurrentUserWorker();
  }, [isCheckingAuth, currentUserId, userRole]);

  // For user role, auto-set selected worker when currentUserWorker is available
  useEffect(() => {
    if (userRole === 'user' && currentUserWorker && !selectedWorkerForDetail) {
      setSelectedWorkerForDetail(currentUserWorker.id);
    }
  }, [userRole, currentUserWorker, selectedWorkerForDetail]);

  // Auto-reload all attendances when month changes (for admin/approver roles)
  useEffect(() => {
    if (userRole !== 'user' && markForm.month && activeTab === 'mark') {
      fetchAllAttendancesForMonth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markForm.month, activeTab, userRole]);

  // Fetch all workers for admin/approver roles
  useEffect(() => {
    if (isCheckingAuth || userRole === 'user') return;

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
        console.error('Không thể tải danh sách nhân viên:', error);
        setGlobalError('Không thể tải danh sách nhân viên. Vui lòng thử lại sau.');
      } finally {
        setLoadingWorkers(false);
      }
    };

    fetchWorkers();
  }, [isCheckingAuth, userRole]);

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
            console.error(`Không thể tải chấm công cho nhân viên ${worker.id}:`, error);
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

  useEffect(() => {
    // Only update selectedDate when the month actually changes
    if (prevMonthRef.current !== createForm.month) {
      const today = getCurrentDateValue();
      const currentMonth = getCurrentMonthValue();
      
      // If the selected month is the current month, auto-select today
      if (createForm.month === currentMonth) {
        setCreateForm((prev) => ({ ...prev, selectedDate: today }));
      } else {
        // If viewing a different month, clear selection
        setCreateForm((prev) => ({ ...prev, selectedDate: '' }));
      }
      prevMonthRef.current = createForm.month;
    }
  }, [createForm.month]);

  const selectedMarkWorker = useMemo(
    () => selectedWorkerForDetail ? workers.find((worker) => worker.id === selectedWorkerForDetail) : null,
    [workers, selectedWorkerForDetail]
  );

  const markPreviewSalary = useMemo(() => {
    if (!selectedMarkWorker || !markForm.month) return null;
    // Salary period is from 15th of previous month to 14th of current month (30 days)
    const daysInSalaryPeriod = 30;
    const dailySalary = selectedMarkWorker.salary / daysInSalaryPeriod;
    // Filter work dates to only include those in the salary period
    const workDatesInPeriod = markWorkDates.filter(wd => {
      return isDateInSalaryPeriod(normalizeDateString(wd.workDate), markForm.month);
    });
    const totalWorkQuantity = workDatesInPeriod.reduce((sum, wd) => sum + wd.workQuantity, 0);
    const baseSalary = dailySalary * totalWorkQuantity;
    // Assuming overtime rate is 2x daily salary per hour (8 hours per day) - matching backend
    const overtimeRate = dailySalary / 8;
    const overtimeSalary = workDatesInPeriod.reduce((sum, wd) => sum + (wd.workOvertime * overtimeRate * 2), 0);
    return baseSalary + overtimeSalary;
  }, [selectedMarkWorker, markForm.month, markWorkDates]);

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

  const getWorkerWorkDate = (workerId: number, dateValue: string): WorkDate | null => {
    if (!dateValue) return null;
    const attendance = workerAttendances.get(workerId);
    if (!attendance || !attendance.daysOff) return null;
    const normalizedDate = normalizeDateString(dateValue);
    return attendance.daysOff.find(wd => normalizeDateString(wd.workDate) === normalizedDate) || null;
  };


  const toggleWorkerAttendance = async (workerId: number, dateValue: string, workQuantity: number = 1, workOvertime: number = 0) => {
    if (!dateValue || !createForm.month) {
      setCreateToast({ type: 'error', message: 'Vui lòng chọn ngày.' });
      return;
    }

    setIsSavingAttendance(workerId);
    setCreateToast(null);

    try {
      const payload = {
        workerId,
        workDate: toDateIsoString(dateValue),
        workQuantity: workQuantity,
        workOvertime: workOvertime,
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
        message: `Đã cập nhật chấm công cho ${workers.find((w) => w.id === workerId)?.name || 'nhân viên'}.`,
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

  const addWorkDateToMark = () => {
    if (!selectedWorkerForDetail) {
      setMarkToast({ type: 'error', message: 'Vui lòng chọn nhân viên.' });
      return;
    }
    if (!markDayInput) {
      setMarkToast({ type: 'error', message: 'Vui lòng chọn ngày làm việc.' });
      return;
    }
    
    // Validate that the date is from nearest 16th to today
    const nearest16th = getNearest16thDate();
    const today = getTodayDate();
    
    if (markDayInput < nearest16th || markDayInput > today) {
      setMarkToast({
        type: 'error',
        message: `Ngày làm việc phải từ ${nearest16th} đến ${today}.`,
      });
      return;
    }
    // Check if work date already exists for this day
    const existingIndex = markWorkDates.findIndex(wd => normalizeDateString(wd.workDate) === markDayInput);
    if (existingIndex >= 0) {
      setMarkToast({ type: 'error', message: 'Ngày này đã được thêm. Vui lòng sửa thông tin trong danh sách.' });
      return;
    }
    setMarkWorkDates((prev) => {
      const newWorkDate: WorkDate = {
        workDate: toDateIsoString(markDayInput),
        workQuantity: 1,
        workOvertime: 0,
      };
      return [...prev, newWorkDate].sort((a, b) => 
        new Date(a.workDate).getTime() - new Date(b.workDate).getTime()
      );
    });
    setMarkDayInput('');
    setMarkToast(null);
  };

  const removeMarkWorkDate = (workDate: WorkDate) => {
    setMarkWorkDates((prev) => prev.filter((wd) => normalizeDateString(wd.workDate) !== normalizeDateString(workDate.workDate)));
  };

  const updateMarkWorkDate = (index: number, field: 'workQuantity' | 'workOvertime', value: number) => {
    setMarkWorkDates((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const fetchAllAttendancesForMonth = async () => {
    if (!markForm.month) {
      setMarkToast({ type: 'error', message: 'Vui lòng chọn tháng.' });
      return;
    }

    setIsLoadingAllAttendances(true);
    setMarkToast(null);
    const [year, month] = markForm.month.split('-');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_HOST}/api/attendances?year=${year}&month=${Number(month)}`,
        {
          method: 'GET',
          headers: buildAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `HTTP ${response.status}`);
      }

      const data: Attendance[] = await response.json();
      setAllAttendances(data);
    } catch (error: unknown) {
      console.error('Không thể tải danh sách chấm công:', error);
      setMarkToast({
        type: 'error',
        message: getErrorMessage(error, 'Không thể tải danh sách chấm công.'),
      });
    } finally {
      setIsLoadingAllAttendances(false);
    }
  };

  const loadWorkerDetail = async (workerId: number) => {
    if (!markForm.month) {
      setMarkToast({ type: 'error', message: 'Vui lòng chọn tháng.' });
      return;
    }

    setSelectedWorkerForDetail(workerId);
    setIsLoadingAttendance(true);
    setMarkToast(null);
    const [year, month] = markForm.month.split('-');
    
    try {
      // Get attendance for the selected month (for salary info)
      const attendanceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_HOST}/api/attendances/worker/${workerId}/month/${year}/${Number(month)}`,
        {
          method: 'GET',
          headers: buildAuthHeaders(),
        }
      );

      if (!attendanceResponse.ok) {
        const errorBody = await attendanceResponse.json().catch(() => ({}));
        throw new Error(errorBody.message || `HTTP ${attendanceResponse.status}`);
      }

      const attendanceData: Attendance = await attendanceResponse.json();
      setMarkAttendance(attendanceData);

      // Get work dates from nearest 16th to today
      const startDate = getNearest16thDate();
      const endDate = getTodayDate();
      
      const workDatesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_HOST}/api/attendances/worker/${workerId}/workdates?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: buildAuthHeaders(),
        }
      );

      if (!workDatesResponse.ok) {
        // If work dates API fails, fall back to attendance work dates
        setMarkWorkDates((attendanceData.daysOff || []).map(wd => ({
          id: wd.id,
          workDate: wd.workDate,
          workQuantity: wd.workQuantity,
          workOvertime: wd.workOvertime,
        })));
      } else {
        const workDatesData: WorkDate[] = await workDatesResponse.json();
        setMarkWorkDates(workDatesData.map(wd => ({
          id: wd.id,
          workDate: wd.workDate,
          workQuantity: wd.workQuantity,
          workOvertime: wd.workOvertime,
        })));
      }
    } catch (error: unknown) {
      console.error('Không thể tải chi tiết chấm công:', error);
      setMarkToast({
        type: 'error',
        message: getErrorMessage(error, 'Không thể tải chi tiết chấm công.'),
      });
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const fetchAttendanceForMarking = async () => {
    if (!selectedWorkerForDetail || !markForm.month) {
      return;
    }
    await loadWorkerDetail(selectedWorkerForDetail);
  };

  const saveMarkedAttendance = async () => {
    if (!selectedWorkerForDetail || !markForm.month) {
      setMarkToast({ type: 'error', message: 'Vui lòng chọn nhân viên và tháng.' });
      return;
    }

    setIsSavingMark(true);
    setMarkToast(null);
    try {
      const payload = {
        workerId: selectedWorkerForDetail,
        calculationMonth: toMonthIsoString(markForm.month),
        workDates: markWorkDates.map(wd => ({
          workDate: wd.workDate,
          workQuantity: wd.workQuantity,
          workOvertime: wd.workOvertime,
        })),
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
      
      // Reload work dates from nearest 16th to today
      const startDate = getNearest16thDate();
      const endDate = getTodayDate();
      
      try {
        const workDatesResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_HOST}/api/attendances/worker/${selectedWorkerForDetail}/workdates?startDate=${startDate}&endDate=${endDate}`,
          {
            method: 'GET',
            headers: buildAuthHeaders(),
          }
        );

        if (workDatesResponse.ok) {
          const workDatesData: WorkDate[] = await workDatesResponse.json();
          setMarkWorkDates(workDatesData.map(wd => ({
            id: wd.id,
            workDate: wd.workDate,
            workQuantity: wd.workQuantity,
            workOvertime: wd.workOvertime,
          })));
        } else {
          // Fallback to updated attendance work dates
          setMarkWorkDates((updated.daysOff || []).map(wd => ({
            id: wd.id,
            workDate: wd.workDate,
            workQuantity: wd.workQuantity,
            workOvertime: wd.workOvertime,
          })));
        }
      } catch {
        // Fallback to updated attendance work dates
        setMarkWorkDates((updated.daysOff || []).map(wd => ({
          id: wd.id,
          workDate: wd.workDate,
          workQuantity: wd.workQuantity,
          workOvertime: wd.workOvertime,
        })));
      }
      
      setMarkToast({ type: 'success', message: 'Đã cập nhật chấm công.' });
      // Refresh all attendances list
      await fetchAllAttendancesForMonth();
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

  const handlePaySalary = async () => {
    if (!markAttendance || !markAttendance.id) {
      setMarkToast({ type: 'error', message: 'Vui lòng tải bảng chấm công trước.' });
      return;
    }

    const amount = parseFloat(salaryPaymentAmount);
    if (!amount || amount <= 0) {
      setMarkToast({ type: 'error', message: 'Vui lòng nhập số tiền hợp lệ.' });
      return;
    }

    const userId = getCookie('userId');
    if (!userId) {
      setMarkToast({ type: 'error', message: 'Không tìm thấy thông tin người dùng.' });
      return;
    }

    setIsPayingSalary(true);
    setMarkToast(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/attendances/${markAttendance.id}/pay-salary`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          amount: amount,
          createdUserId: Number(userId),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `HTTP ${response.status}`);
      }

      const updated: Attendance = await response.json();
      setMarkAttendance(updated);
      setSalaryPaymentAmount('');
      setMarkToast({ type: 'success', message: 'Đã thanh toán lương và tạo bản ghi trong sổ quỹ.' });
      
      // Refresh attendance data
      await fetchAttendanceForMarking();
      // Refresh all attendances list
      await fetchAllAttendancesForMonth();
    } catch (error: unknown) {
      console.error('Không thể thanh toán lương:', error);
      setMarkToast({
        type: 'error',
        message: getErrorMessage(error, 'Không thể thanh toán lương.'),
      });
    } finally {
      setIsPayingSalary(false);
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
      setWorkerToast({ type: 'success', message: 'Đã xóa nhân viên.' });
      setShowDeleteConfirm(null);
    } catch (error: unknown) {
      console.error('Không thể xóa nhân viên:', error);
      setWorkerToast({
        type: 'error',
        message: getErrorMessage(error, 'Không thể xóa nhân viên.'),
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
        setWorkerToast({ type: 'success', message: 'Đã cập nhật nhân viên.' });
      } else {
        setWorkers((prev) => [...prev, result]);
        setWorkerToast({ type: 'success', message: 'Đã tạo nhân viên mới.' });
      }
      resetWorkerForm();
    } catch (error: unknown) {
      console.error('Không thể lưu nhân viên:', error);
      setWorkerToast({
        type: 'error',
        message: getErrorMessage(error, 'Không thể lưu nhân viên.'),
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

  // Fetch overview attendance for user role
  useEffect(() => {
    if (userRole === 'user' && currentUserWorker && overviewMonth) {
      setIsLoadingOverview(true);
      const [year, month] = overviewMonth.split('-');
      fetch(
        `${process.env.NEXT_PUBLIC_API_HOST}/api/attendances/worker/${currentUserWorker.id}/month/${year}/${Number(month)}`,
        {
          method: 'GET',
          headers: buildAuthHeaders(),
        }
      )
        .then((res) => res.ok ? res.json() : null)
        .then((data: Attendance | null) => {
          setOverviewAttendance(data);
        })
        .catch((error) => {
          console.error('Could not load overview attendance:', error);
          setOverviewAttendance(null);
        })
        .finally(() => setIsLoadingOverview(false));
    }
  }, [userRole, currentUserWorker, overviewMonth]);

  // Fetch all attendances for overview (admin/approver)
  useEffect(() => {
    if ((userRole === 'Admin' || userRole === 'approver') && workers.length > 0 && overviewMonth) {
      setIsLoadingOverviewAll(true);
      const [year, month] = overviewMonth.split('-');
      const attendanceMap = new Map<number, Attendance>();

      Promise.all(
        workers.map(async (worker) => {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_HOST}/api/attendances/worker/${worker.id}/month/${year}/${Number(month)}`,
              {
                method: 'GET',
                headers: buildAuthHeaders(),
              }
            );
            if (response.ok) {
              const data: Attendance = await response.json();
              return { workerId: worker.id, attendance: data };
            }
            return null;
          } catch {
            return null;
          }
        })
      )
        .then((results) => {
          results.forEach((result) => {
            if (result) {
              attendanceMap.set(result.workerId, result.attendance);
            }
          });
          setOverviewAttendances(attendanceMap);
        })
        .catch((error) => {
          console.error('Could not load overview attendances:', error);
        })
        .finally(() => setIsLoadingOverviewAll(false));
    }
  }, [userRole, workers, overviewMonth]);

  const handleViewSalary = (worker: Worker) => {
    setViewingSalaryWorker(worker);
    setSalaryViewMonth(getCurrentMonthValue());
  };

  const salaryViewCalendarDays = useMemo(() => buildCalendarDays(salaryViewMonth), [salaryViewMonth]);
  const salaryViewCalendarRows = useMemo(() => chunkArray(salaryViewCalendarDays, 7), [salaryViewCalendarDays]);

  const getWorkDateInSalaryView = (dateValue: string): WorkDate | null => {
    if (!workerAttendanceView || !workerAttendanceView.daysOff) return null;
    const normalizedDate = normalizeDateString(dateValue);
    return workerAttendanceView.daysOff.find(wd => normalizeDateString(wd.workDate) === normalizedDate) || null;
  };

  const isDayWorkedInSalaryView = (dateValue: string): boolean => {
    const workDate = getWorkDateInSalaryView(dateValue);
    return workDate !== null && workDate.workQuantity > 0;
  };

  const calculateDaysWorked = (): number => {
    if (!workerAttendanceView) return 0;
    return workerAttendanceView.daysOff?.filter(wd => wd.workQuantity > 0).length || 0;
  };

  const calculateTotalWorkQuantity = (): number => {
    if (!workerAttendanceView) return 0;
    return workerAttendanceView.daysOff?.reduce((sum, wd) => sum + wd.workQuantity, 0) || 0;
  };

  const calculateTotalOvertime = (): number => {
    if (!workerAttendanceView) return 0;
    return workerAttendanceView.daysOff?.reduce((sum, wd) => sum + wd.workOvertime, 0) || 0;
  };

  const isDefaultAttendanceRecord = (): boolean => {
    if (!workerAttendanceView) return false;
    // Check if it's a default record (Id is 0 or monthlySalary is 0 with no work dates)
    return workerAttendanceView.id === 0 || 
           (workerAttendanceView.monthlySalary === 0 && (workerAttendanceView.daysOff?.length || 0) === 0);
  };

  const getWorkDateForOverview = (attendance: Attendance | null, dateValue: string): WorkDate | null => {
    if (!attendance || !attendance.daysOff) return null;
    const normalizedDate = normalizeDateString(dateValue);
    return attendance.daysOff.find(wd => normalizeDateString(wd.workDate) === normalizedDate) || null;
  };

  const UserOverviewCalendarView = ({ attendance, month, worker, buildCalendarDays, chunkArray, weekDayLabels, formatCurrency }: {
    attendance: Attendance | null;
    month: string;
    worker: Worker | null;
    buildCalendarDays: (monthValue: string) => CalendarDay[];
    chunkArray: <T,>(array: T[], size: number) => T[][];
    weekDayLabels: string[];
    formatCurrency: (value?: number | null) => string;
  }) => {
    const calendarDays = useMemo(() => buildCalendarDays(month), [month, buildCalendarDays]);
    const calendarRows = useMemo(() => chunkArray(calendarDays, 7), [calendarDays, chunkArray]);

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="mb-4">
            <p className="text-sm font-black text-gray-900">
              {formatMonthTitle(month) || 'Chọn tháng'}
            </p>
            {worker && (
              <p className="text-xs text-gray-600 mt-1">Nhân viên: {worker.name}</p>
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
                  <div
                    key={`${day.dateValue}-${rowIndex}-${colIndex}`}
                    className={`rounded-md px-0 py-2 font-semibold relative ${
                      (() => {
                        const wd = getWorkDateForOverview(attendance, day.dateValue);
                        return wd && wd.workQuantity > 0;
                      })()
                        ? 'bg-green-50 text-green-700 border border-green-300'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                    title={(() => {
                      const wd = getWorkDateForOverview(attendance, day.dateValue);
                      return wd && wd.workQuantity > 0 
                        ? `Công: ${wd.workQuantity}, OT: ${wd.workOvertime}h`
                        : 'Chưa làm việc';
                    })()}
                  >
                    {day.label}
                    {(() => {
                      const wd = getWorkDateForOverview(attendance, day.dateValue);
                      return wd && wd.workQuantity > 0;
                    })() && (
                      <div className="absolute top-0 right-0 w-2 h-2 bg-green-600 rounded-full"></div>
                    )}
                  </div>
                ) : (
                  <span key={`empty-${rowIndex}-${colIndex}`} className="text-gray-300">
                    &nbsp;
                  </span>
                )
              )
            )}
          </div>
        </div>
        {attendance && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-black text-gray-900 mb-2">Thống kê tháng</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Lương tháng:</span>
                <span className="ml-2 font-semibold text-green-600">{formatCurrency(attendance.monthlySalary)}</span>
              </div>
              <div>
                <span className="text-gray-600">Số ngày làm việc:</span>
                <span className="ml-2 font-semibold">{attendance.daysOff?.filter(wd => wd.workQuantity > 0).length || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Tổng công:</span>
                <span className="ml-2 font-semibold">{attendance.daysOff?.reduce((sum, wd) => sum + wd.workQuantity, 0) || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Tổng OT:</span>
                <span className="ml-2 font-semibold text-orange-600">{attendance.daysOff?.reduce((sum, wd) => sum + wd.workOvertime, 0) || 0}h</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
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

  // Simplified view for user role
  if (userRole === 'user') {
    if (loadingCurrentUserWorker) {
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
            <span className="text-lg text-gray-600">Đang tải thông tin...</span>
          </div>
        </div>
      );
    }

    if (!currentUserWorker) {
      return (
        <div className="space-y-6 p-4 sm:p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError || 'Không tìm thấy thông tin nhân viên cho tài khoản của bạn.'}
          </div>
        </div>
      );
    }

    // User role view - show simplified attendance marking interface
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Chấm công của tôi</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Chấm công cho: <span className="font-semibold">{currentUserWorker.name}</span>
            </p>
          </div>
        </div>

        {globalError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        )}

        {/* Overview Section for User */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-xl font-black text-gray-900 mb-2">Tổng quan chấm công tháng</h2>
            <input
              type="month"
              value={overviewMonth}
              onChange={(e) => setOverviewMonth(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
          {isLoadingOverview ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-gray-500">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <UserOverviewCalendarView
              attendance={overviewAttendance}
              month={overviewMonth}
              worker={currentUserWorker}
              buildCalendarDays={buildCalendarDays}
              chunkArray={chunkArray}
              weekDayLabels={weekDayLabels}
              formatCurrency={formatCurrency}
            />
          )}
        </div>

        {globalError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-2">Tháng chấm công</label>
                <input
                  type="month"
                  value={markForm.month}
                  onChange={(e) => {
                    setMarkForm((prev) => ({ ...prev, month: e.target.value }));
                    setMarkAttendance(null);
                    setMarkWorkDates([]);
                    setMarkToast(null);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
                {markForm.month && (() => {
                  const { startDate, endDate } = getSalaryPeriod(markForm.month);
                  return (
                    <p className="text-xs text-gray-600 mt-1">
                      Chu kỳ lương: từ {startDate} đến {endDate}
                    </p>
                  );
                })()}
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchAttendanceForMarking}
                  className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                  disabled={!selectedWorkerForDetail || !markForm.month || isLoadingAttendance}
                >
                  {isLoadingAttendance ? 'Đang tải...' : 'Tải bảng chấm công'}
                </button>
              </div>
            </div>

            {markAttendance && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-semibold text-gray-700">
                <div>
                  Nhân viên: <span className="text-gray-900">{markAttendance.worker?.name || currentUserWorker?.name}</span>
                </div>
                <div>
                  Lương tháng hiện tại: <span className="text-green-600">{formatCurrency(markAttendance.monthlySalary)}</span>
                </div>
                <div>
                  Số ngày làm việc: <span className="text-gray-900">{markAttendance.daysOff?.length || 0}</span>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-dashed border-gray-300 p-4 space-y-3">
              {currentUserWorker && (() => {
                const nearest16th = getNearest16thDate();
                const today = getTodayDate();
                return (
                  <div className="text-xs text-gray-600 mb-2">
                    Chọn ngày từ {nearest16th} đến {today}
                  </div>
                );
              })()}
              {userRole !== 'user' && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="date"
                    value={markDayInput}
                    onChange={(e) => setMarkDayInput(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    max={getTodayDate()}
                    min={getNearest16thDate()}
                    disabled={!currentUserWorker}
                  />
                  <button
                    onClick={addWorkDateToMark}
                    className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-700 disabled:opacity-50"
                    disabled={!selectedWorkerForDetail || !markForm.month}
                  >
                    Thêm ngày làm việc
                  </button>
                </div>
              )}
              {markWorkDates.length > 0 ? (
                <div className="space-y-2">
                  {markWorkDates.map((workDate, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-700">
                          {formatDateLabel(normalizeDateString(workDate.workDate))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {userRole === 'user' ? (
                          <>
                            <label className="text-xs text-gray-600">
                              Công: <span className="font-semibold text-gray-900">{workDate.workQuantity}</span>
                            </label>
                            <label className="text-xs text-gray-600">
                              OT: <span className="font-semibold text-gray-900">{workDate.workOvertime}</span> h
                            </label>
                          </>
                        ) : (
                          <>
                            <label className="text-xs text-gray-600">
                              Công:
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="2"
                                value={workDate.workQuantity}
                                onChange={(e) => updateMarkWorkDate(index, 'workQuantity', parseFloat(e.target.value) || 0)}
                                className="ml-1 w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:border-orange-500 focus:outline-none"
                              />
                            </label>
                            <label className="text-xs text-gray-600">
                              OT:
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={workDate.workOvertime}
                                onChange={(e) => updateMarkWorkDate(index, 'workOvertime', parseFloat(e.target.value) || 0)}
                                className="ml-1 w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:border-orange-500 focus:outline-none"
                              />
                              h
                            </label>
                            <button
                              className="ml-2 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-200"
                              onClick={() => removeMarkWorkDate(workDate)}
                              aria-label={`Xóa ${workDate.workDate}`}
                            >
                              ×
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Chưa có ngày làm việc nào trong danh sách.</p>
              )}
            </div>

            {currentUserWorker && (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 flex flex-wrap gap-4 text-sm font-semibold text-gray-700">
                <div>
                  Lương cơ bản: <span className="text-gray-900">{formatCurrency(currentUserWorker.salary)}</span>
                </div>
                <div>
                  Số ngày làm việc: <span className="text-gray-900">{markWorkDates.length}</span>
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

            {userRole !== 'user' && (
              <div className="flex justify-end">
                <button
                  onClick={saveMarkedAttendance}
                  className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold uppercase tracking-wide text-white shadow hover:bg-orange-700 disabled:opacity-50"
                  disabled={isSavingMark || !selectedWorkerForDetail || !markForm.month}
                >
                  {isSavingMark ? 'Đang lưu...' : 'Cập nhật chấm công'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin/Approver role view - full interface
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Chấm công nhân viên</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Tạo hoặc cập nhật bảng chấm công và đánh dấu ngày nghỉ cho từng nhân viên.
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
            Quản lý chấm công
          </button>
          <button
            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === 'worker'
                ? 'bg-orange-600 text-white'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('worker')}
          >
            Quản lý nhân viên
          </button>
          <button
            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
              activeTab === 'overview'
                ? 'bg-orange-600 text-white'
                : 'bg-transparent text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Tổng quan
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
                  Chọn ngày trong lịch bên trái, sau đó đánh dấu chấm công cho từng nhân viên bên phải.
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
                    <label className="text-sm font-bold text-gray-700 block mb-2">Danh sách nhân viên</label>
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
                      <p className="text-sm text-gray-500">Đang tải danh sách nhân viên...</p>
                    ) : filteredWorkers.length === 0 ? (
                      <p className="text-sm text-gray-500">Không tìm thấy nhân viên phù hợp.</p>
                    ) : (
                      filteredWorkers.map((worker) => {
                        const workDate = createForm.selectedDate
                          ? getWorkerWorkDate(worker.id, createForm.selectedDate)
                          : null;
                        const isSaving = isSavingAttendance === worker.id;
                        const attendance = workerAttendances.get(worker.id);
                        const workDatesCount = attendance?.daysOff?.length || 0;

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
                                      {workDatesCount} ngày làm việc trong tháng
                                    </p>
                                  )}
                                  {workDate && workDate.workQuantity > 0 && (
                                    <p className="text-green-600 font-semibold">
                                      Công: {workDate.workQuantity} • OT: {workDate.workOvertime}h
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {createForm.selectedDate ? (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="2"
                                        value={workDate?.workQuantity || 0}
                                        onChange={(e) => {
                                          const qty = parseFloat(e.target.value) || 0;
                                          const ot = workDate?.workOvertime || 0;
                                          toggleWorkerAttendance(worker.id, createForm.selectedDate, qty, ot);
                                        }}
                                        disabled={isSaving}
                                        placeholder="Công"
                                        className="w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:border-orange-500 focus:outline-none disabled:opacity-50"
                                      />
                                      <span className="text-xs text-gray-500">công</span>
                                      <input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={workDate?.workOvertime || 0}
                                        onChange={(e) => {
                                          const ot = parseFloat(e.target.value) || 0;
                                          const qty = workDate?.workQuantity || 1;
                                          toggleWorkerAttendance(worker.id, createForm.selectedDate, qty, ot);
                                        }}
                                        disabled={isSaving}
                                        placeholder="OT"
                                        className="w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:border-orange-500 focus:outline-none disabled:opacity-50"
                                      />
                                      <span className="text-xs text-gray-500">h</span>
                                    </div>
                                    <span className="text-xs text-gray-400">
                                      {isSaving ? 'Đang lưu...' : (workDate && workDate.workQuantity > 0) ? 'Đã chấm công' : 'Chưa chấm'}
                                    </span>
                                  </div>
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
                <div className="md:col-span-2">
                  <label className="text-sm font-bold text-gray-700 block mb-2">Tháng chấm công</label>
                  <input
                    type="month"
                    value={markForm.month}
                    onChange={(e) => {
                      setMarkForm((prev) => ({ ...prev, month: e.target.value }));
                      setMarkAttendance(null);
                      setMarkWorkDates([]);
                      setMarkToast(null);
                      setSelectedWorkerForDetail(null);
                      setAllAttendances([]);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                  {markForm.month && (() => {
                    const { startDate, endDate } = getSalaryPeriod(markForm.month);
                    return (
                      <p className="text-xs text-gray-600 mt-1">
                        Chu kỳ lương: từ {startDate} đến {endDate}
                      </p>
                    );
                  })()}
                </div>
                <div className="md:col-span-1 flex items-end">
                  <button
                    onClick={fetchAllAttendancesForMonth}
                    className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                    disabled={!markForm.month || isLoadingAllAttendances}
                  >
                    {isLoadingAllAttendances ? 'Đang tải...' : 'Tải danh sách lương'}
                  </button>
                </div>
              </div>

              {allAttendances.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-orange-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900">Nhân viên</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900">Lương tháng</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900">Đã trả</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900">Còn lại</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-900">Số ngày làm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAttendances.map((attendance) => {
                        const remaining = attendance.monthlySalary - attendance.salaryPaid;
                        const isSelected = selectedWorkerForDetail === attendance.workerId;
                        return (
                          <tr
                            key={attendance.workerId}
                            onClick={() => loadWorkerDetail(attendance.workerId)}
                            className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                              isSelected ? 'bg-orange-50' : ''
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {attendance.worker?.name || `Nhân viên #${attendance.workerId}`}
                            </td>
                            <td className="px-4 py-3 text-sm text-green-600 font-semibold">
                              {formatCurrency(attendance.monthlySalary)}
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-600 font-semibold">
                              {formatCurrency(attendance.salaryPaid)}
                            </td>
                            <td className="px-4 py-3 text-sm text-orange-600 font-semibold">
                              {formatCurrency(remaining)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {markForm.month ? (() => {
                                const workDatesInPeriod = (attendance.daysOff || []).filter(wd => {
                                  return isDateInSalaryPeriod(normalizeDateString(wd.workDate), markForm.month);
                                });
                                return `${workDatesInPeriod.length} ngày`;
                              })() : `${attendance.daysOff?.length || 0} ngày`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {allAttendances.length === 0 && !isLoadingAllAttendances && markForm.month && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                  <p className="text-sm text-gray-600">Chưa có dữ liệu chấm công cho tháng này. Vui lòng nhấn &quot;Tải danh sách lương&quot; để xem.</p>
                </div>
              )}

              {markAttendance && selectedMarkWorker && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm font-semibold text-gray-700">
                  <div>
                    Nhân viên: <span className="text-gray-900">{markAttendance.worker?.name || selectedMarkWorker?.name}</span>
                  </div>
                  <div>
                    Lương tháng hiện tại: <span className="text-green-600">
                      {markForm.month ? (() => {
                        // Calculate salary based on work dates in salary period from markWorkDates
                        const workDatesInPeriod = markWorkDates.filter(wd => {
                          return isDateInSalaryPeriod(normalizeDateString(wd.workDate), markForm.month);
                        });
                        const daysInSalaryPeriod = 30;
                        const dailySalary = selectedMarkWorker.salary / daysInSalaryPeriod;
                        const totalWorkQuantity = workDatesInPeriod.reduce((sum, wd) => sum + wd.workQuantity, 0);
                        const baseSalary = dailySalary * totalWorkQuantity;
                        const overtimeRate = dailySalary / 8;
                        const overtimeSalary = workDatesInPeriod.reduce((sum, wd) => sum + (wd.workOvertime * overtimeRate * 2), 0);
                        const calculatedSalary = baseSalary + overtimeSalary;
                        return formatCurrency(calculatedSalary);
                      })() : formatCurrency(markAttendance.monthlySalary)}
                    </span>
                  </div>
                  <div>
                    Đã trả: <span className="text-blue-600">{formatCurrency(markAttendance.salaryPaid)}</span>
                  </div>
                  <div>
                    Số ngày làm việc: <span className="text-gray-900">
                      {markForm.month ? (() => {
                        // Count work dates in salary period from markWorkDates
                        const workDatesInPeriod = markWorkDates.filter(wd => {
                          return isDateInSalaryPeriod(normalizeDateString(wd.workDate), markForm.month);
                        });
                        return workDatesInPeriod.length;
                      })() : markWorkDates.length}
                    </span>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-dashed border-gray-300 p-4 space-y-3">
                {selectedWorkerForDetail && (() => {
                  const nearest16th = getNearest16thDate();
                  const today = getTodayDate();
                  return (
                    <div className="text-xs text-gray-600 mb-2">
                      Chọn ngày từ {nearest16th} đến {today}
                    </div>
                  );
                })()}
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="date"
                    value={markDayInput}
                    onChange={(e) => setMarkDayInput(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    max={getTodayDate()}
                    min={getNearest16thDate()}
                    disabled={!selectedWorkerForDetail}
                  />
                  <button
                    onClick={addWorkDateToMark}
                    className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-700 disabled:opacity-50"
                    disabled={!selectedWorkerForDetail || !markForm.month}
                  >
                    Thêm ngày làm việc
                  </button>
                </div>
                {markWorkDates.length > 0 ? (
                  <div className="space-y-2">
                    {markWorkDates.map((workDate, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3"
                      >
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-gray-700">
                            {formatDateLabel(normalizeDateString(workDate.workDate))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">
                            Công:
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="2"
                              value={workDate.workQuantity}
                              onChange={(e) => updateMarkWorkDate(index, 'workQuantity', parseFloat(e.target.value) || 0)}
                              className="ml-1 w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:border-orange-500 focus:outline-none"
                            />
                          </label>
                          <label className="text-xs text-gray-600">
                            OT:
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={workDate.workOvertime}
                              onChange={(e) => updateMarkWorkDate(index, 'workOvertime', parseFloat(e.target.value) || 0)}
                              className="ml-1 w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:border-orange-500 focus:outline-none"
                            />
                            h
                          </label>
                          <button
                            className="ml-2 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-200"
                            onClick={() => removeMarkWorkDate(workDate)}
                            aria-label={`Xóa ${workDate.workDate}`}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Chưa có ngày làm việc nào trong danh sách.</p>
                )}
              </div>

              {selectedMarkWorker && (
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 flex flex-wrap gap-4 text-sm font-semibold text-gray-700">
                  <div>
                    Lương cơ bản: <span className="text-gray-900">{formatCurrency(selectedMarkWorker.salary)}</span>
                  </div>
                  <div>
                    Số ngày làm việc: <span className="text-gray-900">
                      {markForm.month ? (() => {
                        const workDatesInPeriod = markWorkDates.filter(wd => {
                          return isDateInSalaryPeriod(normalizeDateString(wd.workDate), markForm.month);
                        });
                        return workDatesInPeriod.length;
                      })() : markWorkDates.length}
                    </span>
                  </div>
                  <div>
                    Lương dự kiến: <span className="text-green-600">{formatCurrency(markPreviewSalary)}</span>
                  </div>
                </div>
              )}

              {markAttendance && markAttendance.id > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  <h3 className="text-sm font-bold text-gray-900">Thanh toán lương</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Số tiền thanh toán</label>
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        value={salaryPaymentAmount}
                        onChange={(e) => setSalaryPaymentAmount(e.target.value)}
                        placeholder="Nhập số tiền lương cần thanh toán"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <button
                        onClick={handlePaySalary}
                        className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        disabled={isPayingSalary || !salaryPaymentAmount || parseFloat(salaryPaymentAmount) <= 0}
                      >
                        {isPayingSalary ? 'Đang xử lý...' : 'Thanh toán lương'}
                      </button>
                    </div>
                  </div>
                  {markAttendance.salaryPaid > 0 && (
                    <div className="text-xs text-gray-600">
                      Đã thanh toán: <span className="font-semibold text-blue-600">{formatCurrency(markAttendance.salaryPaid)}</span>
                      {markAttendance.monthlySalary > 0 && (
                        <span className="ml-2">
                          (Còn lại: <span className="font-semibold text-orange-600">{formatCurrency(markAttendance.monthlySalary - markAttendance.salaryPaid)}</span>)
                        </span>
                      )}
                    </div>
                  )}
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

              {selectedWorkerForDetail && (
                <div className="flex justify-end">
                  <button
                    onClick={saveMarkedAttendance}
                    className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold uppercase tracking-wide text-white shadow hover:bg-orange-700 disabled:opacity-50"
                    disabled={isSavingMark || !selectedWorkerForDetail || !markForm.month}
                  >
                    {isSavingMark ? 'Đang lưu...' : 'Cập nhật chấm công'}
                  </button>
                </div>
              )}

              {!selectedWorkerForDetail && allAttendances.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-blue-50 p-4 text-center">
                  <p className="text-sm text-blue-700 font-semibold">Nhấn vào một hàng trong bảng để xem và chỉnh sửa chi tiết chấm công</p>
                </div>
              )}
            </div>
          ) : activeTab === 'worker' ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-gray-900">
                  {editingWorker ? 'Sửa nhân viên' : 'Tạo nhân viên mới'}
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
                  <label className="text-sm font-bold text-gray-700 block mb-2">Tên nhân viên</label>
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
                    ? 'Cập nhật nhân viên'
                    : 'Tạo nhân viên'}
                </button>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-xl font-black text-gray-900">Danh sách nhân viên</h2>
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
                    <p className="text-sm text-gray-500 text-center py-4">Đang tải danh sách nhân viên...</p>
                  ) : filteredWorkersCrud.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Không tìm thấy nhân viên phù hợp.</p>
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
                                      isDayWorkedInSalaryView(day.dateValue)
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-gray-100 text-gray-400'
                                    }`}
                                    title={(() => {
                                      const wd = getWorkDateInSalaryView(day.dateValue);
                                      return wd && wd.workQuantity > 0 
                                        ? `Công: ${wd.workQuantity}, OT: ${wd.workOvertime}h`
                                        : 'Chưa làm việc';
                                    })()}
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
                              <span className="text-gray-600">Có làm việc</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div>
                              <span className="text-gray-600">Chưa làm việc</span>
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
                              <span className="text-gray-600">Số ngày làm việc:</span>
                              <span className="font-semibold text-green-600">
                                {calculateDaysWorked()} ngày
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tổng số công:</span>
                              <span className="font-semibold text-gray-900">
                                {calculateTotalWorkQuantity()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tổng giờ làm thêm:</span>
                              <span className="font-semibold text-orange-600">
                                {calculateTotalOvertime()} giờ
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
                            <h3 className="text-sm font-black text-gray-900 mb-2">Danh sách ngày làm việc</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {workerAttendanceView.daysOff
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
                                    <span className="text-green-600 font-semibold">
                                      Công: {workDate.workQuantity}
                                    </span>
                                    {workDate.workOvertime > 0 && (
                                      <span className="text-orange-600 font-semibold">
                                        OT: {workDate.workOvertime}h
                                      </span>
                                    )}
                                  </div>
                                </div>
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
                            Chưa có dữ liệu chấm công cho tháng này. Lương thực nhận: 0 VNĐ.
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
                      Bạn có chắc chắn muốn xóa nhân viên{' '}
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
          ) : activeTab === 'overview' ? (
            <div className="space-y-6 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Tổng quan chấm công tháng</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Xem chi tiết chấm công của tất cả nhân viên trong tháng
                  </p>
                </div>
                <input
                  type="month"
                  value={overviewMonth}
                  onChange={(e) => setOverviewMonth(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {isLoadingOverviewAll ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-gray-500">Đang tải dữ liệu...</span>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-bold text-gray-900 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 min-w-[200px]">
                          Nhân viên
                        </th>
                        {Array.from({ length: getDaysInMonth(overviewMonth) }, (_, i) => {
                          const day = i + 1;
                          const dateValue = `${overviewMonth}-${String(day).padStart(2, '0')}`;
                          return (
                            <th
                              key={day}
                              className="px-2 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[80px]"
                              title={formatDateLabel(dateValue)}
                            >
                              {day}
                            </th>
                          );
                        })}
                        <th className="px-4 py-3 text-center font-bold text-gray-900 border-l border-gray-200">
                          Tổng
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {workers.map((worker, workerIndex) => {
                        const attendance = overviewAttendances.get(worker.id);
                        const totalDays = attendance?.daysOff?.filter(wd => wd.workQuantity > 0).length || 0;
                        const totalWorkQuantity = attendance?.daysOff?.reduce((sum, wd) => sum + wd.workQuantity, 0) || 0;
                        const totalOvertime = attendance?.daysOff?.reduce((sum, wd) => sum + wd.workOvertime, 0) || 0;

                        return (
                          <tr
                            key={worker.id}
                            className={`border-b border-gray-100 hover:bg-gray-50 ${
                              workerIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-gray-900 sticky left-0 bg-inherit z-10 border-r border-gray-200 min-w-[200px]">
                              <div>
                                <div className="font-bold whitespace-nowrap">{worker.name}</div>
                                <div className="text-xs text-gray-500">{formatCurrency(worker.salary)}</div>
                              </div>
                            </td>
                            {Array.from({ length: getDaysInMonth(overviewMonth) }, (_, i) => {
                              const day = i + 1;
                              const dateValue = `${overviewMonth}-${String(day).padStart(2, '0')}`;
                              const workDate = getWorkDateForOverview(attendance || null, dateValue);
                              const hasWork = workDate && workDate.workQuantity > 0;

                              return (
                                <td
                                  key={day}
                                  className={`px-2 py-2 text-center border-r border-gray-100 ${
                                    hasWork ? 'bg-green-50' : ''
                                  }`}
                                  title={
                                    hasWork
                                      ? `${formatDateLabel(dateValue)}: Công ${workDate.workQuantity}, OT ${workDate.workOvertime}h`
                                      : formatDateLabel(dateValue)
                                  }
                                >
                                  {hasWork ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs font-semibold text-green-700">
                                        {workDate.workQuantity}
                                      </span>
                                      {workDate.workOvertime > 0 && (
                                        <span className="text-xs text-orange-600 font-semibold">
                                          +{workDate.workOvertime}h
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-4 py-3 text-center border-l border-gray-200 bg-gray-100 font-semibold">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs text-gray-600">{totalDays} ngày</span>
                                <span className="text-xs text-green-700">{totalWorkQuantity} công</span>
                                {totalOvertime > 0 && (
                                  <span className="text-xs text-orange-600">+{totalOvertime}h</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


