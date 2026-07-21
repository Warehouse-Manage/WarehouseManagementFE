'use client';

import { canAccessAccounting } from '@/lib/roles';
import { useEffect, useMemo, useState } from 'react';
import { getCookie, printHtmlContent } from '@/lib/ultis';
import { financeApi, workerApi, userApi, partnerApi } from '@/api';
import { Fund, Deliver, Worker, Customer, User } from '@/types';
import { toast } from 'sonner';
import { DataTable, FormField } from '@/components/shared';
import FundFormModal from './modal/FundFormModal';
import QuickCreateObjectModal, { QuickObjectType } from './modal/QuickCreateObjectModal';
import { CalendarDays, Printer, Edit, Trash2 } from 'lucide-react';
import { useConfirm } from '@/hooks/useConfirm';

// Type Fund moved to @/types/finance.ts

const normalizeText = (value?: string | null) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const includesText = (source?: string | null, keyword?: string) => {
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return true;
  return normalizeText(source).includes(normalizedKeyword);
};

export default function FundsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
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
  const [filterCategory, setFilterCategory] = useState('');
  const [filterReceiverName, setFilterReceiverName] = useState('');
  const [filterPayerName, setFilterPayerName] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [draftFilterType, setDraftFilterType] = useState<string>('');
  const [draftFilterCategory, setDraftFilterCategory] = useState('');
  const [draftFilterReceiverName, setDraftFilterReceiverName] = useState('');
  const [draftFilterPayerName, setDraftFilterPayerName] = useState('');
  const [draftFilterDateFrom, setDraftFilterDateFrom] = useState('');
  const [draftFilterDateTo, setDraftFilterDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Bộ lọc thời gian: theo tháng / theo năm / toàn thời gian
  const [draftFilterMode, setDraftFilterMode] = useState<'month' | 'year' | 'all'>('month');
  const [filterMode, setFilterMode] = useState<'month' | 'year' | 'all'>('month');
  const [draftFilterMonth, setDraftFilterMonth] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [draftFilterYear, setDraftFilterYear] = useState<number>(new Date().getFullYear());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  // Tổng hợp (do BE tính trên toàn bộ kết quả lọc)
  const [summaryTotalThu, setSummaryTotalThu] = useState(0);
  const [summaryTotalChi, setSummaryTotalChi] = useState(0);
  const [summaryOpeningBalance, setSummaryOpeningBalance] = useState(0);
  const [summaryCurrentBalance, setSummaryCurrentBalance] = useState(0);

  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Quick create object state
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<QuickObjectType>('Khách hàng');
  const [quickCreateData, setQuickCreateData] = useState<Record<string, string | number>>({});
  const [quickCreateError, setQuickCreateError] = useState<string | null>(null);
  const [quickCreateSubmitting, setQuickCreateSubmitting] = useState(false);

  // Khởi tạo filter tháng = tháng hiện tại (theo giờ VN)
  useEffect(() => {
    const now = new Date();
    const vn = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const m = String(vn.getMonth() + 1).padStart(2, '0');
    const initial = `${vn.getFullYear()}-${m}`;
    const currentYear = vn.getFullYear();
    setDraftFilterMonth(initial);
    setFilterMonth(initial);
    setDraftFilterYear(currentYear);
    setFilterYear(currentYear);
  }, []);

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
        { value: 'Sửa chữa', label: 'Sửa chữa' },
        { value: 'Vận chuyển', label: 'Vận chuyển' },
        { value: 'Công nợ cũ', label: 'Công nợ cũ' },
        { value: 'Nhiên liệu', label: 'Nhiên liệu' },
        { value: 'Máy mới', label: 'Máy mới' },
        { value: 'Dịch vụ khác', label: 'Dịch vụ khác' },
      ] : type === 'Thu' ? [
        { value: 'Tiền bán gạch', label: 'Tiền bán gạch' },
        { value: 'Tiền vay ngân hàng', label: 'Tiền vay ngân hàng' },
        { value: 'Tiền đặt cọc', label: 'Tiền đặt cọc' },
        { value: 'Công nợ cũ', label: 'Công nợ cũ' },
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
    }
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

  const formatDateFilterDisplay = (value: string) => {
    if (!value) return '';

    const parts = value.split('-');
    if (parts.length !== 3) return value;

    const [year, month, day] = parts;
    if (year.length !== 4 || month.length !== 2 || day.length !== 2) return value;

    return `${day}/${month}/${year}`;
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

  const loadFunds = async () => {
    setLoading(true);
    setError(null);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;
      let yearParam: number | undefined;

      // Ưu tiên khoảng ngày tùy chỉnh nếu có
      const hasCustomDate = filterDateFrom || filterDateTo;

      if (hasCustomDate) {
        startDate = filterDateFrom
          ? new Date(`${filterDateFrom}T00:00:00`).toISOString()
          : undefined;
        endDate = filterDateTo
          ? new Date(`${filterDateTo}T23:59:59.999`).toISOString()
          : undefined;
      } else if (filterMode === 'month' && filterMonth) {
        startDate = new Date(`${filterMonth}-01T00:00:00`).toISOString();
        endDate = new Date(
          new Date(`${filterMonth}-01T00:00:00`).getFullYear(),
          new Date(`${filterMonth}-01T00:00:00`).getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        ).toISOString();
      } else if (filterMode === 'year' && filterYear) {
        yearParam = filterYear;
      }
      // else 'all' → không gửi startDate/endDate/year

      const result = await financeApi.getFundsFilter({
        pageNumber: currentPage,
        pageSize,
        startDate,
        endDate,
        year: yearParam,
      });

      setFunds(result.data);
      setTotalCount(result.totalCount);
      setSummaryTotalThu(result.totalThu);
      setSummaryTotalChi(result.totalChi);
      setSummaryOpeningBalance(result.openingBalance);
      setSummaryCurrentBalance(result.currentBalance);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách sổ quỹ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadFunds();
  }, [currentPage, pageSize, filterDateFrom, filterDateTo, filterMonth, filterYear, filterMode, filterType, filterCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterCategory, filterReceiverName, filterPayerName, filterDateFrom, filterDateTo, filterMonth, filterYear, filterMode]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const filteredCategoryOptions = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        funds
          .filter((fund) => !draftFilterType || fund.type === draftFilterType)
          .map((fund) => fund.category?.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a!.localeCompare(b!, 'vi'));

    return uniqueCategories as string[];
  }, [funds, draftFilterType]);

  // Show blank page if role is not 'Admin' or 'accountance'
  if (!canAccessAccounting(role)) {
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

  const handleOpenQuickCreate = () => {
    if (!objectType) {
      toast.error('Vui lòng chọn loại đối tượng trước');
      return;
    }
    setQuickCreateType(objectType as QuickObjectType);
    setQuickCreateData({});
    setQuickCreateError(null);
    setShowQuickCreate(true);
  };

  const handleQuickCreateSubmit = async () => {
    const userId = getCookie('userId');
    if (!userId) {
      setQuickCreateError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    const createdUserId = Number(userId);

    setQuickCreateSubmitting(true);
    setQuickCreateError(null);

    try {
      let newId: number;
      let newName: string;

      switch (quickCreateType) {
        case 'Khách hàng': {
          const name = String(quickCreateData.name || '').trim();
          const address = String(quickCreateData.address || '').trim();
          const phone = String(quickCreateData.phone || '').trim();
          if (!name || !address || !phone) {
            setQuickCreateError('Vui lòng nhập đầy đủ thông tin');
            setQuickCreateSubmitting(false);
            return;
          }
          const customer = await financeApi.createCustomer({ name, address, phoneNumber: phone, createdUserId });
          newId = customer.id;
          newName = customer.name;
          break;
        }
        case 'Đối tác': {
          const name = String(quickCreateData.name || '').trim();
          const phone = String(quickCreateData.phone || '').trim();
          const address = String(quickCreateData.address || '').trim();
          if (!name || !phone) {
            setQuickCreateError('Vui lòng nhập đầy đủ thông tin');
            setQuickCreateSubmitting(false);
            return;
          }
          const partner = await partnerApi.createPartner({ name, phoneNumber: phone, address, createdUserId });
          newId = partner.id;
          newName = partner.name;
          break;
        }
        case 'Nhân viên': {
          const name = String(quickCreateData.name || '').trim();
          const age = Number(quickCreateData.age) || 0;
          const phone = String(quickCreateData.phone || '').trim();
          const salary = Number(quickCreateData.salary) || 0;
          if (!name || !age || !phone || !salary) {
            setQuickCreateError('Vui lòng nhập đầy đủ thông tin');
            setQuickCreateSubmitting(false);
            return;
          }
          const worker = await workerApi.createWorker({ name, age, phoneNumber: phone, salary });
          newId = worker.id;
          newName = worker.name;
          break;
        }
        case 'Vật tư': {
          const name = String(quickCreateData.name || '').trim();
          const phone = String(quickCreateData.phone || '').trim();
          if (!name || !phone) {
            setQuickCreateError('Vui lòng nhập đầy đủ thông tin');
            setQuickCreateSubmitting(false);
            return;
          }
          const companyId = Number(getCookie('companyId')) || 0;
          const userName = name.toLowerCase().replace(/\s+/g, '.') + '.' + Date.now().toString().slice(-4);
          const user = await userApi.createUser({
            userName,
            name,
            role: 'approver',
            department: 'Vật tư',
            password: '123456',
            companyId
          });
          newId = user.id || 0;
          newName = name;
          break;
        }
        case 'Giao hàng': {
          const name = String(quickCreateData.name || '').trim();
          const phone = String(quickCreateData.phone || '').trim();
          const plateNumber = String(quickCreateData.plateNumber || '').trim();
          if (!name || !phone || !plateNumber) {
            setQuickCreateError('Vui lòng nhập đầy đủ thông tin');
            setQuickCreateSubmitting(false);
            return;
          }
          const deliver = await financeApi.createDeliver({ name, phoneNumber: phone, plateNumber, createdUserId });
          newId = deliver.id;
          newName = deliver.name;
          break;
        }
        case 'Giám đốc': {
          const name = String(quickCreateData.name || '').trim();
          const phone = String(quickCreateData.phone || '').trim();
          if (!name || !phone) {
            setQuickCreateError('Vui lòng nhập đầy đủ thông tin');
            setQuickCreateSubmitting(false);
            return;
          }
          const companyId = Number(getCookie('companyId')) || 0;
          const userName = name.toLowerCase().replace(/\s+/g, '.') + '.' + Date.now().toString().slice(-4);
          const user = await userApi.createUser({
            userName,
            name,
            role: 'Admin',
            department: 'Giám đốc',
            password: '123456',
            companyId
          });
          newId = user.id || 0;
          newName = name;
          break;
        }
        default:
          setQuickCreateError('Loại đối tượng không hợp lệ');
          setQuickCreateSubmitting(false);
          return;
      }

      // Set the newly created object as selected
      setObjectId(newId);
      setObjectName(newName);
      setShowQuickCreate(false);
      setQuickCreateData({});
      toast.success(`Đã tạo ${quickCreateType.toLowerCase()} mới: ${newName}`);

      // Reload suggestions
      await loadSuggestions(objectType);
    } catch (err: unknown) {
      setQuickCreateError(getErrorMessage(err) || 'Không thể tạo đối tượng mới');
    } finally {
      setQuickCreateSubmitting(false);
    }
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
      await loadFunds();
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
      await loadFunds();
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
    const confirmed = await confirm({
      message: 'Bạn có chắc chắn muốn xóa bản ghi này?',
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;
    try {
      await financeApi.deleteFund(id);
      await loadFunds();
      toast.success('Xóa bản ghi thành công');
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể xóa bản ghi sổ quỹ');
      toast.error(getErrorMessage(err) || 'Không thể xóa bản ghi sổ quỹ');
    }
  };

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
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm cursor-pointer"
        >
          <span className="hidden sm:inline">+ Thêm bản ghi</span>
          <span className="sm:hidden">+ Thêm</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
        <div className="border border-blue-100 rounded-2xl p-4 bg-blue-50 shadow-sm shadow-blue-100">
          <div className="text-[10px] font-black uppercase text-blue-600 tracking-wider mb-1">Quỹ đầu kỳ</div>
          <div className={`text-2xl font-black tabular-nums ${summaryOpeningBalance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {summaryOpeningBalance.toLocaleString('en-US')}đ
          </div>
        </div>
        <div className="border border-green-100 rounded-2xl p-4 bg-green-50 shadow-sm shadow-green-100">
          <div className="text-[10px] font-black uppercase text-green-600 tracking-wider mb-1">Tổng thu</div>
          <div className="text-2xl font-black text-green-700 tabular-nums">{summaryTotalThu.toLocaleString('en-US')}đ</div>
        </div>
        <div className="border border-red-100 rounded-2xl p-4 bg-red-50 shadow-sm shadow-red-100">
          <div className="text-[10px] font-black uppercase text-red-600 tracking-wider mb-1">Tổng chi</div>
          <div className="text-2xl font-black text-red-700 tabular-nums">{summaryTotalChi.toLocaleString('en-US')}đ</div>
        </div>
        <div className="border border-violet-100 rounded-2xl p-4 bg-violet-50 shadow-sm shadow-violet-100">
          <div className="text-[10px] font-black uppercase text-violet-600 tracking-wider mb-1">Tồn quỹ</div>
          <div className={`text-2xl font-black tabular-nums ${summaryCurrentBalance >= 0 ? 'text-violet-700' : 'text-red-700'}`}>
            {summaryCurrentBalance.toLocaleString('en-US')}đ
          </div>
        </div>
      </div>

      {/* Legacy filters removed
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
            className="px-4 py-2 border rounded hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>
      */}

      <FundFormModal
        isOpen={showForm}
        onClose={resetForm}
        editingId={editingId}
        fundFormFields={fundFormFields}
        formValues={{
          type,
          description,
          amount,
          category,
          objectType
        }}
        error={error}
        submitting={submitting}
        suggestions={suggestions}
        loadingSuggestions={loadingSuggestions}
        objectId={objectId}
        objectName={objectName}
        onFieldChange={(name, value) => {
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
          }
        }}
        onSuggestionClick={(s) => {
          if (!s.id) {
            setObjectId('');
          } else {
            setObjectId(s.id);
          }
          setObjectName(s.name);
        }}
        onSubmit={editingId ? handleUpdate : handleCreate}
        onQuickCreateClick={handleOpenQuickCreate}
      />

      <QuickCreateObjectModal
        isOpen={showQuickCreate}
        onClose={() => {
          setShowQuickCreate(false);
          setQuickCreateData({});
          setQuickCreateError(null);
        }}
        objectType={quickCreateType}
        formData={quickCreateData}
        error={quickCreateError}
        submitting={quickCreateSubmitting}
        onFieldChange={(name, value) => setQuickCreateData(prev => ({ ...prev, [name]: value }))}
        onSubmit={handleQuickCreateSubmit}
      />

      <div className="border rounded-2xl p-3 sm:p-5 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">Lịch sử giao dịch</h2>
          <button
            onClick={() => loadFunds()}
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Khoảng thời gian</label>
                <select
                  value={draftFilterMode}
                  onChange={(e) => setDraftFilterMode(e.target.value as 'month' | 'year' | 'all')}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                >
                  <option value="month">Theo tháng</option>
                  <option value="year">Theo năm</option>
                  <option value="all">Toàn thời gian</option>
                </select>
              </div>

              {draftFilterMode === 'month' && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Tháng</label>
                  <input
                    type="month"
                    value={draftFilterMonth}
                    onChange={(e) => setDraftFilterMonth(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              )}

              {draftFilterMode === 'year' && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Năm</label>
                  <select
                    value={draftFilterYear}
                    onChange={(e) => setDraftFilterYear(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                  >
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Thu / Chi</label>
                <select
                  value={draftFilterType}
                  onChange={(e) => setDraftFilterType(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                >
                  {filterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Danh mục</label>
                <select
                  value={draftFilterCategory}
                  onChange={(e) => setDraftFilterCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Tất cả danh mục</option>
                  {filteredCategoryOptions.map((categoryOption) => (
                    <option key={categoryOption} value={categoryOption}>
                      {categoryOption}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Tên người nhận</label>
                <input
                  value={draftFilterReceiverName}
                  onChange={(e) => setDraftFilterReceiverName(e.target.value)}
                  placeholder="Lọc phiếu chi..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Tên người nộp</label>
                <input
                  value={draftFilterPayerName}
                  onChange={(e) => setDraftFilterPayerName(e.target.value)}
                  placeholder="Lọc phiếu thu..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Từ ngày</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatDateFilterDisplay(draftFilterDateFrom)}
                    readOnly
                    placeholder="dd/mm/yyyy"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                  />
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={draftFilterDateFrom}
                    onChange={(e) => setDraftFilterDateFrom(e.target.value)}
                    aria-label="Từ ngày"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Đến ngày</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatDateFilterDisplay(draftFilterDateTo)}
                    readOnly
                    placeholder="dd/mm/yyyy"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                  />
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={draftFilterDateTo}
                    onChange={(e) => setDraftFilterDateTo(e.target.value)}
                    aria-label="Đến ngày"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </div>
              </div>

              <div className="md:col-span-2 xl:col-span-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterType(draftFilterType);
                    setFilterCategory(draftFilterCategory);
                    setFilterReceiverName(draftFilterReceiverName);
                    setFilterPayerName(draftFilterPayerName);
                    setFilterDateFrom(draftFilterDateFrom);
                    setFilterDateTo(draftFilterDateTo);
                    setFilterMonth(draftFilterMonth);
                    setFilterYear(draftFilterYear);
                    setFilterMode(draftFilterMode);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700"
                >
                  Lọc
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const vn = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
                    const m = String(vn.getMonth() + 1).padStart(2, '0');
                    const initial = `${vn.getFullYear()}-${m}`;
                    const currentYear = vn.getFullYear();
                    setDraftFilterType('');
                    setDraftFilterCategory('');
                    setDraftFilterReceiverName('');
                    setDraftFilterPayerName('');
                    setDraftFilterDateFrom('');
                    setDraftFilterDateTo('');
                    setDraftFilterMonth(initial);
                    setDraftFilterYear(currentYear);
                    setDraftFilterMode('month');
                    setFilterType('');
                    setFilterCategory('');
                    setFilterReceiverName('');
                    setFilterPayerName('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setFilterMonth(initial);
                    setFilterYear(currentYear);
                    setFilterMode('month');
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Xóa lọc
                </button>
              </div>
            </div>
          }
          data={funds}
          isLoading={loading}
          enablePagination={true}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
          }}
          onPageSizeChange={(newPageSize) => {
            setPageSize(newPageSize);
            setCurrentPage(1);
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
                  {f.type === 'Thu' ? '+' : '-'}{f.amount.toLocaleString('en-US')}đ
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
        {ConfirmDialog}
      </div>
    </div>
  );
}

const filterOptions = [
  { value: '', label: 'Tất cả loại' },
  { value: 'Thu', label: 'Thu' },
  { value: 'Chi', label: 'Chi' },
];




