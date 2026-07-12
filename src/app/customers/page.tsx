'use client';

import { canAccessAccounting } from '@/lib/roles';
import { useEffect, useMemo, useState } from 'react';
import { getCookie } from '@/lib/ultis';
import { financeApi } from '@/api';
import { Customer } from '@/types';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';
import { Edit, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/useConfirm';

// Type Customer moved to @/types/finance.ts

export default function CustomersPage() {
  const { confirm, ConfirmDialog } = useConfirm();
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
  const [draftFilterName, setDraftFilterName] = useState('');
  const [draftFilterPhone, setDraftFilterPhone] = useState('');
  const [draftFilterAddress, setDraftFilterAddress] = useState('');
  const [draftFilterDebt, setDraftFilterDebt] = useState<'all' | 'receivable' | 'payable' | 'zero'>('all');
  const [filterName, setFilterName] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterAddress, setFilterAddress] = useState('');
  const [filterDebt, setFilterDebt] = useState<'all' | 'receivable' | 'payable' | 'zero'>('all');

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
        const uncached = customers.filter((c) => customerDebts[c.id] === undefined);
        if (uncached.length === 0) return;

        const results = await Promise.all(
          uncached.map(async (c) => {
            const balance = await financeApi.getCustomerDebtSummary(c.id);
            return { id: c.id, balance: balance ?? 0 };
          })
        );

        const updates: Record<number, number> = {};
        for (const r of results) {
          updates[r.id] = r.balance;
        }
        setCustomerDebts((prev) => ({ ...prev, ...updates }));
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
        await financeApi.updateCustomer(editingCustomer.id, {
          name,
          address,
          phoneNumber
        });
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
    const confirmed = await confirm({
      message: `Bạn có chắc chắn muốn xóa khách hàng "${customer.name}"?`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      await financeApi.deleteCustomer(customer.id);
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

  const totalDebtReceivable = useMemo(
    () =>
      Object.values(customerDebts).reduce((sum, debt) => {
        if (debt > 0) return sum + debt;
        return sum;
      }, 0),
    [customerDebts]
  );

  const totalDebtPayable = useMemo(
    () =>
      Object.values(customerDebts).reduce((sum, debt) => {
        if (debt < 0) return sum + Math.abs(debt);
        return sum;
      }, 0),
    [customerDebts]
  );

  const netDebtBalance = totalDebtReceivable - totalDebtPayable;

  const filteredCustomers = useMemo(() => {
    const name = filterName.trim().toLowerCase();
    const phone = filterPhone.trim().toLowerCase();
    const address = filterAddress.trim().toLowerCase();

    return customers.filter((c) => {
      if (name && !c.name.toLowerCase().includes(name)) return false;
      if (phone && !c.phoneNumber.toLowerCase().includes(phone)) return false;
      if (address && !c.address.toLowerCase().includes(address)) return false;

      if (filterDebt !== 'all') {
        const debt = customerDebts[c.id];
        if (debt === undefined) return false;
        if (filterDebt === 'receivable' && debt <= 0) return false;
        if (filterDebt === 'payable' && debt >= 0) return false;
        if (filterDebt === 'zero' && debt !== 0) return false;
      }
      return true;
    });
  }, [customers, filterName, filterPhone, filterAddress, filterDebt, customerDebts]);

  // Show blank page if role is not 'Admin' or 'accountance'
  if (!canAccessAccounting(role)) {
    return null;
  }

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
        <div className="border border-green-100 rounded-2xl p-4 bg-green-50 shadow-sm shadow-green-100">
          <div className="text-[10px] font-black uppercase text-green-600 tracking-wider mb-1">Nợ phải thu</div>
          <div className="text-2xl font-black text-green-700">{totalDebtReceivable.toLocaleString('en-US')}đ</div>
        </div>
        <div className="border border-red-100 rounded-2xl p-4 bg-red-50 shadow-sm shadow-red-100">
          <div className="text-[10px] font-black uppercase text-red-600 tracking-wider mb-1">Nợ phải trả</div>
          <div className="text-2xl font-black text-red-700">{totalDebtPayable.toLocaleString('en-US')}đ</div>
        </div>
        <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50 shadow-sm shadow-blue-100">
          <div className="text-[10px] font-black uppercase text-blue-600 tracking-wider mb-1">Tổng cộng</div>
          <div className={`text-2xl font-black ${netDebtBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {netDebtBalance.toLocaleString('en-US')}đ
          </div>
        </div>
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
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
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
            className="p-2 sm:px-4 sm:py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
        <DataTable
          enableFilter
          filterContent={
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Tên khách hàng</label>
                <input
                  value={draftFilterName}
                  onChange={(e) => setDraftFilterName(e.target.value)}
                  placeholder="Nhập tên..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Số điện thoại</label>
                <input
                  value={draftFilterPhone}
                  onChange={(e) => setDraftFilterPhone(e.target.value)}
                  placeholder="Nhập SĐT..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Địa chỉ</label>
                <input
                  value={draftFilterAddress}
                  onChange={(e) => setDraftFilterAddress(e.target.value)}
                  placeholder="Nhập địa chỉ..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Công nợ</label>
                <select
                  value={draftFilterDebt}
                  onChange={(e) => setDraftFilterDebt(e.target.value as typeof draftFilterDebt)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                >
                  <option value="all">Tất cả</option>
                  <option value="receivable">Đang nợ (phải thu)</option>
                  <option value="payable">Trả thừa (phải trả)</option>
                  <option value="zero">Đã thanh toán đủ</option>
                </select>
              </div>

              <div className="md:col-span-2 xl:col-span-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setFilterName(draftFilterName); setFilterPhone(draftFilterPhone); setFilterAddress(draftFilterAddress); setFilterDebt(draftFilterDebt); }}
                  className="px-4 py-2 text-sm font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700"
                >
                  Lọc
                </button>
                <button
                  type="button"
                  onClick={() => { setDraftFilterName(''); setDraftFilterPhone(''); setDraftFilterAddress(''); setDraftFilterDebt('all'); setFilterName(''); setFilterPhone(''); setFilterAddress(''); setFilterDebt('all'); }}
                  className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Xóa lọc
                </button>
              </div>
            </div>
          }
          data={filteredCustomers}
          isLoading={loading}
          columns={[
            {
              key: 'name',
              header: 'Tên khách hàng',
              isMain: true,
              render: (c) => (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 leading-tight">{c.name}</p>
                    <p className="text-[11px] text-gray-400 font-medium">{c.phoneNumber}</p>
                  </div>
                </div>
              )
            },
            {
              key: 'address',
              header: 'Địa chỉ',
              className: 'text-gray-600 max-w-[200px]',
              mobileHidden: true,
              render: (c) => (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{c.address}</span>
                </div>
              )
            },
            {
              key: 'debt',
              header: 'Công nợ',
              headerClassName: 'text-right',
              className: 'text-right',
              render: (c) => {
                const debt = customerDebts[c.id];
                if (debt === undefined) {
                  return <span className="text-gray-400 text-xs">Đang tải...</span>;
                }
                if (debt > 0) {
                  return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-700 font-black text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {debt.toLocaleString('en-US')}đ
                    </span>
                  );
                }
                if (debt < 0) {
                  return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 font-black text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {Math.abs(debt).toLocaleString('en-US')}đ
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-500 font-semibold text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    Đã thanh toán
                  </span>
                );
              }
            },
            {
              key: 'phoneNumber',
              header: 'Số điện thoại',
              className: 'font-mono text-gray-900',
              render: (c) => (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{c.phoneNumber}</span>
                </div>
              )
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
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
              disabled={downloadingDebt}
            >
              Hủy
            </button>
            <button
              onClick={handleDownloadDebt}
              disabled={downloadingDebt}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
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
      {ConfirmDialog}
    </div>
  );
}




