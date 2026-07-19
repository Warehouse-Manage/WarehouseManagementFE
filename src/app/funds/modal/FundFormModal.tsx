'use client';

import Select from 'react-select';
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
  };
  error: string | null;
  submitting: boolean;
  suggestions: { id: number; name: string }[];
  loadingSuggestions: boolean;
  objectId: number | '';
  objectName: string;
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
  objectId,
  objectName,
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
            {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Lưu'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}

        <DynamicForm
          fields={fundFormFields}
          values={formValues}
          onChange={onFieldChange}
          columns={2}
        />

        {formValues.objectType && (
          <div className="w-full">
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Đối tượng *</label>
            <div className="flex items-stretch gap-2">
              <Select
                className="flex-1 min-w-0 text-sm"
                placeholder={loadingSuggestions ? 'Đang tải...' : '-- Chọn đối tượng --'}
                isDisabled={loadingSuggestions && suggestions.length === 0}
                isLoading={loadingSuggestions}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                options={suggestions.map((s) => ({
                  value: s.id,
                  label: s.name
                }))}
                value={(() => {
                  if (!suggestions.length) return null;
                  const selected = suggestions.find((s) => s.id === objectId || s.name === objectName);
                  return selected ? { value: selected.id, label: selected.name } : null;
                })()}
                onChange={(option) => {
                  if (!option) {
                    onSuggestionClick({ id: 0, name: '' });
                    return;
                  }
                  onSuggestionClick({ id: option.value, name: option.label });
                }}
                noOptionsMessage={() =>
                  loadingSuggestions ? 'Đang tải...' : 'Không tìm thấy gợi ý nào'
                }
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderRadius: '0.5rem',
                    borderColor: state.isFocused ? '#f97316' : '#d1d5db',
                    boxShadow: state.isFocused ? '0 0 0 2px #ffedd5' : 'none',
                    '&:hover': { borderColor: '#f97316' },
                    minHeight: '42px'
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#ffedd5' : 'white',
                    color: state.isSelected ? 'white' : 'black',
                    '&:active': { backgroundColor: '#f97316' }
                  }),
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 9999
                  })
                }}
              />
              <button
                type="button"
                onClick={onQuickCreateClick}
                className="shrink-0 w-10 h-[42px] rounded-lg bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-colors font-bold text-xl leading-none flex items-center justify-center cursor-pointer"
                title={`Thêm ${formValues.objectType} mới`}
              >
                +
              </button>
            </div>
            {!loadingSuggestions && suggestions.length === 0 && formValues.objectType && (
              <span className="text-xs text-gray-400 mt-1.5 block">
                Chưa có {formValues.objectType.toLowerCase()} nào. Bấm <span className="font-bold">+</span> để tạo mới.
              </span>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}