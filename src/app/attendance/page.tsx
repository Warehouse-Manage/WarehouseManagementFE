'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie, printHtmlContent, formatNumberInput, parseNumberInput } from '@/lib/ultis';
import { workerApi, attendanceApi, financeApi } from '@/api';
import { Worker, Attendance, WorkDate } from '@/types';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';

// Types moved to @/types/worker.ts and @/types/attendance.ts
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

const printLatestSalaryFundForWorker = async (workerId: number) => {
  try {
    const funds = await financeApi.getFunds();
    const latestSalaryFund = funds
      .filter(f =>
        f.type === 'Chi' &&
        f.category === 'Lương' &&
        f.objectType === 'Công nhân/Nhân viên' &&
        f.objectId === workerId
      )
      .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())[0];

    if (!latestSalaryFund) return;

    const html = await financeApi.printFund(latestSalaryFund.id);
    await printHtmlContent(html);
  } catch (error) {
    console.error('Không thể in phiếu chi lương:', error);
  }
};

// Helper function to get days from 15th of selected month to 15th of next month
const getOverviewDays = (monthValue: string): Array<{ day: number; dateValue: string; month: string }> => {
  if (!monthValue) return [];
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return [];

  const days: Array<{ day: number; dateValue: string; month: string }> = [];
  const startDate = new Date(year, month - 1, 15);
  const endDate = new Date(year, month, 15); // 15th of next month
  const currentDate = new Date(startDate);

  while (currentDate < endDate) {
    const dateValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    days.push({
      day: currentDate.getDate(),
      dateValue: dateValue,
      month: monthStr
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return days;
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

  // Calculate the period: 15th of selected month to 15th of next month
  const startDate = new Date(year, month - 1, 15);
  const endDate = new Date(year, month, 15); // 15th of next month

  const days: CalendarDay[] = [];
  const currentDate = new Date(startDate);

  // Get the day of week for the 15th (0 = Sunday, 1 = Monday, etc.)
  const leadingEmpty = startDate.getDay();
  for (let i = 0; i < leadingEmpty; i++) {
    days.push({ label: '', dateValue: '', inMonth: false });
  }

  // Generate days from 15th of selected month to 15th of next month
  while (currentDate < endDate) {
    const dateValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    days.push({
      label: String(currentDate.getDate()),
      dateValue,
      inMonth: true
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Fill remaining cells to complete the week
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
  const parsedSalaryPaymentAmount = useMemo(() => parseNumberInput(salaryPaymentAmount), [salaryPaymentAmount]);
  const [isPayingSalary, setIsPayingSalary] = useState(false);
  const [allAttendances, setAllAttendances] = useState<Attendance[]>([]);
  const [isLoadingAllAttendances, setIsLoadingAllAttendances] = useState(false);
  const [selectedWorkerForDetail, setSelectedWorkerForDetail] = useState<number | null>(null);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerForm, setWorkerForm] = useState<Record<string, unknown>>({
    name: '',
    age: '',
    phoneNumber: '',
    salary: '',
    userId: '',
  });

  const workerFormFields: FormField[] = [
    { name: 'name', label: 'Tên nhân viên', type: 'text', placeholder: 'Ví dụ: Nguyễn Văn A', required: true },
    { name: 'age', label: 'Tuổi', type: 'number', placeholder: '30' },
    { name: 'phoneNumber', label: 'Số điện thoại', type: 'tel', placeholder: '0901...', required: true },
    { name: 'salary', label: 'Lương cơ bản', type: 'number', placeholder: '10000000', required: true },
    { name: 'userId', label: 'User ID (tùy chọn)', type: 'number', placeholder: 'Liên kết tài khoản người dùng' },
  ];
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

  // Mobile Overview (Admin/Approver): horizontal scrollbar sync between header and body
  const overviewHeaderScrollRef = useRef<HTMLDivElement | null>(null);
  const overviewBodyScrollRef = useRef<HTMLDivElement | null>(null);
  const [overviewMobileScrollLeft, setOverviewMobileScrollLeft] = useState(0);
  const overviewMobileScrollRafRef = useRef<number | null>(null);
  const isScrollingRef = useRef<'header' | 'body' | null>(null);

  const handleOverviewHeaderScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const left = e.currentTarget.scrollLeft;
    if (overviewMobileScrollRafRef.current) cancelAnimationFrame(overviewMobileScrollRafRef.current);
    overviewMobileScrollRafRef.current = requestAnimationFrame(() => {
      setOverviewMobileScrollLeft(left);
      // Sync body scroll with header
      if (overviewBodyScrollRef.current && isScrollingRef.current !== 'body') {
        isScrollingRef.current = 'header';
        overviewBodyScrollRef.current.scrollLeft = left;
        setTimeout(() => {
          isScrollingRef.current = null;
        }, 50);
      }
    });
  }, []);

  const handleOverviewBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const left = e.currentTarget.scrollLeft;
    if (overviewMobileScrollRafRef.current) cancelAnimationFrame(overviewMobileScrollRafRef.current);
    overviewMobileScrollRafRef.current = requestAnimationFrame(() => {
      setOverviewMobileScrollLeft(left);
      // Sync header scroll with body
      if (overviewHeaderScrollRef.current && isScrollingRef.current !== 'header') {
        isScrollingRef.current = 'body';
        overviewHeaderScrollRef.current.scrollLeft = left;
        setTimeout(() => {
          isScrollingRef.current = null;
        }, 50);
      }
    });
  }, []);

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
        const data = await workerApi.getWorkers(currentUserId);

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
            const attendanceData = await attendanceApi.getWorkerAttendance(worker.id, year, Number(month));
            setMarkAttendance(attendanceData);
            setMarkWorkDates((attendanceData.daysOff || []).map(wd => ({
              id: wd.id,
              workDate: wd.workDate,
              workQuantity: wd.workQuantity,
              workOvertime: wd.workOvertime,
            })));
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
        const data = await workerApi.getWorkers();
        setWorkers(data);
      } catch (error: unknown) {
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
            const data = await attendanceApi.getWorkerAttendance(worker.id, year, Number(month));
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
    // Skip if we just auto-selected (hasAutoSelectedRef is true)
    if (prevMonthRef.current !== createForm.month && !hasAutoSelectedRef.current) {
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

  // Auto-select date when user first reaches the "Tạo bảng chấm công" tab
  const hasAutoSelectedRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'create' && !hasAutoSelectedRef.current) {
      // Use setTimeout to ensure this runs after other effects
      setTimeout(() => {
        // Set flag first to prevent other useEffect from interfering
        hasAutoSelectedRef.current = true;

        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = getCurrentMonthValue();

        if (currentDay >= 1 && currentDay <= 14) {
          // If today is 1-14, select the same day in last month's calendar view
          // The calendar shows Dec 15 - Jan 15, so if today is 5/1/2025,
          // we should select month Dec 2024 and day 5/1/2025 (which is visible in that calendar)
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);
          const monthToUse = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
          // Select the same day in current month (which is visible in last month's calendar)
          const selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

          // Update prevMonthRef first to prevent the other useEffect from clearing
          prevMonthRef.current = monthToUse;

          // Set both month and selectedDate together to ensure the date is selected
          setCreateForm({
            month: monthToUse,
            selectedDate: selectedDate
          });
        } else {
          // If today is 15 or later, select today in current month
          const selectedDate = getCurrentDateValue();

          // Update prevMonthRef first to prevent the other useEffect from clearing
          prevMonthRef.current = currentMonth;

          setCreateForm({
            month: currentMonth,
            selectedDate: selectedDate
          });
        }
      }, 0);
    }

    // Reset when switching away from create tab
    if (activeTab !== 'create') {
      hasAutoSelectedRef.current = false;
    }
  }, [activeTab]);

  // Auto-select previous month when user first reaches the "Tổng quan" tab if current day is 1-14
  const hasAutoSelectedOverviewRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'overview' && !hasAutoSelectedOverviewRef.current) {
      // Use setTimeout to ensure this runs after other effects
      setTimeout(() => {
        // Set flag first
        hasAutoSelectedOverviewRef.current = true;

        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = getCurrentMonthValue();

        if (currentDay >= 1 && currentDay <= 14) {
          // If today is 1-14, select the previous month
          // Example: 5/1/2025 -> select December 2024
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);
          const monthToUse = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

          setOverviewMonth(monthToUse);
        } else {
          // If today is 15 or later, keep current month
          setOverviewMonth(currentMonth);
        }
      }, 0);
    }

    // Reset when switching away from overview tab
    if (activeTab !== 'overview') {
      hasAutoSelectedOverviewRef.current = false;
    }
  }, [activeTab]);

  // Auto-select previous month when user first reaches the "Quản lý chấm công" tab if current day is 1-14
  const hasAutoSelectedMarkRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'mark' && !hasAutoSelectedMarkRef.current) {
      // Use setTimeout to ensure this runs after other effects
      setTimeout(() => {
        // Set flag first
        hasAutoSelectedMarkRef.current = true;

        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = getCurrentMonthValue();

        if (currentDay >= 1 && currentDay <= 14) {
          // If today is 1-14, select the previous month
          // Example: 5/1/2025 -> select December 2024
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);
          const monthToUse = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

          setMarkForm((prev) => ({ ...prev, month: monthToUse }));
        } else {
          // If today is 15 or later, keep current month
          setMarkForm((prev) => ({ ...prev, month: currentMonth }));
        }
      }, 0);
    }

    // Reset when switching away from mark tab
    if (activeTab !== 'mark') {
      hasAutoSelectedMarkRef.current = false;
    }
  }, [activeTab]);

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

      const updated = await attendanceApi.markAttendance(payload);
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
      const data = await attendanceApi.getAttendances(year, Number(month));
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
      const attendanceData = await attendanceApi.getWorkerAttendance(workerId, year, Number(month));
      setMarkAttendance(attendanceData);

      // Get work dates from nearest 16th to today
      const startDate = getNearest16thDate();
      const endDate = getTodayDate();

      const workDatesData = await attendanceApi.getWorkerWorkDates(workerId, startDate, endDate);

      if (workDatesData.length === 0) {
        // Fallback to attendance work dates if no work dates found in the specific period
        setMarkWorkDates((attendanceData.daysOff || []).map(wd => ({
          id: wd.id,
          workDate: wd.workDate,
          workQuantity: wd.workQuantity,
          workOvertime: wd.workOvertime,
        })));
      } else {
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

      const updated = await attendanceApi.saveAttendance(payload);
      setMarkAttendance(updated);

      // Reload work dates from nearest 16th to today
      const startDate = getNearest16thDate();
      const endDate = getTodayDate();

      try {
        const workDatesData = await attendanceApi.getWorkerWorkDates(selectedWorkerForDetail, startDate, endDate);

        if (workDatesData.length > 0) {
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

    const parsedAmount = parseNumberInput(salaryPaymentAmount);
    if (typeof parsedAmount !== 'number' || parsedAmount <= 0) {
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
      const updated = await attendanceApi.paySalary(markAttendance.id, {
        amount: parsedAmount,
        createdUserId: Number(userId),
      });
      setMarkAttendance(updated);
      setSalaryPaymentAmount('');
      setMarkToast({ type: 'success', message: 'Đã thanh toán lương và tạo bản ghi trong sổ quỹ.' });

      // Refresh attendance data
      await fetchAttendanceForMarking();
      // Refresh all attendances list
      await fetchAllAttendancesForMonth();

      await printLatestSalaryFundForWorker(updated.workerId);
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
      await workerApi.deleteWorker(workerId);

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
      name: (workerForm.name as string) || '',
      age: workerForm.age ? Number(workerForm.age) : 0,
      phoneNumber: (workerForm.phoneNumber as string) || '',
      salary: Number(workerForm.salary) || 0,
      userId: workerForm.userId ? Number(workerForm.userId) : null,
    };

    if (Number.isNaN(payload.salary) || payload.salary <= 0) {
      setWorkerToast({ type: 'error', message: 'Lương phải lớn hơn 0.' });
      return;
    }

    setIsSavingWorker(true);
    setWorkerToast(null);
    try {
      let result: Worker;
      if (editingWorker) {
        result = await workerApi.updateWorker(editingWorker.id, payload);
      } else {
        result = await workerApi.createWorker(payload);
      }

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
      const data = await attendanceApi.getWorkerAttendance(workerId, year, Number(monthNum));
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
      attendanceApi.getWorkerAttendance(currentUserWorker.id, year, Number(month))
        .then((data) => {
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
    if ((userRole === 'Admin' || userRole === 'approver') && overviewMonth) {
      setIsLoadingOverviewAll(true);
      const [year, month] = overviewMonth.split('-');

      attendanceApi.getOverview(year, Number(month))
        .then((data) => {
          const attendanceMap = new Map<number, Attendance>();
          Object.entries(data).forEach(([workerId, attendance]) => {
            attendanceMap.set(Number(workerId), attendance);
          });
          setOverviewAttendances(attendanceMap);
        })
        .catch((error) => {
          console.error('Could not load overview attendances:', error);
          setOverviewAttendances(new Map());
        })
        .finally(() => setIsLoadingOverviewAll(false));
    }
  }, [userRole, overviewMonth]);

  const handleViewSalary = (worker: Worker) => {
    setViewingSalaryWorker(worker);
    setSalaryViewMonth(getCurrentMonthValue());
  };

  const calculateTotalWorkQuantity = (): number => {
    if (!workerAttendanceView) return 0;
    return workerAttendanceView.daysOff?.reduce((sum, wd) => sum + wd.workQuantity, 0) || 0;
  };

  const calculateTotalOvertime = (): number => {
    if (!workerAttendanceView) return 0;
    return workerAttendanceView.daysOff?.reduce((sum, wd) => sum + wd.workOvertime, 0) || 0;
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
    chunkArray: <T, >(array: T[], size: number) => T[][];
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
                    className={`rounded-md px-0 py-2 font-semibold relative ${(() => {
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
                  className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
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
                              type="text"
                              inputMode="decimal"
                              step="0.5"
                              min="0"
                              max="2"
                              value={workDate.workQuantity}
                              onChange={(e) => updateMarkWorkDate(index, 'workQuantity', parseFloat(e.target.value.replace(/,/g, '.')) || 0)}
                              className="ml-1 w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:border-orange-500 focus:outline-none text-right"
                            />
                            </label>
                            <label className="text-xs text-gray-600">
                              OT:
                              <input
                              type="text"
                              inputMode="decimal"
                              step="1"
                              min="0"
                              value={workDate.workOvertime}
                              onChange={(e) => updateMarkWorkDate(index, 'workOvertime', parseFloat(e.target.value.replace(/,/g, '.')) || 0)}
                              className="ml-1 w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:border-orange-500 focus:outline-none text-right"
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
                className={`rounded-lg px-4 py-3 text-sm font-semibold ${markToast.type === 'success'
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
                  className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold uppercase tracking-wide text-white shadow hover:bg-orange-700 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Chấm công</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Quản lý lương và thời gian làm việc của nhân viên</p>
        </div>
      </div>

      {globalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {globalError}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto no-scrollbar scroll-smooth bg-gray-50/50 border-b border-gray-100">
          <button
            className={`flex-none px-6 py-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'create'
              ? 'bg-white text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
              }`}
            onClick={() => setActiveTab('create')}
          >
            <span className="hidden sm:inline">Tạo chấm công</span>
            <span className="sm:hidden">Chấm công</span>
          </button>
          {userRole === 'Admin' && (
            <>
              <button
                className={`flex-none px-6 py-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'mark'
                  ? 'bg-white text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                  }`}
                onClick={() => setActiveTab('mark')}
              >
                Quản lý
              </button>
              <button
                className={`flex-none px-6 py-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'worker'
                  ? 'bg-white text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                  }`}
                onClick={() => setActiveTab('worker')}
              >
                Nhân viên
              </button>
            </>
          )}
          <button
            className={`flex-none px-6 py-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'overview'
              ? 'bg-white text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
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
                              className={`rounded-md px-0 py-2 font-semibold transition cursor-pointer ${createForm.selectedDate === day.dateValue
                                ? 'bg-orange-600 text-white shadow-lg ring-2 ring-orange-300 hover:bg-orange-700'
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
                              {/* ================= LEFT: INFO ================= */}
                              <div className="flex-1">
                                {/* Name + Salary */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                  <p className="text-xs sm:text-sm font-black text-gray-900">
                                    {worker.name}
                                  </p>

                                  {userRole === 'Admin' && (
                                    <span className="text-xs font-semibold text-orange-600">
                                      {formatCurrency(worker.salary)}
                                    </span>
                                  )}
                                </div>

                                {/* Extra info */}
                                <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                                  <p>SĐT: {worker.phoneNumber}</p>

                                  {attendance && (
                                    <p className="font-semibold text-orange-600">
                                      <span className="block sm:hidden">
                                        {workDatesCount} ngày làm việc
                                      </span>
                                      <span className="hidden sm:block">
                                        {workDatesCount} ngày làm việc trong tháng
                                      </span>
                                    </p>
                                  )}

                                  {workDate && workDate.workQuantity > 0 && (
                                    <p className="font-semibold text-green-600">
                                      Công: {workDate.workQuantity} • OT: {workDate.workOvertime}h
                                    </p>
                                  )}
                                </div>

                                {/* ================= MOBILE ATTENDANCE ================= */}
                                {createForm.selectedDate && (
                                  <div className="mt-3 sm:hidden rounded-md border border-gray-200 bg-gray-50 p-2">
                                    <div className="flex items-center gap-2">
                                      {/* Work quantity */}
                                      <div className="flex items-center">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const qty = Math.max(
                                              0,
                                              (workDate?.workQuantity || 0) - 0.5
                                            );
                                            toggleWorkerAttendance(
                                              worker.id,
                                              createForm.selectedDate,
                                              qty,
                                              workDate?.workOvertime || 0
                                            );
                                          }}
                                          disabled={isSaving}
                                          className="flex h-7 w-7 items-center justify-center rounded-l bg-gray-200 text-gray-700 active:bg-gray-300 cursor-pointer hover:bg-gray-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          -
                                        </button>

                                        <input
                                          readOnly
                                          value={workDate?.workQuantity || 0}
                                          className="h-7 w-10 border-y border-gray-300 bg-white text-center text-xs"
                                        />

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const qty = Math.min(
                                              2,
                                              (workDate?.workQuantity || 0) + 0.5
                                            );
                                            toggleWorkerAttendance(
                                              worker.id,
                                              createForm.selectedDate,
                                              qty,
                                              workDate?.workOvertime || 0
                                            );
                                          }}
                                          disabled={isSaving}
                                          className="flex h-7 w-7 items-center justify-center rounded-r bg-gray-200 text-gray-700 active:bg-gray-300 cursor-pointer hover:bg-gray-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          +
                                        </button>
                                      </div>

                                      <span className="text-xs text-gray-500">công</span>

                                      {/* OT */}
                                      <input
                                        readOnly
                                        value={workDate?.workOvertime || 0}
                                        className="h-7 w-10 rounded border border-gray-300 text-center text-xs"
                                      />
                                      <span className="text-xs text-gray-500">h</span>
                                    </div>

                                    <p className="mt-1 text-[11px] text-gray-400">
                                      {isSaving
                                        ? 'Đang lưu...'
                                        : workDate?.workQuantity
                                          ? 'Đã chấm công'
                                          : 'Chưa chấm'}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* ================= WEB ATTENDANCE ================= */}
                              <div className="hidden sm:flex items-center gap-2">
                                {createForm.selectedDate ? (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      {/* Quantity */}
                                      <div className="flex items-center">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const qty = Math.max(
                                              0,
                                              (workDate?.workQuantity || 0) - 0.5
                                            );
                                            toggleWorkerAttendance(
                                              worker.id,
                                              createForm.selectedDate,
                                              qty,
                                              workDate?.workOvertime || 0
                                            );
                                          }}
                                          disabled={isSaving}
                                          className="flex h-8 w-8 items-center justify-center rounded-l bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          -
                                        </button>

                                        <input
                                          type="number"
                                          step="0.5"
                                          min="0"
                                          max="2"
                                          value={workDate?.workQuantity || 0}
                                          onChange={(e) => {
                                            const qty = parseFloat(e.target.value) || 0;
                                            toggleWorkerAttendance(
                                              worker.id,
                                              createForm.selectedDate,
                                              qty,
                                              workDate?.workOvertime || 0
                                            );
                                          }}
                                          disabled={isSaving}
                                          className="h-8 w-12 border-y border-gray-300 text-center text-xs focus:border-orange-500 focus:outline-none"
                                        />

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const qty = Math.min(
                                              2,
                                              (workDate?.workQuantity || 0) + 0.5
                                            );
                                            toggleWorkerAttendance(
                                              worker.id,
                                              createForm.selectedDate,
                                              qty,
                                              workDate?.workOvertime || 0
                                            );
                                          }}
                                          disabled={isSaving}
                                          className="flex h-8 w-8 items-center justify-center rounded-r bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          +
                                        </button>
                                      </div>

                                      <span className="text-xs text-gray-500">công</span>

                                      {/* OT */}
                                      <input
                                        type="number"
                                        min="0"
                                        value={workDate?.workOvertime || 0}
                                        onChange={(e) => {
                                          const ot = parseFloat(e.target.value) || 0;
                                          toggleWorkerAttendance(
                                            worker.id,
                                            createForm.selectedDate,
                                            workDate?.workQuantity || 0,
                                            ot
                                          );
                                        }}
                                        disabled={isSaving}
                                        className="w-12 rounded border border-gray-300 px-2 py-1 text-xs focus:border-orange-500 focus:outline-none"
                                      />

                                      <span className="text-xs text-gray-500">h</span>
                                    </div>

                                    <span className="text-xs text-gray-400">
                                      {isSaving
                                        ? 'Đang lưu...'
                                        : workDate?.workQuantity
                                          ? 'Đã chấm công'
                                          : 'Chưa chấm'}
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
                  className={`rounded-lg px-4 py-3 text-sm font-semibold ${createToast.type === 'success'
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
                <div className="md:col-span-1 flex items-center mt-2">
                  <button
                    onClick={fetchAllAttendancesForMonth}
                    className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
                    disabled={!markForm.month || isLoadingAllAttendances}
                  >
                    {isLoadingAllAttendances ? 'Đang tải...' : 'Tải danh sách lương'}
                  </button>
                </div>
              </div>

              {allAttendances.length > 0 && (
                <DataTable
                  data={allAttendances}
                  columns={[
                    {
                      key: 'workerName',
                      header: 'Nhân viên',
                      isMain: true,
                      render: (a) => (
                        <div className="font-black text-gray-900 uppercase">
                          {a.worker?.name || `Nhân viên #${a.workerId}`}
                        </div>
                      )
                    },
                    {
                      key: 'monthlySalary',
                      header: 'Lương tháng',
                      isMain: true,
                      className: 'text-right',
                      headerClassName: 'text-right',
                      render: (a) => <span className="text-green-600 font-black">{formatCurrency(a.monthlySalary)}</span>
                    },
                    {
                      key: 'salaryPaid',
                      header: 'Đã trả',
                      mobileHidden: true,
                      className: 'text-right',
                      headerClassName: 'text-right',
                      render: (a) => <span className="text-blue-600 font-bold">{formatCurrency(a.salaryPaid)}</span>
                    },
                    {
                      key: 'remaining',
                      header: 'Còn lại',
                      className: 'text-right',
                      headerClassName: 'text-right',
                      render: (a) => (
                        <span className="text-orange-600 font-black">{formatCurrency(a.monthlySalary - a.salaryPaid)}</span>
                      )
                    },
                    {
                      key: 'workDays',
                      header: 'Số ngày làm',
                      mobileHidden: true,
                      className: 'text-center',
                      headerClassName: 'text-center',
                      render: (a) => markForm.month ? (() => {
                        const workDatesInPeriod = (a.daysOff || []).filter(wd => {
                          return isDateInSalaryPeriod(normalizeDateString(wd.workDate), markForm.month);
                        });
                        return `${workDatesInPeriod.length} ngày`;
                      })() : `${a.daysOff?.length || 0} ngày`
                    }
                  ]}
                  onRowClick={(a) => loadWorkerDetail(a.workerId)}
                />
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
                            className="ml-2 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-200 cursor-pointer transition-colors"
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
                        type="text"
                        inputMode="decimal"
                        step="1000"
                        min="0"
                        value={salaryPaymentAmount}
                        onChange={(e) => {
                          const inputVal = e.target.value;
                          // Lưu raw string trước
                          setSalaryPaymentAmount(inputVal);

                          // Nếu không kết thúc bằng dấu chấm thì parse và format lại
                          if (!inputVal.endsWith('.')) {
                            const parsed = parseNumberInput(inputVal);
                            if (parsed !== '') {
                              setSalaryPaymentAmount(formatNumberInput(parsed));
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const parsed = parseNumberInput(e.target.value);
                          const formatted = formatNumberInput(parsed);
                          setSalaryPaymentAmount(formatted);
                        }}
                        placeholder="Nhập số tiền lương cần thanh toán"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <button
                        onClick={handlePaySalary}
                        className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
                        disabled={
                          isPayingSalary ||
                          typeof parsedSalaryPaymentAmount !== 'number' ||
                          parsedSalaryPaymentAmount <= 0
                        }
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
                  className={`rounded-lg px-4 py-3 text-sm font-semibold ${markToast.type === 'success'
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
                    className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold uppercase tracking-wide text-white shadow hover:bg-orange-700 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
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
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>

              <DynamicForm
                fields={workerFormFields}
                values={workerForm}
                onChange={(name, value) => setWorkerForm(prev => ({ ...prev, [name]: value }))}
                columns={2}
                isSubmitting={isSavingWorker}
              />

              {workerToast && (
                <div
                  className={`rounded-lg px-4 py-3 text-sm font-semibold ${workerToast.type === 'success'
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
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-bold uppercase tracking-wide text-gray-700 shadow hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
                    disabled={isSavingWorker}
                  >
                    Hủy
                  </button>
                )}
                <button
                  onClick={submitCreateWorker}
                  className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold uppercase tracking-wide text-white shadow hover:bg-orange-700 disabled:opacity-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
                  disabled={isSavingWorker}
                >
                  {isSavingWorker
                    ? 'Đang lưu...'
                    : editingWorker
                      ? (
                        <>
                          <span className="hidden sm:inline">Cập nhật nhân viên</span>
                          <span className="sm:hidden">Cập nhật</span>
                        </>
                      )
                      : (
                        <>
                          <span className="hidden sm:inline">Tạo nhân viên</span>
                          <span className="sm:hidden">Thêm</span>
                        </>
                      )}
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
                    className="w-full sm:w-auto rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all"
                  />
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {loadingWorkers ? (
                    <p className="text-sm text-gray-500 text-center py-4">Đang tải danh sách nhân viên...</p>
                  ) : filteredWorkersCrud.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Không tìm thấy nhân viên phù hợp.</p>
                  ) : (
                    <DataTable
                      data={filteredWorkersCrud}
                      columns={[
                        { key: 'id', header: '#', render: (_, index) => index + 1, className: 'w-10' },
                        {
                          key: 'name',
                          header: 'Tên nhân viên',
                          isMain: true,
                          render: (w) => (
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 min-w-[40px] rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">
                                {w.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-black text-gray-900 uppercase tracking-tight">{w.name}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">#{w.id}</div>
                              </div>
                            </div>
                          )
                        },
                        { key: 'age', header: 'Tuổi', mobileHidden: true },
                        { key: 'phoneNumber', header: 'Số điện thoại', mobileHidden: true },
                        {
                          key: 'salary',
                          header: 'Lương cơ bản',
                          headerClassName: 'text-right',
                          className: 'text-right',
                          isMain: true,
                          render: (w) => <span className="font-black text-orange-600 md:text-base">{formatCurrency(w.salary)}</span>
                        },
                        {
                          key: 'actions',
                          header: 'Thao tác',
                          headerClassName: 'text-center',
                          className: 'text-center',
                          render: (w) => (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewSalary(w)}
                                className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                                title="Xem chi tiết lương"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleEditWorker(w)}
                                className="rounded-lg bg-gray-50 p-2 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(w.id)}
                                className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )
                        }
                      ]}
                      emptyMessage="Không tìm thấy nhân viên nào"
                    />
                  )}
                </div>
              </div>

              <Modal
                isOpen={viewingSalaryWorker !== null}
                onClose={() => setViewingSalaryWorker(null)}
                title={`Chi tiết lương - ${viewingSalaryWorker?.name}`}
                size="lg"
                footer={
                  <button
                    onClick={() => setViewingSalaryWorker(null)}
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
                            <span className="font-bold text-gray-900">{viewingSalaryWorker?.name}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Số điện thoại:</span>
                            <span className="font-bold text-gray-900">{viewingSalaryWorker?.phoneNumber || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Lương cơ bản:</span>
                            <span className="font-bold text-gray-900">{formatCurrency(viewingSalaryWorker?.salary || 0)}</span>
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
                              {formatCurrency(workerAttendanceView?.monthlySalary ?? (viewingSalaryWorker?.salary || 0))}
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

              <Modal
                isOpen={showDeleteConfirm !== null}
                onClose={() => setShowDeleteConfirm(null)}
                title="Xác nhận xóa"
                footer={
                  <>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => showDeleteConfirm !== null && handleDeleteWorker(showDeleteConfirm)}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer transition-colors"
                    >
                      Xóa
                    </button>
                  </>
                }
              >
                <p className="text-sm text-gray-600">
                  Bạn có chắc chắn muốn xóa nhân viên{' '}
                  <span className="font-semibold text-gray-900">
                    {workers.find((w) => w.id === showDeleteConfirm)?.name}
                  </span>
                  ? Hành động này không thể hoàn tác.
                </p>
              </Modal>
            </div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-6 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Tổng quan chấm công</h2>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">
                    Chi tiết tháng {overviewMonth}
                  </p>
                </div>
                <input
                  type="month"
                  value={overviewMonth}
                  onChange={(e) => setOverviewMonth(e.target.value)}
                  className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {isLoadingOverviewAll ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-gray-500">Đang tải dữ liệu...</span>
                </div>
              ) : (
                <>
                  {/* Mobile: Workers (horizontal) - Days (vertical) - Total (horizontal, sticky bottom) */}
                  <div className="sm:hidden rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="relative">
                      {/* Sticky Header: Worker names */}
                      <div className="sticky top-0 z-20 bg-white border-b border-gray-100">
                        <div className="flex">
                          <div className="w-24 shrink-0 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500 bg-white">
                            Ngày
                          </div>
                          <div
                            ref={overviewHeaderScrollRef}
                            onScroll={handleOverviewHeaderScroll}
                            className="flex-1 overflow-x-auto no-scrollbar"
                          >
                            <div className="flex min-w-max">
                              {workers.map((w) => (
                                <div
                                  key={`h-${w.id}`}
                                  className="w-24 shrink-0 px-2 py-2 border-l border-gray-100"
                                  title={w.name}
                                >
                                  <div className="text-[10px] font-black text-gray-900 truncate">{w.name}</div>
                                  {userRole === 'Admin' && (
                                    <div className="text-[10px] text-gray-400 truncate">{formatCurrency(w.salary)}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scrollable body: days */}
                      <div className="max-h-[65vh] overflow-y-auto">
                        <div className="flex">
                          <div className="w-24 shrink-0 border-r border-gray-100 bg-white">
                            {getOverviewDays(overviewMonth).map((d) => (
                              <div
                                key={`d-${d.dateValue}`}
                                className="h-10 px-2 flex flex-col justify-center border-b border-gray-50"
                              >
                                <div className="text-[11px] font-bold text-gray-900">{String(d.day).padStart(2, '0')}</div>
                                <div className="text-[10px] text-gray-400">{d.month}</div>
                              </div>
                            ))}
                          </div>

                          {/* Horizontal scrollable body: sync with header */}
                          <div
                            ref={overviewBodyScrollRef}
                            onScroll={handleOverviewBodyScroll}
                            className="flex-1 overflow-x-auto no-scrollbar"
                          >
                            <div className="flex min-w-max">
                              {getOverviewDays(overviewMonth).map((d) => (
                                <div key={`r-${d.dateValue}`} className="flex h-10 border-b border-gray-50">
                                  {workers.map((w) => {
                                    const attendance = overviewAttendances.get(w.id);
                                    const wd = getWorkDateForOverview(attendance || null, d.dateValue);
                                    const hasWork = !!wd && wd.workQuantity > 0;
                                    return (
                                      <div
                                        key={`c-${d.dateValue}-${w.id}`}
                                        className={`w-24 shrink-0 px-2 flex items-center justify-center border-l border-gray-50 ${hasWork ? 'bg-green-50' : 'bg-white'}`}
                                        title={hasWork ? `Công: ${wd?.workQuantity} • OT: ${wd?.workOvertime || 0}h` : 'Chưa làm'}
                                      >
                                        {hasWork ? (
                                          <div className="flex items-baseline gap-1">
                                            <span className="text-[11px] font-black text-green-700">{wd?.workQuantity}</span>
                                            {!!wd?.workOvertime && wd.workOvertime > 0 && (
                                              <span className="text-[10px] font-bold text-orange-600">+{wd.workOvertime}h</span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-[11px] text-gray-300">-</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sticky Footer: totals per worker */}
                      <div className="sticky bottom-0 z-20 bg-white border-t border-gray-100">
                        <div className="flex">
                          <div className="w-24 shrink-0 px-2 py-2 text-[10px] font-black uppercase tracking-wider text-gray-500 bg-white">
                            Tổng
                          </div>
                          {/* No horizontal scroll here: follow header scroll via transform */}
                          <div className="flex-1 overflow-hidden">
                            <div
                              className="flex min-w-max will-change-transform"
                              style={{ transform: `translateX(-${overviewMobileScrollLeft}px)` }}
                            >
                              {workers.map((w) => {
                                const attendance = overviewAttendances.get(w.id);
                                const totalWorkQuantity = attendance?.daysOff?.reduce((sum, wd) => sum + wd.workQuantity, 0) || 0;
                                const totalOvertime = attendance?.daysOff?.reduce((sum, wd) => sum + wd.workOvertime, 0) || 0;
                                return (
                                  <div
                                    key={`t-${w.id}`}
                                    className="w-24 shrink-0 px-2 py-2 border-l border-gray-100 bg-gray-50"
                                    title={`Tổng công: ${totalWorkQuantity} • Tổng OT: ${totalOvertime}h`}
                                  >
                                    <div className="text-[11px] font-black text-green-700">{totalWorkQuantity}C</div>
                                    {totalOvertime > 0 ? (
                                      <div className="text-[10px] font-bold text-orange-600">+{totalOvertime}h</div>
                                    ) : (
                                      <div className="text-[10px] text-gray-300">—</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop/Tablet: current table */}
                  <div className="hidden sm:block">
                    <DataTable
                      data={workers}
                      isLoading={isLoadingOverviewAll}
                      disableCardView={true}
                      columns={[
                        {
                          key: 'name',
                          header: 'Nhân viên',
                          headerClassName: 'sticky left-0 bg-gray-50 z-10 border-r border-gray-200 min-w-[120px] text-[10px]',
                          className: 'sticky left-0 bg-white z-10 border-r border-gray-200 font-bold text-xs sm:min-w-[150px]',
                          render: (w) => (
                            <div>
                              <div className="font-bold text-gray-900">{w.name}</div>
                              {userRole === 'Admin' && (
                                <div className="text-xs text-gray-500">{formatCurrency(w.salary)}</div>
                              )}
                            </div>
                          )
                        },
                        ...getOverviewDays(overviewMonth).map((dayInfo) => ({
                          key: dayInfo.dateValue,
                          header: String(dayInfo.day),
                          headerClassName: 'text-center border-r border-gray-200 min-w-[40px] text-[10px]',
                          className: 'text-center border-r border-gray-100 p-0 min-w-[40px]',
                          render: (w: Worker) => {
                            const attendance = overviewAttendances.get(w.id);
                            const workDate = getWorkDateForOverview(attendance || null, dayInfo.dateValue);
                            const hasWork = workDate && workDate.workQuantity > 0;
                            return hasWork ? (
                              <div className="flex flex-col items-center gap-0.5 py-1 bg-green-50 h-full">
                                <span className="text-[10px] font-black text-green-700">{workDate.workQuantity}</span>
                                {workDate.workOvertime > 0 && (
                                  <span className="text-[9px] text-orange-600 font-bold">+{workDate.workOvertime}h</span>
                                )}
                              </div>
                            ) : <span className="text-gray-300">-</span>;
                          }
                        })),
                        {
                          key: 'total',
                          header: 'Tổng',
                          headerClassName: 'text-center border-l border-gray-200 sticky right-0 bg-gray-50 z-10',
                          className: 'text-center border-l border-gray-200 bg-gray-100 font-semibold sticky right-0 z-10',
                          render: (w) => {
                            const attendance = overviewAttendances.get(w.id);
                            const totalDays = attendance?.daysOff?.filter(wd => wd.workQuantity > 0).length || 0;
                            const totalWorkQuantity = attendance?.daysOff?.reduce((sum, wd) => sum + wd.workQuantity, 0) || 0;
                            const totalOvertime = attendance?.daysOff?.reduce((sum, wd) => sum + wd.workOvertime, 0) || 0;
                            return (
                              <div className="flex flex-col gap-0.5 text-[10px]">
                                <span className="text-gray-600 font-bold">{totalDays}N</span>
                                <span className="text-green-700 font-black">{totalWorkQuantity}C</span>
                                {totalOvertime > 0 && <span className="text-orange-600">+{totalOvertime}h</span>}
                              </div>
                            );
                          }
                        }
                      ]}
                      emptyMessage="Không có dữ liệu nhân viên"
                    />
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


