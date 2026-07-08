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
  onQuickCreateClick: () => void;
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
  onSubmit,
  onQuickCreateClick
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
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-600">Chọn đối tượng</h3>
              <div className="flex items-center gap-2">
                {loadingSuggestions && <span className="text-[10px] text-blue-400 italic">Đang tải...</span>}
                <button
                  type="button"
                  onClick={onQuickCreateClick}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                  title={`Thêm ${formValues.objectType} mới`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Thêm mới</span>
                </button>
              </div>
            </div>
            <select
              value={suggestions.find(s => s.name === formValues.objectName)?.id || ''}
              onChange={(e) => {
                const selected = suggestions.find(s => s.id === Number(e.target.value));
                if (selected) onSuggestionClick(selected);
              }}
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loadingSuggestions || suggestions.length === 0}
            >
              <option value="">-- Chọn đối tượng --</option>
              {suggestions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {!loadingSuggestions && suggestions.length === 0 && formValues.objectType && (
              <span className="text-xs text-gray-400 mt-2 block">Không tìm thấy gợi ý nào</span>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
