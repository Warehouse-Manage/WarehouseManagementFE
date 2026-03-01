'use client';

import { Modal, DynamicForm, FormField } from '@/components/shared';

interface FundFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingId: number | null;
  fundFormFields: FormField[];
  formValues: {
    type: 'Thu' | 'Chi' | '';
    description: string;
    amount: number | '';
    category: string;
    objectType: string;
    objectName: string;
  };
  error: string | null;
  submitting: boolean;
  suggestions: { id: number; name: string }[];
  loadingSuggestions: boolean;
  onFieldChange: (name: string, value: unknown) => void;
  onSuggestionClick: (suggestion: { id: number; name: string }) => void;
  onSubmit: () => void;
}

export default function FundFormModal({
  isOpen,
  onClose,
  editingId,
  fundFormFields,
  formValues,
  error,
  submitting,
  suggestions,
  loadingSuggestions,
  onFieldChange,
  onSuggestionClick,
  onSubmit
}: FundFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? 'Sửa bản ghi' : 'Thêm bản ghi sổ quỹ'}
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
            {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}

        <DynamicForm
          fields={fundFormFields}
          values={formValues}
          onChange={onFieldChange}
          columns={2}
        />

        {formValues.objectType && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-600">Gợi ý đối tượng</h3>
              {loadingSuggestions && <span className="text-[10px] text-blue-400 italic">Đang tải...</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSuggestionClick(s)}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  {s.name}
                </button>
              ))}
              {!loadingSuggestions && suggestions.length === 0 && (
                <span className="text-xs text-gray-400">Không tìm thấy gợi ý nào</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
