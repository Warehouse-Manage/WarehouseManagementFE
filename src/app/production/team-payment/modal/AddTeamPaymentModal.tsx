'use client';

import { useState } from 'react';
import { Modal } from '@/components/shared';
import { getCookie } from '@/lib/ultis';
import { teamPaymentApi } from '@/api';
import { TeamPaymentSettings, PackageProduct, BrokenPackageItem } from '@/types';
import Select from 'react-select';

interface AddTeamPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TeamPaymentSettings | null;
  packageProducts: PackageProduct[];
}

export default function AddTeamPaymentModal({
  isOpen,
  onClose,
  settings,
  packageProducts
}: AddTeamPaymentModalProps) {
  const [todayRemaining, setTodayRemaining] = useState(0);
  const [brokenPackages, setBrokenPackages] = useState<BrokenPackageItem[]>([
    { type: '', quantity: 0 }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const packageProductOptions = packageProducts.map(p => ({
    value: p.name,
    label: p.name
  }));

  const addBrokenPackageRow = () => {
    setBrokenPackages([...brokenPackages, { type: '', quantity: 0 }]);
  };

  const removeBrokenPackageRow = (index: number) => {
    if (brokenPackages.length > 1) {
      setBrokenPackages(brokenPackages.filter((_, i) => i !== index));
    }
  };

  const updateBrokenPackage = (index: number, field: 'type' | 'quantity', value: string | number) => {
    const updated = [...brokenPackages];
    updated[index] = { ...updated[index], [field]: value };
    setBrokenPackages(updated);
  };

  const calculateBrokenPackageAmount = (quantity: number): number => {
    if (!settings) return 0;
    return Math.floor(quantity / 100) * 100000;
  };

  const calculateTotalBrokenAmount = (): number => {
    return brokenPackages.reduce((sum, bp) => {
      if (bp.type && bp.quantity > 0) {
        return sum + calculateBrokenPackageAmount(bp.quantity);
      }
      return sum;
    }, 0);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = parseInt(getCookie('userId') || '0');
      if (!userId) {
        setError('Không tìm thấy thông tin người dùng');
        return;
      }

      // Validate
      const validBrokenPackages = brokenPackages.filter(bp => bp.type && bp.quantity > 0);
      
      await teamPaymentApi.createTeamPayment({
        todayRemaining,
        brokenPackages: validBrokenPackages,
        createdUserId: userId
      });

      // Reset form
      setTodayRemaining(0);
      setBrokenPackages([{ type: '', quantity: 0 }]);
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm thanh toán tổ ra"
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 transition-colors cursor-pointer disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : 'Thêm thanh toán'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">
            {error}
          </div>
        )}

        {/* Gòng còn thừa hôm nay */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gòng còn thừa hôm nay <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={todayRemaining}
            onChange={(e) => setTodayRemaining(parseInt(e.target.value) || 0)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Nhập số gòng..."
          />
        </div>

        {/* Danh sách kiện sổ */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-700">Danh sách kiện sổ</h3>
            <button
              onClick={addBrokenPackageRow}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm loại kiện
            </button>
          </div>

          <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {brokenPackages.map((bp, idx) => {
              const amount = calculateBrokenPackageAmount(bp.quantity);
              return (
                <div key={idx} className="relative rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Loại kiện */}
                    <div className="lg:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Loại kiện</label>
                      <Select
                        className="w-full text-[11px]"
                        placeholder="-- Chọn loại kiện --"
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        value={packageProductOptions.find(o => o.value === bp.type) || null}
                        onChange={(option) => updateBrokenPackage(idx, 'type', option?.value || '')}
                        options={packageProductOptions}
                        styles={{
                          control: (base, state) => ({
                            ...base,
                            borderRadius: '0.5rem',
                            borderColor: state.isFocused ? '#f97316' : '#d1d5db',
                            boxShadow: state.isFocused ? '0 0 0 1px #ffedd5' : 'none',
                            fontSize: '12px',
                            minHeight: '34px',
                            '&:hover': {
                              borderColor: '#f97316'
                            }
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#ffedd5' : 'white',
                            color: state.isSelected ? 'white' : 'black',
                            padding: '4px 8px',
                            fontSize: '11px',
                            '&:active': {
                              backgroundColor: '#f97316'
                            }
                          }),
                          menuPortal: (base) => ({
                            ...base,
                            zIndex: 9999
                          })
                        }}
                      />
                    </div>

                    {/* Số lượng */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Số lượng</label>
                      <input
                        type="number"
                        value={bp.quantity}
                        onChange={(e) => updateBrokenPackage(idx, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>

                    {/* Thành tiền */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Thành tiền</label>
                      <div className="font-bold text-sm text-orange-600 pt-1.5">
                        {amount > 0 ? amount.toLocaleString('en-US') + 'đ' : '0đ'}
                      </div>
                    </div>
                  </div>

                  {/* Nút xóa */}
                  {brokenPackages.length > 1 && (
                    <button
                      onClick={() => removeBrokenPackageRow(idx)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors cursor-pointer"
                    >
                      <span className="text-sm">×</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tổng tiền kiện sổ */}
          <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Tổng tiền kiện sổ:</span>
              <span className="text-xl font-black text-orange-600">
                {calculateTotalBrokenAmount().toLocaleString('en-US')}đ
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
