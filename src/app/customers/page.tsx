'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';

type Customer = {
  id: number;
  name: string;
  address: string;
  phoneNumber: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const apiHost = process.env.NEXT_PUBLIC_API_HOST;

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

  const loadCustomers = async () => {
    if (!apiHost) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiHost}/api/customers`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setCustomers(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách khách hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiHost]);

  const handleCreate = async () => {
    if (!apiHost) return;
    if (!name || !address || !phoneNumber) {
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
      const res = await fetch(`${apiHost}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, phoneNumber, createdUserId: Number(userId) }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || `HTTP ${res.status}`);
      }
      setName('');
      setAddress('');
      setPhoneNumber('');
      setShowForm(false);
      await loadCustomers();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo khách hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Khách hàng</h1>
        <button
          onClick={() => {
            setName('');
            setAddress('');
            setPhoneNumber('');
            setError(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          + Thêm khách hàng
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Thêm khách hàng</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Tên"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Địa chỉ"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Số điện thoại"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
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
                  onClick={() => setShowForm(false)}
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
            onClick={loadCustomers}
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
                  <th className="px-4 py-3 text-left">Địa chỉ</th>
                  <th className="px-4 py-3 text-left">Số điện thoại</th>
                </tr>
              </thead>
              <tbody className="text-base">
                {customers.map((c) => (
                  <tr key={c.id} className="border-b">
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3">{c.address}</td>
                    <td className="px-4 py-3">{c.phoneNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!customers.length && <div className="text-sm text-gray-500 py-3">Chưa có dữ liệu</div>}
          </div>
        )}
      </div>
    </div>
  );
}


