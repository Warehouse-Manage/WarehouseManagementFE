'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';
import { teamPaymentApi, inventoryApi } from '@/api';
import { TeamPayment, TeamPaymentSettings, PackageProduct } from '@/types';
import { DataTable } from '@/components/shared';
import AddTeamPaymentModal from './modal/AddTeamPaymentModal';
import SettingsModal from './modal/SettingsModal';

export default function TeamPaymentPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<TeamPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<TeamPaymentSettings | null>(null);
  const [packageProducts, setPackageProducts] = useState<PackageProduct[]>([]);

  const [canFetch, setCanFetch] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const role = getCookie('role');
    const userId = getCookie('userId');
    const userName = getCookie('userName');

    if (!userId || !userName) {
      router.push('/login');
      return;
    }

    if (role !== 'Admin' && role !== 'accountance') {
      setCanFetch(false);
      setIsCheckingAuth(false);
      return;
    }
    setCanFetch(true);
    setIsCheckingAuth(false);
  }, [router]);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await teamPaymentApi.getTeamPayments();
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await teamPaymentApi.getTeamPaymentSettings();
      setSettings(data);
    } catch (err) {
      console.error('Lỗi khi lấy cài đặt:', err);
    }
  }, []);

  const fetchPackageProducts = useCallback(async () => {
    try {
      const data = await inventoryApi.getPackageProducts();
      setPackageProducts(data);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách kiện sản phẩm:', err);
    }
  }, []);

  useEffect(() => {
    if (!canFetch) return;
    fetchPayments();
    fetchSettings();
    fetchPackageProducts();
  }, [fetchPayments, fetchSettings, fetchPackageProducts, canFetch]);

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' đ';
  };

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

  const role = getCookie('role');
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Thanh toán tổ ra</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Quản lý thanh toán tiền làm gòng cho tổ ra</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Cài đặt</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="hidden sm:inline">Thêm thanh toán</span>
            <span className="sm:hidden">Thêm</span>
          </button>
        </div>
      </div>

      {/* Settings Info Card */}
      {settings && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 sm:p-6 rounded-lg border border-orange-200">
          <h2 className="text-base sm:text-lg font-semibold mb-3 text-orange-900">Cài đặt hiện tại</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-gray-600">Tên tổ trưởng</p>
              <p className="text-base font-bold text-gray-900">{settings.teamLeaderName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Giá trên 1 gòng</p>
              <p className="text-base font-bold text-orange-600">{formatCurrency(settings.pricePerPackage)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Lịch sử thanh toán</h2>
        </div>

        <div className="p-4">
          <DataTable
            data={payments}
            isLoading={loading}
            columns={[
              {
                key: 'stt',
                header: 'STT',
                className: 'w-16 text-gray-500 font-mono',
                render: (_, index) => <span>{index + 1}</span>
              },
              {
                key: 'dateCreated',
                header: 'Thời gian',
                className: 'font-medium text-gray-900',
                render: (p) => <span>{formatDateTime(p.dateCreated)}</span>
              },
              {
                key: 'teamLeaderName',
                header: 'Tổ trưởng',
                className: 'font-medium text-gray-900'
              },
              {
                key: 'previousDayRemaining',
                header: 'Gòng thừa hôm qua',
                headerClassName: 'text-right',
                className: 'text-right font-semibold text-blue-600',
                render: (p) => <span>{p.previousDayRemaining}</span>
              },
              {
                key: 'newPackagesFromA',
                header: 'Gòng mới nhập',
                headerClassName: 'text-right',
                className: 'text-right font-semibold text-green-600',
                render: (p) => <span>{p.newPackagesFromA}</span>
              },
              {
                key: 'todayRemaining',
                header: 'Gòng thừa hôm nay',
                headerClassName: 'text-right',
                className: 'text-right font-semibold text-purple-600',
                render: (p) => <span>{p.todayRemaining}</span>
              },
              {
                key: 'brokenPackages',
                header: 'Kiện sổ',
                headerClassName: 'text-right',
                className: 'text-right',
                render: (p) => (
                  <div className="text-sm">
                    {p.brokenPackages.map((bp, idx) => (
                      <div key={idx}>
                        {bp.quantity} ({bp.type})
                      </div>
                    ))}
                  </div>
                )
              }
            ]}
            emptyMessage="Chưa có dữ liệu thanh toán"
          />
        </div>
      </div>

      <AddTeamPaymentModal
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          fetchPayments();
        }}
        settings={settings}
        packageProducts={packageProducts}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          fetchSettings();
        }}
        currentSettings={settings}
      />
    </div>
  );
}
