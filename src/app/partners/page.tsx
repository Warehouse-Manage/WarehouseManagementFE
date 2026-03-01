'use client';

import { useEffect, useState } from 'react';
import { getCookie, printHtmlContent } from '@/lib/ultis';
import { Partner } from '@/types';
import { partnerApi } from '@/api';
import { DataTable, FormField } from '@/components/shared';
import { CreditCard, Edit, Trash2 } from 'lucide-react';
import PartnerFormModal from './modal/PartnerFormModal';
import PaymentModal from './modal/PaymentModal';
import DeleteConfirmModal from './modal/DeleteConfirmModal';

export default function DoiTacPage() {
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const partnerFormFields: FormField[] = [
    { name: 'name', label: 'Tên đối tác', type: 'text', required: true, placeholder: 'Nhập tên...' },
    { name: 'phoneNumber', label: 'Số điện thoại', type: 'text', required: true, placeholder: 'Nhập số điện thoại...' },
  ];

  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [search, setSearch] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>(0);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [monthlyTotal, setMonthlyTotal] = useState<number | null>(null);
  const [loadingMonthlyTotal, setLoadingMonthlyTotal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

  const loadPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await partnerApi.getPartners(search ? { search } : undefined);
      setPartners(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách đối tác');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (search === '') {
      loadPartners();
      return;
    }
    const timer = setTimeout(() => {
      loadPartners();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadMonthlyTotal = async (_partnerId: number, _month: string) => {
    setLoadingMonthlyTotal(true);
    try {
      // TODO: Implement API endpoint for monthly total if needed
      // For now, this is optional functionality
      setMonthlyTotal(null);
    } catch (err: unknown) {
      console.error('Failed to load monthly total:', err);
      setMonthlyTotal(null);
    } finally {
      setLoadingMonthlyTotal(false);
    }
  };

  const handleOpenPaymentModal = (partner: Partner) => {
    setSelectedPartner(partner);
    setPaymentAmount(0);
    setShowPaymentModal(true);
    if (selectedMonth) {
      loadMonthlyTotal(partner.id, selectedMonth);
    }
  };

  const handlePayment = async () => {
    if (!selectedPartner) return;
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
      const result = await partnerApi.payPartner(selectedPartner.id, {
        amount: Number(paymentAmount),
        createdUserId: Number(userId)
      });
      
      // Update local state với dữ liệu từ server
      setPartners(prev => prev.map(p => 
        p.id === result.partner.id ? result.partner : p
      ));
      
      // Hiển thị và in phiếu chi
      if (result.fund && result.fund.id) {
        try {
          const receiptHtml = await partnerApi.getPartnerReceipt(selectedPartner.id, result.fund.id);
          await printHtmlContent(receiptHtml);
        } catch (printErr) {
          console.error('Không thể in phiếu chi:', printErr);
          // Không throw error để không làm gián đoạn flow thanh toán
        }
      }
      
      setShowPaymentModal(false);
      setSelectedPartner(null);
      setPaymentAmount(0);
      await loadPartners();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !phoneNumber) {
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
      await partnerApi.createPartner({
        name,
        phoneNumber,
        createdUserId: Number(userId)
      });
      
      setName('');
      setPhoneNumber('');
      setShowForm(false);
      await loadPartners();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo đối tác');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setName(partner.name);
    setPhoneNumber(partner.phoneNumber);
    setShowForm(true);
    setError(null);
  };

  const handleUpdate = async () => {
    if (!editingPartner || !name || !phoneNumber) {
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
      await partnerApi.updatePartner(editingPartner.id, {
        name,
        phoneNumber,
        createdUserId: Number(userId)
      });
      
      setName('');
      setPhoneNumber('');
      setEditingPartner(null);
      setShowForm(false);
      await loadPartners();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể cập nhật đối tác');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setSubmitting(true);
    setError(null);
    try {
      await partnerApi.deletePartner(id);
      setShowDeleteConfirm(null);
      await loadPartners();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể xóa đối tác');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Đối tác</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Quản lý đối tác và chi phí hợp tác</p>
        </div>
        <button
          onClick={() => {
            setName('');
            setPhoneNumber('');
            setEditingPartner(null);
            setError(null);
            setShowForm(true);
          }}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm cursor-pointer"
        >
          <span className="hidden sm:inline">+ Thêm đối tác mới</span>
          <span className="sm:hidden">+ Thêm</span>
        </button>
      </div>

      <PartnerFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingPartner(null);
          setName('');
          setPhoneNumber('');
        }}
        editingPartner={editingPartner}
        partnerFormFields={partnerFormFields}
        formValues={{ name, phoneNumber }}
        error={error}
        submitting={submitting}
        onFieldChange={(field, value) => {
          if (field === 'name') setName(value as string);
          if (field === 'phoneNumber') setPhoneNumber(value as string);
        }}
        onSubmit={editingPartner ? handleUpdate : handleCreate}
      />

      <div className="border rounded-2xl p-3 sm:p-5 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">Danh sách đối tác</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Tìm kiếm đối tác..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 sm:flex-none sm:w-64 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
            />
            <button
              onClick={loadPartners}
              disabled={loading}
              className="p-2 sm:px-4 sm:py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        </div>
        <DataTable
          data={partners}
          isLoading={loading}
          columns={[
            {
              key: 'info',
              header: 'Thông tin đối tác',
              className: 'min-w-[200px]',
              render: (d) => (
                <div>
                  <div className="font-bold text-gray-900">{d.name}</div>
                  <div className="text-xs text-gray-500">{d.phoneNumber}</div>
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
            return [
              {
                label: 'Thanh toán',
                icon: <CreditCard className="h-4 w-4" />,
                onClick: () => handleOpenPaymentModal(d),
                variant: 'default' as const
              },
              {
                label: 'Sửa',
                icon: <Edit className="h-4 w-4" />,
                onClick: () => handleEdit(d),
                variant: 'default' as const
              },
              {
                label: 'Xóa',
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => setShowDeleteConfirm(d.id),
                variant: 'danger' as const
              }
            ];
          }}
          emptyMessage="Chưa có dữ liệu đối tác"
        />
      </div>

      <PaymentModal
        isOpen={showPaymentModal && !!selectedPartner}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPartner(null);
          setPaymentAmount(0);
          setMonthlyTotal(null);
        }}
        selectedPartner={selectedPartner}
        paymentAmount={paymentAmount}
        selectedMonth={selectedMonth}
        monthlyTotal={monthlyTotal}
        loadingMonthlyTotal={loadingMonthlyTotal}
        error={error}
        submitting={submitting}
        onPaymentAmountChange={setPaymentAmount}
        onMonthChange={(month) => {
          setSelectedMonth(month);
          if (month && selectedPartner) {
            loadMonthlyTotal(selectedPartner.id, month);
          }
        }}
        onLoadMonthlyTotal={loadMonthlyTotal}
        onSubmit={handlePayment}
      />

      <DeleteConfirmModal
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        partnerName={partners.find((p) => p.id === showDeleteConfirm)?.name || ''}
        error={error}
        submitting={submitting}
        onConfirm={() => showDeleteConfirm !== null && handleDelete(showDeleteConfirm)}
      />
    </div>
  );
}
