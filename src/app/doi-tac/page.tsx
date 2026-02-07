'use client';

import { useEffect, useState } from 'react';
import { getCookie, printHtmlContent, formatNumberInput, parseNumberInput } from '@/lib/ultis';
import { Partner } from '@/types';
import { partnerApi } from '@/api';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';
import { CreditCard, Edit, Trash2, Printer } from 'lucide-react';

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

  const loadMonthlyTotal = async (partnerId: number, month: string) => {
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

  const handlePrintReceipt = async (partnerId: number, fundId: number) => {
    try {
      const html = await partnerApi.getPartnerReceipt(partnerId, fundId);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể in phiếu chi');
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

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingPartner(null);
          setName('');
          setPhoneNumber('');
        }}
        title={editingPartner ? 'Sửa đối tác' : 'Thêm đối tác mới'}
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingPartner(null);
                setName('');
                setPhoneNumber('');
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={editingPartner ? handleUpdate : handleCreate}
              disabled={submitting}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang lưu...' : editingPartner ? 'Cập nhật' : 'Lưu'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
          <DynamicForm
            fields={partnerFormFields}
            values={{ name, phoneNumber }}
            onChange={(field, value) => {
              if (field === 'name') setName(value as string);
              if (field === 'phoneNumber') setPhoneNumber(value as string);
            }}
            columns={1}
          />
        </div>
      </Modal>

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
            const remaining = (d.amountMoneyTotal || 0) - (d.amountMoneyPaid || 0);
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

      <Modal
        isOpen={showPaymentModal && !!selectedPartner}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedPartner(null);
          setPaymentAmount(0);
          setMonthlyTotal(null);
        }}
        title={`Thanh toán - ${selectedPartner?.name}`}
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setSelectedPartner(null);
                setPaymentAmount(0);
                setMonthlyTotal(null);
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handlePayment}
              disabled={submitting || !paymentAmount || Number(paymentAmount) <= 0}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}

          {selectedPartner && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
                  <div className="text-[10px] uppercase font-black text-gray-400 mb-1">Tổng chi phí</div>
                  <div className="text-sm font-bold text-gray-900">{(selectedPartner.amountMoneyTotal || 0).toLocaleString('vi-VN')}đ</div>
                </div>
                <div className="bg-green-50 p-3 rounded-xl border border-green-100 shadow-sm">
                  <div className="text-[10px] uppercase font-black text-green-400 mb-1">Đã trả</div>
                  <div className="text-sm font-bold text-green-600">{(selectedPartner.amountMoneyPaid || 0).toLocaleString('vi-VN')}đ</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 shadow-sm">
                  <div className="text-[10px] uppercase font-black text-orange-400 mb-1">Còn nợ</div>
                  <div className="text-sm font-black text-orange-600">
                    {((selectedPartner.amountMoneyTotal || 0) - (selectedPartner.amountMoneyPaid || 0)).toLocaleString('vi-VN')}đ
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
                        loadMonthlyTotal(selectedPartner.id, e.target.value);
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
                    type="text"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-gray-200 p-4 text-2xl font-black text-orange-600 placeholder:text-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-50 outline-none transition-all text-right"
                    placeholder="0"
                    value={formatNumberInput(paymentAmount)}
                    onChange={(e) => setPaymentAmount(parseNumberInput(e.target.value))}
                    min={0}
                    max={(selectedPartner.amountMoneyTotal || 0) - (selectedPartner.amountMoneyPaid || 0)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">VNĐ</div>
                </div>
                <div className="text-[10px] font-bold text-gray-400 text-right uppercase italic">
                  Tối đa: {((selectedPartner.amountMoneyTotal || 0) - (selectedPartner.amountMoneyPaid || 0)).toLocaleString('vi-VN')}đ
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        title="Xác nhận xóa"
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={() => showDeleteConfirm !== null && handleDelete(showDeleteConfirm)}
              disabled={submitting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang xóa...' : 'Xóa'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
          <p className="text-sm text-gray-700">
            Bạn có chắc chắn muốn xóa đối tác{' '}
            <span className="font-bold text-gray-900">
              {partners.find((p) => p.id === showDeleteConfirm)?.name}
            </span>
            ? Hành động này không thể hoàn tác.
          </p>
        </div>
      </Modal>
    </div>
  );
}
