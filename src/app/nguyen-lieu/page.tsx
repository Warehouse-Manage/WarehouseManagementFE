'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';
import { inventoryApi } from '@/api';
import { RawMaterial } from '@/types';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';

// Type NguyenLieu moved to @/types/inventory.ts as RawMaterial

export default function NguyenLieuPage() {
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  const [nguyenLieu, setNguyenLieu] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const nguyenLieuFormFields: FormField[] = [
    { name: 'name', label: 'Tên nguyên liệu', type: 'text', required: true, placeholder: 'Nhập tên...' },
    {
      name: 'unit',
      label: 'Đơn vị',
      type: 'select',
      required: true,
      options: [
        { value: 'Cây', label: 'Cây' },
        { value: 'Bao', label: 'Bao' },
        { value: 'Viên', label: 'Viên' },
        { value: 'm³', label: 'm³' },
        { value: 'Kg', label: 'Kg' },
        { value: 'Tấn', label: 'Tấn' },
        { value: 'Lít', label: 'Lít' },
      ]
    },
    { name: 'quantity', label: 'Số lượng', type: 'number', required: true, placeholder: 'Nhập số lượng...' },
    { name: 'description', label: 'Mô tả', type: 'textarea', placeholder: 'Nhập mô tả (không bắt buộc)...' },
  ];

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  // apiHost removed, handled in inventoryApi

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
  // formatNumber and parseNumber removed

  const loadNguyenLieu = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryApi.getRawMaterials();
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
  }, []);

  // Show blank page if role is not 'Admin' or 'accountance'
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  const handleCreate = async () => {
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
      await inventoryApi.createRawMaterial({
        name,
        unit,
        quantity: Number(quantity),
        description: description || '',
        createdUserId: Number(userId),
      });
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
        <div>
          <h1 className="text-2xl font-black text-gray-900">Nguyên liệu</h1>
          <p className="text-sm text-gray-600 mt-1">Theo dõi tồn kho nguyên liệu và vật tư thô</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 transition-colors shadow-sm"
        >
          + Thêm nguyên liệu
        </button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        title="Thêm nguyên liệu mới"
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
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
            fields={nguyenLieuFormFields}
            values={{ name, unit, quantity, description }}
            onChange={(field, value) => {
              if (field === 'name') setName(value as string);
              if (field === 'unit') setUnit(value as string);
              if (field === 'quantity') setQuantity(value as number);
              if (field === 'description') setDescription(value as string);
            }}
            columns={2}
          />
        </div>
      </Modal>

      <div className="border rounded-lg p-4 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Danh sách nguyên liệu</h2>
          <button
            onClick={loadNguyenLieu}
            className="px-3 py-1 border rounded text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Làm mới
          </button>
        </div>
        <DataTable
          data={nguyenLieu}
          isLoading={loading}
          columns={[
            {
              key: 'name',
              header: 'Tên nguyên liệu',
              className: 'font-bold text-gray-900',
              render: (n) => <span>{n.name}</span>
            },
            {
              key: 'unit',
              header: 'Đơn vị',
              className: 'text-gray-500 font-medium',
              render: (n) => <span>{n.unit}</span>
            },
            {
              key: 'quantity',
              header: 'Số lượng tồn',
              headerClassName: 'text-right',
              className: 'text-right font-black text-gray-900',
              render: (n) => <span>{n.quantity.toLocaleString()}</span>
            },
            {
              key: 'description',
              header: 'Mô tả',
              className: 'text-gray-500 italic max-w-xs truncate',
              render: (n) => <span title={n.description || ''}>{n.description || '-'}</span>
            }
          ]}
          emptyMessage="Chưa có dữ liệu nguyên liệu"
        />
      </div>
    </div>
  );
}

