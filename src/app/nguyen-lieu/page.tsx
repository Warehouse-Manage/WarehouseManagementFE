'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';

type NguyenLieu = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  description?: string;
};

export default function NguyenLieuPage() {
  const [nguyenLieu, setNguyenLieu] = useState<NguyenLieu[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const apiHost = process.env.NEXT_PUBLIC_API_HOST;

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
  const formatNumber = (value: number | '') => (value === '' ? '' : value.toLocaleString());
  const parseNumber = (input: string) => {
    const cleaned = input.replace(/,/g, '');
    const num = Number(cleaned);
    return Number.isNaN(num) ? '' : num;
  };

  const loadNguyenLieu = async () => {
    if (!apiHost) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiHost}/api/nguyenlieu`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setNguyenLieu(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách nguyên liệu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNguyenLieu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiHost]);

  const handleCreate = async () => {
    if (!apiHost) return;
    if (!name || !unit || quantity === '') {
      setError('Vui lòng nhập đầy đủ thông tin (Tên, Đơn vị, Số lượng)');
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
      const res = await fetch(`${apiHost}/api/nguyenlieu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          unit,
          quantity: Number(quantity),
          description: description || '',
          createdUserId: Number(userId),
        }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || `HTTP ${res.status}`);
      }
      setName('');
      setUnit('');
      setQuantity('');
      setDescription('');
      setShowForm(false);
      await loadNguyenLieu();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo nguyên liệu');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setUnit('');
    setQuantity('');
    setDescription('');
    setError(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nguyên liệu</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          + Thêm nguyên liệu
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Thêm nguyên liệu</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên nguyên liệu *</label>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Tên nguyên liệu"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Đơn vị *</label>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    <option value="Cây">Cây</option>
                    <option value="Bao">Bao</option>
                    <option value="Viên">Viên</option>
                    <option value="m³">m³</option>
                    <option value="Kg">Kg</option>
                    <option value="Tấn">Tấn</option>
                    <option value="Lít">Lít</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số lượng *</label>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Số lượng"
                    inputMode="decimal"
                    value={formatNumber(quantity)}
                    onChange={(e) => setQuantity(parseNumber(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Mô tả (tùy chọn)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-60"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Danh sách</h2>
          <button
            onClick={loadNguyenLieu}
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
                  <th className="px-4 py-3 text-left">Tên</th>
                  <th className="px-4 py-3 text-left">Đơn vị</th>
                  <th className="px-4 py-3 text-right">Số lượng</th>
                  <th className="px-4 py-3 text-left">Mô tả</th>
                </tr>
              </thead>
              <tbody className="text-base">
                {nguyenLieu.map((n) => (
                  <tr key={n.id} className="border-b">
                    <td className="px-4 py-3">{n.name}</td>
                    <td className="px-4 py-3">{n.unit}</td>
                    <td className="px-4 py-3 text-right">{n.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3">{n.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!nguyenLieu.length && <div className="text-sm text-gray-500 py-3">Chưa có dữ liệu</div>}
          </div>
        )}
      </div>
    </div>
  );
}

