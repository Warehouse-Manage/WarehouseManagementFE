'use client';

import { canAccessAccounting } from '@/lib/roles';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';
import { productionApi } from '@/api';
import { BrickYardStatus, BrickYardAggregated, DeviceActivity } from '@/types';
import { DataTable } from '@/components/shared';
import Select from "react-select";
import AddStatusModal from './modal/AddStatusModal';

// Client-side guard: redirect role 'user' away from this page

// Types moved to @/types/production.ts

type ChartDatum = { label: string; value: number };

interface FilterOptions {
  type: 'today' | 'day' | 'month' | 'year' | 'range';
  date?: string;
  month?: string;
  year?: string;
  startDate?: string;
  endDate?: string;
}

export default function LoGachPage() {
  const router = useRouter();
  const [statuses, setStatuses] = useState<BrickYardStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOptions>({ type: 'today' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'Ra' | 'Vô'>('Ra');

  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Hàm lấy local datetime string cho input datetime-local (có giây để khớp biểu đồ / lưu chính xác)
  const getLocalDateTimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const [newStatus, setNewStatus] = useState({
    packageQuantity: 0,
    dateTime: getLocalDateTimeString()
  });

  const [canFetch, setCanFetch] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [chartData, setChartData] = useState<ChartDatum[]>([]);

  // Device Activity state
  const [activityDate, setActivityDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activityData, setActivityData] = useState<DeviceActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    const role = getCookie('role');
    const userId = getCookie('userId');
    const userName = getCookie('userName');

    // Redirect to login if userId or userName is missing
    if (!userId || !userName) {
      router.push('/login');
      return;
    }

    // Only allow 'Admin' and 'accountance' roles to access this page
    if (!canAccessAccounting(role)) {
      setCanFetch(false);
      setIsCheckingAuth(false);
      return;
    }
    setCanFetch(true);
    setIsCheckingAuth(false);
  }, [router]);

  const fetchStatuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      let apiType: 'hour' | 'date' | 'month' | 'raw' | undefined;

      switch (filter.type) {
        case 'today':
          params.append('date', getLocalDateString());
          apiType = 'raw';
          break;
        case 'day':
          if (filter.date) {
            params.append('date', filter.date);
            apiType = 'raw';
          }
          break;
        case 'month':
          if (filter.month && filter.year) {
            const startDate = `${filter.year}-${filter.month.padStart(2, '0')}-01`;
            const endDate = new Date(parseInt(filter.year), parseInt(filter.month), 0).toISOString().split('T')[0];
            params.append('startDate', startDate);
            params.append('endDate', endDate);
            apiType = 'date';
          }
          break;
        case 'year':
          if (filter.year) {
            const startDate = `${filter.year}-01-01`;
            const endDate = `${filter.year}-12-31`;
            params.append('startDate', startDate);
            params.append('endDate', endDate);
            apiType = 'month';
          }
          break;
        case 'range':
          if (filter.startDate && filter.endDate) {
            params.append('startDate', filter.startDate);
            params.append('endDate', filter.endDate);
            apiType = 'date';
          }
          break;
      }

      if (apiType) {
        params.append('type', apiType);
      }

      params.append('brickYardType', activeTab);

      const data = await productionApi.getBrickYardStatuses(Object.fromEntries(params));

      if (Array.isArray(data) && data.length > 0 && 'totalPackageQuantity' in data[0]) {
        const aggregated = data as BrickYardAggregated[];
        // Map for table/stats reuse
        const mappedStatuses: BrickYardStatus[] = aggregated.map((item, idx) => ({
          id: idx + 1,
          packageQuantity: item.totalPackageQuantity,
          dateTime: item.periodStart
        }));
        setStatuses(mappedStatuses);

        // Build chart data
        const typeForLabel = aggregated[0].periodType.toLowerCase();
        const chart = aggregated.map(item => {
          const d = new Date(item.periodStart);
          let label = '';
          switch (typeForLabel) {
            case 'hour':
              label = `${d.getHours().toString().padStart(2, '0')}:00`;
              break;
            case 'date':
              label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
              break;
            case 'month':
              label = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
              break;
            case 'year':
              label = `${d.getFullYear()}`;
              break;
            default:
              label = d.toLocaleDateString('vi-VN');
          }
          return { label, value: item.totalPackageQuantity } as ChartDatum;
        });
        setChartData(chart);
      } else {
        // Raw data fallback
        const items = (data as BrickYardStatus[]);
        setStatuses(items);
        const chart = items.map(item => ({
          label: item.dateTime
            ? new Date(item.dateTime).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            })
            : '',
          value: item.packageQuantity
        }));
        setChartData(chart);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }, [filter, activeTab]);

  const addNewStatus = async () => {
    try {
      await productionApi.createBrickYardStatus({
        packageQuantity: newStatus.packageQuantity,
        dateTime: new Date(newStatus.dateTime).toISOString(),
        type: activeTab
      });

      setShowAddForm(false);
      setNewStatus({
        packageQuantity: 0,
        dateTime: getLocalDateTimeString()
      });
      fetchStatuses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  };

  useEffect(() => {
    if (!canFetch) return;
    fetchStatuses();
  }, [fetchStatuses, canFetch]);

  // Fetch device activities
  const fetchDeviceActivities = useCallback(async () => {
    if (!canFetch) return;
    try {
      setActivityLoading(true);
      const data = await productionApi.getDeviceActivities(activityDate);
      setActivityData(data);
    } catch (err) {
      console.error('Lỗi khi lấy hoạt động thiết bị:', err);
    } finally {
      setActivityLoading(false);
    }
  }, [activityDate, canFetch]);

  useEffect(() => {
    fetchDeviceActivities();
  }, [fetchDeviceActivities]);

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const getTotalQuantity = () => {
    return statuses.reduce((sum, status) => sum + status.packageQuantity, 0);
  };

  const getAverageQuantity = () => {
    return statuses.length > 0 ? Math.round(getTotalQuantity() / statuses.length) : 0;
  };

  const Chart = ({ data }: { data: ChartDatum[] }) => {
    const maxValue = Math.max(1, ...data.map(d => d.value));
    const barWidth = 36;
    const gap = 24;
    const height = 280;
    const contentWidth = Math.max(800, data.length * (barWidth + gap) + gap * 2);

    return (
      <div className="w-full overflow-x-auto py-6 px-4 bg-white/30 backdrop-blur-md rounded-2xl border border-white/50 shadow-inner">
        <svg
          viewBox={`0 -30 ${contentWidth} ${height + 90}`}
          width="100%"
          height="auto"
          className="mx-auto drop-shadow-sm"
          style={{
            minHeight: '300px',
            maxWidth: '100%'
          }}
          preserveAspectRatio="xMidYMin meet"
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <line
              key={i}
              x1={0}
              y1={height * (1 - p)}
              x2={contentWidth}
              y2={height * (1 - p)}
              className="stroke-gray-200"
              strokeDasharray="4 4"
            />
          ))}

          {data.map((d, i) => {
            const x = gap + i * (barWidth + gap);
            const barHeight = Math.round((d.value / maxValue) * height);
            const y = height - barHeight;
            return (
              <g key={i} className="transition-all duration-300 hover:scale-105 origin-bottom cursor-pointer">
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={8}
                  fill="url(#barGradient)"
                  filter="url(#shadow)"
                />
                <text
                  x={x + barWidth / 2}
                  y={height + 25}
                  textAnchor="middle"
                  className="fill-gray-600 font-semibold text-[10px] sm:text-[12px]"
                >
                  {d.label}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={y - 12}
                  textAnchor="middle"
                  className="fill-orange-700 font-black text-[12px] sm:text-[14px]"
                >
                  {d.value}
                </text>
              </g>
            );
          })}

          {/* x-axis base line */}
          <line x1={0} y1={height} x2={contentWidth} y2={height} className="stroke-gray-400" strokeWidth={1} />
        </svg>
      </div>
    );
  };

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg text-gray-600">Đang kiểm tra xác thực...</span>
        </div>
      </div>
    );
  }

  // Show blank page if role is not 'Admin' or 'accountance'
  const role = getCookie('role');
  if (!canAccessAccounting(role)) {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tình trạng lò gạch</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Theo dõi số lượng gòng gạch theo thời gian</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm sm:text-base"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">Thêm dữ liệu</span>
          <span className="sm:hidden">Thêm</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border border-gray-200 bg-white p-1.5 rounded-2xl shadow-sm gap-2 w-full sm:w-fit">
        <button
          onClick={() => setActiveTab('Ra')}
          className={`flex-1 sm:flex-none py-2.5 px-6 font-black text-sm sm:text-base rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'Ra'
            ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-100'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
          <span>Lò gạch ra</span>
        </button>
        <button
          onClick={() => setActiveTab('Vô')}
          className={`flex-1 sm:flex-none py-2.5 px-6 font-black text-sm sm:text-base rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'Vô'
            ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-100'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
          <span>Lò gạch vô</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
        <h2 className="text-base sm:text-lg font-semibold mb-4">Bộ lọc</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {/* Filter Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại lọc</label>
            <Select
              classNames={{
                control: ({ isFocused }) =>
                  `border rounded-md ${isFocused
                    ? 'border-orange-500 ring-1 ring-orange-500'
                    : 'border-gray-300'
                  }`,
              }} options={typeOptions}
              value={typeOptions.find(o => o.value === filter.type) || null}
              onChange={(option) =>
                setFilter({
                  ...filter,
                  type: option?.value as FilterOptions['type'],
                })
              }
            />
          </div>

          {/* Day Filter */}
          {filter.type === 'day' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chọn ngày</label>
              <input
                type="date"
                value={filter.date || ''}
                onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          )}

          {/* Month Filter */}
          {filter.type === 'month' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tháng</label>
                <select
                  value={filter.month || ''}
                  onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Chọn tháng</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Tháng {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Năm</label>
                <select
                  value={filter.year || ''}
                  onChange={(e) => setFilter({ ...filter, year: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Chọn năm</option>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </>
          )}

          {/* Year Filter */}
          {filter.type === 'year' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Năm</label>
              <select
                value={filter.year || ''}
                onChange={(e) => setFilter({ ...filter, year: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Chọn năm</option>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Date Range Filter */}
          {filter.type === 'range' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
                <input
                  type="date"
                  value={filter.startDate || ''}
                  onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
                <input
                  type="date"
                  value={filter.endDate || ''}
                  onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tổng số gòng</p>
              <p className="text-2xl font-semibold text-gray-900">{getTotalQuantity().toLocaleString('en-US')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Trung bình</p>
              <p className="text-2xl font-semibold text-gray-900">{getAverageQuantity().toLocaleString('en-US')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Số lần ghi nhận</p>
              <p className="text-2xl font-semibold text-gray-900">{statuses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            Dữ liệu tình trạng lò gạch {activeTab === 'Ra' ? '— Tổ Ra (Xuất)' : '— Tổ Vô (Vào)'}
          </h2>
        </div>

        {/* Column Chart */}
        {!loading && !error && chartData.length > 0 && (
          <div className="px-6 py-6 bg-gray-50/50 border-b">
            <Chart data={chartData} />
          </div>
        )}

        <div className="p-4">
          <DataTable
            data={statuses}
            isLoading={loading}
            columns={[
              {
                key: 'stt',
                header: 'STT',
                className: 'w-16 text-gray-500 font-mono',
                render: (_, index) => <span>{index + 1}</span>
              },
              {
                key: 'dateTime',
                header: 'Thời gian',
                className: 'font-medium text-gray-900',
                render: (s) => <span>{formatDateTime(s.dateTime)}</span>
              },
              {
                key: 'packageQuantity',
                header: 'Số lượng gòng',
                headerClassName: 'text-right',
                className: 'text-right font-black text-orange-600 text-lg',
                render: (s) => <span>{s.packageQuantity.toLocaleString('en-US')}</span>
              }
            ]}
            emptyMessage="Không có dữ liệu tình trạng lò gạch trong khoảng thời gian này"
          />
        </div>
      </div>

      {/* Device Activity Chart */}
      <div className="bg-white/30 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-white/50 bg-white/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Biểu đồ hoạt động của thiết bị
            </h2>
            <p className="text-sm text-gray-500">Tần suất tín hiệu IoT nhận được theo giờ trong ngày</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Chọn ngày:</label>
            <input
              type="date"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
        </div>
        <div className="p-6">
          {activityLoading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (() => {
            const timestamps = activityData?.timestamps || [];
            const hourMap: Record<number, number> = {};
            for (let i = 0; i < 24; i++) hourMap[i] = 0;

            timestamps.forEach(ts => {
              const hour = new Date(ts).getHours();
              hourMap[hour]++;
            });

            const chartItems: ChartDatum[] = Object.entries(hourMap)
              .map(([hour, count]) => ({
                label: `${hour.padStart(2, '0')}:00`,
                value: count
              }));

            if (timestamps.length === 0) {
              return (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="font-medium">Chưa có dữ liệu hoạt động cho ngày này</p>
                </div>
              );
            }

            return <Chart data={chartItems} />;
          })()}
        </div>
      </div>

      <AddStatusModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        newStatus={newStatus}
        error={error}
        onStatusChange={(field, value) => setNewStatus(prev => ({ ...prev, [field]: value }))}
        onAdd={addNewStatus}
      />
    </div>
  );
}

const typeOptions = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'day', label: 'Theo ngày' },
  { value: 'month', label: 'Theo tháng' },
  { value: 'year', label: 'Theo năm' },
  { value: 'range', label: 'Khoảng thời gian' },
];



