'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';
import { statisticsApi } from '@/api/statisticsApi';
import { materialApi } from '@/api/materialApi';
import { MonthlyData, RequestDetail, ApiRequest } from '@/types';
import { Modal, DataTable } from '@/components/shared';



export default function MonthlyDetailsPage() {
  const router = useRouter();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [requestDetails, setRequestDetails] = useState<RequestDetail[]>([]);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  interface RequestItemMaterial {
    id: number;
    name: string;
    type: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }

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

        const data = await statisticsApi.getMonthlySpending();
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
      const data = await materialApi.getMaterialRequests({
        status: 'approved',
        year,
        month
      });

      // Map ApiRequest to RequestDetail for UI
      const mapped: RequestDetail[] = (data || []).map((rb: ApiRequest) => ({
        id: rb.id,
        requesterId: rb.requesterId,
        requesterName: rb.requesterName || 'Không rõ',
        department: rb.department || '',
        status: rb.status,
        totalPrice: rb.totalPrice || 0,
        requestDate: rb.requestDate,
        createdDate: rb.createdDate,
        items: (rb.items || []).map(it => ({
          id: it.id,
          name: it.name,
          type: it.type || '',
          quantity: it.quantity,
          unitPrice: it.unitPrice || 0,
          totalPrice: it.totalPrice || 0
        }))
      }));
      setRequestDetails(mapped);

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
      return amount.toLocaleString('en-US') + ' VNĐ';
    }
  };

  const formatCurrencyFull = (amount: number) => {
    return amount.toLocaleString('en-US') + ' VNĐ';
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Tiêu đề */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Chi tiết yêu cầu theo tháng</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Xem danh sách các tháng có yêu cầu được phê duyệt</p>
        </div>

        <Link
          href="/statistics"
          className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm sm:text-base"
        >
          Quay lại
        </Link>
      </div>

      {/* Danh sách tháng */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {monthlyData.length > 0 ? (
          monthlyData.map((month, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
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
      <Modal
        isOpen={!!selectedMonth}
        onClose={() => {
          setSelectedMonth(null);
          setRequestDetails([]);
        }}
        title={`Chi tiết yêu cầu - ${selectedMonth ? getMonthName(selectedMonth.split('-')[1]) + ' ' + selectedMonth.split('-')[0] : ''}`}
        size="4xl"
        isLoading={detailsLoading}
      >
        {requestDetails.length > 0 ? (
          <div className="space-y-4">
            {requestDetails.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                  <div>
                    <h4 className="font-black text-gray-900 text-lg">Yêu cầu #{request.id}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-semibold text-gray-700">Người yêu cầu:</span> {request.requesterName} | <span className="font-semibold text-gray-700">Phòng ban:</span> {request.department}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Tạo: {new Date(request.createdDate).toLocaleDateString('vi-VN')} |
                      Yêu cầu: {new Date(request.requestDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-xl font-black text-orange-600">
                      {formatCurrencyFull(request.totalPrice)}
                    </p>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-black text-green-800 uppercase tracking-tighter">
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <h5 className="font-black text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase">
                    <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Danh sách vật tư
                  </h5>
                  <DataTable
                    data={request.items}
                    columns={[
                      {
                        key: 'name',
                        header: 'Tên vật tư',
                        render: (it: unknown) => {
                          const item = it as RequestItemMaterial;
                          return (
                            <div>
                              <span className="font-bold text-gray-900">{item.name}</span>
                              <span className="ml-2 text-xs text-gray-500 italic">({item.type})</span>
                            </div>
                          );
                        }
                      },
                      {
                        key: 'quantity',
                        header: 'Số lượng',
                        className: 'w-24 text-center',
                        render: (it: unknown) => <span className="font-bold text-gray-700">{(it as RequestItemMaterial).quantity.toLocaleString('en-US')}</span>
                      },
                      {
                        key: 'unitPrice',
                        header: 'Đơn giá',
                        className: 'w-32 text-right',
                        render: (it: unknown) => <span className="text-gray-600">{(it as RequestItemMaterial).unitPrice.toLocaleString('en-US')} đ</span>
                      },
                      {
                        key: 'totalPrice',
                        header: 'Thành tiền',
                        className: 'w-32 text-right',
                        render: (it: unknown) => <span className="font-black text-green-600">{(it as RequestItemMaterial).totalPrice.toLocaleString('en-US')} đ</span>
                      }
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <div className="text-gray-300 text-6xl mb-4">📋</div>
            <p className="text-gray-500 font-medium">Không có yêu cầu nào trong tháng này.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
