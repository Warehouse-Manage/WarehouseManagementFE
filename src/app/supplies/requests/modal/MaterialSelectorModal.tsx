'use client';

import { Modal } from '@/components/shared';
import { Material } from '@/types';
import Image from 'next/image';

interface MaterialSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  onSelectMaterial: (material: Material) => void;
}

export default function MaterialSelectorModal({
  isOpen,
  onClose,
  materials,
  onSelectMaterial
}: MaterialSelectorModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chọn vật tư từ kho"
      size="3xl"
      isLoading={false}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {materials.map(m => (
            <button
              key={m.id}
              onClick={() => onSelectMaterial(m)}
              className="flex items-center gap-3 p-3 text-left rounded-xl border border-gray-100 hover:border-orange-300 hover:bg-orange-50 transition-all group cursor-pointer"
            >
              <div className="h-12 w-12 relative flex-shrink-0">
                {m.imageUrl ? (
                  <Image src={m.imageUrl} alt={m.name} fill className="object-cover rounded-lg" />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-orange-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-gray-900 group-hover:text-orange-700 truncate">{m.name}</div>
                <div className="text-[10px] text-gray-500 uppercase font-medium">{m.type} • Có sẵn: {m.amount.toLocaleString('vi-VN')}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
