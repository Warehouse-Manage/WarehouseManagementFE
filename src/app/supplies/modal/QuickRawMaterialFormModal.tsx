'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';

interface QuickRawMaterialFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    formValues: {
        name: string;
        unit: string;
        quantity: number | '';
        description: string;
    };
    error: string | null;
    submitting: boolean;
    onFieldChange: (field: string, value: unknown) => void;
    onSubmit: () => void;
}

const buildFields = (): FormField[] => [
    { name: 'name', label: 'Tên nguyên liệu', type: 'text', required: true, placeholder: 'Nhập tên nguyên liệu...' },
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
        ],
    },
    { name: 'quantity', label: 'Số lượng ban đầu', type: 'number', placeholder: 'Nhập số lượng...' },
    { name: 'description', label: 'Mô tả', type: 'textarea', placeholder: 'Nhập mô tả...' },
];

export default function QuickRawMaterialFormModal({
    isOpen,
    onClose,
    formValues,
    error,
    submitting,
    onFieldChange,
    onSubmit,
}: QuickRawMaterialFormModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Thêm nguyên liệu mới"
            size="lg"
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
                        {submitting ? 'Đang lưu...' : 'Lưu nguyên liệu'}
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
                    columns={2}
                />
            </div>
        </Modal>
    );
}
