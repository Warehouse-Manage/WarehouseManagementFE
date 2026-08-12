'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, UserPlus, Package, CreditCard } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { Material, MaterialPartner, RequestItem } from '@/types';
import { materialApi } from '@/api/materialApi';
import { API_HOST } from '@/api/api';
import { toast } from 'sonner';
import {
    getUserId,
    getCompanyId,
    isAdminUser as checkIsAdminUser,
    formatNumberInput,
    parseNumberInput,
} from '@/lib/ultis';

/**
 * Local form-state shape. Differs from {@link RequestItem} only in that
 * `quantity` may be the empty string while the user is editing, so the
 * controlled input can clear without flipping NaN. We coerce to a number
 * at submit time.
 */
type RequestItemForm = Omit<RequestItem, 'quantity'> & {
    quantity: number | '';
};

interface RequestFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    title: string;
    department: string;
    /** When omitted (preferred), the modal reads the role cookie directly so
     *  admin vs. non-admin UI is always live. Pass only when the parent
     *  genuinely has a different signal to enforce. */
    isAdminUser?: boolean;
    /** Initial items, used to prefill when editing an existing request. */
    initialItems?: RequestItem[];
    initialPartnerId?: number | null;
    initialPaidAmount?: number | null;
    submitting: boolean;
    materials: Material[];
    partners: MaterialPartner[];
    onPartnerCreated?: (partner: MaterialPartner) => void;
    onMaterialCreated?: (material: Material) => void;
    onSubmit: (payload: {
        partnerId?: number | null;
        paidAmount?: number;
        items: {
            materialId: number;
            requestedQuantity: number;
            unitPrice?: number;
            discountAmount?: number;
            note?: string;
        }[];
    }) => Promise<void> | void;
}

const newBlankItem = (nextId: number): RequestItemForm => ({
    id: nextId,
    name: '',
    unit: '',
    quantity: '',
    unitPrice: undefined,
    discountAmount: 0,
});

