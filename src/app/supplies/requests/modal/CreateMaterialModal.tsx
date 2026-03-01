'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';

interface CreateMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  createMaterialFormFields: FormField[];
  newMaterial: { name: string; type: string; description: string; imageUrl?: string };
  createError: string | null;
  creatingMaterial: boolean;
  onMaterialChange: (name: string, value: unknown) => void;
  onSubmit: () => void;
}

export default function CreateMaterialModal({
  isOpen,
  onClose,
  createMaterialFormFields,
  newMaterial,
  createError,
  creatingMaterial,
  onMaterialChange,
  onSubmit
}: CreateMaterialModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm vật tư mới vào hệ thống"
      size="lg"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            disabled={creatingMaterial}
            className="px-6 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {creatingMaterial ? "Đang lưu..." : "Lưu vật tư"}
          </button>
        </>
      }
    >
      <DynamicForm
        fields={createMaterialFormFields}
        values={newMaterial as unknown as Record<string, unknown>}
        onChange={onMaterialChange}
        columns={1}
      />
      {createError && <p className="mt-3 text-sm text-red-600 font-medium">{createError}</p>}
    </Modal>
  );
}
