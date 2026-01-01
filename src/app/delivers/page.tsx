'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';

type Deliver = {
  id: number;
  name: string;
  phoneNumber: string;
  plateNumber: string;
  amountMoneyTotal: number;
  amountMoneyPaid: number;
};

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

  const apiHost = process.env.NEXT_PUBLIC_API_HOST;

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

  const loadDelivers = async () => {
    if (!apiHost) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiHost}/api/delivers`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
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
  }, [apiHost]);

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
    if (!apiHost) return;
    setLoadingMonthlyTotal(true);
    try {
      const res = await fetch(`${apiHost}/api/delivers/${deliverId}/monthly-total?month=${month}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
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
    if (!apiHost || !selectedDeliver) return;
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
      const res = await fetch(`${apiHost}/api/delivers/${selectedDeliver.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          createdUserId: Number(userId),
        }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || `HTTP ${res.status}`);
      }
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

  const handleCreate = async () => {
    if (!apiHost) return;
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
      const res = await fetch(`${apiHost}/api/delivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phoneNumber, plateNumber, createdUserId: Number(userId) }),
      });
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        throw new Error(msg?.message || `HTTP ${res.status}`);
      }
      setName('');
      setPhoneNumber('');
      setPlateNumber('');
      setShowForm(false);
      await loadDelivers();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo người giao hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Người giao hàng</h1>
        <button
          onClick={() => {
            setName('');
            setPhoneNumber('');
            setPlateNumber('');
            setError(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          + Thêm người giao hàng
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Thêm người giao hàng</h2>
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
            placeholder="Số điện thoại"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Biển số"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
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
            onClick={loadDelivers}
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
                  <th className="px-4 py-3 text-left">Số điện thoại</th>
                  <th className="px-4 py-3 text-left">Biển số</th>
                  <th className="px-4 py-3 text-right">Tổng chi phí</th>
                  <th className="px-4 py-3 text-right">Đã thanh toán</th>
                  <th className="px-4 py-3 text-right">Còn lại</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="text-base">
                {delivers.map((d) => {
                  const remaining = (d.amountMoneyTotal || 0) - (d.amountMoneyPaid || 0);
                  return (
                  <tr key={d.id} className="border-b">
                      <td className="px-4 py-3">{d.name}</td>
                      <td className="px-4 py-3">{d.phoneNumber}</td>
                      <td className="px-4 py-3">{d.plateNumber}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {(d.amountMoneyTotal || 0).toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {(d.amountMoneyPaid || 0).toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600 font-semibold">
                        {remaining.toLocaleString('vi-VN')} VNĐ
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenPaymentModal(d)}
                          className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                          disabled={remaining <= 0}
                        >
                          Thanh toán
                        </button>
                      </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            {!delivers.length && <div className="text-sm text-gray-500 py-3">Chưa có dữ liệu</div>}
          </div>
        )}
      </div>

      {showPaymentModal && selectedDeliver && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Thanh toán cho {selectedDeliver.name}</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedDeliver(null);
                  setPaymentAmount(0);
                  setMonthlyTotal(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Tổng chi phí</div>
                  <div className="text-lg font-semibold">{(selectedDeliver.amountMoneyTotal || 0).toLocaleString('vi-VN')} VNĐ</div>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Đã thanh toán</div>
                  <div className="text-lg font-semibold text-green-600">{(selectedDeliver.amountMoneyPaid || 0).toLocaleString('vi-VN')} VNĐ</div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded">
                <div className="text-sm text-gray-600">Còn lại</div>
                <div className="text-lg font-semibold text-orange-600">
                  {((selectedDeliver.amountMoneyTotal || 0) - (selectedDeliver.amountMoneyPaid || 0)).toLocaleString('vi-VN')} VNĐ
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Chọn tháng để xem chi phí</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    if (e.target.value) {
                      loadMonthlyTotal(selectedDeliver.id, e.target.value);
                    }
                  }}
                  className="border rounded px-3 py-2 w-full"
                />
                {loadingMonthlyTotal ? (
                  <div className="text-sm text-gray-500">Đang tải...</div>
                ) : monthlyTotal !== null ? (
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Chi phí tháng {selectedMonth}</div>
                    <div className="text-lg font-semibold text-blue-600">
                      {monthlyTotal.toLocaleString('vi-VN')} VNĐ
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Số tiền thanh toán</label>
                <input
                  type="number"
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Nhập số tiền"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  min="0"
                  max={(selectedDeliver.amountMoneyTotal || 0) - (selectedDeliver.amountMoneyPaid || 0)}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Tối đa: {((selectedDeliver.amountMoneyTotal || 0) - (selectedDeliver.amountMoneyPaid || 0)).toLocaleString('vi-VN')} VNĐ
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePayment}
                  disabled={submitting || !paymentAmount || Number(paymentAmount) <= 0}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-60"
                >
                  {submitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                </button>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedDeliver(null);
                    setPaymentAmount(0);
                    setMonthlyTotal(null);
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
    </div>
  );
}


