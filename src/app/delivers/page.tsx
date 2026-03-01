'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';
import { financeApi } from '@/api';
import { Deliver } from '@/types';
import { DataTable, FormField } from '@/components/shared';
import { CreditCard, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DeliverFormModal from './modal/DeliverFormModal';
import PaymentModal from './modal/PaymentModal';

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
  const [editingDeliver, setEditingDeliver] = useState<Deliver | null>(null);

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

  const handleOpenCreate = () => {
    setEditingDeliver(null);
    setName('');
    setPhoneNumber('');
    setPlateNumber('');
    setError(null);
    setShowForm(true);
  };

  const handleEditDeliver = (deliver: Deliver) => {
    setEditingDeliver(deliver);
    setName(deliver.name);
    setPhoneNumber(deliver.phoneNumber);
    setPlateNumber(deliver.plateNumber);
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
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
      if (editingDeliver) {
        await financeApi.updateDeliver(editingDeliver.id, {
          name,
          phoneNumber,
          plateNumber,
          createdUserId: Number(userId)
        });
        toast.success('Cập nhật người giao hàng thành công');
      } else {
        await financeApi.createDeliver({
          name,
          phoneNumber,
          plateNumber,
          createdUserId: Number(userId)
        });
        toast.success('Thêm người giao hàng mới thành công');
      }
      setName('');
      setPhoneNumber('');
      setPlateNumber('');
      setShowForm(false);
      setEditingDeliver(null);
      await loadDelivers();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || (editingDeliver ? 'Không thể cập nhật người giao hàng' : 'Không thể tạo người giao hàng'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDeliver = async (deliver: Deliver) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa người giao hàng "${deliver.name}"?`)) {
      return;
    }
    try {
      setLoading(true);
      await financeApi.deleteDeliver(deliver.id);
      toast.success('Xóa người giao hàng thành công');
      await loadDelivers();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Không thể xóa người giao hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Người giao hàng</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Quản lý đội ngũ vận chuyển và chi phí giao hàng</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm cursor-pointer"
        >
          <span className="hidden sm:inline">+ Thêm người giao hàng mới</span>
          <span className="sm:hidden">+ Thêm</span>
        </button>
      </div>

      <DeliverFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingDeliver(null);
        }}
        editingDeliver={editingDeliver}
        deliverFormFields={deliverFormFields}
        formValues={{ name, phoneNumber, plateNumber }}
        error={error}
        submitting={submitting}
        onFieldChange={(field, value) => {
          if (field === 'name') setName(value as string);
          if (field === 'phoneNumber') setPhoneNumber(value as string);
          if (field === 'plateNumber') setPlateNumber(value as string);
        }}
        onSubmit={handleSubmit}
      />

      <div className="border rounded-2xl p-3 sm:p-5 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">Danh sách người giao</h2>
          <button
            onClick={loadDelivers}
            disabled={loading}
            className="p-2 sm:px-4 sm:py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Làm mới</span>
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
          ]}
          actions={(d) => {
            const remaining = (d.amountMoneyTotal || 0) - (d.amountMoneyPaid || 0);
            const actions: Array<{
              label: string;
              icon: React.ReactElement;
              onClick: () => void;
              variant?: 'default' | 'danger';
            }> = [
              {
                label: 'Sửa',
                icon: <Edit className="h-4 w-4" />,
                onClick: () => handleEditDeliver(d)
              },
              {
                label: 'Xóa',
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => handleDeleteDeliver(d),
                variant: 'danger' as const
              }
            ];
            if (remaining > 0) {
              actions.unshift({
                label: 'Thanh toán',
                icon: <CreditCard className="h-4 w-4" />,
                onClick: () => handleOpenPaymentModal(d),
                variant: 'default' as const
              });
            }
            return actions;
          }}
          emptyMessage="Chưa có dữ liệu người giao hàng"
        />
      </div>

      <PaymentModal
        isOpen={showPaymentModal && !!selectedDeliver}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedDeliver(null);
          setPaymentAmount(0);
          setMonthlyTotal(null);
        }}
        selectedDeliver={selectedDeliver}
        paymentAmount={paymentAmount}
        selectedMonth={selectedMonth}
        monthlyTotal={monthlyTotal}
        loadingMonthlyTotal={loadingMonthlyTotal}
        error={error}
        submitting={submitting}
        onPaymentAmountChange={setPaymentAmount}
        onMonthChange={(month) => {
          setSelectedMonth(month);
          if (month && selectedDeliver) {
            loadMonthlyTotal(selectedDeliver.id, month);
          }
        }}
        onLoadMonthlyTotal={loadMonthlyTotal}
        onSubmit={handlePayment}
      />
    </div>
  );
}


