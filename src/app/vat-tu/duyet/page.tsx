'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';
import { toast } from 'sonner';
import { Request, RequestItem, ApiRequest, ApiRequestItem, ApiShortItem } from '@/types';
import { materialApi } from '@/api/materialApi';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

export default function DuyetPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const userUserId = getCookie('userId');
    const userUserName = getCookie('userName');

    setUserId(userUserId);
    setUserName(userUserName);

    // Redirect to login if userId or userName is missing
    if (!userUserId || !userUserName) {
      router.push('/login');
    }

    setIsCheckingAuth(false);
  }, [router]);

  useEffect(() => {
    const fetchRequests = async () => {
      // Only fetch if userName is available
      if (!userName) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Build query parameters - always include userName
        const data = await materialApi.getMaterialRequests({ userName });
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
      } catch (e) {
        console.error('Lỗi tải RequestBuys:', e);
        setError('Không thể tải danh sách yêu cầu mua.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [userId, userName]);

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [editedItems, setEditedItems] = useState<RequestItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);

  const handleApprove = async (requestId: number) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    setEditingRequest(request);
    setEditedItems([...request.items]);
    setTotalDiscountAmount(0);
    setShowApprovalModal(true);
  };

  const handleConfirmApproval = async () => {
    if (!editingRequest) return;

    setIsSubmitting(true);
    try {
      const approvalData = {
        approverId: userId ? parseInt(userId) : 1, // Use actual user ID from cookie
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

      // Cập nhật trạng thái yêu cầu trong state local
      setRequests(prev => prev.map(req =>
        req.id === editingRequest.id
          ? { ...req, status: 'approved' as const }
          : req
      ));

      toast.success('Đã duyệt và mua yêu cầu thành công!');
      setShowApprovalModal(false);
      setEditingRequest(null);
      setEditedItems([]);
    } catch (error) {
      console.error('Lỗi khi duyệt yêu cầu:', error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelApproval = () => {
    setShowApprovalModal(false);
    setEditingRequest(null);
    setEditedItems([]);
    setTotalDiscountAmount(0);
  };

  const handleItemChange = (itemId: number, field: keyof RequestItem, value: string | number) => {
    setEditedItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const handleRemoveItem = (itemId: number) => {
    if (editedItems.length > 1) {
      setEditedItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      toast.warning('Không thể xóa vật tư cuối cùng. Yêu cầu phải có ít nhất 1 vật tư.');
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

  const handleReject = async (requestId: number) => {
    try {
      const rejectionData = {
        approverId: userId ? parseInt(userId) : 1, // Use actual user ID from cookie
        comments: 'Yêu cầu bị từ chối'
      };

      await materialApi.rejectRequest(requestId, rejectionData);

      // Cập nhật trạng thái yêu cầu trong state local
      setRequests(prev => prev.map(req =>
        req.id === requestId
          ? { ...req, status: 'rejected' as const }
          : req
      ));

      toast.success('Đã từ chối yêu cầu!');
    } catch (error) {
      console.error('Lỗi khi từ chối yêu cầu:', error);
      toast.error('Có lỗi xảy ra, vui lòng thử lại!');
    }
  };

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

  // Show loading screen while checking authentication
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

  const approvalFormFields: FormField[] = [
    { name: 'discountAmount', label: 'Giảm giá tiền mặt', type: 'number', placeholder: 'Nhập số tiền giảm giá...' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-black text-gray-800">Duyệt yêu cầu mua vật tư</h1>
        <div className="text-sm text-gray-600">
          Tổng: {requests.length} yêu cầu
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-semibold">{error}</div>
      )}

      <DataTable
        data={requests}
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
            header: 'Ngày đề nghị',
            className: 'text-gray-600',
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
            render: (r) => r.totalPrice ? (
              <span className="font-black text-green-600">
                {r.totalPrice.toLocaleString('vi-VN')} đ
              </span>
            ) : <span className="text-gray-400">---</span>
          },
        ]}
        actions={(r) => [
          {
            label: 'Duyệt',
            icon: <CheckCircle className="h-4 w-4" />,
            onClick: () => handleApprove(r.id),
            variant: 'default' as const
          },
          {
            label: 'Từ chối',
            icon: <XCircle className="h-4 w-4" />,
            onClick: () => handleReject(r.id),
            variant: 'danger' as const
          },
          {
            label: 'Chi tiết',
            icon: <Eye className="h-4 w-4" />,
            onClick: () => setSelectedRequest(r),
            variant: 'default' as const
          }
        ].filter(action => {
          if (action.label === 'Duyệt' || action.label === 'Từ chối') {
            return r.status === 'pending';
          }
          return true;
        })}
        emptyMessage="Không có yêu cầu mua vật tư nào"
      />

      {/* Modal chi tiết */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
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
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Phòng ban</p>
                <p className="font-semibold text-gray-900">{selectedRequest.department}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ngày đề nghị</p>
                <p className="font-semibold text-gray-900">{formatDate(selectedRequest.date)}</p>
              </div>
              {selectedRequest.totalPrice && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Tổng tiền</p>
                  <p className="font-black text-green-600">{selectedRequest.totalPrice.toLocaleString('vi-VN')} đ</p>
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
                          <p className="text-sm font-bold text-gray-900">{item.quantity.toLocaleString('vi-VN')} {item.unit}</p>
                        </div>
                        {selectedRequest.status === 'approved' && item.unitPrice && (
                          <div className="text-right">
                            <p className="text-[10px] text-gray-500 uppercase font-bold">Thành tiền</p>
                            <p className="text-sm font-bold text-green-600">{(item.unitPrice * item.quantity).toLocaleString('vi-VN')} đ</p>
                          </div>
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

      {/* Modal duyệt và mua */}
      <Modal
        isOpen={showApprovalModal}
        onClose={handleCancelApproval}
        title={editingRequest ? `Duyệt và mua yêu cầu #${editingRequest.id}` : ''}
        size="4xl"
        footer={
          <>
            <button
              onClick={handleCancelApproval}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmApproval}
              disabled={isSubmitting || editedItems.length === 0}
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-6 py-2 text-sm font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận duyệt và mua'}
            </button>
          </>
        }
      >
        {editingRequest && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-sm font-medium">
              <span className="text-gray-600">Người đề nghị: <span className="text-gray-900 font-bold">{editingRequest.requester}</span></span>
              <span className="text-gray-600">Ngày: <span className="text-gray-900 font-bold">{formatDate(editingRequest.date)}</span></span>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-800">Thông tin mua hàng chi tiết</h3>
              <div className="space-y-3">
                {editedItems.map((item, index) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600 text-xs">
                        {index + 1}
                      </div>
                      <span className="text-sm font-bold text-gray-900">{item.name} ({item.unit})</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-24">
                        <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Số lượng</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Đơn giá (đ)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice || 0}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                        />
                      </div>
                      <div className="w-32 text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Thành tiền</p>
                        <p className="text-sm font-black text-green-600">{((item.unitPrice || 0) * item.quantity).toLocaleString('vi-VN')} đ</p>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-orange-50 rounded-xl border border-orange-100 p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-600">Tổng phụ:</span>
                <span className="text-sm font-bold text-gray-900">{calculateSubtotal().toLocaleString('vi-VN')} đ</span>
              </div>
              <DynamicForm
                fields={approvalFormFields}
                values={{ discountAmount: totalDiscountAmount }}
                onChange={(_, val) => setTotalDiscountAmount(Number(val))}
                columns={1}
              />
              <div className="pt-3 border-t border-orange-200 flex justify-between items-center">
                <span className="text-lg font-black text-gray-900">TỔNG CỘNG:</span>
                <span className="text-2xl font-black text-orange-600">{calculateTotal().toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
