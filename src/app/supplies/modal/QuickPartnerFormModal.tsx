'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';
import { Partner } from '@/types';

interface QuickPartnerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    formValues: { name: string; phoneNumber: string };
    error: string | null;
    submitting: boolean;
    onFieldChange: (field: string, value: unknown) => void;
    onSubmit: () => void;
}

const buildFields = (): FormField[] => [
    { name: 'name', label: 'Tên đối tác', type: 'text', required: true, placeholder: 'Nhập tên đối tác...' },
    { name: 'phoneNumber', label: 'Số điện thoại', type: 'tel', required: true, placeholder: 'Nhập số điện thoại...' },
];

export default function QuickPartnerFormModal({
    isOpen,
    onClose,
    formValues,
    error,
    submitting,
    onFieldChange,
    onSubmit,
}: QuickPartnerFormModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Thêm đối tác mới"
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
                        {submitting ? 'Đang lưu...' : 'Lưu đối tác'}
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

export type { Partner };
