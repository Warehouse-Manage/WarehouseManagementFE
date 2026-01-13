'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';
import { financeApi } from '@/api';
import { Customer } from '@/types';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';

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
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show blank page if role is not 'Admin' or 'accountance'
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  const handleCreate = async () => {
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
      await financeApi.createCustomer({
        name,
        address,
        phoneNumber,
        createdUserId: Number(userId)
      });
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
        <div>
          <h1 className="text-2xl font-black text-gray-900">Khách hàng</h1>
          <p className="text-sm text-gray-600 mt-1">Quản lý danh sách khách hàng và thông tin liên hệ</p>
        </div>
        <button
          onClick={() => {
            setName('');
            setAddress('');
            setPhoneNumber('');
            setError(null);
            setShowForm(true);
          }}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 transition-colors shadow-sm"
        >
          + Thêm khách hàng
        </button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Thêm khách hàng mới"
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
              onClick={handleCreate}
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

      <div className="border rounded-lg p-4 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Danh sách khách hàng</h2>
          <button
            onClick={loadCustomers}
            className="px-3 py-1 border rounded text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Làm mới
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
              key: 'phoneNumber',
              header: 'Số điện thoại',
              className: 'font-mono text-gray-900',
              render: (c) => <span>{c.phoneNumber}</span>
            }
          ]}
          emptyMessage="Chưa có dữ liệu khách hàng"
        />
      </div>
    </div>
  );
}


