'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    getUserId,
    getUserName,
    getUserDepartment,
    getUserRole,
    isAdminUser,
    canApproveRequests,
} from '@/lib/ultis';
import { toast } from 'sonner';
import { Request, RequestItem, ApiRequest, ApiShortItem, ApiRequestItem, Material, MaterialPartner } from '@/types';
import { materialApi } from '@/api/materialApi';
import { API_HOST } from '@/api/api';
import { DataTable, Modal, FormField } from '@/components/shared';
import { CheckCircle, XCircle, Eye, Plus, Warehouse, ClipboardCheck, Pencil, Trash2, Users } from 'lucide-react';
import { sendNotification } from '../../../actions/notification';
import { RequestFormModal } from './RequestFormModal';
import Image from 'next/image';

export default function SuppliesPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [department, setDepartment] = useState<string>('');
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRequest, setEditingRequest] = useState<Request | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

    // Delete confirmation
    const [confirmDeleteRequest, setConfirmDeleteRequest] = useState<Request | null>(null);

    // Materials cache (loaded once; passed to the form modal as a prop).
    const [materials, setMaterials] = useState<Material[]>([]);

    // Partners — used by both the partner-cards section and the form modal.
    const [partners, setPartners] = useState<MaterialPartner[]>([]);

    // Approval form state
    const [editedItems, setEditedItems] = useState<RequestItem[]>([]);
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
    const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);

  useEffect(() => {
    const userUserId = getUserId();
    const userUserName = getUserName();
    const userDepartment = getUserDepartment();

    setUserId(userUserId);
    setUserName(userUserName);
    setDepartment(userDepartment);

    if (!userUserId || !userUserName) {
      router.push('/login');
    }

    setIsCheckingAuth(false);
  }, [router]);

  // Fetch materials
  const fetchMaterials = async () => {
    try {
      const data = await materialApi.getMaterials();
      setMaterials(data);
    } catch (err) {
      console.error('Error fetching materials:', err);
    }
  };

  // Fetch material partners
  const fetchPartners = async () => {
    try {
      const data = await materialApi.getMaterialPartners();
      setPartners(data);
    } catch (err) {
      console.error('Error fetching partners:', err);
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchPartners();
  }, []);

  // Fetch requests
    useEffect(() => {
        const fetchRequests = async () => {
            if (!userName) return;

            try {
                setLoading(true);
                setError(null);
                await refreshRequests();
            } catch (e) {
                console.error('Lỗi tải yêu cầu:', e);
                setError('Không thể tải danh sách yêu cầu.');
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, userName]);

  // Filter requests by tab
    const filteredRequests = useMemo(() => {
        if (activeTab === 'all') return requests;
        return requests.filter(r => r.status === activeTab);
    }, [requests, activeTab]);

    // Live role checks: re-read the cookie on every render so a logout/login
    // in another tab (or by the login page redirect) takes effect immediately
    // instead of waiting for the next mount-cycle useEffect.
    const adminUser = isAdminUser();
    const currentUserRole = getUserRole();
    const canApprove = canApproveRequests();

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-bold text-yellow-800">Chờ duyệt</span>;
      case 'approved':
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">Đã duyệt</span>;
      case 'rejected':
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">Đã từ chối</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Map an ApiRequest (server payload) into the page-level Request shape.
    const mapApiRequestToRequest = (rb: ApiRequest): Request => {
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
            requesterId: rb.requesterId,
            partnerId: rb.partnerId,
            partnerName: rb.partnerName || undefined,
            department: rb.department || rb.requester?.role || '',
            date: rb.createdDate || rb.requestDate || new Date().toISOString(),
            status: normalizedStatus,
            items,
            totalItems: items.length,
            totalPrice: rb.totalPrice,
            discountAmount: rb.discountAmount,
            finalTotal: rb.finalTotal,
            paid: rb.paid,
            remain: rb.remain,
            createdAt: rb.createdDate || rb.requestDate || new Date().toISOString(),
        };
    };

    // Re-fetch the request list from the server and replace local state.
    const refreshRequests = async () => {
        if (!userName) return;
        const data = await materialApi.getMaterialRequests({ userName });
        setRequests((data || []).map(mapApiRequestToRequest));
    };

    const getAdminAndApproverUsers = async () => {
        try {
            const res = await fetch('/api/notifications/users-with-subscriptions');
            if (!res.ok) return [];
            const users = await res.json();
            return users.filter((u: { role: string; notificationEnabled: boolean; notificationEndpoint?: string }) =>
                (u.role === 'Admin' || u.role === 'admin company' || u.role === 'approver') &&
                u.notificationEnabled &&
                u.notificationEndpoint
            );
        } catch (error) {
            console.error('Error fetching admin/approver users:', error);
            return [];
        }
    };

    // Submit handler invoked by the create-form modal. The modal already validated
    // the items and produced a normalized payload — we just send it and refresh.
    const handleCreateSubmitFromModal = async (payload: {
        partnerId?: number | null;
        paidAmount?: number;
        items: {
            materialId: number;
            requestedQuantity: number;
            unitPrice?: number;
            discountAmount?: number;
            note?: string;
        }[];
    }) => {
        setSubmitting(true);
        try {
            const currentUserId = userId ? parseInt(userId) : 1;

            await materialApi.createMaterialRequest({
                requesterId: currentUserId,
                paidAmount: adminUser ? payload.paidAmount : undefined,
                partnerId: payload.partnerId ?? undefined,
                department: department || '',
                requestDate: new Date().toISOString(),
                description: '',
                items: payload.items,
            });

            // Notifications: only non-admin requesters — admins auto-approve their own.
            if (currentUserRole === 'user') {
                try {
                    const adminUsers = await getAdminAndApproverUsers();
                    for (const user of adminUsers) {
                        await sendNotification(
                            `Có yêu cầu mua vật tư mới từ ${department || 'phòng ban không xác định'}. Số lượng vật tư: ${payload.items.length}`,
                            user.id.toString(),
                            '/icon-192x192.png',
                            'Yêu cầu mua vật tư mới',
                            {
                                endpoint: user.notificationEndpoint || '',
                                p256dh: user.notificationP256dh || '',
                                auth: user.notificationAuth || '',
                            }
                        );
                    }
                } catch (notificationError) {
                    console.error('Error sending notifications:', notificationError);
                }
            }

            toast.success(
                adminUser
                    ? `Đã tạo và tự động duyệt yêu cầu! (Đã thanh toán: ${(payload.paidAmount || 0).toLocaleString('en-US')} đ)`
                    : 'Tạo yêu cầu thành công! Vui lòng chờ duyệt.'
            );

            setShowCreateModal(false);
            await refreshRequests();
        } catch (error) {
            console.error('Lỗi khi tạo yêu cầu:', error);
            toast.error('Có lỗi xảy ra khi tạo yêu cầu!');
        } finally {
            setSubmitting(false);
        }
    };

    // Open the edit modal. Allowed for everyone when the request is still
    // pending; for approved/rejected requests only admins may reopen it
    // (business rule: post-approval stock moves & partner-debt postings make
    // blind edits risky, so we restrict them to the admin role).
    const handleEdit = (request: Request) => {
        if (request.status !== 'pending' && !adminUser) {
            toast.warning(
                request.status === 'approved'
                    ? 'Yêu cầu đã duyệt — chỉ Admin/Admin Company mới có thể chỉnh sửa.'
                    : 'Yêu cầu đã bị từ chối — chỉ Admin/Admin Company mới có thể chỉnh sửa.'
            );
            return;
        }
        setEditingRequest(request);
        setShowEditModal(true);
    };

    // Soft-delete a request. Allowed for the original requester when pending;
    // for non-pending requests only admins can delete.
    const handleConfirmDelete = async () => {
        if (!confirmDeleteRequest) return;
        if (confirmDeleteRequest.status !== 'pending' && !adminUser) {
            toast.warning(
                confirmDeleteRequest.status === 'approved'
                    ? 'Yêu cầu đã duyệt — chỉ Admin/Admin Company mới có thể xóa.'
                    : 'Yêu cầu đã bị từ chối — chỉ Admin/Admin Company mới có thể xóa.'
            );
            return;
        }
        try {
            await materialApi.deleteMaterialRequest(confirmDeleteRequest.id, userId ? parseInt(userId) : 1);
            toast.success('Đã xóa yêu cầu!');
            setConfirmDeleteRequest(null);
            await Promise.all([refreshRequests(), fetchPartners()]);
        } catch (error) {
            console.error('Lỗi khi xóa yêu cầu:', error);
            toast.error('Có lỗi xảy ra khi xóa yêu cầu!');
        }
    };

    const handleEditSubmitFromModal = async (payload: {
        partnerId?: number | null;
        paidAmount?: number;
        items: {
            materialId: number;
            requestedQuantity: number;
            unitPrice?: number;
            discountAmount?: number;
            note?: string;
        }[];
    }) => {
        if (!editingRequest) return;
        setSubmitting(true);
        try {
            await materialApi.updateMaterialRequest(editingRequest.id, {
                EditorUserId: userId ? parseInt(userId) : 1,
                partnerId: payload.partnerId ?? null,
                department: department || editingRequest.department,
                requestDate: editingRequest.date,
                description: '',
                paidAmount: adminUser ? payload.paidAmount : undefined,
                items: payload.items,
            });
            toast.success('Đã cập nhật yêu cầu!');
            setShowEditModal(false);
            setEditingRequest(null);
            await refreshRequests();
        } catch (error) {
            console.error('Lỗi khi cập nhật yêu cầu:', error);
            const message = (error as { message?: string })?.message || '';
            toast.error(message || 'Có lỗi xảy ra khi cập nhật yêu cầu!');
        } finally {
            setSubmitting(false);
        }
    };

  // Approval handlers
  const handleApprove = (request: Request) => {
    setEditingRequest(request);
    setEditedItems([...request.items]);
    setTotalDiscountAmount(0);
    setShowApprovalModal(true);
  };

  const handleConfirmApproval = async () => {
    if (!editingRequest) return;

    setIsSubmittingApproval(true);
    try {
      const approvalData = {
        approverId: userId ? parseInt(userId) : 1,
        comments: 'Đã duyệt yêu cầu',
        discountAmount: totalDiscountAmount,
        finalTotal: calculateTotal(),
        items: editedItems.map((it) => ({
          materialId: it.id,
          quantity: it.quantity,
          unitPrice: it.unitPrice ?? 0,
        })),
      };

      await materialApi.approveRequest(editingRequest.id, approvalData);

      setRequests(prev => prev.map(req =>
        req.id === editingRequest.id ? { ...req, status: 'approved' as const } : req
      ));

      toast.success('Đã duyệt yêu cầu thành công!');
      setShowApprovalModal(false);
      setEditingRequest(null);
      setEditedItems([]);
    } catch (error) {
      console.error('Lỗi khi duyệt yêu cầu:', error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      const rejectionData = {
        approverId: userId ? parseInt(userId) : 1,
        comments: 'Yêu cầu bị từ chối'
      };

      await materialApi.rejectRequest(requestId, rejectionData);

      setRequests(prev => prev.map(req =>
        req.id === requestId ? { ...req, status: 'rejected' as const } : req
      ));

      toast.success('Đã từ chối yêu cầu!');
    } catch (error) {
      console.error('Lỗi khi từ chối yêu cầu:', error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại!');
    }
  };

  const handleItemChange = (itemId: number, field: keyof RequestItem, value: string | number) => {
    setEditedItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleRemoveApprovalItem = (itemId: number) => {
    if (editedItems.length > 1) {
      setEditedItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      toast.warning('Không thể xóa vật tư cuối cùng.');
    }
  };

  const calculateSubtotal = () => {
    return editedItems.reduce((total, item) => {
      const unitPrice = item.unitPrice || 0;
      const quantity = item.quantity;
      return total + (unitPrice * quantity);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return Math.max(0, subtotal - totalDiscountAmount);
  };

  // Show loading screen
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg text-gray-600">Đang kiểm tra xác thực...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-black text-gray-800">Yêu cầu vật tư</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="h-5 w-5" />
          <span>Thêm yêu cầu</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'Tất cả', icon: Warehouse },
          { key: 'pending', label: 'Chờ duyệt', icon: ClipboardCheck },
          { key: 'approved', label: 'Đã duyệt', icon: CheckCircle },
          { key: 'rejected', label: 'Đã từ chối', icon: XCircle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === key
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {key !== 'all' && (
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                activeTab === key ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                {requests.filter(r => r.status === key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">{error}</div>
      )}

      {/* Table */}
      <DataTable
        data={filteredRequests}
        isLoading={loading}
        columns={[
          {
            key: 'id',
            header: 'Yêu cầu',
            className: 'font-bold text-gray-900',
            render: (r) => <span>#{r.id}</span>
          },
          {
            key: 'requester',
            header: 'Người đề nghị',
            className: 'font-medium',
            render: (r) => (
              <div>
                <div className="text-gray-900">{r.requester}</div>
                <div className="text-xs text-gray-500">{r.department}</div>
              </div>
            )
          },
          {
            key: 'date',
            header: 'Ngày',
            className: 'text-gray-600',
            mobileHidden: true,
            render: (r) => <span>{formatDate(r.date)}</span>
          },
          {
            key: 'status',
            header: 'Trạng thái',
            render: (r) => getStatusBadge(r.status)
          },
          {
            key: 'totalPrice',
            header: 'Tổng tiền',
            headerClassName: 'text-right',
            className: 'text-right',
            mobileHidden: true,
            render: (r) => r.totalPrice ? (
              <span className="font-black text-green-600">{r.totalPrice.toLocaleString('en-US')} đ</span>
            ) : <span className="text-gray-400">---</span>
          },
        ]}
        actions={(r) => [
          ...(canApprove && r.status === 'pending' ? [
            {
              label: 'Duyệt',
              icon: <CheckCircle className="h-4 w-4" />,
              onClick: () => handleApprove(r),
              variant: 'default' as const
            },
            {
              label: 'Từ chối',
              icon: <XCircle className="h-4 w-4" />,
              onClick: () => handleReject(r.id),
              variant: 'danger' as const
            },
          ] : []),
          ...(canApprove || r.requesterId === (userId ? parseInt(userId) : -1) || adminUser ? [
            {
              label: 'Sửa',
              icon: <Pencil className="h-4 w-4" />,
              onClick: () => handleEdit(r),
              variant: 'default' as const
            },
            {
              label: 'Xóa',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => setConfirmDeleteRequest(r),
              variant: 'danger' as const
            },
          ] : []),
          {
            label: 'Chi tiết',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => {
              setSelectedRequest(r);
              setShowDetailModal(true);
            },
            variant: 'default' as const
          }
        ]}
        emptyMessage="Không có yêu cầu nào"
      />

      {/* Partners Section - đối tác & công nợ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Đối tác & công nợ
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg shadow-md hover:shadow-lg font-bold text-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Thêm yêu cầu
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {partners.filter(p => p.isEmployee).length > 0 && (
            <>
              <div className="col-span-full">
                <h3 className="text-sm font-bold text-green-700 uppercase mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Đối tác là nhân viên
                </h3>
              </div>
              {partners.filter(p => p.isEmployee).map((partner) => {
                const remain = partner.amountMoneyTotal - partner.amountMoneyPaid;
                return (
                  <div key={partner.id} className="bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900">{partner.name}</h4>
                        <p className="text-xs text-gray-500">{partner.phoneNumber}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">NV</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Tổng công nợ:</span>
                        <span className="font-bold text-orange-600">{partner.amountMoneyTotal.toLocaleString('en-US')} đ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Đã thanh toán:</span>
                        <span className="font-bold text-green-600">{partner.amountMoneyPaid.toLocaleString('en-US')} đ</span>
                      </div>
                      <div className="h-px bg-gray-200"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-700">Còn lại:</span>
                        <span className={`font-black ${remain > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {remain.toLocaleString('en-US')} đ
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {partners.filter(p => !p.isEmployee).length > 0 && (
            <>
              <div className="col-span-full mt-4">
                <h3 className="text-sm font-bold text-blue-700 uppercase mb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Đối tác / Nhà cung cấp
                </h3>
              </div>
              {partners.filter(p => !p.isEmployee).map((partner) => {
                const remain = partner.amountMoneyTotal - partner.amountMoneyPaid;
                return (
                  <div key={partner.id} className="bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900">{partner.name}</h4>
                        <p className="text-xs text-gray-500">{partner.phoneNumber}</p>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Đối tác</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Tổng công nợ:</span>
                        <span className="font-bold text-orange-600">{partner.amountMoneyTotal.toLocaleString('en-US')} đ</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Đã thanh toán:</span>
                        <span className="font-bold text-green-600">{partner.amountMoneyPaid.toLocaleString('en-US')} đ</span>
                      </div>
                      <div className="h-px bg-gray-200"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-700">Còn lại:</span>
                        <span className={`font-black ${remain > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {remain.toLocaleString('en-US')} đ
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {partners.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Chưa có đối tác nào</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Request Modal (reuses RequestFormModal) */}
      <RequestFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode="create"
        title="Thêm yêu cầu vật tư"
        department={department}
        submitting={submitting}
        materials={materials}
        partners={partners}
        onPartnerCreated={(p) => setPartners(prev => [p, ...prev])}
        onMaterialCreated={(m) => setMaterials(prev => [m, ...prev])}
        onSubmit={handleCreateSubmitFromModal}
      />

      {/* Edit Request Modal (reuses RequestFormModal, prefills with current values) */}
      <RequestFormModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRequest(null);
        }}
        mode="edit"
        title={editingRequest ? `Chỉnh sửa yêu cầu #${editingRequest.id}` : 'Chỉnh sửa yêu cầu'}
        department={editingRequest?.department || department}
        submitting={submitting}
        materials={materials}
        partners={partners}
        initialItems={editingRequest?.items}
        initialPartnerId={editingRequest?.partnerId ?? null}
        initialPaidAmount={editingRequest?.paid ?? null}
        onPartnerCreated={(p) => setPartners(prev => [p, ...prev])}
        onMaterialCreated={(m) => setMaterials(prev => [m, ...prev])}
        onSubmit={handleEditSubmitFromModal}
      />

      {/* Delete-confirm modal */}
      <Modal
        isOpen={!!confirmDeleteRequest}
        onClose={() => setConfirmDeleteRequest(null)}
        title="Xác nhận xóa"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Bạn có chắc chắn muốn xóa yêu cầu
            {confirmDeleteRequest ? <strong className="font-bold"> #{confirmDeleteRequest.id}</strong> : ''}?
            Hành động này sẽ ẩn yêu cầu khỏi danh sách và hoàn lại số tiền công nợ đã ghi nhận với đối tác.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setConfirmDeleteRequest(null)}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 cursor-pointer transition-colors"
            >
              Xóa yêu cầu
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedRequest ? `Chi tiết yêu cầu #${selectedRequest.id}` : ''}
        size="3xl"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Người đề nghị</p>
                <p className="font-semibold text-gray-900">{selectedRequest.requester}</p>
              </div>
              {selectedRequest.partnerName && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Đối tác</p>
                  <p className="font-semibold text-blue-700">{selectedRequest.partnerName}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Phòng ban</p>
                <p className="font-semibold text-gray-900">{selectedRequest.department}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ngày đề nghị</p>
                <p className="font-semibold text-gray-900">{formatDate(selectedRequest.date)}</p>
              </div>
              {selectedRequest.totalPrice !== undefined && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Tổng tiền</p>
                  <p className="font-semibold text-gray-900">{selectedRequest.totalPrice.toLocaleString('en-US')} đ</p>
                </div>
              )}
              {selectedRequest.discountAmount !== undefined && selectedRequest.discountAmount > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Giảm giá</p>
                  <p className="font-semibold text-red-600">{selectedRequest.discountAmount.toLocaleString('en-US')} đ</p>
                </div>
              )}
              {selectedRequest.finalTotal !== undefined && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Thành tiền</p>
                  <p className="font-bold text-green-600">{selectedRequest.finalTotal.toLocaleString('en-US')} đ</p>
                </div>
              )}
              {selectedRequest.paid !== undefined && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Đã thanh toán</p>
                  <p className="font-semibold text-blue-600">{selectedRequest.paid.toLocaleString('en-US')} đ</p>
                </div>
              )}
              {selectedRequest.remain !== undefined && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Còn lại</p>
                  <p className="font-semibold text-orange-600">{selectedRequest.remain.toLocaleString('en-US')} đ</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Danh mục vật tư
              </h3>
              <div className="space-y-3">
                {selectedRequest.items.map((item, index) => (
                  <div key={item.id} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-gray-900">{item.name}</h5>
                          {item.note && <p className="text-xs text-gray-500 mt-1 italic">Ghi chú: {item.note}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Số lượng</p>
                          <p className="text-sm font-bold text-gray-900">{item.quantity.toLocaleString('en-US')} {item.unit}</p>
                        </div>
                        {selectedRequest.status === 'approved' && item.unitPrice && (
                          <>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500 uppercase font-bold">Đơn giá</p>
                              <p className="text-sm font-bold text-gray-900">{item.unitPrice.toLocaleString('en-US')} đ</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500 uppercase font-bold">Chiết khấu</p>
                              <p className="text-sm font-bold text-red-600">{(item.discountAmount || 0).toLocaleString('en-US')} đ</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500 uppercase font-bold">Thành tiền</p>
                              <p className="text-sm font-bold text-green-600">{((item.unitPrice * item.quantity) - (item.discountAmount || 0)).toLocaleString('en-US')} đ</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => { setShowApprovalModal(false); setEditingRequest(null); }}
        title={editingRequest ? `Duyệt yêu cầu #${editingRequest.id}` : ''}
        size="3xl"
      >
        {editingRequest && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
            <div className="grid grid-cols-12 gap-2 text-xs font-bold text-gray-500 uppercase px-2 py-2 bg-gray-50 rounded-lg">
              <div className="col-span-4">Tên vật tư</div>
              <div className="col-span-2">ĐVT</div>
              <div className="col-span-2">Số lượng</div>
              <div className="col-span-2">Đơn giá</div>
              <div className="col-span-2">Thành tiền</div>
            </div>

            {editedItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 font-semibold text-gray-900 truncate">{item.name}</div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={e => handleItemChange(item.id, "unit", e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm text-center"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => handleItemChange(item.id, "quantity", parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm text-center"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.unitPrice || 0}
                    onChange={e => handleItemChange(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm text-center"
                  />
                </div>
                <div className="col-span-1 text-right font-bold text-green-600">
                  {((item.unitPrice || 0) * item.quantity).toLocaleString('en-US')}
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => handleRemoveApprovalItem(item.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-right space-y-1">
                <p className="text-sm text-gray-500">Tạm tính: <span className="font-bold text-gray-900">{calculateSubtotal().toLocaleString('en-US')} đ</span></p>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm text-gray-500">Giảm giá:</span>
                  <input
                    type="number"
                    value={totalDiscountAmount}
                    onChange={e => setTotalDiscountAmount(parseInt(e.target.value) || 0)}
                    className="w-32 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center"
                  />
                </div>
                <p className="text-lg font-black text-green-600">Tổng: {calculateTotal().toLocaleString('en-US')} đ</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={() => { setShowApprovalModal(false); setEditingRequest(null); }}
            className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirmApproval}
            disabled={isSubmittingApproval}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 cursor-pointer"
          >
            {isSubmittingApproval ? 'Đang xử lý...' : 'Duyệt yêu cầu'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
