'use client';

import { Modal } from '@/components/shared';

export type QuickObjectType = 'Khách hàng' | 'Đối tác' | 'Nhân viên' | 'Vật tư' | 'Giao hàng' | 'Giám đốc';

interface QuickCreateObjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  objectType: QuickObjectType;
  formData: Record<string, string | number>;
  error: string | null;
  submitting: boolean;
  onFieldChange: (name: string, value: string | number) => void;
  onSubmit: () => void;
}

const objectConfig: Record<QuickObjectType, { title: string; fields: { name: string; label: string; type: string; placeholder: string; required?: boolean }[] }> = {
  'Khách hàng': {
    title: 'Thêm khách hàng mới',
    fields: [
      { name: 'name', label: 'Tên khách hàng', type: 'text', placeholder: 'Nhập tên khách hàng...', required: true },
      { name: 'address', label: 'Địa chỉ', type: 'text', placeholder: 'Nhập địa chỉ...', required: true },
      { name: 'phone', label: 'Số điện thoại', type: 'text', placeholder: 'Nhập số điện thoại...', required: true },
    ]
  },
  'Đối tác': {
    title: 'Thêm đối tác mới',
    fields: [
      { name: 'name', label: 'Tên đối tác', type: 'text', placeholder: 'Nhập tên đối tác...', required: true },
      { name: 'phone', label: 'Số điện thoại', type: 'text', placeholder: 'Nhập số điện thoại...', required: true },
      { name: 'address', label: 'Địa chỉ', type: 'text', placeholder: 'Nhập địa chỉ...' },
    ]
  },
  'Nhân viên': {
    title: 'Thêm nhân viên mới',
    fields: [
      { name: 'name', label: 'Tên nhân viên', type: 'text', placeholder: 'Nhập tên nhân viên...', required: true },
      { name: 'age', label: 'Tuổi', type: 'number', placeholder: 'Nhập tuổi...', required: true },
      { name: 'phone', label: 'Số điện thoại', type: 'text', placeholder: 'Nhập số điện thoại...', required: true },
      { name: 'salary', label: 'Lương', type: 'number', placeholder: 'Nhập lương...', required: true },
    ]
  },
  'Vật tư': {
    title: 'Thêm người phụ trách vật tư mới',
    fields: [
      { name: 'name', label: 'Họ và tên', type: 'text', placeholder: 'Nhập họ và tên...', required: true },
      { name: 'phone', label: 'Số điện thoại', type: 'text', placeholder: 'Nhập số điện thoại...', required: true },
    ]
  },
  'Giao hàng': {
    title: 'Thêm người giao hàng mới',
    fields: [
      { name: 'name', label: 'Tên người giao hàng', type: 'text', placeholder: 'Nhập tên...', required: true },
      { name: 'phone', label: 'Số điện thoại', type: 'text', placeholder: 'Nhập số điện thoại...', required: true },
      { name: 'plateNumber', label: 'Biển số xe', type: 'text', placeholder: 'Nhập biển số xe...', required: true },
    ]
  },
  'Giám đốc': {
    title: 'Thêm giám đốc mới',
    fields: [
      { name: 'name', label: 'Họ và tên', type: 'text', placeholder: 'Nhập họ và tên...', required: true },
      { name: 'phone', label: 'Số điện thoại', type: 'text', placeholder: 'Nhập số điện thoại...', required: true },
    ]
  },
};

export default function QuickCreateObjectModal({
  isOpen,
  onClose,
  objectType,
  formData,
  error,
  submitting,
  onFieldChange,
  onSubmit
}: QuickCreateObjectModalProps) {
  const config = objectConfig[objectType];

  if (!config) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      size="md"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 disabled:opacity-60 cursor-pointer transition-colors disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
        {config.fields.map((field) => (
          <div key={field.name}>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
              {field.label} {field.required && '*'}
            </label>
            <input
              type={field.type}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              placeholder={field.placeholder}
              value={formData[field.name] || ''}
              onChange={(e) => onFieldChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
}
