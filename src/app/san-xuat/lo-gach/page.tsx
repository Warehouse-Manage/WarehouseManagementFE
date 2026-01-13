'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';
import { productionApi } from '@/api';
import { BrickYardStatus, BrickYardAggregated } from '@/types';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';

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
  const [newStatus, setNewStatus] = useState({
    packageQuantity: 0,
    dateTime: new Date().toISOString().slice(0, 16)
  });

  const brickYardFormFields: FormField[] = [
    { name: 'packageQuantity', label: 'Số lượng gói', type: 'number', required: true, placeholder: 'Nhập số lượng...' },
    { name: 'dateTime', label: 'Thời gian', type: 'datetime-local', required: true },
  ];
  const [canFetch, setCanFetch] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [chartData, setChartData] = useState<ChartDatum[]>([]);

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
    if (role !== 'Admin' && role !== 'accountance') {
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
      let apiType: 'hour' | 'date' | 'month' | undefined;

      switch (filter.type) {
        case 'today':
          const today = new Date().toISOString().split('T')[0];
          params.append('date', today);
          apiType = 'hour';
          break;
        case 'day':
          if (filter.date) {
            params.append('date', filter.date);
            apiType = 'hour';
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
          label: new Date(item.dateTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          value: item.packageQuantity
        }));
        setChartData(chart);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const addNewStatus = async () => {
    try {
      await productionApi.createBrickYardStatus({
        packageQuantity: newStatus.packageQuantity,
        dateTime: new Date(newStatus.dateTime).toISOString()
      });

      setShowAddForm(false);
      setNewStatus({
        packageQuantity: 0,
        dateTime: new Date().toISOString().slice(0, 16)
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

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
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
    const barWidth = 28;
    const gap = 16;
    const height = 220;
    const width = data.length * (barWidth + gap) + gap;

    return (
      <div className="w-full overflow-x-auto">
        <svg width={width} height={height + 40} className="text-gray-700">
          {data.map((d, i) => {
            const x = gap + i * (barWidth + gap);
            const barHeight = Math.round((d.value / maxValue) * height);
            const y = height - barHeight;
            return (
              <g key={i}>
                <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} className="fill-orange-500" />
                <text x={x + barWidth / 2} y={height + 16} textAnchor="middle" fontSize={10} className="fill-current">
                  {d.label}
                </text>
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={10} className="fill-current">
                  {d.value}
                </text>
              </g>
            );
          })}
          {/* y-axis line */}
          <line x1={gap / 2} y1={0} x2={gap / 2} y2={height} className="stroke-gray-300" />
          {/* x-axis line */}
          <line x1={0} y1={height} x2={width} y2={height} className="stroke-gray-300" />
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
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tình trạng lò gạch</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Theo dõi số lượng gói gạch theo thời gian</p>
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

      {/* Filter Controls */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
        <h2 className="text-base sm:text-lg font-semibold mb-4">Bộ lọc</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {/* Filter Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại lọc</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value as FilterOptions['type'] })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="today">Hôm nay</option>
              <option value="day">Theo ngày</option>
              <option value="month">Theo tháng</option>
              <option value="year">Theo năm</option>
              <option value="range">Khoảng thời gian</option>
            </select>
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
              <p className="text-sm font-medium text-gray-600">Tổng số gói</p>
              <p className="text-2xl font-semibold text-gray-900">{getTotalQuantity().toLocaleString()}</p>
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
              <p className="text-2xl font-semibold text-gray-900">{getAverageQuantity().toLocaleString()}</p>
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
      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Dữ liệu tình trạng lò gạch</h2>
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
                header: 'Số lượng gói',
                headerClassName: 'text-right',
                className: 'text-right font-black text-orange-600 text-lg',
                render: (s) => <span>{s.packageQuantity.toLocaleString()}</span>
              }
            ]}
            emptyMessage="Không có dữ liệu tình trạng lò gạch trong khoảng thời gian này"
          />
        </div>
      </div>

      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Thêm dữ liệu tình trạng lò gạch"
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={addNewStatus}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 transition-colors"
            >
              Thêm dữ liệu
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
          <DynamicForm
            fields={brickYardFormFields}
            values={newStatus}
            onChange={(field, value) => setNewStatus(prev => ({ ...prev, [field]: value }))}
            columns={1}
          />
        </div>
      </Modal>
    </div>
  );
}
