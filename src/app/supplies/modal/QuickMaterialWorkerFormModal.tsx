'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';

interface QuickMaterialWorkerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    formValues: { name: string; phoneNumber: string; note: string };
    error: string | null;
    submitting: boolean;
    onFieldChange: (field: string, value: unknown) => void;
    onSubmit: () => void;
}

const buildFields = (): FormField[] => [
    { name: 'name', label: 'Tên nhân viên', type: 'text', required: true, placeholder: 'Nhập tên nhân viên...' },
    { name: 'phoneNumber', label: 'Số điện thoại', type: 'tel', required: true, placeholder: 'Nhập số điện thoại...' },
    { name: 'note', label: 'Ghi chú', type: 'textarea', placeholder: 'Ghi chú thêm (không bắt buộc)' },
];

export default function QuickMaterialWorkerFormModal({
    isOpen,
    onClose,
    formValues,
    error,
    submitting,
    onFieldChange,
    onSubmit,
}: QuickMaterialWorkerFormModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Thêm nhân viên vật tư"
            size="md"
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={submitting}
                        className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Đang lưu...' : 'Lưu nhân viên'}
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
                <DynamicForm
                    fields={buildFields()}
                    values={formValues}
                    onChange={onFieldChange}
                    columns={1}
                />
            </div>
        </Modal>
    );
}
