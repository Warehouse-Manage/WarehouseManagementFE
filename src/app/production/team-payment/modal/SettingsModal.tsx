'use client';

import { useState, useEffect } from 'react';
import { Modal, DynamicForm, FormField } from '@/components/shared';
import { teamPaymentApi } from '@/api';
import { TeamPaymentSettings } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: TeamPaymentSettings | null;
}

export default function SettingsModal({
  isOpen,
  onClose,
  currentSettings
}: SettingsModalProps) {
  const [formData, setFormData] = useState({
    pricePerPackage: 0,
    teamLeaderName: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setFormData({
        pricePerPackage: currentSettings.pricePerPackage,
        teamLeaderName: currentSettings.teamLeaderName
      });
    }
  }, [currentSettings]);

  const handleChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formData.teamLeaderName) {
        setError('Vui lòng nhập tên tổ trưởng');
        return;
      }

      if (formData.pricePerPackage <= 0) {
        setError('Giá trên 1 gòng phải lớn hơn 0');
        return;
      }

      await teamPaymentApi.updateTeamPaymentSettings(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const formFields: FormField[] = [
    { 
      name: 'teamLeaderName', 
      label: 'Tên tổ trưởng', 
      type: 'text', 
      required: true,
      placeholder: 'Nhập tên tổ trưởng...'
    },
    { 
      name: 'pricePerPackage', 
      label: 'Giá trên 1 gòng (đ)', 
      type: 'number', 
      required: true,
      placeholder: 'Nhập giá...'
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài đặt thanh toán tổ ra"
      size="md"
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
            {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
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

        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>Lưu ý:</strong> Các giá trị này sẽ được sử dụng mặc định khi tạo thanh toán mới.
          </p>
        </div>

        <DynamicForm
          fields={formFields}
          values={formData}
          onChange={handleChange}
          columns={1}
        />
      </div>
    </Modal>
  );
}
