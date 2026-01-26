'use client';

import { useEffect, useState } from 'react';
import { getCookie, printHtmlContent } from '@/lib/ultis';
import { financeApi, workerApi, userApi } from '@/api';
import { Fund, Deliver, Worker, Customer, User } from '@/types';
import { toast } from 'sonner';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';
import { Printer, Edit, Trash2 } from 'lucide-react';
import Select from 'react-select';

// Type Fund moved to @/types/finance.ts

export default function FundsPage() {
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<'Thu' | 'Chi' | ''>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  const [objectId, setObjectId] = useState<number | ''>('');
  const [objectType, setObjectType] = useState('');
  const [objectName, setObjectName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  // apiHost removed, handled in API modules
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const fundFormFields: FormField[] = [
    {
      name: 'type',
      label: 'Loại',
      type: 'select',
      required: true,
      options: [
        { value: 'Thu', label: 'Thu' },
        { value: 'Chi', label: 'Chi' }
      ]
    },
    { name: 'amount', label: 'Số tiền', type: 'number', required: true, placeholder: 'Ví dụ: 1000000' },
    { name: 'description', label: 'Mô tả', type: 'text', required: true, placeholder: 'Lý do thu/chi...' },
    {
      name: 'category',
      label: 'Danh mục',
      type: 'select',
      options: type === 'Chi' ? [
        { value: 'Nguyên liệu', label: 'Nguyên liệu' },
        { value: 'Vật tư', label: 'Vật tư' },
        { value: 'Lương', label: 'Lương' },
        { value: 'Chi tiêu', label: 'Chi tiêu' },
        { value: 'Trả lãi ngân hàng', label: 'Trả lãi ngân hàng' },
        { value: 'Trả nợ', label: 'Trả nợ' },
      ] : type === 'Thu' ? [
        { value: 'Tiền bán gạch', label: 'Tiền bán gạch' },
        { value: 'Tiền vay ngân hàng', label: 'Tiền vay ngân hàng' },
        { value: 'Tiền đặt cọc', label: 'Tiền đặt cọc' },
      ] : []
    },
    {
      name: 'objectType',
      label: 'Đối tượng',
      type: 'select',
      options: type === 'Chi' ? [
        { value: 'Nhân viên', label: 'Nhân viên' },
        { value: 'Giám đốc', label: 'Giám đốc' },
        { value: 'Vật tư', label: 'Vật tư' },
        { value: 'Đối tác', label: 'Đối tác' },
        { value: 'Giao hàng', label: 'Giao hàng' },
      ] : type === 'Thu' ? [
        { value: 'Khách hàng', label: 'Khách hàng' },
        { value: 'Đối tác', label: 'Đối tác' },
      ] : []
    },
    { name: 'objectName', label: 'Tên người thu/nhận', type: 'text', placeholder: 'Người nhận hoặc người nộp...' },
  ];

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
  // formatNumber and parseNumber removed as unused

  const formatDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN');
  };

  // Load suggestions based on objectType
  const loadSuggestions = async (target: string) => {
    if (!target) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      let data: (Deliver | Worker | Customer | User)[] = [];
      switch (target) {
        case 'Giao hàng':
          data = await financeApi.getDelivers();
          break;
        case 'Nhân viên':
          data = await workerApi.getWorkers();
          break;
        case 'Khách hàng':
          data = await financeApi.getCustomers();
          break;
        case 'Vật tư':
          data = await userApi.getUsers({ role: 'approver' });
          break;
        default:
          setSuggestions([]);
          setLoadingSuggestions(false);
          return;
      }

      const mapped = data.map((item: Deliver | Worker | Customer | User) => {
        const id = item.id ?? 0;
        if (target === 'Giao hàng') {
          const deliver = item as Deliver;
          return { id, name: deliver.name || deliver.plateNumber || `Giao hàng #${id}` };
        }
        return { id, name: item.name || `${target} #${id}` };
      });
      setSuggestions(mapped);
    } catch (err) {
      console.error(err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const loadFunds = async (page: number = currentPage, size: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;

      const result = await financeApi.getFundsFilter(page, size, params);
      setFunds(result.data);
      setTotalCount(result.totalCount);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách sổ quỹ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadFunds(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  // Show blank page if role is not 'Admin' or 'accountance'
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  const resetForm = () => {
    setType('');
    setDescription('');
    setAmount('');
    setCategory('');
    setObjectId('');
    setObjectType('');
    setObjectName('');
    setEditingId(null);
    setError(null);
    setShowForm(false);
  };

  // Category options based on type
  // getCategoryOptions removed as its logic is now in fundFormFields

  // Object type options based on type
  // getObjectTypeOptions removed as its logic is now in fundFormFields

  const handlePrintRecord = async (id: number) => {
    try {
      const html = await financeApi.printFund(id);
      await printHtmlContent(html);
    } catch (err) {
      toast.error('Không thể tải bản in: ' + getErrorMessage(err));
    }
  };

  const handleCreate = async () => {
    if (!type || !description || amount === '' || Number(amount) <= 0) {
      setError('Vui lòng nhập đầy đủ thông tin và số tiền phải lớn hơn 0');
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
      const res = await financeApi.createFund({
        type,
        description,
        amount: Number(amount),
        category: category || '',
        objectId: objectId === '' ? null : Number(objectId),
        objectType: objectType || '',
        objectName: objectName || '',
        createdUserId: Number(userId),
      });

      if (res && res.id) {
        await handlePrintRecord(res.id);
      }

      resetForm();
      setShowForm(false);
      await loadFunds(currentPage);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo bản ghi sổ quỹ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!type || !description || amount === '' || Number(amount) <= 0) {
      setError('Vui lòng nhập đầy đủ thông tin và số tiền phải lớn hơn 0');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await financeApi.updateFund(editingId, {
        type,
        description,
        amount: Number(amount),
        category: category || '',
        objectId: objectId === '' ? null : Number(objectId),
        objectType: objectType || '',
        objectName: objectName || '',
      });
      resetForm();
      setShowForm(false);
      await loadFunds(currentPage);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể cập nhật bản ghi sổ quỹ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (fund: Fund) => {
    setEditingId(fund.id);
    setType(fund.type as 'Thu' | 'Chi');
    setDescription(fund.description);
    setAmount(fund.amount);
    setCategory(fund.category || '');
    setObjectId(fund.objectId ?? '');
    setObjectType(fund.objectType || '');
    setObjectName(fund.objectName || '');
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
    try {
      await financeApi.deleteFund(id);
      await loadFunds(currentPage);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể xóa bản ghi sổ quỹ');
    }
  };

  // Note: Tổng thu/chi chỉ tính trên trang hiện tại, không phải toàn bộ dữ liệu
  const calculateTotal = (type: string) => {
    return funds
      .filter(f => f.type === type)
      .reduce((sum, f) => sum + f.amount, 0);
  };

  const totalThu = calculateTotal('Thu');
  const totalChi = calculateTotal('Chi');
  const balance = totalThu - totalChi;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Sổ quỹ</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Theo dõi thu chi và quản lý dòng tiền</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setType('');
            setAmount('');
            setCategory('');
            setDescription('');
            setShowForm(true);
          }}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm"
        >
          <span className="hidden sm:inline">+ Thêm bản ghi</span>
          <span className="sm:hidden">+ Thêm</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
        <div className="border border-green-100 rounded-2xl p-4 bg-green-50 shadow-sm shadow-green-100">
          <div className="text-[10px] font-black uppercase text-green-600 tracking-wider mb-1">Tổng thu</div>
          <div className="text-2xl font-black text-green-700">{totalThu.toLocaleString()}đ</div>
        </div>
        <div className="border border-red-100 rounded-2xl p-4 bg-red-50 shadow-sm shadow-red-100">
          <div className="text-[10px] font-black uppercase text-red-600 tracking-wider mb-1">Tổng chi</div>
          <div className="text-2xl font-black text-red-700">{totalChi.toLocaleString()}đ</div>
        </div>
        <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50 shadow-sm shadow-blue-100">
          <div className="text-[10px] font-black uppercase text-blue-600 tracking-wider mb-1">Số dư</div>
          <div className={`text-2xl font-black ${balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {balance.toLocaleString()}đ
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="font-semibold mb-3">Lọc</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            options={filterOptions}
            value={filterOptions.find(o => o.value === filterType) || filterOptions[0]}
            onChange={(option) => setFilterType(option?.value || '')}
          />

          <button
            onClick={() => {
              setFilterType('');
            }}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingId ? 'Sửa bản ghi' : 'Thêm bản ghi sổ quỹ'}
        size="lg"
        footer={
          <>
            <button
              onClick={resetForm}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={editingId ? handleUpdate : handleCreate}
              disabled={submitting}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Lưu'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}

          <DynamicForm
            fields={fundFormFields}
            values={{
              type,
              description,
              amount,
              category,
              objectType,
              objectName
            }}
            onChange={(name, value) => {
              if (name === 'type') {
                setType(value as 'Thu' | 'Chi');
                setCategory('');
                setObjectType('');
                setObjectName('');
                setObjectId('');
                setSuggestions([]);
              } else if (name === 'amount') setAmount(value as number);
              else if (name === 'description') setDescription(value as string);
              else if (name === 'category') setCategory(value as string);
              else if (name === 'objectType') {
                setObjectType(value as string);
                if (!value) setObjectName('');
                setObjectId('');
                setSuggestions([]);
                loadSuggestions(value as string);
              } else if (name === 'objectName') setObjectName(value as string);
            }}
            columns={2}
          />

          {objectType && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-600">Gợi ý đối tượng</h3>
                {loadingSuggestions && <span className="text-[10px] text-blue-400 italic">Đang tải...</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setObjectId(s.id);
                      setObjectName(s.name);
                    }}
                    className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    {s.name}
                  </button>
                ))}
                {!loadingSuggestions && suggestions.length === 0 && (
                  <span className="text-xs text-gray-400">Không tìm thấy gợi ý nào</span>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <div className="border rounded-2xl p-3 sm:p-5 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">Lịch sử giao dịch</h2>
          <button
            onClick={() => loadFunds(currentPage, pageSize)}
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
          data={funds}
          isLoading={loading}
          enablePagination={true}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
            loadFunds(page);
          }}
          onPageSizeChange={(newPageSize) => {
            setPageSize(newPageSize);
            setCurrentPage(1);
            loadFunds(1, newPageSize);
          }}
          columns={[
            {
              key: 'type',
              header: 'Loại',
              render: (f) => (
                <span className={`inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${f.type === 'Thu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {f.type}
                </span>
              )
            },
            {
              key: 'description',
              header: 'Mô tả',
              isMain: true,
              className: 'font-black text-gray-900',
              render: (f) => (
                <div>
                  <div className="truncate max-w-[180px] md:max-w-xs" title={f.description}>{f.description}</div>
                  <div className="md:hidden text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">
                    {formatDate(f.date)} • {f.category}
                  </div>
                </div>
              )
            },
            {
              key: 'date',
              header: 'Ngày',
              mobileHidden: true,
              render: (f) => <span className="text-sm text-gray-600 font-semibold">{formatDate(f.date)}</span>
            },
            { key: 'category', header: 'Danh mục', mobileHidden: true, className: 'text-gray-600 font-medium' },
            {
              key: 'object',
              header: 'Đối tượng',
              render: (f) => (
                <div className="flex items-center gap-2">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black ${f.type === 'Thu' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {(f.objectName || 'O').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-xs">{f.objectName || '-'}</div>
                    <div className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">{f.objectType || '-'}</div>
                  </div>
                </div>
              )
            },
            {
              key: 'amount',
              header: 'Số tiền',
              headerClassName: 'text-right',
              className: 'text-right',
              isMain: true,
              render: (f) => (
                <span className={`font-black text-base md:text-lg ${f.type === 'Thu' ? 'text-green-600' : 'text-red-600'}`}>
                  {f.type === 'Thu' ? '+' : '-'}{f.amount.toLocaleString()}đ
                </span>
              )
            }
          ]}
          actions={(f) => [
            {
              label: 'In phiếu',
              icon: <Printer className="h-4 w-4" />,
              onClick: () => handlePrintRecord(f.id)
            },
            {
              label: 'Sửa',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleEdit(f)
            },
            {
              label: 'Xóa',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDelete(f.id),
              variant: 'danger'
            }
          ]}
          emptyMessage="Chưa có dữ liệu sổ quỹ"
        />
      </div>
    </div>
  );
}

const filterOptions = [
  { value: '', label: 'Tất cả loại' },
  { value: 'Thu', label: 'Thu' },
  { value: 'Chi', label: 'Chi' },
];