export const RequestFormModal: React.FC<RequestFormModalProps> = ({
    isOpen,
    onClose,
    mode,
    title,
    department,
    isAdminUser: isAdminUserProp,
    initialItems,
    initialPartnerId,
    initialPaidAmount,
    submitting,
    materials,
    partners,
    onPartnerCreated,
    onMaterialCreated,
    onSubmit,
}) => {
    const [items, setItems] = useState<RequestItemForm[]>([newBlankItem(1)]);
    const [form, setForm] = useState<{ partnerId: string; paidAmount: string }>({
        partnerId: '',
        paidAmount: '',
    });
    const [openSearchFor, setOpenSearchFor] = useState<number | null>(null);
    const [searchResultsByItem, setSearchResultsByItem] = useState<Record<number, Material[]>>({});

    // Inline-create states
    const [showCreatePartner, setShowCreatePartner] = useState(false);
    const [newPartner, setNewPartner] = useState({ name: '', phoneNumber: '', isEmployee: false });
    const [creatingPartner, setCreatingPartner] = useState(false);

    const [showCreateMaterial, setShowCreateMaterial] = useState(false);
    const [newMaterial, setNewMaterial] = useState({ name: '', type: '', description: '' });
    const [creatingMaterial, setCreatingMaterial] = useState(false);

    // Live role check: prefer the explicit prop when given, otherwise read the
    // cookie on every render so the admin-only UI tracks the current session
    // even if the role changes while the modal is open.
    const isAdminUser = isAdminUserProp ?? checkIsAdminUser();

    // Hydrate prefill values whenever the modal opens.
    useEffect(() => {
        if (!isOpen) return;

        const seedItems: RequestItemForm[] =
            initialItems && initialItems.length > 0
                ? initialItems.map((it, idx) => ({
                    id: it.id ?? idx + 1,
                    name: it.name ?? '',
                    unit: it.unit ?? '',
                    quantity: (it.quantity ?? '') as number | '',
                    unitPrice: it.unitPrice ?? undefined,
                    discountAmount: it.discountAmount ?? 0,
                    note: it.note,
                }))
                : [newBlankItem(1)];

        setItems(seedItems);
        setForm({
            partnerId: initialPartnerId != null ? String(initialPartnerId) : '',
            paidAmount:
                initialPaidAmount != null && initialPaidAmount > 0
                    ? initialPaidAmount.toString()
                    : '',
        });
        setOpenSearchFor(null);
        setSearchResultsByItem({});
        setShowCreatePartner(false);
        setNewPartner({ name: '', phoneNumber: '', isEmployee: false });
        setShowCreateMaterial(false);
        setNewMaterial({ name: '', type: '', description: '' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // ---- Item handlers ----
    const handleItemChange = (itemId: number, field: keyof RequestItemForm, value: string | number) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, [field]: value } as RequestItemForm : item
        ));
    };

    const handleNameInputChange = async (itemId: number, name: string) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, name } : item
        ));
        if (!name.trim()) {
            setOpenSearchFor(null);
            setSearchResultsByItem(prev => ({ ...prev, [itemId]: [] }));
            return;
        }
        try {
            const results = await materialApi.searchMaterials(name);
            setSearchResultsByItem(prev => ({ ...prev, [itemId]: results }));
            setOpenSearchFor(itemId);
        } catch (err) {
            console.error('Lỗi tìm kiếm vật tư:', err);
        }
    };

    const handlePickMaterial = (rowId: number, material: Material) => {
        setItems(prev => prev.map(it =>
            it.id === rowId
                ? { ...it, id: material.id, name: material.name, unit: material.type }
                : it
        ));
        setOpenSearchFor(null);
    };

    const handleRemoveItem = (itemId: number) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(item => item.id !== itemId));
        } else {
            toast.warning('Không thể xóa vật tư cuối cùng.');
        }
    };

    const handleAddItem = () => {
        const lastId = items[items.length - 1]?.id ?? 0;
        setItems(prev => [...prev, newBlankItem(lastId + 1)]);
    };

    // ---- Inline create partner ----
    const handleCreatePartner = async () => {
        if (!newPartner.name.trim() || !newPartner.phoneNumber.trim()) {
            toast.error('Vui lòng nhập tên và số điện thoại');
            return;
        }
        setCreatingPartner(true);
        try {
            const currentUserId = getUserId() || '1';
            const companyId = getCompanyId() || '1';
            const res = await fetch(`${API_HOST}/api/materialpartners`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': currentUserId,
                    'X-Company-Id': companyId,
                },
                body: JSON.stringify({
                    name: newPartner.name,
                    phoneNumber: newPartner.phoneNumber,
                    isEmployee: newPartner.isEmployee,
                }),
            });

            if (res.ok) {
                const created = await res.json();
                onPartnerCreated?.(created);
                setForm(prev => ({ ...prev, partnerId: created.id.toString() }));
                toast.success('Đã tạo đối tác mới!');
                setNewPartner({ name: '', phoneNumber: '', isEmployee: false });
                setShowCreatePartner(false);
            } else {
                const err = await res.json();
                toast.error(err.message || 'Không thể tạo đối tác');
            }
        } catch (err) {
            console.error('Error creating partner:', err);
            toast.error('Có lỗi xảy ra khi tạo đối tác');
        } finally {
            setCreatingPartner(false);
        }
    };

    // ---- Inline create material ----
    const handleCreateMaterial = async () => {
        if (!newMaterial.name.trim() || !newMaterial.type.trim()) {
            toast.error('Vui lòng nhập tên và loại vật tư');
            return;
        }
        setCreatingMaterial(true);
        try {
            const currentUserId = getUserId() || '1';
            const res = await fetch(`${API_HOST}/api/materials`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newMaterial.name,
                    type: newMaterial.type,
                    description: newMaterial.description,
                    amount: 0,
                    creatorId: parseInt(currentUserId) || 1,
                }),
            });
            if (res.ok) {
                const created = await res.json();
                onMaterialCreated?.(created);
                toast.success('Đã tạo vật tư mới!');
                setNewMaterial({ name: '', type: '', description: '' });
                setShowCreateMaterial(false);
            } else {
                const err = await res.json();
                toast.error(err.message || 'Không thể tạo vật tư');
            }
        } catch (err) {
            console.error('Error creating material:', err);
            toast.error('Có lỗi xảy ra khi tạo vật tư');
        } finally {
            setCreatingMaterial(false);
        }
    };

    // ---- Totals ----
    const finalTotal = useMemo(() => items.reduce((total, item) => {
        const unitPrice = item.unitPrice ?? 0;
        const quantity = Number(item.quantity) || 0;
        const discountAmount = item.discountAmount ?? 0;
        return total + (unitPrice * quantity) - discountAmount;
    }, 0), [items]);

    const paidAmountNumber = useMemo(() => {
        if (!isAdminUser) return 0;
        return Number(parseNumberInput(form.paidAmount) ?? 0);
    }, [form.paidAmount, isAdminUser]);

    const remainAmount = useMemo(
        () => Math.max(0, finalTotal - paidAmountNumber),
        [finalTotal, paidAmountNumber]
    );

    // ---- Submit ----
    const handleSubmit = async () => {
        const validItems = items
            .filter(it => it.name && it.quantity !== '' && Number(it.quantity) > 0);

        if (validItems.length === 0) {
            toast.warning('Vui lòng chọn ít nhất 1 vật tư.');
            return;
        }

        const partnerIdValue = form.partnerId ? parseInt(form.partnerId) : null;

        await onSubmit({
            partnerId: partnerIdValue,
            paidAmount: isAdminUser ? paidAmountNumber : undefined,
            items: validItems.map(it => ({
                materialId: it.id,
                requestedQuantity: Number(it.quantity) || 1,
                unitPrice: it.unitPrice ?? 0,
                discountAmount: it.discountAmount ?? 0,
                note: it.note || '',
            })),
        });
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
            >
                Hủy
            </button>
            <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
                {submitting ? 'Đang xử lý...' : (mode === 'edit' ? 'Cập nhật' : 'Gửi yêu cầu')}
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="3xl" footer={footer}>
            <div className="space-y-4">
                {/* Partner Selection */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-bold text-gray-700">Đối tác/Nhà cung cấp</label>
                        <button
                            type="button"
                            onClick={() => setShowCreatePartner(!showCreatePartner)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                        >
                            <UserPlus className="h-3 w-3" />
                            Thêm mới
                        </button>
                    </div>
                    <select
                        value={form.partnerId}
                        onChange={(e) => setForm(prev => ({ ...prev, partnerId: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                    >
                        <option value="">-- Chọn đối tác --</option>
                        {partners.map(p => (
                            <option key={p.id} value={p.id}>{p.name} - {p.phoneNumber} {p.isEmployee ? '(NV)' : ''}</option>
                        ))}
                    </select>

                    {showCreatePartner && (
                        <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                            <h4 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                Thêm đối tác mới
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
                                <input
                                    type="text"
                                    placeholder="Tên đối tác"
                                    value={newPartner.name}
                                    onChange={(e) => setNewPartner(prev => ({ ...prev, name: e.target.value }))}
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Số điện thoại"
                                    value={newPartner.phoneNumber}
                                    onChange={(e) => setNewPartner(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                />
                                <div className="flex items-center">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newPartner.isEmployee}
                                            onChange={(e) => setNewPartner(prev => ({ ...prev, isEmployee: e.target.checked }))}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-700">Là nhân viên</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setShowCreatePartner(false); setNewPartner({ name: '', phoneNumber: '', isEmployee: false }); }}
                                    className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreatePartner}
                                    disabled={creatingPartner}
                                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                                >
                                    {creatingPartner ? 'Đang tạo...' : 'Tạo đối tác'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Department Display */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phòng ban</label>
                    <p className="text-lg font-bold text-gray-900">{department || "---"}</p>
                </div>

                {/* Items Table */}
                <div className="space-y-2">
                    <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase px-2">
                        <div className="col-span-1">STT</div>
                        <div className="col-span-7">Tên vật tư</div>
                        <div className="col-span-2">ĐVT</div>
                        <div className="col-span-2 text-right">Thành tiền</div>
                    </div>

                    {items.map((item, idx) => {
                        const unitPrice = item.unitPrice ?? 0;
                        const quantity = Number(item.quantity) || 0;
                        const discountAmount = item.discountAmount ?? 0;
                        const lineTotal = (unitPrice * quantity) - discountAmount;

                        return (
                            <div
                                key={item.id}
                                className="rounded-xl border border-gray-200 bg-white p-3 space-y-3"
                            >
                                {/* Row 1: STT + Tên vật tư (with typeahead) + Thành tiền + Xóa */}
                                <div className="flex items-start gap-2">
                                    <div className="shrink-0 w-7 h-7 mt-1.5 flex items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">
                                        {idx + 1}
                                    </div>
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={e => handleNameInputChange(item.id, e.target.value)}
                                            placeholder="Nhập tên để tìm..."
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                                        />
                                        {openSearchFor === item.id && (
                                            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-gray-200 bg-white shadow-2xl">
                                                {(searchResultsByItem[item.id]?.length > 0) ? (
                                                    searchResultsByItem[item.id].map(s => (
                                                        <button
                                                            key={s.id}
                                                            type="button"
                                                            onClick={() => handlePickMaterial(item.id, s)}
                                                            className="flex w-full items-center gap-3 px-4 py-2 hover:bg-orange-50 transition-colors cursor-pointer"
                                                        >
                                                            <div className="text-left">
                                                                <div className="text-sm font-bold text-gray-900">{s.name}</div>
                                                                <div className="text-[10px] text-gray-500 uppercase">{s.type} • Tồn: {s.amount}</div>
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 text-sm text-gray-500 italic text-center">Không thấy kết quả</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Thành tiền</div>
                                        <div className="text-sm font-black text-green-600 leading-tight">
                                            {lineTotal.toLocaleString('en-US')}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                        title="Xóa dòng"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Row 2: ĐVT | Số lượng | Đơn giá | Chiết khấu */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">ĐVT</label>
                                        <input
                                            type="text"
                                            value={item.unit}
                                            onChange={e => handleItemChange(item.id, "unit", e.target.value)}
                                            placeholder="ĐVT"
                                            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center font-bold focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Số lượng</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={formatNumberInput(item.quantity as number | '' | null | undefined)}
                                            onChange={e => handleItemChange(item.id, "quantity", e.target.value)}
                                            placeholder="0"
                                            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center font-bold text-orange-600 focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Đơn giá</label>
                                        <input
                                            type="number"
                                            value={item.unitPrice ?? ''}
                                            onChange={e => handleItemChange(item.id, "unitPrice", e.target.value)}
                                            placeholder="0"
                                            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center font-bold focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Chiết khấu</label>
                                        <input
                                            type="number"
                                            value={item.discountAmount ?? 0}
                                            onChange={e => handleItemChange(item.id, "discountAmount", e.target.value)}
                                            placeholder="0"
                                            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center font-bold focus:border-orange-500 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Ghi chú (full-width) */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ghi chú</label>
                                    <input
                                        type="text"
                                        value={item.note || ''}
                                        onChange={e => handleItemChange(item.id, "note", e.target.value)}
                                        placeholder="Ghi chú..."
                                        className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:border-orange-500 outline-none"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Summary */}
                <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-end gap-4">
                        <div className="text-right">
                            <p className="text-xs text-gray-500 font-bold">Tổng tiền</p>
                            <p className="text-lg font-black text-green-600">
                                {finalTotal.toLocaleString('en-US')} đ
                            </p>
                        </div>
                    </div>

                    {isAdminUser && (
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-end gap-3 border-t border-gray-200 pt-3">
                            <div className="text-right">
                                <label className="block text-xs font-bold text-gray-500 mb-1">
                                    Đã thanh toán (admin)
                                </label>
                                <div className="flex items-center gap-2 justify-end">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={formatNumberInput(form.paidAmount)}
                                        onChange={(e) =>
                                            setForm(prev => ({ ...prev, paidAmount: e.target.value }))
                                        }
                                        placeholder="0"
                                        className="w-40 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setForm(prev => ({
                                                ...prev,
                                                paidAmount: finalTotal > 0 ? finalTotal.toString() : '0',
                                            }))
                                        }
                                        disabled={finalTotal <= 0}
                                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
                                    >
                                        <CreditCard className="h-3 w-3" />
                                        Thanh toán đủ
                                    </button>
                                </div>
                            </div>
                            <div className="text-right sm:min-w-[160px]">
                                <p className="text-xs text-gray-500 font-bold">Còn lại</p>
                                <p className={`text-base font-black ${remainAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {remainAmount.toLocaleString('en-US')} đ
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm dòng
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCreateMaterial(!showCreateMaterial)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-orange-200 rounded-lg text-sm font-bold text-orange-600 hover:bg-orange-50 transition-colors shadow-sm cursor-pointer"
                    >
                        <Package className="w-4 h-4" />
                        Thêm vật tư mới
                    </button>
                </div>

                {showCreateMaterial && (
                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 space-y-3">
                        <h4 className="text-sm font-bold text-orange-700 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Thêm vật tư mới
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                            <input
                                type="text"
                                placeholder="Tên vật tư"
                                value={newMaterial.name}
                                onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Loại (ĐVT)"
                                value={newMaterial.type}
                                onChange={(e) => setNewMaterial(prev => ({ ...prev, type: e.target.value }))}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                            />
                            <input
                                type="text"
                                placeholder="Mô tả"
                                value={newMaterial.description}
                                onChange={(e) => setNewMaterial(prev => ({ ...prev, description: e.target.value }))}
                                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => { setShowCreateMaterial(false); setNewMaterial({ name: '', type: '', description: '' }); }}
                                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleCreateMaterial}
                                disabled={creatingMaterial}
                                className="px-4 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 disabled:opacity-50 cursor-pointer"
                            >
                                {creatingMaterial ? 'Đang tạo...' : 'Tạo vật tư'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};