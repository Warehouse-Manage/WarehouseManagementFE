'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';
import { statisticsApi } from '@/api/statisticsApi';
import { StatisticsData } from '@/types';
import { DataTable } from '@/components/shared';
import { TrendingUp, PieChart, BarChart3, Package, Calendar, DollarSign, Activity, ChevronRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

// Client-side guard: redirect role 'user' away from this page


export default function ThongKePage() {
  const router = useRouter();
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'tuần' | 'tháng' | 'quý' | 'năm'>('tháng');
  const [canFetch, setCanFetch] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const role = getCookie('role');
    const userId = getCookie('userId');
    const userName = getCookie('userName');

    // Redirect to login if userId or userName is missing
    if (!userId || !userName) {
      router.push('/login');
      return;
    }

    // Redirect users with 'user' or 'approver' role away from this page
    if (role === 'user' || role === 'approver') {
      window.location.replace('/');
      setLoading(false);
      return;
    }
    setCanFetch(true);
    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    if (!canFetch) return;
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch statistics data using consolidated API
        const [summary, monthlySpending, departmentSpending, topMaterials] = await Promise.all([
          statisticsApi.getSummary(),
          statisticsApi.getMonthlySpending(),
          statisticsApi.getDepartmentSpending(),
          statisticsApi.getTopMaterials(10)
        ]);

        setStatistics({
          totalRequests: summary.totalRequests,
          approvedRequests: summary.approvedRequests,
          pendingRequests: summary.pendingRequests,
          rejectedRequests: summary.rejectedRequests,
          totalSpent: summary.totalSpent,
          averageRequestValue: summary.averageRequestValue,
          monthlySpending: monthlySpending.map((item) => ({
            month: `${item.year}-${item.month}`,
            amount: item.amount
          })),
          topMaterials: topMaterials.map((item) => ({
            name: item.materialName,
            quantity: item.totalQuantity,
            totalValue: item.totalValue
          })),
          departmentSpending: departmentSpending.map((item) => ({
            department: item.department,
            amount: item.amount,
            percentage: item.percentage
          }))
        });

      } catch (e) {
        console.error('Lỗi tải thống kê:', e);
        setError('Không thể tải dữ liệu thống kê.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [selectedPeriod, canFetch]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return (amount / 1000000000).toFixed(1) + ' tỷ VNĐ';
    } else if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + ' triệu VNĐ';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + ' nghìn VNĐ';
    } else {
      return amount.toLocaleString('vi-VN') + ' VNĐ';
    }
  };

  const formatCurrencyFull = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' VNĐ';
  };

  const formatPercentage = (value: number) => {
    return value.toFixed(1) + '%';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-orange-600 border-t-transparent shadow-lg shadow-orange-100"></div>
        <p className="mt-6 text-sm font-black text-gray-400 uppercase tracking-widest animate-pulse">Đang tải dữ liệu thống kê...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="h-20 w-20 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-6 shadow-xl shadow-red-50">
          <AlertTriangle className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Lỗi tải dữ liệu</h2>
        <p className="text-gray-500 font-medium max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-3 bg-red-600 text-white font-black rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95 cursor-pointer"
        >
          Thử lại ngay
        </button>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center text-gray-500">
        <div className="h-24 w-24 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
          <BarChart3 className="h-12 w-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Không có dữ liệu</h2>
        <p className="font-medium">Chưa có dữ liệu thống kê nào để hiển thị trong kỳ này.</p>
      </div>
    );
  }

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

  const stats = statistics;

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Bộ lọc */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-50/50">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 ring-4 ring-orange-50">
            <TrendingUp className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Thống Kê Tài Chính
            </h1>
            <p className="hidden sm:block text-gray-500 font-medium">
              Tổng quan chi tiêu và hiệu quả quản lý vật tư
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100 w-full lg:w-auto">
          <span className="hidden sm:block text-xs font-black text-gray-400 uppercase tracking-widest pl-3">
            Khoảng thời gian:
          </span>

          <div className="flex gap-1 flex-1 lg:flex-none justify-center">
            {['tuần', 'tháng', 'quý', 'năm'].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p as 'tuần' | 'tháng' | 'quý' | 'năm')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${selectedPeriod === p
                  ? 'bg-white text-orange-600 shadow-md ring-1 ring-orange-100'
                  : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Thẻ tóm tắt */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Tổng yêu cầu', value: stats.totalRequests, icon: BarChart3, color: 'blue' },
          { label: 'Đã duyệt', value: stats.approvedRequests, icon: TrendingUp, color: 'green' },
          { label: 'Chờ duyệt', value: stats.pendingRequests, icon: Activity, color: 'yellow' },
          { label: 'Tổng chi tiêu', value: formatCurrency(stats.totalSpent), icon: DollarSign, color: 'orange', title: formatCurrencyFull(stats.totalSpent) }
        ].map((item, idx) => (
          <div key={idx} className="group overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-50/50 hover:shadow-2xl hover:shadow-gray-100/50 transition-all duration-300 active:scale-[0.98]">
            <div className="flex items-center gap-5">
              <div className={`h-14 w-14 rounded-2xl bg-${item.color}-100 flex items-center justify-center text-${item.color}-600 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500`}>
                <item.icon className="h-7 w-7" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
                <p
                  className={`text-2xl font-black text-gray-900 tracking-tight ${item.title ? 'cursor-help' : ''}`}
                  title={item.title}
                >
                  {item.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chi tiêu theo tháng */}
        <div className="rounded-3xl border border-gray-100 bg-white overflow-hidden shadow-xl shadow-gray-50/50">
          <div className="bg-gray-50/50 px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Chi tiêu theo tháng</h3>
            <div className="h-8 w-8 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="p-4">
            <DataTable
              data={stats.monthlySpending}
              emptyMessage="Chưa có dữ liệu chi tiêu"
              columns={[
                {
                  key: 'month',
                  header: 'Tháng',
                  className: 'font-bold text-gray-900',
                  render: (it: unknown) => (it as { month: string }).month
                },
                {
                  key: 'chart',
                  header: 'Trực quan',
                  render: (it: unknown) => {
                    const item = it as { amount: number };
                    const max = Math.max(...stats.monthlySpending.map(m => m.amount));
                    const percent = (item.amount / (max || 1)) * 100;
                    return (
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%` }} />
                      </div>
                    );
                  }
                },
                {
                  key: 'amount',
                  header: 'Số tiền',
                  className: 'text-right font-black text-gray-700',
                  render: (it: unknown) => formatCurrency((it as { amount: number }).amount)
                }
              ]}
            />
          </div>
        </div>

        {/* Chi tiêu theo phòng ban */}
        <div className="rounded-3xl border border-gray-100 bg-white overflow-hidden shadow-xl shadow-gray-50/50">
          <div className="bg-gray-50/50 px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Chi tiêu theo phòng ban</h3>
            <div className="h-8 w-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <PieChart className="h-4 w-4" />
            </div>
          </div>
          <div className="p-4">
            <DataTable
              data={stats.departmentSpending}
              emptyMessage="Chưa có dữ liệu phòng ban"
              columns={[
                {
                  key: 'department',
                  header: 'Phòng ban',
                  className: 'font-bold text-gray-900',
                  render: (it: unknown) => {
                    const dept = it as { department: string; percentage: number };
                    return (
                      <div className="flex flex-col">
                        <span>{dept.department}</span>
                        <span className="text-[10px] font-black text-blue-500 uppercase">{formatPercentage(dept.percentage)}</span>
                      </div>
                    );
                  }
                },
                {
                  key: 'chart',
                  header: 'Phân bổ',
                  render: (it: unknown) => {
                    const dept = it as { percentage: number };
                    return (
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${dept.percentage}%` }} />
                      </div>
                    );
                  }
                },
                {
                  key: 'amount',
                  header: 'Số tiền',
                  className: 'text-right font-black text-gray-700 w-32',
                  render: (it: unknown) => formatCurrency((it as { amount: number }).amount)
                }
              ]}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top vật tư - New section */}
        <div className="lg:col-span-2 rounded-3xl border border-gray-100 bg-white overflow-hidden shadow-xl shadow-gray-50/50">
          <div className="bg-gray-50/50 px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Top vật tư tiêu thụ</h3>
            <div className="h-8 w-8 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="p-4">
            <DataTable
              data={stats.topMaterials}
              emptyMessage="Chưa có thông tin vật tư"
              columns={[
                {
                  key: 'name',
                  header: 'Vật tư',
                  className: 'font-bold text-gray-900',
                  render: (it: unknown) => (it as { name: string }).name
                },
                {
                  key: 'quantity',
                  header: 'Số lượng',
                  className: 'text-center font-black text-orange-600',
                  render: (it: unknown) => (it as { quantity: number }).quantity.toLocaleString('vi-VN')
                },
                {
                  key: 'totalValue',
                  header: 'Tổng trị giá',
                  className: 'text-right font-black text-green-600',
                  render: (it: unknown) => formatCurrency((it as { totalValue: number }).totalValue)
                }
              ]}
            />
          </div>
        </div>

        {/* Dashboard Actions & Summary */}
        <div className="space-y-6">
          {/* Average Value */}
          <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-orange-500 to-orange-600 p-8 text-white shadow-xl shadow-orange-200 ring-4 ring-orange-50 relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 h-32 w-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            <Activity className="h-8 w-8 mb-4 opacity-50" />
            <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Giá trị trung bình</p>
            <h4 className="text-3xl font-black mb-1">{formatCurrency(stats.averageRequestValue)}</h4>
            <p className="text-xs font-medium opacity-60">Trung bình mỗi yêu cầu được phê duyệt</p>
          </div>

          {/* Quick Links */}
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-50/50">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Lối tắt báo cáo</h3>
            <Link
              href="/statistics/monthly-details"
              className="group flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all font-bold text-gray-700 hover:text-blue-700 mb-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <span>Chi tiết theo tháng</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </Link>

            <Link
              href="/vat-tu/yeu-cau"
              className="group flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all font-bold text-gray-700 hover:text-orange-700"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Package className="h-5 w-5 text-orange-500" />
                </div>
                <span>Tạo yêu cầu mới</span>
              </div>
              <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
