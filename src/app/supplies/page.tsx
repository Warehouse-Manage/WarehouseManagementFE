'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getCookie } from '@/lib/ultis';
import { inventoryApi, materialApi, partnerApi, materialWorkerApi, statisticsApi } from '@/api';
import { Material, MaterialWorker, Partner, RawMaterial, RawMaterialImport } from '@/types';
import { MaterialPurchaseSummary, Request, RequestItem, ApiRequest, ApiRequestItem, ApiShortItem } from '@/types';
import { DataTable } from '@/components/shared';
import { Pencil, Trash2 } from 'lucide-react';
import PurchaseFormModal, { PurchaseFormItem } from './modal/PurchaseFormModal';
import QuickPartnerFormModal from './modal/QuickPartnerFormModal';
import QuickRawMaterialFormModal from './modal/QuickRawMaterialFormModal';
import QuickMaterialWorkerFormModal from './modal/QuickMaterialWorkerFormModal';
import { useConfirm } from '@/hooks/useConfirm';

const STATUS_FILTERS: Array<{ value: 'all' | 'pending' | 'approved' | 'rejected'; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'approved', label: 'Đã duyệt' },
    { value: 'rejected', label: 'Đã từ chối' },
];

interface PartnerOption {
    value: number;
    label: string;
}

export default function SuppliesPage() {
    const router = useRouter();
    const { confirm, ConfirmDialog } = useConfirm();
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    const [activeSection, setActiveSection] = useState<'purchases' | 'requests'>('purchases');
    const [purchases, setPurchases] = useState<RawMaterialImport[]>([]);
    const [loadingPurchases, setLoadingPurchases] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [summary, setSummary] = useState<MaterialPurchaseSummary | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [partnerOptions, setPartnerOptions] = useState<PartnerOption[]>([]);
    const [materialWorkers, setMaterialWorkers] = useState<MaterialWorker[]>([]);
    const [workerOptions, setWorkerOptions] = useState<PartnerOption[]>([]);
    const [partnerDebt, setPartnerDebt] = useState<number | null>(null);
    const [loadingPartnerDebt, setLoadingPartnerDebt] = useState(false);

    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [editingPurchase, setEditingPurchase] = useState<RawMaterialImport | null>(null);
    const [purchaseItems, setPurchaseItems] = useState<PurchaseFormItem[]>([]);
    const [purchasePartnerId, setPurchasePartnerId] = useState<number | ''>('');
    const [purchaseWorkerId, setPurchaseWorkerId] = useState<number | ''>('');
    const [purchasePaidAmount, setPurchasePaidAmount] = useState<number | ''>(0);
    const [purchaseDiscount, setPurchaseDiscount] = useState<number | ''>(0);
    const [submittingPurchase, setSubmittingPurchase] = useState(false);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);

    const [showPartnerForm, setShowPartnerForm] = useState(false);
    const [newPartnerName, setNewPartnerName] = useState('');
    const [newPartnerPhone, setNewPartnerPhone] = useState('');
    const [newPartnerError, setNewPartnerError] = useState<string | null>(null);
    const [submittingNewPartner, setSubmittingNewPartner] = useState(false);

    const [showRawMaterialForm, setShowRawMaterialForm] = useState(false);
    const [newRawMaterialName, setNewRawMaterialName] = useState('');
    const [newRawMaterialUnit, setNewRawMaterialUnit] = useState('');
    const [newRawMaterialQuantity, setNewRawMaterialQuantity] = useState<number | ''>('');
    const [newRawMaterialDescription, setNewRawMaterialDescription] = useState('');
    const [newRawMaterialError, setNewRawMaterialError] = useState<string | null>(null);
    const [submittingNewRawMaterial, setSubmittingNewRawMaterial] = useState(false);

    const [showWorkerForm, setShowWorkerForm] = useState(false);
    const [newWorkerName, setNewWorkerName] = useState('');
    const [newWorkerPhone, setNewWorkerPhone] = useState('');
    const [newWorkerNote, setNewWorkerNote] = useState('');
    const [newWorkerError, setNewWorkerError] = useState<string | null>(null);
    const [submittingNewWorker, setSubmittingNewWorker] = useState(false);

    const [requests, setRequests] = useState<Request[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

    useEffect(() => {
        const id = getCookie('userId');
        const name = getCookie('userName');
        const role = getCookie('role');
        setUserId(id);
        setUserName(name);
        setUserRole(role);
        if (!id || !name) {
            router.push('/login');
        }
    }, [router]);

    const loadSummary = async () => {
        setLoadingSummary(true);
        try {
            const data = await statisticsApi.getMaterialPurchaseSummary();
            setSummary(data);
        } catch (err) {
            console.error('Lỗi tải thống kê mua vật tư:', err);
        } finally {
            setLoadingSummary(false);
        }
    };

    const loadPurchases = async (page: number = currentPage, size: number = pageSize) => {
        setLoadingPurchases(true);
        try {
            const params: Record<string, string | number> = {};
            if (searchTerm.trim()) params.searchTerm = searchTerm.trim();
            if (dateFrom) {
                params.startDate = new Date(`${dateFrom}T00:00:00`).toISOString();
            }
            if (dateTo) {
                params.endDate = new Date(`${dateTo}T23:59:59.999`).toISOString();
            }
            const result = await inventoryApi.getRawMaterialImportsFilter(page, size, params);
            setPurchases(result.data);
            setTotalCount(result.totalCount);
        } catch (err) {
            console.error('Lỗi tải danh sách mua vật tư:', err);
            toast.error('Không thể tải danh sách mua vật tư');
        } finally {
            setLoadingPurchases(false);
        }
    };

    const loadRawMaterials = async () => {
        try {
            const data = await inventoryApi.getRawMaterials();
            setRawMaterials(data);
        } catch (err) {
            console.error('Lỗi tải nguyên liệu:', err);
        }
    };

    const loadPartners = async () => {
        try {
            const data = await partnerApi.getPartners();
            setPartners(data);
            setPartnerOptions(data.map((p) => ({ value: p.id, label: p.name })));
        } catch (err) {
            console.error('Lỗi tải đối tác:', err);
        }
    };

    const loadMaterialWorkers = async () => {
        try {
            const data = await materialWorkerApi.getAll();
            setMaterialWorkers(data);
            setWorkerOptions(data.map((w) => ({ value: w.id, label: w.name })));
        } catch (err) {
            console.error('Lỗi tải nhân viên vật tư:', err);
        }
    };

    const loadRequests = async () => {
        if (!userName) return;
        setLoadingRequests(true);
        try {
            const params: { userName: string; status?: string } = { userName };
            if (statusFilter !== 'all') params.status = statusFilter;
            const data = await materialApi.getMaterialRequests(params);
            const mapped: Request[] = (data || []).map((rb: ApiRequest) => {
                const candidateItems = (rb.items ?? rb.requestItems ?? []) as Array<ApiShortItem | ApiRequestItem>;
                const items: RequestItem[] = candidateItems.map((it) => {
                    if ('name' in it && 'type' in it) {
                        return {
                            id: it.id,
                            name: it.name,
                            unit: it.type,
                            quantity: it.quantity ?? 1,
                            unitPrice: (it as ApiShortItem).unitPrice,
                        };
                    }
                    return {
                        id: it.materialId,
                        name: it.material?.name ?? '',
                        unit: it.material?.type ?? '',
                        quantity: it.quantity ?? 1,
                        unitPrice: (it as ApiRequestItem).unitPrice,
                    };
                });
                const normalizedStatus: 'pending' | 'approved' | 'rejected' =
                    rb.status === 'approved' || rb.status === 'rejected' || rb.status === 'pending'
                        ? (rb.status as 'pending' | 'approved' | 'rejected')
                        : 'pending';
                return {
                    id: rb.id,
                    requester: rb.requesterName || rb.requester?.name || `Người #${rb.requesterId}`,
                    department: rb.department || rb.requester?.role || '',
                    date: rb.createdDate || rb.requestDate || new Date().toISOString(),
                    status: normalizedStatus,
                    items,
                    totalItems: items.length,
                    totalPrice: rb.totalPrice,
                    createdAt: rb.createdDate || rb.requestDate || new Date().toISOString(),
                };
            });
            setRequests(mapped);
        } catch (err) {
            console.error('Lỗi tải yêu cầu mua:', err);
            toast.error('Không thể tải danh sách yêu cầu mua');
        } finally {
            setLoadingRequests(false);
        }
    };

    useEffect(() => {
        loadSummary();
        loadRawMaterials();
        loadPartners();
        loadMaterialWorkers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadPurchases(1, pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, userName]);

    useEffect(() => {
        if (purchasePartnerId === '') {
            setPartnerDebt(null);
            return;
        }
        let cancelled = false;
        setLoadingPartnerDebt(true);
        partnerApi
            .getPartner(Number(purchasePartnerId))
            .then((partner) => {
                if (!cancelled) {
                    const debt = (partner?.amountMoneyTotal ?? 0) - (partner?.amountMoneyPaid ?? 0);
                    setPartnerDebt(debt);
                }
            })
            .catch(() => {
                if (!cancelled) setPartnerDebt(null);
            })
            .finally(() => {
                if (!cancelled) setLoadingPartnerDebt(false);
            });
        return () => {
            cancelled = true;
        };
    }, [purchasePartnerId]);

    const rawMaterialOptions = rawMaterials.map((r) => ({
        value: r.id,
        label: r.name,
        unit: r.unit,
    }));

    const resetPurchaseForm = () => {
        setEditingPurchase(null);
        setPurchaseItems([createEmptyRow()]);
        setPurchasePartnerId('');
        setPurchaseWorkerId('');
        setPurchasePaidAmount(0);
        setPurchaseDiscount(0);
        setPurchaseError(null);
    };

    function createEmptyRow(): PurchaseFormItem {
        return {
            rowId: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            rawMaterialId: '',
            name: '',
            unit: '',
            quantity: '',
            unitPrice: '',
            discount: '',
        };
    }

    const handleOpenCreate = () => {
        resetPurchaseForm();
        setShowPurchaseModal(true);
    };

    const handleCloseModal = () => {
        setShowPurchaseModal(false);
        resetPurchaseForm();
    };

    const handleAddRow = () => {
        setPurchaseItems((prev) => [...prev, createEmptyRow()]);
    };

    const resetNewPartnerForm = () => {
        setNewPartnerName('');
        setNewPartnerPhone('');
        setNewPartnerError(null);
    };

    const handleCreatePartner = async () => {
        if (!newPartnerName.trim() || !newPartnerPhone.trim()) {
            setNewPartnerError('Vui lòng nhập đầy đủ tên và số điện thoại');
            return;
        }
        if (!userId) {
            setNewPartnerError('Không tìm thấy thông tin người dùng');
            return;
        }
        setSubmittingNewPartner(true);
        setNewPartnerError(null);
        try {
            const created = await partnerApi.createPartner({
                name: newPartnerName.trim(),
                phoneNumber: newPartnerPhone.trim(),
                createdUserId: Number(userId),
            });
            await loadPartners();
            setPurchasePartnerId(created.id);
            resetNewPartnerForm();
            setShowPartnerForm(false);
            toast.success('Thêm đối tác thành công');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Không thể tạo đối tác';
            setNewPartnerError(message);
        } finally {
            setSubmittingNewPartner(false);
        }
    };

    const resetNewRawMaterialForm = () => {
        setNewRawMaterialName('');
        setNewRawMaterialUnit('');
        setNewRawMaterialQuantity('');
        setNewRawMaterialDescription('');
        setNewRawMaterialError(null);
    };

    const resetNewWorkerForm = () => {
        setNewWorkerName('');
        setNewWorkerPhone('');
        setNewWorkerNote('');
        setNewWorkerError(null);
    };

    const handleCreateWorker = async () => {
        if (!newWorkerName.trim() || !newWorkerPhone.trim()) {
            setNewWorkerError('Vui lòng nhập đầy đủ tên và số điện thoại');
            return;
        }
        if (!userId) {
            setNewWorkerError('Không tìm thấy thông tin người dùng');
            return;
        }
        setSubmittingNewWorker(true);
        setNewWorkerError(null);
        try {
            const created = await materialWorkerApi.create({
                name: newWorkerName.trim(),
                phoneNumber: newWorkerPhone.trim(),
                note: newWorkerNote.trim() || undefined,
                createdUserId: Number(userId),
            });
            await loadMaterialWorkers();
            setPurchaseWorkerId(created.id);
            resetNewWorkerForm();
            setShowWorkerForm(false);
            toast.success('Thêm nhân viên vật tư thành công');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Không thể tạo nhân viên vật tư';
            setNewWorkerError(message);
        } finally {
            setSubmittingNewWorker(false);
        }
    };

    const handleCreateRawMaterial = async () => {
        if (!newRawMaterialName.trim() || !newRawMaterialUnit) {
            setNewRawMaterialError('Vui lòng nhập tên và đơn vị');
            return;
        }
        if (!userId) {
            setNewRawMaterialError('Không tìm thấy thông tin người dùng');
            return;
        }
        setSubmittingNewRawMaterial(true);
        setNewRawMaterialError(null);
        try {
            const created = await inventoryApi.createRawMaterial({
                name: newRawMaterialName.trim(),
                unit: newRawMaterialUnit,
                quantity: Number(newRawMaterialQuantity || 0),
                description: newRawMaterialDescription.trim(),
                createdUserId: Number(userId),
            });
            await loadRawMaterials();
            const rowId = purchaseItems[purchaseItems.length - 1]?.rowId;
            if (rowId) {
                handleItemFieldChange(rowId, 'rawMaterialId', created.id);
                handleItemFieldChange(rowId, 'name', created.name);
                handleItemFieldChange(rowId, 'unit', created.unit || '');
            }
            resetNewRawMaterialForm();
            setShowRawMaterialForm(false);
            toast.success('Thêm nguyên liệu thành công');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Không thể tạo nguyên liệu';
            setNewRawMaterialError(message);
        } finally {
            setSubmittingNewRawMaterial(false);
        }
    };

    const handleRemoveRow = (rowId: string) => {
        setPurchaseItems((prev) => (prev.length <= 1 ? prev : prev.filter((it) => it.rowId !== rowId)));
    };

    const handleItemFieldChange = (
        rowId: string,
        field: keyof PurchaseFormItem,
        value: string | number | ''
    ) => {
        setPurchaseItems((prev) => prev.map((it) => (it.rowId === rowId ? { ...it, [field]: value } : it)));
    };

    const handleSubmitPurchase = async () => {
        if (purchasePartnerId === '') {
            setPurchaseError('Vui lòng chọn đối tác cung cấp');
            return;
        }
        const validItems = purchaseItems.filter(
            (it) =>
                it.rawMaterialId !== '' &&
                it.quantity !== '' &&
                Number(it.quantity) > 0 &&
                it.unitPrice !== '' &&
                Number(it.unitPrice) >= 0
        );
        if (validItems.length === 0) {
            setPurchaseError('Cần ít nhất một nguyên liệu có số lượng và đơn giá hợp lệ');
            return;
        }
        const userIdStr = userId;
        if (!userIdStr) {
            setPurchaseError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
            return;
        }
        const totalQuantity = validItems.reduce((sum, it) => sum + Number(it.quantity), 0);
        const totalAmount = validItems.reduce(
            (sum, it) => sum + Number(it.quantity) * Number(it.unitPrice),
            0
        );
        const discount = Number(purchaseDiscount || 0);
        const finalAmount = Math.max(0, totalAmount - discount);
        const paid = Number(purchasePaidAmount || 0);
        if (paid > finalAmount) {
            setPurchaseError('Số tiền đã trả không được vượt quá tổng tiền mua');
            return;
        }
        const weightedUnitPrice = totalQuantity > 0 ? finalAmount / totalQuantity : 0;

        setSubmittingPurchase(true);
        setPurchaseError(null);
        try {
            if (editingPurchase) {
                await inventoryApi.updateRawMaterialImport(editingPurchase.id, {
                    id: editingPurchase.id,
                    rawMaterialId: Number(validItems[0].rawMaterialId),
                    quantity: totalQuantity,
                    unitPrice: weightedUnitPrice,
                    discount: Number(purchaseDiscount || 0),
                    totalAmount: finalAmount,
                    paidAmount: Number(purchasePaidAmount || 0),
                    partnerId: Number(purchasePartnerId),
                    materialWorkerId:
                        purchaseWorkerId === '' ? null : Number(purchaseWorkerId),
                });
                toast.success('Cập nhật phiếu mua thành công');
            } else {
                await inventoryApi.importRawMaterial({
                    rawMaterialId: Number(validItems[0].rawMaterialId),
                    quantity: totalQuantity,
                    unitPrice: weightedUnitPrice,
                    discount: Number(purchaseDiscount || 0),
                    totalAmount: finalAmount,
                    paidAmount: Number(purchasePaidAmount || 0),
                    partnerId: Number(purchasePartnerId),
                    materialWorkerId:
                        purchaseWorkerId === '' ? null : Number(purchaseWorkerId),
                    createdUserId: Number(userIdStr),
                });
                toast.success('Mua vật tư thành công');
            }
            handleCloseModal();
            await Promise.all([
                loadPurchases(currentPage, pageSize),
                loadSummary(),
                loadRawMaterials(),
                loadMaterialWorkers(),
            ]);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Không thể lưu phiếu mua';
            setPurchaseError(message);
        } finally {
            setSubmittingPurchase(false);
        }
    };

    const handleEditPurchase = async (item: RawMaterialImport) => {
        try {
            const detail = await inventoryApi.getRawMaterialImportById(item.id);
            setEditingPurchase(detail);
            setPurchasePartnerId(detail.partnerId ?? '');
            setPurchaseWorkerId(detail.materialWorkerId ?? '');
            setPurchasePaidAmount(detail.paidAmount);
            setPurchaseDiscount(detail.discount);
            setPurchaseItems([
                {
                    rowId: `row-${detail.id}`,
                    rawMaterialId: detail.rawMaterialId,
                    name: detail.rawMaterial?.name ?? '',
                    unit: detail.rawMaterial?.unit ?? '',
                    quantity: detail.quantity,
                    unitPrice: detail.unitPrice,
                    discount: detail.discount,
                },
            ]);
            setShowPurchaseModal(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Không thể tải phiếu mua';
            toast.error(message);
        }
    };

    const handleDeletePurchase = async (purchase: RawMaterialImport) => {
        const confirmed = await confirm({
            message: `Bạn có chắc muốn xóa phiếu mua #${purchase.id}? Hành động này sẽ hoàn trả tồn kho, công nợ và phiếu chi liên quan.`,
            variant: 'danger',
            confirmText: 'Xóa',
            cancelText: 'Hủy',
        });
        if (!confirmed) return;
        try {
            await inventoryApi.deleteRawMaterialImport(purchase.id);
            toast.success('Xóa phiếu mua thành công');
            await Promise.all([loadPurchases(currentPage, pageSize), loadSummary(), loadMaterialWorkers()]);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Không thể xóa phiếu mua';
            toast.error(message);
        }
    };

    const handleApproveRequest = async (request: Request) => {
        const availableRawMaterial = rawMaterials[0];
        const availablePartner = partners[0];
        if (!availableRawMaterial || !availablePartner) {
            toast.error('Cần có ít nhất một nguyên liệu và đối tác trước khi duyệt');
            return;
        }
        const confirmed = await confirm({
            message: `Duyệt và mua cho yêu cầu #${request.id}? Bạn cần chọn nguyên liệu và đối tác để hoàn tất phiếu mua.`,
            confirmText: 'Tiếp tục',
            cancelText: 'Hủy',
        });
        if (!confirmed) return;
        const quantity = request.items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
        const unitPrice = request.items.length > 0 ? Number(request.items[0].unitPrice || 0) : 0;
        if (quantity <= 0 || unitPrice <= 0) {
            toast.error('Yêu cầu cần số lượng và đơn giá hợp lệ');
            return;
        }
        const total = request.items.reduce(
            (sum, it) => sum + Number(it.quantity) * Number(it.unitPrice || 0),
            0
        );
        if (!userId) {
            toast.error('Không tìm thấy thông tin người dùng');
            return;
        }
        try {
            await materialApi.approveRequest(request.id, {
                approverId: Number(userId),
                comments: 'Đã duyệt và mua',
                finalTotal: total,
                rawMaterialId: availableRawMaterial.id,
                partnerId: availablePartner.id,
                paidAmount: 0,
                items: request.items.map((it) => ({
                    materialId: it.id,
                    quantity: Number(it.quantity),
                    unitPrice: Number(it.unitPrice || 0),
                })),
            });
            toast.success('Duyệt yêu cầu và tạo phiếu mua thành công');
            await Promise.all([loadRequests(), loadSummary(), loadPurchases(currentPage, pageSize)]);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Không thể duyệt yêu cầu';
            toast.error(message);
        }
    };

    const formatDate = (value?: string) => {
        if (!value) return '';
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN');
    };

    const purchaseColumns = [
        {
            key: 'rawMaterial',
            header: 'Nguyên liệu',
            isMain: true,
            render: (item: RawMaterialImport) => (
                <div className="space-y-1">
                    <div className="font-bold text-gray-900">{item.rawMaterial?.name ?? 'N/A'}</div>
                    <div className="text-xs text-gray-500">#{item.id}</div>
                </div>
            ),
        },
        {
            key: 'quantity',
            header: 'Số lượng',
            render: (item: RawMaterialImport) => (
                <span className="font-semibold text-gray-900">
                    {Number(item.quantity).toLocaleString('en-US')} {item.rawMaterial?.unit ?? ''}
                </span>
            ),
        },
        {
            key: 'unitPrice',
            header: 'Đơn giá',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (item: RawMaterialImport) => (
                <span>{Number(item.unitPrice).toLocaleString('en-US')} đ</span>
            ),
        },
        {
            key: 'totalAmount',
            header: 'Tổng tiền',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (item: RawMaterialImport) => (
                <span className="font-black text-blue-600">{Number(item.totalAmount).toLocaleString('en-US')} đ</span>
            ),
        },
        {
            key: 'paidAmount',
            header: 'Đã trả',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (item: RawMaterialImport) => (
                <span className="font-semibold text-green-600">{Number(item.paidAmount).toLocaleString('en-US')} đ</span>
            ),
        },
        {
            key: 'remaining',
            header: 'Còn lại',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (item: RawMaterialImport) => {
                const remaining = Number(item.totalAmount) - Number(item.paidAmount);
                return (
                    <span className="font-bold text-orange-600">{remaining.toLocaleString('en-US')} đ</span>
                );
            },
        },
        {
            key: 'partner',
            header: 'Đối tác',
            render: (item: RawMaterialImport) => (
                <div className="space-y-1">
                    <div className="font-semibold text-gray-900">{item.partner?.name ?? 'N/A'}</div>
                </div>
            ),
        },
        {
            key: 'worker',
            header: 'NV vật tư',
            render: (item: RawMaterialImport) => (
                <div className="space-y-1">
                    <div className="font-semibold text-gray-900">
                        {item.materialWorker?.name ?? <span className="text-gray-400">---</span>}
                    </div>
                </div>
            ),
        },
        {
            key: 'dateCreated',
            header: 'Ngày mua',
            render: (item: RawMaterialImport) => formatDate(item.dateCreated),
            mobileHidden: true,
        },
    ];

    const requestColumns = [
        {
            key: 'id',
            header: 'Yêu cầu',
            isMain: true,
            render: (r: Request) => <span className="font-bold text-gray-900">#{r.id}</span>,
        },
        {
            key: 'requester',
            header: 'Người đề nghị',
            render: (r: Request) => (
                <div>
                    <div className="font-semibold text-gray-900">{r.requester}</div>
                    <div className="text-xs text-gray-500">{r.department}</div>
                </div>
            ),
        },
        {
            key: 'date',
            header: 'Ngày',
            render: (r: Request) => formatDate(r.date),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (r: Request) => {
                const styles: Record<string, string> = {
                    pending: 'bg-yellow-100 text-yellow-800',
                    approved: 'bg-green-100 text-green-800',
                    rejected: 'bg-red-100 text-red-800',
                };
                const labels: Record<string, string> = {
                    pending: 'Chờ duyệt',
                    approved: 'Đã duyệt',
                    rejected: 'Đã từ chối',
                };
                return (
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${styles[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {labels[r.status] ?? r.status}
                    </span>
                );
            },
        },
        {
            key: 'totalPrice',
            header: 'Tổng tiền',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (r: Request) =>
                r.totalPrice ? (
                    <span className="font-black text-green-600">
                        {Number(r.totalPrice).toLocaleString('en-US')} đ
                    </span>
                ) : (
                    <span className="text-gray-400">---</span>
                ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Mua vật tư</h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
                        Theo dõi chi phí mua nguyên liệu, tiền đã trả và công nợ với đối tác
                    </p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm cursor-pointer"
                >
                    + Mua vật tư
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Số phiếu mua',
                        value: summary?.purchaseCount ?? 0,
                        hint: 'Tổng số lần mua',
                        color: 'blue',
                    },
                    {
                        label: 'Tổng tiền mua',
                        value: summary ? `${summary.totalPurchased.toLocaleString('en-US')} đ` : '---',
                        hint: 'Cộng dồn các phiếu nhập',
                        color: 'orange',
                    },
                    {
                        label: 'Đã thanh toán',
                        value: summary ? `${summary.totalPaid.toLocaleString('en-US')} đ` : '---',
                        hint: 'Tổng tiền đã trả đối tác',
                        color: 'green',
                    },
                    {
                        label: 'Công nợ',
                        value: summary ? `${summary.totalDebt.toLocaleString('en-US')} đ` : '---',
                        hint: `${summary?.partnerCount ?? 0} đối tác • ${summary?.pendingRequestCount ?? 0} yêu cầu chờ`,
                        color: 'red',
                    },
                ].map((card) => (
                    <div
                        key={card.label}
                        className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm"
                    >
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">{card.label}</p>
                        <p className="text-2xl font-black text-gray-900 mt-2">{card.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{card.hint}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 bg-white rounded-2xl p-1 border border-gray-100 shadow-sm w-fit">
                {[
                    { key: 'purchases', label: 'Danh sách đã mua' },
                    { key: 'requests', label: 'Yêu cầu chờ duyệt' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveSection(tab.key as 'purchases' | 'requests')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                            activeSection === tab.key
                                ? 'bg-orange-600 text-white shadow'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeSection === 'purchases' && (
                <DataTable
                    data={purchases}
                    columns={purchaseColumns}
                    isLoading={loadingPurchases}
                    enableFilter
                    filterContent={
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Tìm nguyên liệu/đối tác</label>
                                <input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Nhập từ khóa..."
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Từ ngày</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Đến ngày</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    min={dateFrom || undefined}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => loadPurchases(1, pageSize)}
                                    className="px-4 py-2 text-sm font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700 cursor-pointer"
                                >
                                    Lọc
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setDateFrom('');
                                        setDateTo('');
                                        loadPurchases(1, pageSize);
                                    }}
                                    className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                    Xóa lọc
                                </button>
                            </div>
                        </div>
                    }
                    enablePagination
                    totalCount={totalCount}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={(page) => {
                        setCurrentPage(page);
                        loadPurchases(page, pageSize);
                    }}
                    onPageSizeChange={(newSize) => {
                        setPageSize(newSize);
                        setCurrentPage(1);
                        loadPurchases(1, newSize);
                    }}
                    emptyMessage="Chưa có phiếu mua vật tư nào"
                    actions={(item) => [
                        {
                            label: 'Sửa',
                            icon: <Pencil className="h-4 w-4" />,
                            onClick: () => handleEditPurchase(item),
                        },
                        {
                            label: 'Xóa',
                            icon: <Trash2 className="h-4 w-4" />,
                            onClick: () => handleDeletePurchase(item),
                            variant: 'danger',
                        },
                    ]}
                />
            )}

            {activeSection === 'requests' && (
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {STATUS_FILTERS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setStatusFilter(opt.value)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold cursor-pointer ${
                                    statusFilter === opt.value
                                        ? 'bg-orange-600 text-white shadow'
                                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <DataTable
                        data={requests}
                        columns={requestColumns}
                        isLoading={loadingRequests}
                        actions={(request) =>
                            request.status === 'pending' && (userRole === 'Admin' || userRole === 'approver' || userRole === 'admin company')
                                ? [
                                    {
                                        label: 'Duyệt & mua',
                                        icon: <Pencil className="h-4 w-4" />,
                                        onClick: () => {
                                            void handleApproveRequest(request);
                                        },
                                    },
                                ]
                                : []
                        }
                        emptyMessage={
                            statusFilter === 'pending'
                                ? 'Không có yêu cầu mua vật tư nào đang chờ duyệt'
                                : 'Không có yêu cầu mua vật tư nào'
                        }
                    />
                </div>
            )}

            <PurchaseFormModal
                isOpen={showPurchaseModal}
                onClose={handleCloseModal}
                submitting={submittingPurchase}
                items={purchaseItems}
                partnerId={purchasePartnerId}
                materialWorkerId={purchaseWorkerId}
                paidAmount={purchasePaidAmount}
                discountAmount={purchaseDiscount}
                rawMaterialOptions={rawMaterialOptions}
                partnerOptions={partnerOptions}
                workerOptions={workerOptions}
                partnerDebt={partnerDebt}
                loadingPartnerDebt={loadingPartnerDebt}
                error={purchaseError}
                onPartnerIdChange={setPurchasePartnerId}
                onMaterialWorkerIdChange={setPurchaseWorkerId}
                onPaidAmountChange={setPurchasePaidAmount}
                onDiscountAmountChange={setPurchaseDiscount}
                onAddItem={handleAddRow}
                onRemoveItem={handleRemoveRow}
                onItemChange={handleItemFieldChange}
                onAddPartner={() => setShowPartnerForm(true)}
                onAddRawMaterial={() => setShowRawMaterialForm(true)}
                onAddMaterialWorker={() => setShowWorkerForm(true)}
                onSubmit={handleSubmitPurchase}
                title={editingPurchase ? `Sửa phiếu mua #${editingPurchase.id}` : 'Mua vật tư'}
                submitLabel={editingPurchase ? 'Cập nhật phiếu mua' : 'Lưu mua vật tư'}
            />

            <QuickPartnerFormModal
                isOpen={showPartnerForm}
                onClose={() => {
                    setShowPartnerForm(false);
                    resetNewPartnerForm();
                }}
                formValues={{ name: newPartnerName, phoneNumber: newPartnerPhone }}
                error={newPartnerError}
                submitting={submittingNewPartner}
                onFieldChange={(field, value) => {
                    if (field === 'name') setNewPartnerName(value as string);
                    if (field === 'phoneNumber') setNewPartnerPhone(value as string);
                }}
                onSubmit={handleCreatePartner}
            />

            <QuickRawMaterialFormModal
                isOpen={showRawMaterialForm}
                onClose={() => {
                    setShowRawMaterialForm(false);
                    resetNewRawMaterialForm();
                }}
                formValues={{
                    name: newRawMaterialName,
                    unit: newRawMaterialUnit,
                    quantity: newRawMaterialQuantity,
                    description: newRawMaterialDescription,
                }}
                error={newRawMaterialError}
                submitting={submittingNewRawMaterial}
                onFieldChange={(field, value) => {
                    if (field === 'name') setNewRawMaterialName(value as string);
                    if (field === 'unit') setNewRawMaterialUnit(value as string);
                    if (field === 'quantity') setNewRawMaterialQuantity(value === '' ? '' : Number(value));
                    if (field === 'description') setNewRawMaterialDescription(value as string);
                }}
                onSubmit={handleCreateRawMaterial}
            />

            <QuickMaterialWorkerFormModal
                isOpen={showWorkerForm}
                onClose={() => {
                    setShowWorkerForm(false);
                    resetNewWorkerForm();
                }}
                formValues={{
                    name: newWorkerName,
                    phoneNumber: newWorkerPhone,
                    note: newWorkerNote,
                }}
                error={newWorkerError}
                submitting={submittingNewWorker}
                onFieldChange={(field, value) => {
                    if (field === 'name') setNewWorkerName(value as string);
                    if (field === 'phoneNumber') setNewWorkerPhone(value as string);
                    if (field === 'note') setNewWorkerNote(value as string);
                }}
                onSubmit={handleCreateWorker}
            />

            {summary && (summary.partners.length > 0 || (summary.workers && summary.workers.length > 0)) && (
                <div className="space-y-6">
                    {summary.partners.length > 0 && (
                        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                            <h3 className="text-base font-black text-gray-900 mb-4">Công nợ theo đối tác</h3>
                            <DataTable
                                data={summary.partners.map((p) => ({ ...p, id: p.partnerId }))}
                                columns={[
                                    {
                                        key: 'partnerName',
                                        header: 'Đối tác',
                                        isMain: true,
                                        render: (p) => (
                                            <div>
                                                <div className="font-bold text-gray-900">{p.partnerName}</div>
                                                <div className="text-xs text-gray-500">{p.phoneNumber}</div>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'totalPurchased',
                                        header: 'Số tiền đã mua',
                                        headerClassName: 'text-right',
                                        className: 'text-right',
                                        render: (p) => (
                                            <span className="font-semibold text-blue-600">
                                                {p.totalPurchased.toLocaleString('en-US')} đ
                                            </span>
                                        ),
                                    },
                                    {
                                        key: 'totalPaid',
                                        header: 'Đã trả',
                                        headerClassName: 'text-right',
                                        className: 'text-right',
                                        render: (p) => (
                                            <span className="font-semibold text-green-600">
                                                {p.totalPaid.toLocaleString('en-US')} đ
                                            </span>
                                        ),
                                    },
                                    {
                                        key: 'debt',
                                        header: 'Còn nợ',
                                        headerClassName: 'text-right',
                                        className: 'text-right',
                                        render: (p) => (
                                            <span className="font-black text-orange-600">
                                                {p.debt.toLocaleString('en-US')} đ
                                            </span>
                                        ),
                                    },
                                    {
                                        key: 'purchaseCount',
                                        header: 'Số phiếu',
                                        headerClassName: 'text-right',
                                        className: 'text-right',
                                        render: (p) => (
                                            <span className="font-semibold">{p.purchaseCount}</span>
                                        ),
                                    },
                                ]}
                                emptyMessage="Chưa có dữ liệu đối tác"
                            />
                        </div>
                    )}

                    {summary.workers && summary.workers.length > 0 && (
                        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                            <h3 className="text-base font-black text-gray-900 mb-4">Công nợ theo nhân viên vật tư</h3>
                            <DataTable
                                data={summary.workers.map((w) => ({ ...w, id: w.workerId }))}
                                columns={[
                                    {
                                        key: 'workerName',
                                        header: 'Nhân viên',
                                        isMain: true,
                                        render: (w) => (
                                            <div>
                                                <div className="font-bold text-gray-900">{w.workerName}</div>
                                                <div className="text-xs text-gray-500">{w.phoneNumber}</div>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: 'totalPurchased',
                                        header: 'Số tiền đã mua',
                                        headerClassName: 'text-right',
                                        className: 'text-right',
                                        render: (w) => (
                                            <span className="font-semibold text-blue-600">
                                                {w.totalPurchased.toLocaleString('en-US')} đ
                                            </span>
                                        ),
                                    },
                                    {
                                        key: 'debt',
                                        header: 'Còn nợ',
                                        headerClassName: 'text-right',
                                        className: 'text-right',
                                        render: (w) => (
                                            <span className="font-black text-orange-600">
                                                {w.debt.toLocaleString('en-US')} đ
                                            </span>
                                        ),
                                    },
                                    {
                                        key: 'purchaseCount',
                                        header: 'Số phiếu',
                                        headerClassName: 'text-right',
                                        className: 'text-right',
                                        render: (w) => (
                                            <span className="font-semibold">{w.purchaseCount}</span>
                                        ),
                                    },
                                ]}
                                emptyMessage="Chưa có dữ liệu nhân viên vật tư"
                            />
                        </div>
                    )}
                </div>
            )}

            {ConfirmDialog}
        </div>
    );
}