'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie, formatNumberInput, parseNumberInput } from '@/lib/ultis';
import { toast } from 'sonner';


import { Request, RequestItem, ApiRequest, ApiRequestItem, ApiShortItem } from '@/types';
import { materialApi } from '@/api/materialApi';
import { Modal, DataTable } from '@/components/shared';
import { ArrowLeft, Check, X, FileText, Package, Calendar, User, Building2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ApprovalsPage() {
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
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [editedItems, setEditedItems] = useState<RequestItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState<number | ''>(0);

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
    const discount = Number(totalDiscountAmount || 0);
    return Math.max(0, subtotal - discount);
  };

  const handleReject = async (requestId: number) => {
    setActionLoading(requestId);
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
    } finally {
      setActionLoading(null);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
            <Check className="h-6 w-6" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Duyệt Yêu Cầu</h1>
            <p className="text-gray-500 font-medium">Quản lý và phê duyệt đề nghị vật tư</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/vat-tu"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Vật Tư
          </Link>
          <div className="bg-orange-600 px-4 py-2.5 rounded-xl shadow-lg shadow-orange-200">
            <span className="text-sm font-black text-white">{requests.length} Yêu cầu</span>
          </div>
        </div>
      </div>

      {/* Danh sách yêu cầu */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-700 font-bold mb-4 shadow-sm animate-in slide-in-from-top duration-300">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      <DataTable
        data={requests}
        isLoading={loading}
        emptyMessage="Không có yêu cầu nào cần xử lý"
        columns={[
          {
            key: 'id',
            header: 'Mã số',
            className: 'w-24 font-black text-gray-400',
            render: (it) => <span>#{(it as Request).id}</span>
          },
          {
            key: 'info',
            header: 'Thông tin đề nghị',
            render: (it: unknown) => {
              const req = it as Request;
              return (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="font-bold text-gray-900">{req.requester}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Building2 className="h-3 w-3" />
                    <span>{req.department}</span>
                    <span className="mx-1">•</span>
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(req.date)}</span>
                  </div>
                </div>
              );
            }
          },
          {
            key: 'items',
            header: 'Vật tư',
            className: 'w-32',
            render: (it) => (
              <div className="flex items-center gap-2 text-orange-600 font-black">
                <Package className="h-4 w-4" />
                <span>{(it as Request).totalItems} mục</span>
              </div>
            )
          },
          {
            key: 'total',
            header: 'Ước tính',
            className: 'w-40 text-right',
            render: (it: unknown) => {
              const req = it as Request;
              return req.totalPrice ? (
                <span className="font-black text-green-600">{req.totalPrice.toLocaleString('vi-VN')} đ</span>
              ) : <span className="text-gray-400 italic">N/A</span>;
            }
          },
          {
            key: 'status',
            header: 'Trạng thái',
            className: 'w-32 text-center',
            render: (it) => getStatusBadge((it as Request).status)
          },
          {
            key: 'actions',
            header: '',
            className: 'w-48 text-right',
            render: (it: unknown) => {
              const req = it as Request;
              return (
                <div className="flex items-center justify-end gap-2">
                  {req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={actionLoading === req.id}
                        className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors shadow-sm"
                        title="Duyệt và mua"
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={actionLoading === req.id}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors shadow-sm"
                        title="Từ chối"
                      >
                        <X className="h-4 w-4" strokeWidth={3} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors shadow-sm"
                    title="Xem chi tiết"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </div>
              );
            }
          }
        ]}
      />

      {/* Modal chi tiết */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title={`Chi tiết yêu cầu #${selectedRequest?.id}`}
        size="4xl"
      >
        {selectedRequest && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Người đề nghị</p>
                  <p className="font-black text-gray-900">{selectedRequest.requester}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Phòng ban</p>
                  <p className="font-black text-gray-900">{selectedRequest.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Ngày đề nghị</p>
                  <p className="font-black text-gray-900">{formatDate(selectedRequest.date)}</p>
                </div>
              </div>
            </div>

            <DataTable
              data={selectedRequest.items}
              columns={[
                {
                  key: 'name',
                  header: 'Vật tư',
                  render: (it) => <span className="font-bold text-gray-900">{(it as RequestItem).name}</span>
                },
                {
                  key: 'unit',
                  header: 'ĐVT',
                  className: 'w-24 text-center text-gray-500 font-bold',
                  render: (it) => (it as RequestItem).unit
                },
                {
                  key: 'quantity',
                  header: 'Số lượng',
                  className: 'w-24 text-center font-black text-orange-600',
                  render: (it) => (it as RequestItem).quantity.toLocaleString('vi-VN')
                },
                {
                  key: 'unitPrice',
                  header: 'Đơn giá',
                  className: 'w-32 text-right',
                  render: (it) => {
                    const price = (it as RequestItem).unitPrice;
                    return price ? <span className="text-gray-600 font-bold">{price.toLocaleString('vi-VN')} đ</span> : <span className="text-gray-300">---</span>;
                  }
                },
                {
                  key: 'total',
                  header: 'Thành tiền',
                  className: 'w-32 text-right',
                  render: (it) => {
                    const item = it as RequestItem;
                    const total = (item.unitPrice ?? 0) * item.quantity;
                    return total > 0 ? <span className="text-green-600 font-black">{total.toLocaleString('vi-VN')} đ</span> : <span className="text-gray-300">---</span>;
                  }
                }
              ]}
            />
          </div>
        )}
      </Modal>

      {/* Modal duyệt và mua */}
      <Modal
        isOpen={showApprovalModal}
        onClose={handleCancelApproval}
        title={`Duyệt và mua yêu cầu #${editingRequest?.id}`}
        size="full"
        footer={(
          <>
            <button
              onClick={handleCancelApproval}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmApproval}
              disabled={isSubmitting || editedItems.length === 0}
              className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl bg-orange-600 font-black text-white shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Xác nhận duyệt
                </>
              )}
            </button>
          </>
        )}
      >
        {editingRequest && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Người đề nghị</p>
                  <p className="font-black text-gray-900">{editingRequest.requester}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Phòng ban</p>
                  <p className="font-black text-gray-900">{editingRequest.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center shadow-sm text-gray-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Ngày đề nghị</p>
                  <p className="font-black text-gray-900">{formatDate(editingRequest.date)}</p>
                </div>
              </div>
            </div>

            <DataTable
              data={editedItems}
              emptyMessage="Không có vật tư nào"
              columns={[
                {
                  key: 'name',
                  header: 'Tên vật tư',
                  render: (it) => <span className="font-bold text-gray-900">{(it as RequestItem).name}</span>
                },
                {
                  key: 'unit',
                  header: 'ĐVT',
                  className: 'w-24 text-center font-bold text-gray-500',
                  render: (it) => (it as RequestItem).unit
                },
                {
                  key: 'quantity',
                  header: 'Số lượng mua',
                  className: 'w-32',
                  render: (it) => {
                    const item = it as RequestItem;
                    return (
                      <input
                      type="text"
                      inputMode="decimal"
                      min="1"
                      value={formatNumberInput(item.quantity)}
                      onChange={(e) => {
                        const parsed = parseNumberInput(e.target.value);
                        handleItemChange(item.id, 'quantity', parsed === '' ? 0 : Number(parsed));
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-black text-gray-800 text-right focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                    />
                    );
                  }
                },
                {
                  key: 'unitPrice',
                  header: 'Đơn giá mua (đ)',
                  className: 'w-48',
                  render: (it) => {
                    const item = it as RequestItem;
                    return (
                      <input
                      type="text"
                      inputMode="decimal"
                      min="0"
                      value={formatNumberInput(item.unitPrice || 0)}
                      onChange={(e) => {
                        const parsed = parseNumberInput(e.target.value);
                        handleItemChange(item.id, 'unitPrice', parsed === '' ? 0 : Number(parsed));
                      }}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-black text-gray-800 text-right focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                      placeholder="Nhập giá..."
                    />
                    );
                  }
                },
                {
                  key: 'total',
                  header: 'Thành tiền',
                  className: 'w-40 text-right',
                  render: (it) => {
                    const item = it as RequestItem;
                    const total = (item.unitPrice || 0) * item.quantity;
                    return <span className="font-black text-green-600">{total.toLocaleString('vi-VN')} đ</span>;
                  }
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-16 text-center',
                  render: (it) => (
                    <button
                      onClick={() => handleRemoveItem((it as RequestItem).id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa vật tư"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )
                }
              ]}
            />

            <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 flex flex-col items-end gap-3 max-w-md ml-auto">
              <div className="w-full flex justify-between items-center text-orange-900 opacity-60">
                <span className="font-bold text-sm uppercase">Tổng chưa giảm:</span>
                <span className="font-black">{calculateSubtotal().toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="w-full flex justify-between items-center bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                <span className="font-bold text-sm text-gray-500 uppercase">Giảm giá:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    min="0"
                    max={calculateSubtotal()}
                    value={formatNumberInput(totalDiscountAmount as number | '' | null | undefined)}
                    onChange={(e) => setTotalDiscountAmount(parseNumberInput(e.target.value))}
                    className="w-32 text-right font-black text-red-600 focus:outline-none"
                  />
                  <span className="font-bold text-red-300">đ</span>
                </div>
              </div>
              <div className="w-full h-px bg-orange-200 my-1" />
              <div className="w-full flex justify-between items-center">
                <span className="font-black text-orange-900 text-lg uppercase">Tổng cộng:</span>
                <span className="text-3xl font-black text-orange-600 tracking-tighter">
                  {calculateTotal().toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}