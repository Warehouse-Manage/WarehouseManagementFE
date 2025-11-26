'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';

// Client-side guard: redirect role 'user' away from this page

// Types for statistics data
type StatisticsData = {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  totalSpent: number;
  averageRequestValue: number;
  monthlySpending: Array<{
    month: string;
    amount: number;
  }>;
  topMaterials: Array<{
    name: string;
    quantity: number;
    totalValue: number;
  }>;
  departmentSpending: Array<{
    department: string;
    amount: number;
    percentage: number;
  }>;
};

// API Response Types
type MonthlySpendingResponse = {
  month: string;
  year: number;
  amount: number;
  requestCount: number;
};

type TopMaterialResponse = {
  materialId: number;
  materialName: string;
  materialType: string;
  totalQuantity: number;
  totalValue: number;
  requestCount: number;
};

type DepartmentSpendingResponse = {
  department: string;
  amount: number;
  requestCount: number;
  percentage: number;
};

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
        
        // Fetch statistics summary
        const summaryResponse = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/statistics/summary`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!summaryResponse.ok) {
          throw new Error(`HTTP ${summaryResponse.status} ${summaryResponse.statusText}`);
        }
        
        const summary = await summaryResponse.json();
        
        // Fetch monthly spending
        const monthlyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/statistics/monthly-spending`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        const monthlySpending: MonthlySpendingResponse[] = monthlyResponse.ok ? await monthlyResponse.json() : [];
        
        // Fetch department spending
        const deptResponse = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/statistics/department-spending`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        const departmentSpending: DepartmentSpendingResponse[] = deptResponse.ok ? await deptResponse.json() : [];
        
        // Fetch top materials
        const materialsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/statistics/top-materials?limit=10`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        const topMaterials: TopMaterialResponse[] = materialsResponse.ok ? await materialsResponse.json() : [];
        
        setStatistics({
          totalRequests: summary.totalRequests,
          approvedRequests: summary.approvedRequests,
          pendingRequests: summary.pendingRequests,
          rejectedRequests: summary.rejectedRequests,
          totalSpent: summary.totalSpent,
          averageRequestValue: summary.averageRequestValue,
          monthlySpending: monthlySpending.map((item: MonthlySpendingResponse) => ({
            month: `${item.year}-${item.month}`,
            amount: item.amount
          })),
          topMaterials: topMaterials.map((item: TopMaterialResponse) => ({
            name: item.materialName,
            quantity: item.totalQuantity,
            totalValue: item.totalValue
          })),
          departmentSpending: departmentSpending.map((item: DepartmentSpendingResponse) => ({
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu thống kê...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Lỗi tải dữ liệu</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Không có dữ liệu</h2>
          <p className="text-gray-600">Chưa có dữ liệu thống kê để hiển thị.</p>
        </div>
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Thống kê tài chính</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Tổng quan chi tiêu và quản lý tài chính</p>
        </div>
        
        {/* Bộ chọn khoảng thời gian */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <label className="text-sm font-bold text-gray-700">Khoảng thời gian:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'tuần' | 'tháng' | 'quý' | 'năm')}
            className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
          >
            <option value="tuần">Tuần này</option>
            <option value="tháng">Tháng này</option>
            <option value="quý">Quý này</option>
            <option value="năm">Năm này</option>
          </select>
        </div>
      </div>

      {/* Thẻ tóm tắt */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tổng yêu cầu */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-bold text-gray-500">Tổng yêu cầu</p>
              <p className="text-2xl font-black text-gray-900">{statistics.totalRequests}</p>
            </div>
          </div>
        </div>

        {/* Yêu cầu đã duyệt */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-bold text-gray-500">Đã duyệt</p>
              <p className="text-2xl font-black text-green-600">{statistics.approvedRequests}</p>
            </div>
          </div>
        </div>

        {/* Yêu cầu chờ duyệt */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-bold text-gray-500">Chờ duyệt</p>
              <p className="text-2xl font-black text-yellow-600">{statistics.pendingRequests}</p>
            </div>
          </div>
        </div>

        {/* Tổng chi tiêu */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-bold text-gray-500">Tổng chi tiêu</p>
              <p 
                className="text-xl font-black text-orange-600 break-words cursor-help" 
                title={formatCurrencyFull(statistics.totalSpent)}
              >
                {formatCurrency(statistics.totalSpent)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Biểu đồ và thống kê chi tiết */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Biểu đồ chi tiêu theo tháng */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-black text-gray-900 mb-4">Chi tiêu theo tháng</h3>
          <div className="space-y-3">
            {statistics.monthlySpending.length > 0 ? (
              statistics.monthlySpending.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">{item.month}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (item.amount / Math.max(...statistics.monthlySpending.map(m => m.amount))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-28 text-right">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Chưa có dữ liệu chi tiêu</p>
            )}
          </div>
        </div>

        {/* Chi tiêu theo phòng ban */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiêu theo phòng ban</h3>
          <div className="space-y-3">
            {statistics.departmentSpending.length > 0 ? (
              statistics.departmentSpending.map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700">{dept.department}</span>
                    <span className="ml-2 text-xs text-gray-500">({formatPercentage(dept.percentage)})</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${dept.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-24 text-right">
                      {formatCurrency(dept.amount)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Chưa có dữ liệu phòng ban</p>
            )}
          </div>
        </div>
      </div>

      {/* Vật tư và thống kê bổ sung */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Nút chi tiết theo tháng */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Chi tiết yêu cầu theo tháng</h3>
          <div className="text-center">
            <button
              onClick={() => window.location.href = '/statistics/monthly-details'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Xem chi tiết theo tháng</span>
            </button>
            <p className="text-sm text-gray-500 mt-2">Xem danh sách các tháng có yêu cầu được phê duyệt</p>
          </div>
        </div>

        {/* Giá trị trung bình yêu cầu */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Giá trị trung bình</h3>
          <div className="text-center">
            <div 
              className="text-3xl font-bold text-green-600 mb-2 cursor-help" 
              title={formatCurrencyFull(statistics.averageRequestValue)}
            >
              {formatCurrency(statistics.averageRequestValue)}
            </div>
            <p className="text-sm text-gray-500">Giá trị trung bình mỗi yêu cầu</p>
          </div>
        </div>

        {/* Phân bố trạng thái yêu cầu */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Phân bố trạng thái</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Đã duyệt</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${(statistics.approvedRequests / statistics.totalRequests) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-900">{statistics.approvedRequests}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Chờ duyệt</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${(statistics.pendingRequests / statistics.totalRequests) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-900">{statistics.pendingRequests}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Từ chối</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: `${(statistics.rejectedRequests / statistics.totalRequests) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-gray-900">{statistics.rejectedRequests}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

