import React from 'react';
import Image from 'next/image';
import { Material } from '../types';

interface ConfirmModalProps {
    isOpen: boolean;
    material: Material | null;
    quantity: number;
    onQuantityChange: (val: number) => void;
    note: string;
    onNoteChange: (val: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    material,
    quantity,
    onQuantityChange,
    note,
    onNoteChange,
    onConfirm,
    onCancel,
    isSubmitting,
}) => {
    if (!isOpen || !material) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onCancel}></div>
                <div className="relative w-full max-w-md mx-4 rounded-xl bg-white p-4 sm:p-6 shadow-xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg sm:text-xl font-black text-gray-900">Yêu cầu sử dụng vật tư</h2>
                        <button onClick={onCancel} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center gap-3">
                                {material.imageUrl ? (
                                    <div className="relative h-12 w-12">
                                        <Image src={material.imageUrl} alt={material.name} fill className="rounded-lg object-cover" sizes="48px" />
                                    </div>
                                ) : (
                                    <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                                        <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                        </svg>
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold text-gray-900">{material.name}</h3>
                                    <p className="text-sm text-gray-600">ĐVT: {material.type} | Tồn kho: {material.amount.toLocaleString('vi-VN')}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Số lượng yêu cầu</label>
                            <input
                                type="number"
                                min="1"
                                max={material.amount}
                                value={quantity}
                                onChange={(e) => onQuantityChange(Number(e.target.value))}
                                className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Ghi chú (tùy chọn)</label>
                            <textarea
                                value={note}
                                onChange={(e) => onNoteChange(e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button onClick={onCancel} disabled={isSubmitting} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">Hủy</button>
                        <button
                            onClick={onConfirm}
                            disabled={isSubmitting || quantity < 1 || quantity > material.amount}
                            className="inline-flex items-center rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-4 py-2 text-sm font-bold text-white shadow"
                        >
                            {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
