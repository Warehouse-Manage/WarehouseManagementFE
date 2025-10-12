'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Helper function to get cookie value
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

// Kiểu dữ liệu cho chi tiết theo tháng
type MonthlyData = {
  month: string;
  year: number;
  amount: number;
  requestCount: number;
};

type RequestDetail = {
  id: number;
  requesterId: number;
  requesterName: string;
  department: string;
  status: string;
  totalPrice: number;
  requestDate: string;
  createdDate: string;
  items: Array<{
    id: number;
    name: string;
    type: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

export default function MonthlyDetailsPage() {
  const router = useRouter();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [requestDetails, setRequestDetails] = useState<RequestDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Authentication check
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
      return;
    }
    
    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/statistics/monthly-spending`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        
        const data: MonthlyData[] = await response.json();
        setMonthlyData(data);
        
      } catch (e) {
        console.error('Lỗi tải dữ liệu tháng:', e);
        setError('Không thể tải dữ liệu tháng.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMonthlyData();
  }, []);

  const fetchRequestDetails = async (year: number, month: string) => {
    try {
      setDetailsLoading(true);
      setSelectedMonth(`${year}-${month}`);
      
        // Lấy yêu cầu đã duyệt cho tháng cụ thể
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/materialrequests?status=approved&year=${year}&month=${month}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      
      const data: RequestDetail[] = await response.json();
      setRequestDetails(data);
      
    } catch (e) {
      console.error('Lỗi tải chi tiết yêu cầu:', e);
      setError('Không thể tải chi tiết yêu cầu.');
    } finally {
      setDetailsLoading(false);
    }
  };

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

  const getMonthName = (month: string) => {
    const months = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    const monthNum = parseInt(month) - 1;
    return months[monthNum] || month;
  };

  // Hàm chuyển trạng thái sang tiếng Việt
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Đã duyệt';
      case 'pending':
        return 'Chờ duyệt';
      case 'rejected':
        return 'Đã từ chối';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu tháng...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lỗi tải dữ liệu</h2>
          <p className="text-gray-600">{error}</p>
          <Link 
            href="/statistics" 
            className="mt-4 inline-block bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
          >
            Quay lại
          </Link>
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
    <div className="space-y-6 p-6">
      {/* Tiêu đề */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chi tiết yêu cầu theo tháng</h1>
          <p className="text-gray-600 mt-1">Xem danh sách các tháng có yêu cầu được phê duyệt</p>
        </div>
        
        <Link 
          href="/statistics" 
          className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Quay lại
        </Link>
      </div>

      {/* Danh sách tháng */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {monthlyData.length > 0 ? (
          monthlyData.map((month, index) => (
            <div 
              key={index} 
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => fetchRequestDetails(month.year, month.month)}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {getMonthName(month.month)} {month.year}
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Số yêu cầu:</span>
                    <span className="font-semibold text-blue-600">{month.requestCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Tổng chi tiêu:</span>
                    <span 
                      className="font-semibold text-orange-600 cursor-help" 
                      title={formatCurrencyFull(month.amount)}
                    >
                      {formatCurrency(month.amount)}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    Nhấn để xem chi tiết
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có dữ liệu</h3>
            <p className="text-gray-500">Chưa có tháng nào có yêu cầu được phê duyệt.</p>
          </div>
        )}
      </div>

      {/* Modal chi tiết yêu cầu */}
      {selectedMonth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Chi tiết yêu cầu - {getMonthName(selectedMonth.split('-')[1])} {selectedMonth.split('-')[0]}
                </h2>
                <button
                  onClick={() => {
                    setSelectedMonth(null);
                    setRequestDetails([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {detailsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Đang tải chi tiết...</p>
                </div>
              ) : requestDetails.length > 0 ? (
                <div className="space-y-4">
                  {requestDetails.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">Yêu cầu #{request.id}</h4>
                          <p className="text-sm text-gray-500">
                            Người yêu cầu: {request.requesterName} | Phòng ban: {request.department}
                          </p>
                          <p className="text-sm text-gray-500">
                            Tạo: {new Date(request.createdDate).toLocaleDateString('vi-VN')} | 
                            Yêu cầu: {new Date(request.requestDate).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600">
                            {formatCurrency(request.totalPrice)}
                          </p>
                          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            {getStatusLabel(request.status)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-100 pt-3">
                        <h5 className="font-medium text-gray-700 mb-2">Danh sách vật tư:</h5>
                        <div className="space-y-2">
                          {request.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex justify-between items-center text-sm">
                              <div>
                                <span className="text-gray-700">{item.name}</span>
                                <span className="ml-2 text-xs text-gray-500">({item.type})</span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="text-gray-500">{item.quantity} đơn vị</span>
                                <span className="text-gray-500">{formatCurrency(item.unitPrice)}/đơn vị</span>
                                <span className="font-semibold text-gray-900">{formatCurrency(item.totalPrice)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📋</div>
                  <p className="text-gray-500">Không có yêu cầu nào trong tháng này.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
