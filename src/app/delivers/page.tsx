'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';
import { financeApi } from '@/api';
import { Deliver } from '@/types';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';

// Type Deliver moved to @/types/finance.ts

export default function DeliversPage() {
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  const [delivers, setDelivers] = useState<Deliver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const deliverFormFields: FormField[] = [
    { name: 'name', label: 'Tên người giao hàng', type: 'text', required: true, placeholder: 'Nhập tên...' },
    { name: 'phoneNumber', label: 'Số điện thoại', type: 'text', required: true, placeholder: 'Nhập số điện thoại...' },
    { name: 'plateNumber', label: 'Biển số xe', type: 'text', required: true, placeholder: 'Nhập biển số xe...' },
  ];

  const [selectedDeliver, setSelectedDeliver] = useState<Deliver | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>(0);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [monthlyTotal, setMonthlyTotal] = useState<number | null>(null);
  const [loadingMonthlyTotal, setLoadingMonthlyTotal] = useState(false);

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  // apiHost removed, handled in financeApi

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

  const loadDelivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeApi.getDelivers();
      setDelivers(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách người giao hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDelivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!selectedMonth) {
      setSelectedMonth(getCurrentMonth());
    }
  }, [selectedMonth]);

  // Show blank page if role is not 'Admin' or 'accountance'
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  const loadMonthlyTotal = async (deliverId: number, month: string) => {
    setLoadingMonthlyTotal(true);
    try {
      const data = await financeApi.getDeliverMonthlyTotal(deliverId, month);
      setMonthlyTotal(data.totalCost);
    } catch (err: unknown) {
      console.error('Failed to load monthly total:', err);
      setMonthlyTotal(null);
    } finally {
      setLoadingMonthlyTotal(false);
    }
  };

  const handleOpenPaymentModal = (deliver: Deliver) => {
    setSelectedDeliver(deliver);
    setPaymentAmount(0);
    setShowPaymentModal(true);
    if (selectedMonth) {
      loadMonthlyTotal(deliver.id, selectedMonth);
    }
  };

  const handlePayment = async () => {
    if (!selectedDeliver) return;
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    const userId = getCookie('userId');
    if (!userId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await financeApi.payDeliver(selectedDeliver.id, {
        amount: Number(paymentAmount),
        createdUserId: Number(userId),
      });
      setShowPaymentModal(false);
      setSelectedDeliver(null);
      setPaymentAmount(0);
      await loadDelivers();
      if (selectedMonth && selectedDeliver) {
        await loadMonthlyTotal(selectedDeliver.id, selectedMonth);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !phoneNumber || !plateNumber) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    const userId = getCookie('userId');
    if (!userId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await financeApi.createDeliver({
        name,
        phoneNumber,
        plateNumber,
        createdUserId: Number(userId)
      });
      setName('');
      setPhoneNumber('');
      setPlateNumber('');
      setShowForm(false);
      await loadDelivers();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo người giao hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Người giao hàng</h1>
          <p className="text-sm text-gray-600 mt-1">Quản lý đội ngũ vận chuyển và chi phí giao hàng</p>
        </div>
        <button
          onClick={() => {
            setName('');
            setPhoneNumber('');
            setPlateNumber('');
            setError(null);
            setShowForm(true);
          }}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 transition-colors shadow-sm"
        >
          + Thêm người giao hàng
        </button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Thêm người giao hàng mới"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
          <DynamicForm
            fields={deliverFormFields}
            values={{ name, phoneNumber, plateNumber }}
            onChange={(field, value) => {
              if (field === 'name') setName(value as string);
              if (field === 'phoneNumber') setPhoneNumber(value as string);
              if (field === 'plateNumber') setPlateNumber(value as string);
            }}
            columns={1}
          />
        </div>
      </Modal>

      <div className="border rounded-lg p-4 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Danh sách người giao hàng</h2>
          <button
            onClick={loadDelivers}
            className="px-3 py-1 border rounded text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Làm mới
          </button>
        </div>
        <DataTable
          data={delivers}
          isLoading={loading}
          columns={[
            {
              key: 'info',
              header: 'Thông tin người giao',
              className: 'min-w-[200px]',
              render: (d) => (
                <div>
                  <div className="font-bold text-gray-900">{d.name}</div>
                  <div className="text-xs text-gray-500">{d.phoneNumber} - <span className="font-semibold">{d.plateNumber}</span></div>
                </div>
              )
            },
            {
              key: 'amountMoneyTotal',
              header: 'Tổng chi phí',
              headerClassName: 'text-right',
              className: 'text-right font-semibold text-gray-900',
              render: (d) => <span>{(d.amountMoneyTotal || 0).toLocaleString('vi-VN')}đ</span>
            },
            {
              key: 'amountMoneyPaid',
              header: 'Đã thanh toán',
              headerClassName: 'text-right',
              className: 'text-right text-green-600 font-medium',
              render: (d) => <span>{(d.amountMoneyPaid || 0).toLocaleString('vi-VN')}đ</span>
            },
            {
              key: 'remaining',
              header: 'Còn lại',
              headerClassName: 'text-right',
              className: 'text-right text-orange-600 font-black text-lg',
              render: (d) => {
                const remaining = (d.amountMoneyTotal || 0) - (d.amountMoneyPaid || 0);
                return <span>{remaining.toLocaleString('vi-VN')}đ</span>;
              }
            },
            {
              key: 'actions',
              header: 'Thao tác',
              headerClassName: 'text-center',
              className: 'text-center',
              render: (d) => {
                const remaining = (d.amountMoneyTotal || 0) - (d.amountMoneyPaid || 0);
                return (
                  <button
                    onClick={() => handleOpenPaymentModal(d)}
                    className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 transition-colors disabled:opacity-30 disabled:grayscale"
                    disabled={remaining <= 0}
                  >
                    Thanh toán
                  </button>
                );
              }
            }
          ]}
          emptyMessage="Chưa có dữ liệu người giao hàng"
        />
      </div>

      <Modal
        isOpen={showPaymentModal && !!selectedDeliver}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedDeliver(null);
          setPaymentAmount(0);
          setMonthlyTotal(null);
        }}
        title={`Thanh toán - ${selectedDeliver?.name}`}
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setSelectedDeliver(null);
                setPaymentAmount(0);
                setMonthlyTotal(null);
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handlePayment}
              disabled={submitting || !paymentAmount || Number(paymentAmount) <= 0}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}

          {selectedDeliver && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
                  <div className="text-[10px] uppercase font-black text-gray-400 mb-1">Tổng chi phí</div>
                  <div className="text-sm font-bold text-gray-900">{(selectedDeliver.amountMoneyTotal || 0).toLocaleString('vi-VN')}đ</div>
                </div>
                <div className="bg-green-50 p-3 rounded-xl border border-green-100 shadow-sm">
                  <div className="text-[10px] uppercase font-black text-green-400 mb-1">Đã trả</div>
                  <div className="text-sm font-bold text-green-600">{(selectedDeliver.amountMoneyPaid || 0).toLocaleString('vi-VN')}đ</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 shadow-sm">
                  <div className="text-[10px] uppercase font-black text-orange-400 mb-1">Còn nợ</div>
                  <div className="text-sm font-black text-orange-600">
                    {((selectedDeliver.amountMoneyTotal || 0) - (selectedDeliver.amountMoneyPaid || 0)).toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-blue-600">Chi phí theo tháng</h4>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      if (e.target.value) {
                        loadMonthlyTotal(selectedDeliver.id, e.target.value);
                      }
                    }}
                    className="rounded-lg border border-blue-200 px-2 py-1 text-xs focus:ring-2 focus:ring-blue-100 outline-none shadow-sm"
                  />
                </div>
                {loadingMonthlyTotal ? (
                  <div className="text-xs text-blue-400 italic">Đang tính toán...</div>
                ) : monthlyTotal !== null ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-blue-700">Chi phí tháng {selectedMonth}:</span>
                    <span className="text-lg font-black text-blue-800">{monthlyTotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                ) : (
                  <div className="text-xs text-blue-400">Chọn tháng để xem chi tiết chi phí phát sinh</div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-500">Số tiền muốn thanh toán</label>
                <div className="relative">
                  <input
                    type="number"
                    className="w-full rounded-xl border border-gray-200 p-4 text-2xl font-black text-orange-600 placeholder:text-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all"
                    placeholder="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    min="0"
                    max={(selectedDeliver.amountMoneyTotal || 0) - (selectedDeliver.amountMoneyPaid || 0)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">VNĐ</div>
                </div>
                <div className="text-[10px] font-bold text-gray-400 text-right uppercase italic">
                  Tối đa: {((selectedDeliver.amountMoneyTotal || 0) - (selectedDeliver.amountMoneyPaid || 0)).toLocaleString('vi-VN')}đ
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}


