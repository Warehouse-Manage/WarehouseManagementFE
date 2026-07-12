'use client';

import { canAccessAccounting } from '@/lib/roles';
import { useEffect, useMemo, useState } from 'react';
import { getCookie } from '@/lib/ultis';
import { inventoryApi, partnerApi } from '@/api';
import { RawMaterial, Partner } from '@/types';
import { DataTable } from '@/components/shared';
import RawMaterialFormModal from './modal/RawMaterialFormModal';

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
  const [partnerId, setPartnerId] = useState<number | ''>('');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draftFilterName, setDraftFilterName] = useState('');
  const [draftFilterUnit, setDraftFilterUnit] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterUnit, setFilterUnit] = useState('');

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  const loadPartners = async () => {
    try {
      const data = await partnerApi.getPartners();
      setPartners(data);
    } catch (err: unknown) {
      console.error('Không thể tải danh sách đối tác:', err);
    }
  };

  useEffect(() => {
    loadPartners();
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

  const filteredNguyenLieu = useMemo(() => {
    const name = filterName.trim().toLowerCase();
    const unit = filterUnit.trim().toLowerCase();
    return nguyenLieu.filter((n) => {
      if (name && !n.name.toLowerCase().includes(name)) return false;
      if (unit && !n.unit.toLowerCase().includes(unit)) return false;
      return true;
    });
  }, [nguyenLieu, filterName, filterUnit]);

  // Show blank page if role is not 'Admin' or 'accountance'
  if (!canAccessAccounting(role)) {
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
        partnerId: partnerId ? Number(partnerId) : undefined,
      });
      setName('');
      setUnit('');
      setQuantity('');
      setDescription('');
      setPartnerId('');
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
    setPartnerId('');
    setError(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Nguyên liệu</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Theo dõi tồn kho nguyên liệu và vật tư thô</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm cursor-pointer"
        >
          <span className="hidden sm:inline">+ Thêm nguyên liệu</span>
          <span className="sm:hidden">+ Thêm</span>
        </button>
      </div>

      <RawMaterialFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          resetForm();
        }}
        partners={partners}
        formValues={{ name, unit, quantity, description, partnerId }}
        error={error}
        submitting={submitting}
        onFieldChange={(field, value) => {
          if (field === 'name') setName(value as string);
          if (field === 'unit') setUnit(value as string);
          if (field === 'quantity') setQuantity(value as number);
          if (field === 'description') setDescription(value as string);
          if (field === 'partnerId') setPartnerId(value === '' ? '' : Number(value));
        }}
        onSubmit={handleCreate}
      />

      <div className="border rounded-lg p-4 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Danh sách nguyên liệu</h2>
          <button
            onClick={loadNguyenLieu}
            className="px-3 py-1 border rounded text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Làm mới
          </button>
        </div>
        <DataTable
          data={filteredNguyenLieu}
          isLoading={loading}
          enableFilter
          filterContent={
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Tên nguyên liệu</label>
                <input
                  value={draftFilterName}
                  onChange={(e) => setDraftFilterName(e.target.value)}
                  placeholder="Nhập tên..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Đơn vị</label>
                <input
                  value={draftFilterUnit}
                  onChange={(e) => setDraftFilterUnit(e.target.value)}
                  placeholder="Nhập đơn vị..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setFilterName(draftFilterName); setFilterUnit(draftFilterUnit); }}
                  className="px-4 py-2 text-sm font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700"
                >
                  Lọc
                </button>
                <button
                  type="button"
                  onClick={() => { setDraftFilterName(''); setDraftFilterUnit(''); setFilterName(''); setFilterUnit(''); }}
                  className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Xóa lọc
                </button>
              </div>
            </div>
          }
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
              render: (n) => <span>{n.quantity.toLocaleString('en-US')}</span>
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



