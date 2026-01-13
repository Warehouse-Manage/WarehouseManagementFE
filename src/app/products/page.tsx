'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';
import { inventoryApi } from '@/api';
import { Product } from '@/types';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';

// Type Product moved to @/types/inventory.ts

export default function ProductsPage() {
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const productFormFields: FormField[] = [
    { name: 'name', label: 'Tên sản phẩm', type: 'text', required: true, placeholder: 'Nhập tên sản phẩm...' },
    { name: 'price', label: 'Đơn giá', type: 'number', required: true, placeholder: 'Nhập giá...' },
    { name: 'quantity', label: 'Số lượng ban đầu', type: 'number', required: true, placeholder: 'Nhập số lượng...' },
  ];

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  // apiHost removed, handled in inventoryApi

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
  // formatNumber and parseNumber removed

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryApi.getProducts();
      setProducts(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách sản phẩm');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show blank page if role is not 'Admin' or 'accountance'
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  const handleCreate = async () => {
    if (!name || price === '' || quantity === '') {
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
      await inventoryApi.createProduct({
        name,
        price: Number(price),
        quantity: Number(quantity),
        createdUserId: Number(userId)
      });
      setName('');
      setPrice('');
      setQuantity('');
      setShowForm(false);
      await loadProducts();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo sản phẩm');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Sản phẩm</h1>
          <p className="text-sm text-gray-600 mt-1">Quản lý danh sách thành phẩm gạch và giá bán</p>
        </div>
        <button
          onClick={() => {
            setName('');
            setPrice('');
            setQuantity('');
            setError(null);
            setShowForm(true);
          }}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 transition-colors shadow-sm"
        >
          + Thêm sản phẩm
        </button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Thêm sản phẩm mới"
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
            fields={productFormFields}
            values={{ name, price, quantity }}
            onChange={(field, value) => {
              if (field === 'name') setName(value as string);
              if (field === 'price') setPrice(value as number);
              if (field === 'quantity') setQuantity(value as number);
            }}
            columns={1}
          />
        </div>
      </Modal>

      <div className="border rounded-lg p-4 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Danh sách sản phẩm</h2>
          <button
            onClick={loadProducts}
            className="px-3 py-1 border rounded text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Làm mới
          </button>
        </div>
        <DataTable
          data={products}
          isLoading={loading}
          columns={[
            {
              key: 'name',
              header: 'Tên sản phẩm',
              className: 'font-bold text-gray-900',
              render: (p) => <span>{p.name}</span>
            },
            {
              key: 'price',
              header: 'Đơn giá',
              headerClassName: 'text-right',
              className: 'text-right font-semibold text-orange-600',
              render: (p) => <span>{p.price.toLocaleString()}đ</span>
            },
            {
              key: 'quantity',
              header: 'Số lượng tồn',
              headerClassName: 'text-right',
              className: 'text-right font-mono text-gray-900',
              render: (p) => <span>{p.quantity.toLocaleString()}</span>
            }
          ]}
          emptyMessage="Chưa có dữ liệu sản phẩm"
        />
      </div>
    </div>
  );
}


