'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';
import { DeviceUnit, DeviceFormData } from '@/types';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceUnits: DeviceUnit[];
  newDevice: DeviceFormData;
  error: string | null;
  onDeviceChange: (field: string, value: unknown) => void;
  onAdd: () => void;
}

const getDeviceFormFields = (units: DeviceUnit[]): FormField[] => [
  { name: 'name', label: 'Tên thiết bị', type: 'text', required: true, placeholder: 'Nhập tên thiết bị...' },
  { name: 'description', label: 'Mô tả', type: 'textarea', placeholder: 'Nhập mô tả...' },
  {
    name: 'deviceUnitId',
    label: 'Đơn vị / Loại thiết bị',
    type: 'select',
    required: true,
    options: units.map(u => ({ value: u.id, label: u.type || 'Không xác định' }))
  },
  { name: 'lowLimit', label: 'Giới hạn dưới', type: 'number', placeholder: '0' },
  { name: 'highLimit', label: 'Giới hạn trên', type: 'number', placeholder: '100' },
  { name: 'value', label: 'Giá trị hiện tại', type: 'text', placeholder: 'Nhập giá trị...' },
  { name: 'isAuto', label: 'Tự động bật/tắt theo lịch', type: 'checkbox' },
  { name: 'start', label: 'Giờ bắt đầu', type: 'time' },
  { name: 'end', label: 'Giờ kết thúc', type: 'time' },
];

export default function AddDeviceModal({
  isOpen,
  onClose,
  deviceUnits,
  newDevice,
  error,
  onDeviceChange,
  onAdd
}: AddDeviceModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm thiết bị mới"
      size="lg"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={onAdd}
            className="rounded-xl bg-orange-600 px-8 py-2.5 text-sm font-black text-white hover:bg-orange-700 transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            Thêm thiết bị
          </button>
        </div>
      }
    >
      <div className="p-2">
        {error && <div className="mb-4 text-red-600 text-sm font-bold bg-red-50 p-4 rounded-xl border border-red-100">{error}</div>}
        <DynamicForm
          fields={getDeviceFormFields(deviceUnits)}
          values={newDevice}
          onChange={onDeviceChange}
          columns={2}
        />
      </div>
    </Modal>
  );
}
