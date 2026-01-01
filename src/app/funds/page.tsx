'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';

type Fund = {
  id: number;
  date: string;
  type: string;
  description: string;
  amount: number;
  category: string;
  objectId: number | null;
  objectType: string;
  objectName: string;
  dateCreated: string;
};

export default function FundsPage() {
  const [role, setRole] = useState<string | null>(() => getCookie('role'));

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  // Show blank page if role is not 'Admin' or 'accountance'
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

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

  const apiHost = process.env.NEXT_PUBLIC_API_HOST;
  const [suggestions, setSuggestions] = useState<{ id: number; name: string }[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
  const formatNumber = (value: number | '') => (value === '' ? '' : value.toLocaleString());
  const parseNumber = (input: string) => {
    const cleaned = input.replace(/[.,\s]/g, '');
    const num = Number(cleaned);
    return Number.isNaN(num) ? '' : num;
  };

  const formatDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN');
  };

  // Load suggestions based on objectType
  const loadSuggestions = async (target: string) => {
    if (!apiHost || !target) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      let url = '';
      switch (target) {
        case 'Giao hàng':
          url = `${apiHost}/api/delivers`;
          break;
        case 'Nhân viên':
          url = `${apiHost}/api/workers`;
          break;
        case 'Khách hàng':
          url = `${apiHost}/api/customers`;
          break;
        case 'Vật tư':
          // Approvers; best-effort to fetch users with role=approver if available
          url = `${apiHost}/api/users?role=approver`;
          break;
        case 'Đối tác':
          // No specific endpoint; clear suggestions
          setSuggestions([]);
          setLoadingSuggestions(false);
          return;
        default:
          setSuggestions([]);
          setLoadingSuggestions(false);
          return;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        const msg = (json as { message?: string })?.message;
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const data = json as { id?: number; name?: string; plateNumber?: string }[];
      // Map suggestions
      const mapped = data.map((item) => {
        const id = item.id ?? 0;
        if (target === 'Giao hàng') return { id, name: item.name || item.plateNumber || `Giao hàng #${id}` };
        if (target === 'Nhân viên') return { id, name: item.name || `Nhân viên #${id}` };
        if (target === 'Khách hàng') return { id, name: item.name || `Khách hàng #${id}` };
        return { id, name: item.name ?? `Đối tượng #${id}` };
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
    if (!apiHost) return;
    setLoading(true);
    setError(null);
    try {
      let url = `${apiHost}/api/funds`;
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (params.toString()) url += '?' + params.toString();

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setFunds(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách sổ quỹ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiHost, filterType]);

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
  const getCategoryOptions = () => {
    if (type === 'Chi') {
      return [
        { value: '', label: '-- Chọn danh mục --' },
        { value: 'Nguyên liệu', label: 'Nguyên liệu' },
        { value: 'Vật tư', label: 'Vật tư' },
        { value: 'Lương', label: 'Lương' },
        { value: 'Chi tiêu', label: 'Chi tiêu' },
        { value: 'Trả lãi ngân hàng', label: 'Trả lãi ngân hàng' },
        { value: 'Trả nợ', label: 'Trả nợ' },
      ];
    } else if (type === 'Thu') {
      return [
        { value: '', label: '-- Chọn danh mục --' },
        { value: 'Tiền bán gạch', label: 'Tiền bán gạch' },
        { value: 'Tiền vay ngân hàng', label: 'Tiền vay ngân hàng' },
        { value: 'Tiền đặt cọc', label: 'Tiền đặt cọc' },
      ];
    }
    return [{ value: '', label: '-- Chọn loại trước --' }];
  };

  // Object type options based on type
  const getObjectTypeOptions = () => {
    if (type === 'Chi') {
      return [
        { value: '', label: '-- Chọn đối tượng --' },
        { value: 'Nhân viên', label: 'Nhân viên' },
        { value: 'Giám đốc', label: 'Giám đốc' },
        { value: 'Vật tư', label: 'Vật tư' },
        { value: 'Đối tác', label: 'Đối tác' },
        { value: 'Giao hàng', label: 'Giao hàng' },
      ];
    } else if (type === 'Thu') {
      return [
        { value: '', label: '-- Chọn đối tượng --' },
        { value: 'Khách hàng', label: 'Khách hàng' },
        { value: 'Đối tác', label: 'Đối tác' },
      ];
    }
    return [{ value: '', label: '-- Chọn loại trước --' }];
  };

  const handleCreate = async () => {
    if (!apiHost) return;
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
      const res = await fetch(`${apiHost}/api/funds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            description,
            amount: Number(amount),
            category: category || '',
          objectId: objectId === '' ? null : Number(objectId),
            objectType: objectType || '',
            objectName: objectName || '',
            createdUserId: Number(userId),
          }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || `HTTP ${res.status}`);
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
    if (!apiHost || !editingId) return;
    if (!type || !description || amount === '' || Number(amount) <= 0) {
      setError('Vui lòng nhập đầy đủ thông tin và số tiền phải lớn hơn 0');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiHost}/api/funds/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            description,
            amount: Number(amount),
            category: category || '',
          objectId: objectId === '' ? null : Number(objectId),
            objectType: objectType || '',
            objectName: objectName || '',
          }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || `HTTP ${res.status}`);
      }
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
    if (!apiHost) return;
    if (!confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;
    try {
      const res = await fetch(`${apiHost}/api/funds/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || `HTTP ${res.status}`);
      }
      await loadFunds();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể xóa bản ghi sổ quỹ');
    }
  };

  const calculateTotal = (type: string) => {
    return funds
      .filter(f => f.type === type)
      .reduce((sum, f) => sum + f.amount, 0);
  };

  const totalThu = calculateTotal('Thu');
  const totalChi = calculateTotal('Chi');
  const balance = totalThu - totalChi;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sổ quỹ</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          + Thêm bản ghi
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-green-50">
          <div className="text-sm text-gray-600">Tổng thu</div>
          <div className="text-2xl font-bold text-green-600">{totalThu.toLocaleString()}đ</div>
        </div>
        <div className="border rounded-lg p-4 bg-red-50">
          <div className="text-sm text-gray-600">Tổng chi</div>
          <div className="text-2xl font-bold text-red-600">{totalChi.toLocaleString()}đ</div>
        </div>
        <div className="border rounded-lg p-4 bg-blue-50">
          <div className="text-sm text-gray-600">Số dư</div>
          <div className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {balance.toLocaleString()}đ
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h2 className="font-semibold mb-3">Lọc</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            className="border rounded px-3 py-2"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Tất cả loại</option>
            <option value="Thu">Thu</option>
            <option value="Chi">Chi</option>
          </select>
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

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editingId ? 'Sửa bản ghi' : 'Thêm bản ghi sổ quỹ'}</h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <select
                  className="border rounded px-3 py-2"
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as 'Thu' | 'Chi');
                    setCategory('');
                    setObjectType('');
                    setObjectName('');
                    setObjectId('');
                    setSuggestions([]);
                  }}
                  required
                >
                  <option value="">-- Chọn loại --</option>
                  <option value="Thu">Thu</option>
                  <option value="Chi">Chi</option>
                </select>
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Số tiền"
                  inputMode="decimal"
                  value={formatNumber(amount)}
                  onChange={(e) => setAmount(parseNumber(e.target.value))}
                  required
                />
                <input
                  className="border rounded px-3 py-2 md:col-span-2"
                  placeholder="Mô tả"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
                <select
                  className="border rounded px-3 py-2"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={!type}
                >
                  {getCategoryOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  className="border rounded px-3 py-2"
                  value={objectType}
                  onChange={(e) => {
                    setObjectType(e.target.value);
                    if (!e.target.value) setObjectName('');
                    setObjectId('');
                    setSuggestions([]);
                    loadSuggestions(e.target.value);
                  }}
                  disabled={!type}
                >
                  {getObjectTypeOptions().map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Tên người thu/nhận"
                  value={objectName}
                  onChange={(e) => setObjectName(e.target.value)}
                  disabled={!objectType}
                />
                {objectType && (
                  <div className="md:col-span-2 space-y-2">
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>Gợi ý:</span>
                      {loadingSuggestions && <span>Đang tải...</span>}
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
                          className="px-3 py-1 border rounded text-xs hover:bg-gray-100"
                        >
                          {s.name}
                        </button>
                      ))}
                      {!loadingSuggestions && suggestions.length === 0 && (
                        <span className="text-xs text-gray-400">Không có gợi ý</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={editingId ? handleUpdate : handleCreate}
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-60"
                >
                  {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Lưu'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Danh sách</h2>
          <button
            onClick={loadFunds}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
          >
            Làm mới
          </button>
        </div>
        {loading ? (
          <div>Đang tải...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-base">
              <thead>
                <tr className="bg-orange-50">
                  <th className="px-4 py-3 text-left">Ngày</th>
                  <th className="px-4 py-3 text-left">Loại</th>
                  <th className="px-4 py-3 text-left">Mô tả</th>
                  <th className="px-4 py-3 text-left">Danh mục</th>
                  <th className="px-4 py-3 text-left">Đối tượng</th>
                  <th className="px-4 py-3 text-left">Tên người</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                  <th className="px-4 py-3 text-left">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {funds.map((f) => (
                  <tr key={f.id} className="border-b">
                    <td className="px-4 py-3">{formatDate(f.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        f.type === 'Thu' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {f.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{f.description}</td>
                    <td className="px-4 py-3">{f.category || '-'}</td>
                    <td className="px-4 py-3">{f.objectType || '-'}</td>
                    <td className="px-4 py-3">{f.objectName || '-'}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      f.type === 'Thu' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {f.type === 'Thu' ? '+' : '-'}{f.amount.toLocaleString()}đ
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(f)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!funds.length && <div className="text-sm text-gray-500 py-3">Chưa có dữ liệu</div>}
          </div>
        )}
      </div>
    </div>
  );
}

