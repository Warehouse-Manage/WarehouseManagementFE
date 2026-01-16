"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from 'sonner';
import Image from "next/image";
import { sendNotification } from "../../../../actions/notification";
import { getCookie } from "@/lib/ultis";
import { materialApi, notificationApi } from "@/api";
import { Material, UserWithNotification } from "@/types";
import { Modal, DataTable, DynamicForm, FormField } from "@/components/shared";


// Types moved to @/types/material.ts and @/types/notification.ts
type RequestItem = {
  id: number;
  materialId?: number;
  name: string;
  type: string;
  quantity: number | "";
  note?: string;
  imageUrl?: string;
  isNew?: boolean; // Đánh dấu item mới tạo
  unitPrice?: number; // Giá đơn vị cho approved requests
};


export default function YeuCauPage() {
  const router = useRouter();
  const [department, setDepartment] = useState("");
  const [items, setItems] = useState<RequestItem[]>([
    { id: 1, name: "", type: "", quantity: "", note: "", isNew: true },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  // Tìm kiếm theo tên ngay tại hàng
  const [openSearchFor, setOpenSearchFor] = useState<number | null>(null);
  const [searchResultsByItem, setSearchResultsByItem] = useState<Record<number, Material[]>>({});
  // Modal tạo vật tư mới
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [creatingMaterial, setCreatingMaterial] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newMaterial, setNewMaterial] = useState<{ name: string; type: string; description: string; imageUrl?: string }>({ name: "", type: "", description: "", imageUrl: "" });

  // User authentication
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Initialize user ID and check authentication
  useEffect(() => {
    const userUserId = getCookie('userId');
    const userDepartment = getCookie('department');
    const userUserRole = getCookie('role');

    setUserId(userUserId);
    setUserRole(userUserRole);

    // Set department from cookies if available
    if (userDepartment) {
      setDepartment(userDepartment);
    }

    // Redirect to login if userId is missing
    if (!userUserId) {
      router.push('/login');
    }

    setIsCheckingAuth(false);
  }, [router]);

  // Fetch materials from API
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const data = await materialApi.getMaterials();
        setMaterials(data);
      } catch (err) {
        console.error('Lỗi khi tải danh sách vật tư:', err);
      }
    };

    fetchMaterials();
  }, []);


  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, name: "", type: "", quantity: "", note: "", isNew: true },
    ]);
  };

  const handleRemoveItem = (id: number) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleItemChange = (id: number, field: keyof RequestItem, value: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: field === "quantity" ? (value === "" ? "" : Number(value)) : value } : it));
  };

  // Nhập tên để tìm nhanh từ API /api/Items/search?name=
  const handleNameInputChange = (id: number, value: string) => {
    handleItemChange(id, "name", value);
    if (!value || value.trim().length === 0) {
      setOpenSearchFor(null);
      setSearchResultsByItem(prev => ({ ...prev, [id]: [] }));
      return;
    }
    setOpenSearchFor(id);
    window.setTimeout(async () => {
      try {
        const data = await materialApi.searchMaterials(value);
        setSearchResultsByItem(prev => ({ ...prev, [id]: data }));
      } catch (e) {
        console.error('Lỗi tìm kiếm vật tư:', e);
        setSearchResultsByItem(prev => ({ ...prev, [id]: [] }));
      }
    }, 300);
  };

  const handlePickSearchedMaterial = (rowId: number, material: Material) => {
    setItems(prev => prev.map(it =>
      it.id === rowId
        ? { ...it, materialId: material.id, name: material.name, type: material.type, imageUrl: material.imageUrl, isNew: false }
        : it
    ));
    setOpenSearchFor(null);
  };

  const handleCreateMaterialSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setCreatingMaterial(true);
      setCreateError(null);

      // Use actual user ID from cookies
      const currentUserId = userId ? parseInt(userId) : 1;

      const payload = {
        name: newMaterial.name,
        type: newMaterial.type,
        description: newMaterial.description,
        imageUrl: newMaterial.imageUrl ?? "",
        amount: 0,
        creatorId: currentUserId,
      };

      const created = await materialApi.createMaterial(payload);

      // Cập nhật kho vật tư
      setMaterials(prev => [created, ...prev]);
      setShowCreateMaterial(false);
      setNewMaterial({ name: "", type: "", description: "", imageUrl: "" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tạo vật tư. Vui lòng thử lại.';
      console.error('Lỗi tạo vật tư:', err);
      setCreateError(message);
    } finally {
      setCreatingMaterial(false);
    }
  };

  const handleSelectMaterial = (material: Material) => {
    if (currentItemId) {
      setItems(prev => prev.map(it =>
        it.id === currentItemId
          ? {
            ...it,
            materialId: material.id,
            name: material.name,
            type: material.type,
            imageUrl: material.imageUrl,
            isNew: false
          }
          : it
      ));
    }
    setShowMaterialSelector(false);
    setCurrentItemId(null);
  };

  const handleOpenMaterialSelector = (itemId: number) => {
    setCurrentItemId(itemId);
    setShowMaterialSelector(true);
  };

  // Function to get admin and approver users for notifications
  const getAdminAndApproverUsers = async () => {
    try {
      const users = await notificationApi.getUsersWithSubscriptions();

      // Filter users with admin or approver roles who have notification subscriptions
      return users.filter((u: UserWithNotification) =>
        (u.role === 'Admin' || u.role === 'approver') &&
        u.notificationEnabled &&
        u.notificationEndpoint
      );
    } catch (error) {
      console.error('Error fetching admin/approver users:', error);
      return [];
    }
  };

  // Function to send notifications to admin/approver users
  const sendNotificationsToAdmins = async (requestData: { items: { materialId: number; requestedQuantity: number; note: string }[] }) => {
    try {
      const adminUsers = await getAdminAndApproverUsers();
      console.log(adminUsers);
      if (adminUsers.length === 0) {
        console.log('No admin/approver users with notifications enabled');
        return;
      }

      const notificationPromises = adminUsers.map(async (user: UserWithNotification) => {
        try {
          await sendNotification(
            `Có yêu cầu mua vật tư mới từ ${department || 'phòng ban không xác định'}. Số lượng vật tư: ${requestData.items.length}`,
            user.id.toString(),
            "/icon-192x192.png",
            "Yêu cầu mua vật tư mới",
            {
              endpoint: user.notificationEndpoint || '',
              p256dh: user.notificationP256dh || '',
              auth: user.notificationAuth || ''
            }
          );
        } catch (error) {
          console.error(`Failed to send notification to user ${user.id}:`, error);
        }
      });

      await Promise.all(notificationPromises);
      console.log(`Sent notifications to ${adminUsers.length} admin/approver users`);
    } catch (error) {
      console.error('Error sending notifications to admins:', error);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitting(true);
    try {
      // Use actual user ID from cookie
      const currentUserId = userId ? parseInt(userId) : 1;

      const itemIds = items
        .filter(it => typeof it.materialId === 'number')
        .map(it => it.materialId!)
        .filter((v, idx, arr) => arr.indexOf(v) === idx);

      if (itemIds.length === 0) {
        toast.warning('Vui lòng chọn ít nhất 1 vật tư từ kho trước khi gửi.');
        setSubmitting(false);
        return;
      }

      const payload = {
        requesterId: currentUserId,
        department: department || '',
        requestDate: new Date().toISOString(),
        description: '',
        items: items
          .filter(it => typeof it.materialId === 'number' && it.quantity !== '' && Number(it.quantity) > 0)
          .map(it => ({
            materialId: it.materialId!,
            requestedQuantity: Number(it.quantity) || 1,
            note: it.note || ''
          })),
      };

      const result = await materialApi.createMaterialRequest(payload);
      console.log("Đề nghị mua vật tư đã tạo:", result);

      // Send notifications to admin/approver users if current user role is "user"
      if (userRole === 'user') {
        try {
          await sendNotificationsToAdmins(payload);
        } catch (notificationError) {
          console.error('Error sending notifications:', notificationError);
          // Don't fail the request if notifications fail
        }
      }

      toast.success("Gửi đề nghị thành công!");

      // Reset form (keep department from cookies)
      setItems([{ id: 1, name: "", type: "", quantity: "", note: "", isNew: true }]);

    } catch (error) {
      console.error('Lỗi khi tạo đề nghị:', error);
      toast.error('Có lỗi xảy ra khi tạo đề nghị. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
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

  const createMaterialFormFields: FormField[] = [
    { name: 'name', label: 'Tên vật tư', type: 'text', placeholder: 'VD: Thép hộp 20x20', required: true },
    { name: 'type', label: 'Đơn vị tính', type: 'text', placeholder: 'Cây, Kg, Bao...', required: true },
    { name: 'description', label: 'Mô tả', type: 'textarea', placeholder: 'Mô tả ngắn về vật tư' },
    { name: 'imageUrl', label: 'URL Hình ảnh', type: 'text', placeholder: 'https://...' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-black text-gray-800">Đề nghị mua vật tư</h1>
        <button
          type="button"
          onClick={() => setShowCreateMaterial(true)}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
        >
          <span className="hidden sm:inline">+ Thêm vật tư mới</span>
          <span className="sm:hidden">+ Thêm</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phòng ban</label>
          <p className="text-lg font-bold text-gray-900">{department || "---"}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày đề nghị</label>
          <p className="text-lg font-bold text-gray-900">{new Date().toLocaleDateString('vi-VN')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-black ">
        <DataTable
          data={items}
          columns={[
            {
              key: 'index',
              header: 'STT',
              className: 'w-12 text-center font-bold text-gray-400',
              render: (_, idx) => <span>{idx + 1}</span>
            },
            {
              key: 'image',
              header: 'Ảnh',
              className: 'w-20',
              render: (it) => (
                <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center relative">
                  {it.imageUrl ? (
                    <Image src={it.imageUrl || ""} alt={it.name} fill className="object-cover" sizes="48px" />
                  ) : (
                    <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                  )}
                </div>
              )
            },
            {
              key: 'name',
              header: 'Tên vật tư',
              render: (it) => (
                <div className="relative min-w-[200px]">
                  <input
                    type="text"
                    value={it.name}
                    onChange={e => handleNameInputChange(it.id, e.target.value)}
                    placeholder="Nhập tên để tìm..."
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none"
                  />
                  {openSearchFor === it.id && (
                    <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-gray-200 bg-white shadow-2xl">
                      {(searchResultsByItem[it.id]?.length > 0) ? (
                        searchResultsByItem[it.id].map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handlePickSearchedMaterial(it.id, s)}
                            className="flex w-full items-center gap-3 px-4 py-2 hover:bg-orange-50 transition-colors"
                          >
                            <div className="h-8 w-8 relative flex-shrink-0">
                              {s.imageUrl ? (
                                <Image src={s.imageUrl} alt={s.name} fill className="object-cover rounded" />
                              ) : (
                                <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </div>
                              )}
                            </div>
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
              )
            },
            {
              key: 'type',
              header: 'ĐVT',
              className: 'w-24',
              render: (it) => (
                <input
                  type="text"
                  value={it.type}
                  onChange={e => handleItemChange(it.id, "type", e.target.value)}
                  placeholder="ĐVT"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-center font-bold focus:border-orange-500 outline-none"
                />
              )
            },
            {
              key: 'quantity',
              header: 'Số lượng',
              className: 'w-24',
              render: (it) => (
                <input
                  type="number"
                  min="0"
                  value={it.quantity === "" ? "" : it.quantity}
                  onChange={e => handleItemChange(it.id, "quantity", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-center font-bold text-orange-600 focus:border-orange-500 outline-none"
                />
              )
            },
            {
              key: 'note',
              header: 'Ghi chú',
              render: (it) => (
                <input
                  type="text"
                  value={it.note ?? ""}
                  onChange={e => handleItemChange(it.id, "note", e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 outline-none"
                />
              )
            },
            {
              key: 'actions',
              header: '',
              className: 'w-24 text-right',
              render: (it) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenMaterialSelector(it.id)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Chọn từ kho"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(it.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )
            }
          ]}
        />
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Thêm dòng mới</span>
            <span className="sm:hidden">Dòng mới</span>
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setItems([{ id: 1, name: "", type: "", quantity: "", note: "", isNew: true }])}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              Làm mới
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-8 py-2.5 text-sm font-black text-white shadow-lg hover:bg-orange-700 disabled:opacity-50 transition-all font-inter"
            >
              {submitting ? "Đang xử lý..." : "Gửi yêu cầu"}
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showMaterialSelector}
        onClose={() => setShowMaterialSelector(false)}
        title="Chọn vật tư từ kho"
        size="3xl"
        isLoading={false}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {materials.map(m => (
              <button
                key={m.id}
                onClick={() => handleSelectMaterial(m)}
                className="flex items-center gap-3 p-3 text-left rounded-xl border border-gray-100 hover:border-orange-300 hover:bg-orange-50 transition-all group"
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

      <Modal
        isOpen={showCreateMaterial}
        onClose={() => setShowCreateMaterial(false)}
        title="Thêm vật tư mới vào hệ thống"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowCreateMaterial(false)}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              Hủy
            </button>
            <button
              onClick={() => handleCreateMaterialSubmit()}
              disabled={creatingMaterial}
              className="px-6 py-2 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-all"
            >
              {creatingMaterial ? "Đang lưu..." : "Lưu vật tư"}
            </button>
          </>
        }
      >
        <DynamicForm
          fields={createMaterialFormFields}
          values={newMaterial as unknown as Record<string, unknown>}
          onChange={(name, val) =>
            setNewMaterial(prev => ({ ...prev, [name]: val }))
          }
          columns={1}
        />
        {createError && <p className="mt-3 text-sm text-red-600 font-medium">{createError}</p>}
      </Modal>
    </div>
  );
}
