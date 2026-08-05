'use client';

import { Modal, FormField } from '@/components/shared';
import { useMemo } from 'react';

export interface PurchaseFormItem {
    rowId: string;
    rawMaterialId: number | '';
    name: string;
    unit: string;
    quantity: number | '';
    unitPrice: number | '';
    discount: number | '';
}

interface PurchaseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    submitting: boolean;
    items: PurchaseFormItem[];
    partnerId: number | '';
    paidAmount: number | '';
    discountAmount: number | '';
    materialWorkerId: number | '';
    rawMaterialOptions: { value: number; label: string; unit?: string }[];
    partnerOptions: { value: number; label: string }[];
    workerOptions: { value: number; label: string }[];
    partnerDebt: number | null;
    loadingPartnerDebt: boolean;
    error?: string | null;
    onPartnerIdChange: (id: number | '') => void;
    onMaterialWorkerIdChange: (id: number | '') => void;
    onPaidAmountChange: (value: number | '') => void;
    onDiscountAmountChange: (value: number | '') => void;
    onAddItem: () => void;
    onRemoveItem: (rowId: string) => void;
    onItemChange: (rowId: string, field: keyof PurchaseFormItem, value: string | number | '') => void;
    onAddPartner: () => void;
    onAddRawMaterial: () => void;
    onAddMaterialWorker: () => void;
    onSubmit: () => void;
    title?: string;
    submitLabel?: string;
}

const inputClass = 'w-full rounded-lg border-2 border-gray-100 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all';
const selectClass = 'w-full rounded-lg border-2 border-gray-100 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all';

function NumberField({
    value,
    onChange,
    placeholder,
    className = inputClass,
}: {
    value: number | '';
    onChange: (value: number | '') => void;
    placeholder?: string;
    className?: string;
}) {
    const display = value === '' || value === undefined || value === null ? '' : value.toLocaleString('en-US');

    return (
        <input
            type="text"
            inputMode="decimal"
            value={display}
            placeholder={placeholder}
            onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, '');
                if (raw === '') {
                    onChange('');
                    return;
                }
                if (raw.endsWith('.')) {
                    onChange(Number(raw.slice(0, -1)));
                    return;
                }
                const parsed = Number(raw);
                onChange(Number.isNaN(parsed) ? '' : parsed);
            }}
            onBlur={(e) => {
                if (e.target.value === '') return;
                const parsed = Number(e.target.value.replace(/[^0-9.]/g, ''));
                if (!Number.isNaN(parsed)) {
                    onChange(parsed);
                }
            }}
            className={`${className} text-right font-semibold`}
        />
    );
}

