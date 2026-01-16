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
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Sản phẩm</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Quản lý danh sách thành phẩm gạch và giá bán</p>
        </div>
        <button
          onClick={() => {
            setName('');
            setPrice('');
            setQuantity('');
            setError(null);
            setShowForm(true);
          }}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm"
        >
          <span className="hidden sm:inline">+ Thêm sản phẩm</span>
          <span className="sm:hidden">+ Thêm</span>
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
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">Danh sách sản phẩm</h2>
          <button
            onClick={loadProducts}
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
          data={products}
          isLoading={loading}
          columns={[
            {
              key: 'name',
              header: 'Tên sản phẩm',
              isMain: true,
              className: 'font-black text-gray-900',
              render: (p) => (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 min-w-[40px] rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="uppercase tracking-tight">{p.name}</span>
                </div>
              )
            },
            {
              key: 'price',
              header: 'Đơn giá',
              isMain: true,
              headerClassName: 'text-right',
              className: 'text-right font-black text-orange-600 md:text-base',
              render: (p) => <span>{p.price.toLocaleString()}đ</span>
            },
            {
              key: 'quantity',
              header: 'Tồn kho',
              headerClassName: 'text-right',
              className: 'text-right font-bold text-gray-500',
              render: (p) => <span>{p.quantity.toLocaleString()}</span>
            }
          ]}
          emptyMessage="Chưa có dữ liệu sản phẩm"
        />
      </div>
    </div>
  );
}


