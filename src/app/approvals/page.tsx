'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/ultis';


type RequestItem = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  note?: string;
  unitPrice?: number;
  discount?: number;
};

type Request = {
  id: number;
  requester: string;
  department: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  items: RequestItem[];
  totalItems: number;
  totalPrice?: number;
  createdAt: string;
};

// Kiểu dữ liệu phản hồi API (một phần)
type ApiShortItem = {
  id: number;
  name: string;
  type: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
};
type ApiRequestItem = {
  id: number;
  materialRequestId: number;
  materialId: number;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  note?: string;
  material?: { id: number; name: string; type: string };
};
type ApiRequest = {
  id: number;
  requesterId: number;
  requesterName?: string;
  department: string;
  requestDate: string;
  status: string;
  description?: string;
  createdDate: string;
  updatedDate?: string | null;
  totalPrice?: number;
  requester?: { id: number; userName: string; name: string; role: string; email: string };
  requestItems?: ApiRequestItem[];
  items?: ApiShortItem[];
};

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
        const params = new URLSearchParams();
        params.append('userName', userName);
        
        const queryString = params.toString();
        const url = `${process.env.NEXT_PUBLIC_API_HOST}/api/materialrequests?${queryString}`;
        
        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!resp.ok) {
          const errText = await resp.text().catch(() => '');
          throw new Error(`HTTP ${resp.status} ${resp.statusText} ${errText}`);
        }
        const data: ApiRequest[] = await resp.json();
        const mapped: Request[] = (data || []).map((rb) => {
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/materialrequests/${editingRequest.id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approvalData),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} ${errText}`);
      }
      
      // Cập nhật trạng thái yêu cầu trong state local
      setRequests(prev => prev.map(req => 
        req.id === editingRequest.id 
          ? { ...req, status: 'approved' as const }
          : req
      ));
      
      alert('Đã duyệt và mua yêu cầu thành công!');
      setShowApprovalModal(false);
      setEditingRequest(null);
      setEditedItems([]);
    } catch (error) {
      console.error('Lỗi khi duyệt yêu cầu:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại!');
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
      alert('Không thể xóa vật tư cuối cùng. Yêu cầu phải có ít nhất 1 vật tư.');
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
    setActionLoading(requestId);
    try {
      const rejectionData = {
        approverId: userId ? parseInt(userId) : 1, // Use actual user ID from cookie
        comments: 'Yêu cầu bị từ chối'
      };
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/materialrequests/${requestId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rejectionData),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} ${errText}`);
      }
      
      // Cập nhật trạng thái yêu cầu trong state local
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { ...req, status: 'rejected' as const }
          : req
      ));
      
      alert('Đã từ chối yêu cầu!');
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-black text-gray-800">Duyệt yêu cầu mua vật tư</h1>
        <div className="text-sm text-gray-600">
          Tổng: {requests.length} yêu cầu
        </div>
      </div>

      {/* Danh sách yêu cầu */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-600">Đang tải danh sách yêu cầu...</div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}
      {!loading && !error && (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-4 sm:p-6">
                {/* Header with title, status and action buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <h3 className="text-base sm:text-lg font-black text-gray-900">Yêu cầu #{request.id}</h3>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  {/* Action buttons - moved to header for mobile */}
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={actionLoading === request.id}
                          className="inline-flex items-center justify-center rounded-lg bg-green-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionLoading === request.id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="hidden sm:inline">Đang xử lý...</span>
                              <span className="sm:hidden">Đang xử lý</span>
                            </>
                          ) : (
                            <>
                              <span className="hidden sm:inline">Duyệt và mua</span>
                              <span className="sm:hidden">Duyệt</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={actionLoading === request.id}
                          className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <span className="hidden sm:inline">Xem chi tiết</span>
                      <span className="sm:hidden">Chi tiết</span>
                    </button>
                  </div>
                </div>
                
                {/* Request details */}
                <div className="flex-1">
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Người đề nghị</p>
                      <p className="font-bold text-gray-900">{request.requester}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phòng ban</p>
                      <p className="font-bold text-gray-900">{request.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Ngày đề nghị</p>
                      <p className="font-bold text-gray-900">{formatDate(request.date)}</p>
                    </div>
                    {request.totalPrice && (
                      <div>
                        <p className="text-sm text-gray-500">Tổng tiền</p>
                        <p className="font-black text-lg text-green-600">{request.totalPrice.toLocaleString('vi-VN')} VNĐ</p>
                      </div>
                    )}
                  </div>

                  {/* Materials section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <svg className="h-4 w-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Danh mục vật tư
                      </h4>
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                        {request.totalItems} mục
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="space-y-3">
                        {request.items.map((item, index) => (
                          <div key={item.id} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-bold text-orange-600">{index + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h5>
                                  {item.note && (
                                    <p className="text-xs text-gray-500 mt-1 italic">Ghi chú: {item.note}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">ĐVT</div>
                                  <div className="text-sm font-bold text-gray-700 mt-1">{item.unit}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Số lượng</div>
                                  <div className="text-sm font-bold text-gray-700 mt-1">{item.quantity.toLocaleString('vi-VN')}</div>
                                </div>
                                {request.status === 'approved' && (
                                  <>
                                    <div className="text-center">
                                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Đơn giá</div>
                                      <div className="text-sm font-bold text-gray-700 mt-1">{(item.unitPrice ?? 0).toLocaleString('vi-VN')} đ</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Thành tiền</div>
                                      <div className="text-sm font-bold text-green-600 mt-1">
                                        {(((item.unitPrice ?? 0) * item.quantity) || 0).toLocaleString('vi-VN')} đ
                                      </div>
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
                </div>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">Không có yêu cầu nào</div>
          )}
        </div>
      )}

      {/* Modal chi tiết */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setSelectedRequest(null)}></div>
            <div className="relative w-full max-w-4xl rounded-xl bg-white mx-4 p-4 sm:p-6 shadow-xl">
              <div className="mb-4 sm:mb-6 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Chi tiết yêu cầu #{selectedRequest.id}</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-sm text-gray-500">Người đề nghị</p>
                    <p className="font-medium text-gray-900">{selectedRequest.requester}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phòng ban</p>
                    <p className="font-medium text-gray-900">{selectedRequest.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ngày đề nghị</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedRequest.date)}</p>
                  </div>
                  {selectedRequest.totalPrice && (
                    <div>
                      <p className="text-sm text-gray-500">Tổng tiền</p>
                      <p className="font-semibold text-base sm:text-lg text-green-600">{selectedRequest.totalPrice.toLocaleString('vi-VN')} đ</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <svg className="h-4 sm:h-5 w-4 sm:w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Danh mục vật tư
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-medium text-orange-800">
                      {selectedRequest.items.length} mục
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4">
                    <div className="space-y-3">
                      {selectedRequest.items.map((item, index) => (
                        <div key={item.id} className="bg-white rounded-lg border border-gray-100 p-3 sm:p-4 shadow-sm">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-orange-600">{index + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h5>
                                {item.note && (
                                  <p className="text-xs text-gray-500 mt-1 italic">Ghi chú: {item.note}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 lg:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                              <div className="text-center">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">ĐVT</div>
                                <div className="text-sm font-bold text-gray-700 mt-1">{item.unit}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Số lượng</div>
                                <div className="text-sm font-bold text-gray-700 mt-1">{item.quantity.toLocaleString('vi-VN')}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Đơn giá</div>
                                <div className="text-sm font-bold text-gray-700 mt-1">{(item.unitPrice ?? 0).toLocaleString('vi-VN')} đ</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Thành tiền</div>
                                <div className="text-sm font-bold text-green-600 mt-1">
                                  {(((item.unitPrice ?? 0) * item.quantity) || 0).toLocaleString('vi-VN')} đ
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal duyệt và mua */}
      {showApprovalModal && editingRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleCancelApproval}></div>
            <div className="relative w-full max-w-6xl rounded-xl bg-white mx-4 p-4 sm:p-6 shadow-xl">
              <div className="mb-4 sm:mb-6 flex items-center justify-between">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Duyệt và mua yêu cầu #{editingRequest.id}</h2>
                <button
                  onClick={handleCancelApproval}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Thông tin yêu cầu */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-sm text-gray-500">Người đề nghị</p>
                      <p className="font-medium text-gray-900">{editingRequest.requester}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phòng ban</p>
                      <p className="font-medium text-gray-900">{editingRequest.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Ngày đề nghị</p>
                      <p className="font-medium text-gray-900">{formatDate(editingRequest.date)}</p>
                    </div>
                  </div>
                </div>

                {/* Bảng chỉnh sửa vật tư */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Chỉnh sửa thông tin mua hàng</h3>
                  {editedItems.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Không có vật tư nào</h3>
                      <p className="mt-1 text-sm text-gray-500">Tất cả vật tư đã bị xóa khỏi yêu cầu.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editedItems.map((item, index) => {
                        const unitPrice = item.unitPrice || 0;
                        const quantity = item.quantity;
                        const subtotal = unitPrice * quantity;
                        
                        return (
                          <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            {/* Mobile Layout */}
                            <div className="block sm:hidden">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-orange-600">{index + 1}</span>
                                  </div>
                                  <h4 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h4>
                                </div>
                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="inline-flex items-center rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">ĐVT</label>
                                  <div className="text-sm font-semibold text-gray-900">{item.unit}</div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Số lượng</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Đơn giá (đ)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={unitPrice}
                                    onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1">Thành tiền</label>
                                  <div className="text-sm font-bold text-green-600">
                                    {subtotal.toLocaleString('vi-VN')} đ
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden sm:block">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-bold text-orange-600">{index + 1}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h4>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <div className="text-center">
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">ĐVT</div>
                                    <div className="text-sm font-bold text-gray-700 mt-1">{item.unit}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Số lượng</div>
                                    <input
                                      type="number"
                                      min="1"
                                      value={quantity}
                                      onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                                      className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                    />
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Đơn giá (đ)</div>
                                    <input
                                      type="number"
                                      min="0"
                                      value={unitPrice}
                                      onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                                      className="w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Thành tiền</div>
                                    <div className="text-sm font-bold text-green-600 mt-1">
                                      {subtotal.toLocaleString('vi-VN')} đ
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <button
                                      onClick={() => handleRemoveItem(item.id)}
                                      className="inline-flex items-center rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    >
                                      <svg className="mr-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Xóa
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tổng tiền */}
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Tổng phụ:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {calculateSubtotal().toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">Giảm giá tiền mặt:</span>
                          <input
                            type="number"
                            min="0"
                            max={calculateSubtotal()}
                            value={totalDiscountAmount}
                            onChange={(e) => setTotalDiscountAmount(Number(e.target.value))}
                            className="w-24 sm:w-32 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs sm:text-sm text-gray-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                            placeholder="0"
                          />
                          <span className="text-xs sm:text-sm text-gray-500">đ</span>
                        </div>
                        <span className="text-sm font-semibold text-red-600">
                          -{totalDiscountAmount.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-base sm:text-lg font-semibold text-gray-900">Tổng cộng:</span>
                          <span className="text-lg sm:text-2xl font-bold text-orange-600">
                            {calculateTotal().toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <button
                  onClick={handleCancelApproval}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmApproval}
                  disabled={isSubmitting || editedItems.length === 0}
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-green-500 via-green-600 to-green-700 px-4 sm:px-6 py-2.5 text-sm font-bold text-white shadow hover:from-green-600 hover:via-green-700 hover:to-green-800 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden sm:inline">Đang xử lý...</span>
                      <span className="sm:hidden">Đang xử lý</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Xác nhận duyệt và mua</span>
                      <span className="sm:hidden">Duyệt và mua</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}