export default function PurchaseFormModal(props: PurchaseFormModalProps) {
    const {
        isOpen,
        onClose,
        submitting,
        items,
        partnerId,
        materialWorkerId,
        paidAmount,
        discountAmount,
        rawMaterialOptions,
        partnerOptions,
        workerOptions,
        partnerDebt,
        loadingPartnerDebt,
        error,
        onPartnerIdChange,
        onMaterialWorkerIdChange,
        onPaidAmountChange,
        onDiscountAmountChange,
        onAddItem,
        onRemoveItem,
        onItemChange,
        onAddPartner,
        onAddRawMaterial,
        onAddMaterialWorker,
        onSubmit,
        title = 'Mua vật tư',
        submitLabel = 'Lưu mua vật tư',
    } = props;

    const totals = useMemo(() => {
        let subtotal = 0;
        items.forEach((item) => {
            if (item.quantity === '' || item.unitPrice === '') return;
            const line = Number(item.quantity) * Number(item.unitPrice);
            subtotal += line;
        });
        const discount = Number(discountAmount || 0);
        const total = Math.max(0, subtotal - discount);
        const paid = Number(paidAmount || 0);
        const remaining = Math.max(0, total - paid);
        return { subtotal, total, paid, remaining };
    }, [items, discountAmount, paidAmount]);

    const partnerSelectValue = partnerId === '' ? '' : String(partnerId);
    const workerSelectValue = materialWorkerId === '' ? '' : String(materialWorkerId);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="4xl"
            footer={
                <>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={submitting}
                        className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-bold text-white hover:bg-orange-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        {submitting ? 'Đang lưu...' : submitLabel}
                    </button>
                </>
            }
        >
            <div className="space-y-5">
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                            Đối tác cung cấp <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-stretch gap-2">
                            <select
                                value={partnerSelectValue}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    onPartnerIdChange(val === '' ? '' : Number(val));
                                }}
                                className={selectClass}
                            >
                                <option value="">Chọn đối tác...</option>
                                {partnerOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={onAddPartner}
                                title="Thêm đối tác mới"
                                className="shrink-0 w-10 rounded-lg bg-orange-600 text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-colors font-bold text-xl leading-none flex items-center justify-center cursor-pointer"
                            >
                                +
                            </button>
                        </div>
                        {partnerId !== '' && (
                            <p className="text-[11px] text-gray-500">
                                {loadingPartnerDebt ? 'Đang tải công nợ...' : partnerDebt === null
                                    ? 'Công nợ: ---'
                                    : `Công nợ đối tác: ${partnerDebt.toLocaleString('en-US')} đ`}
                            </p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                            Nhân viên vật tư
                        </label>
                        <div className="flex items-stretch gap-2">
                            <select
                                value={workerSelectValue}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    onMaterialWorkerIdChange(val === '' ? '' : Number(val));
                                }}
                                className={selectClass}
                            >
                                <option value="">Không có</option>
                                {workerOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={onAddMaterialWorker}
                                title="Thêm nhân viên vật tư mới"
                                className="shrink-0 w-10 rounded-lg bg-orange-600 text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-colors font-bold text-xl leading-none flex items-center justify-center cursor-pointer"
                            >
                                +
                            </button>
                        </div>
                        <p className="text-[11px] text-gray-500">
                            Nếu có, công nợ sẽ được tính cho nhân viên phụ trách.
                        </p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500">Giảm giá tổng</label>
                        <NumberField value={discountAmount} onChange={onDiscountAmountChange} placeholder="0" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500">Số tiền đã trả</label>
                        <NumberField value={paidAmount} onChange={onPaidAmountChange} placeholder="0" />
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-600">Danh sách vật tư mua</h4>
                        <button
                            type="button"
                            onClick={onAddItem}
                            className="inline-flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 hover:bg-orange-100 cursor-pointer"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Thêm dòng
                        </button>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {items.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm italic text-gray-500">
                                Chưa có vật tư nào. Nhấn &quot;Thêm dòng&quot; để bắt đầu.
                            </p>
                        ) : (
                            items.map((item, index) => {
                                const lineTotal =
                                    item.quantity !== '' && item.unitPrice !== ''
                                        ? Number(item.quantity) * Number(item.unitPrice)
                                        : 0;
                                return (
                                    <div
                                        key={item.rowId}
                                        className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-3 items-stretch"
                                    >
                                        <div className="md:col-span-1 md:flex md:items-center md:justify-center">
                                            <span className="text-xs font-black text-gray-400">#{index + 1}</span>
                                        </div>
                                        <div className="md:col-span-5 flex flex-col gap-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                Nguyên vật liệu
                                                <span className="text-gray-400 ml-1 normal-case font-medium">
                                                    {item.unit && `(${item.unit})`}
                                                </span>
                                            </label>
                                            <div className="flex items-stretch gap-2">
                                                <select
                                                    value={item.rawMaterialId === '' ? '' : String(item.rawMaterialId)}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const opt = rawMaterialOptions.find((o) => String(o.value) === val);
                                                        onItemChange(item.rowId, 'rawMaterialId', val === '' ? '' : Number(val));
                                                        onItemChange(item.rowId, 'name', opt?.label ?? '');
                                                        onItemChange(item.rowId, 'unit', opt?.unit ?? '');
                                                    }}
                                                    className={selectClass}
                                                >
                                                    <option value="">Chọn nguyên liệu...</option>
                                                    {rawMaterialOptions.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                            {opt.unit ? ` (${opt.unit})` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={onAddRawMaterial}
                                                    title="Thêm nguyên liệu mới"
                                                    className="shrink-0 w-10 rounded-lg bg-orange-600 text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-colors font-bold text-xl leading-none flex items-center justify-center cursor-pointer"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 flex flex-col gap-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Số lượng</label>
                                            <NumberField
                                                value={item.quantity}
                                                onChange={(value) => onItemChange(item.rowId, 'quantity', value)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="md:col-span-2 flex flex-col gap-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Đơn giá</label>
                                            <NumberField
                                                value={item.unitPrice}
                                                onChange={(value) => onItemChange(item.rowId, 'unitPrice', value)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex flex-col gap-1 text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Thành tiền</p>
                                            <p className="text-sm font-black text-green-600 self-end">
                                                {lineTotal.toLocaleString('en-US')}
                                            </p>
                                        </div>
                                        <div className="md:col-span-1 flex flex-col gap-1 md:items-end">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 md:opacity-0">
                                                Xóa
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => onRemoveItem(item.rowId)}
                                                className="rounded-lg p-2 text-red-500 hover:bg-red-50 cursor-pointer"
                                                title="Xóa dòng"
                                            >
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-bold text-gray-600">Tổng phụ:</span>
                        <span className="font-bold text-gray-900">{totals.subtotal.toLocaleString('en-US')} đ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="font-bold text-gray-600">Giảm giá:</span>
                        <span className="font-bold text-gray-900">- {Number(discountAmount || 0).toLocaleString('en-US')} đ</span>
                    </div>
                    <div className="flex justify-between border-t border-orange-200 pt-2">
                        <span className="text-base font-black text-gray-900">Tổng tiền mua:</span>
                        <span className="text-2xl font-black text-orange-600">{totals.total.toLocaleString('en-US')} đ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="font-bold text-gray-600">Đã trả:</span>
                        <span className="font-bold text-green-600">{totals.paid.toLocaleString('en-US')} đ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="font-bold text-gray-600">Còn lại:</span>
                        <span className="font-bold text-orange-700">{totals.remaining.toLocaleString('en-US')} đ</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
