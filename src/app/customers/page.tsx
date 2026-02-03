'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';
import { financeApi } from '@/api';
import { Customer } from '@/types';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';
import { Edit, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';

// Type Customer moved to @/types/finance.ts

export default function CustomersPage() {
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [selectedCustomerForDebt, setSelectedCustomerForDebt] = useState<Customer | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [downloadingDebt, setDownloadingDebt] = useState(false);
  const [customerDebts, setCustomerDebts] = useState<Record<number, number>>({});

  const customerFormFields: FormField[] = [
    { name: 'name', label: 'Tên khách hàng', type: 'text', required: true, placeholder: 'Nhập tên khách hàng...' },
    { name: 'address', label: 'Địa chỉ', type: 'text', required: true, placeholder: 'Nhập địa chỉ...' },
    { name: 'phoneNumber', label: 'Số điện thoại', type: 'text', required: true, placeholder: 'Nhập số điện thoại...' },
  ];

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  // apiHost removed, handled in financeApi

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeApi.getCustomers();
      setCustomers(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách khách hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCustomerDebts = async () => {
      if (!customers.length) return;

      try {
        const updates: Record<number, number> = {};
        for (const c of customers) {
          if (customerDebts[c.id] !== undefined) continue;
          const balance = await financeApi.getCustomerDebtSummary(c.id);
          updates[c.id] = balance ?? 0;
        }
        if (Object.keys(updates).length > 0) {
          setCustomerDebts((prev) => ({ ...prev, ...updates }));
        }
      } catch (err) {
        console.error('Failed to load customer debts', err);
      }
    };

    fetchCustomerDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers]);

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show blank page if role is not 'Admin' or 'accountance'
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setName('');
    setAddress('');
    setPhoneNumber('');
    setError(null);
    setShowForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setAddress(customer.address);
    setPhoneNumber(customer.phoneNumber);
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!name || !address || !phoneNumber) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (editingCustomer) {
        toast.success('Cập nhật khách hàng thành công');
      } else {
        const userId = getCookie('userId');
        if (!userId) {
          setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
          return;
        }
        await financeApi.createCustomer({
          name,
          address,
          phoneNumber,
          createdUserId: Number(userId)
        });
        toast.success('Thêm khách hàng mới thành công');
      }
      setName('');
      setAddress('');
      setPhoneNumber('');
      setShowForm(false);
      setEditingCustomer(null);
      await loadCustomers();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể lưu khách hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa khách hàng "${customer.name}"?`)) {
      return;
    }
    try {
      setLoading(true);
      toast.success('Xóa khách hàng thành công');
      await loadCustomers();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Không thể xóa khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomerDebt = (customer: Customer) => {
    setSelectedCustomerForDebt(customer);
    setStartDate('');
    setEndDate('');
    setError(null);
    setShowDebtModal(true);
  };

  const handleDownloadDebt = async () => {
    if (!selectedCustomerForDebt) return;
    
    setDownloadingDebt(true);
    setError(null);
    try {
      const blob = await financeApi.getCustomerDebtTemplate(
        selectedCustomerForDebt.id,
        startDate || undefined,
        endDate || undefined
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      link.download = `CongNo_Template_${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Đã tải file công nợ thành công');
      setShowDebtModal(false);
      setSelectedCustomerForDebt(null);
      setStartDate('');
      setEndDate('');
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải file công nợ');
      console.error(err);
    } finally {
      setDownloadingDebt(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Khách hàng</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Quản lý danh sách khách hàng và thông tin liên hệ</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm"
        >
          <span className="hidden sm:inline">+ Thêm khách hàng mới</span>
          <span className="sm:hidden">+ Thêm</span>
        </button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingCustomer ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'}
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
              onClick={handleSubmit}
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
            fields={customerFormFields}
            values={{ name, address, phoneNumber }}
            onChange={(field, value) => {
              if (field === 'name') setName(value as string);
              if (field === 'address') setAddress(value as string);
              if (field === 'phoneNumber') setPhoneNumber(value as string);
            }}
            columns={1}
          />
        </div>
      </Modal>

      <div className="border rounded-2xl p-3 sm:p-5 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">Danh sách khách hàng</h2>
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="p-2 sm:px-4 sm:py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-all flex items-center gap-2"
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
        <DataTable
          data={customers}
          isLoading={loading}
          columns={[
            {
              key: 'name',
              header: 'Tên khách hàng',
              className: 'font-bold text-gray-900',
              render: (c) => <span>{c.name}</span>
            },
            {
              key: 'address',
              header: 'Địa chỉ',
              className: 'text-gray-600',
              render: (c) => <span>{c.address}</span>
            },
            {
              key: 'debt',
              header: 'Công nợ',
              className: 'font-semibold text-right text-gray-900',
              render: (c) => {
                const debt = customerDebts[c.id];
                if (debt === undefined) {
                  return <span className="text-gray-400 text-xs">Đang tải...</span>;
                }
                return <span>{debt.toLocaleString('vi-VN')}</span>;
              }
            },
            {
              key: 'phoneNumber',
              header: 'Số điện thoại',
              className: 'font-mono text-gray-900',
              render: (c) => <span>{c.phoneNumber}</span>
            }
          ]}
          actions={(c) => [
            {
              label: 'Sửa',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEditCustomer(c)
            },
            {
              label: 'Công nợ',
              icon: <Wallet className="h-4 w-4" />,
              onClick: () => handleViewCustomerDebt(c)
            },
            {
              label: 'Xóa',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDeleteCustomer(c),
              variant: 'danger'
            }
          ]}
          emptyMessage="Chưa có dữ liệu khách hàng"
        />
      </div>

      {/* Modal công nợ */}
      <Modal
        isOpen={showDebtModal && !!selectedCustomerForDebt}
        onClose={() => {
          setShowDebtModal(false);
          setSelectedCustomerForDebt(null);
          setStartDate('');
          setEndDate('');
          setError(null);
        }}
        title={`Công nợ - ${selectedCustomerForDebt?.name}`}
        size="md"
        footer={
          <>
            <button
              onClick={() => {
                setShowDebtModal(false);
                setSelectedCustomerForDebt(null);
                setStartDate('');
                setEndDate('');
                setError(null);
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={downloadingDebt}
            >
              Hủy
            </button>
            <button
              onClick={handleDownloadDebt}
              disabled={downloadingDebt}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors"
            >
              {downloadingDebt ? 'Đang tải...' : 'Tải file Excel'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                Từ ngày <span className="text-gray-400 font-normal normal-case">(tùy chọn)</span>
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">
                Đến ngày <span className="text-gray-400 font-normal normal-case">(tùy chọn)</span>
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
            
            <div className="text-xs text-gray-500 italic">
              <p>• Để trống cả 2 trường để lấy công nợ tất cả thời gian</p>
              <p>• Chỉ chọn &quot;Từ ngày&quot; để lấy từ ngày đó đến hiện tại</p>
              <p>• Chọn cả 2 để lấy công nợ trong khoảng thời gian</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}


