"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Helper function to get cookie value
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

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

type Material = {
  id: number;
  name: string;
  type: string;
  amount: number;
  imageUrl?: string;
};


export default function RequestsPage() {
  const router = useRouter();
  const [department, setDepartment] = useState("");
  const [items, setItems] = useState<RequestItem[]>([
    { id: 1, name: "", type: "", quantity: "", note: "", isNew: true },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  // Tìm kiếm theo tên ngay tại hàng
  const [openSearchFor, setOpenSearchFor] = useState<number | null>(null);
  const [searchResultsByItem, setSearchResultsByItem] = useState<Record<number, Material[]>>({});
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);
  // Modal tạo vật tư mới
  const [showCreateMaterial, setShowCreateMaterial] = useState(false);
  const [creatingMaterial, setCreatingMaterial] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newMaterial, setNewMaterial] = useState<{ name: string; type: string; description: string; imageUrl?: string }>({ name: "", type: "", description: "", imageUrl: "" });
  
  // User authentication
  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Initialize user ID and check authentication
  useEffect(() => {
    const userUserId = getCookie('userId');
    const userUserName = getCookie('userName');
    
    setUserId(userUserId);
    
    // Redirect to login if userId or userName is missing
    if (!userUserId || !userUserName) {
      router.push('/login');
    }
    
    setIsCheckingAuth(false);
  }, [router]);

  // Fetch materials from API
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoadingMaterials(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/materials`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setMaterials(data);
      } catch (err) {
        console.error('Lỗi khi tải danh sách vật tư:', err);
      } finally {
        setLoadingMaterials(false);
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
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    if (!value || value.trim().length === 0) {
      setOpenSearchFor(null);
      setSearchResultsByItem(prev => ({ ...prev, [id]: [] }));
      return;
    }
    setOpenSearchFor(id);
    setSearchLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/materials/search?term=${encodeURIComponent(value)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: Material[] = await response.json();
        setSearchResultsByItem(prev => ({ ...prev, [id]: data }));
      } catch (e) {
        console.error('Lỗi tìm kiếm vật tư:', e);
        setSearchResultsByItem(prev => ({ ...prev, [id]: [] }));
      } finally {
        setSearchLoading(false);
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

  const handleCreateMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingMaterial(true);
      setCreateError(null);

      // Use default user ID since authentication is removed
      const userId = 1;

      const payload = {
        name: newMaterial.name,
        type: newMaterial.type,
        description: newMaterial.description,
        imageUrl: newMaterial.imageUrl ?? "",
        amount: 0,
        creatorId: userId,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let serverMessage = '';
        if (contentType.includes('application/json')) {
          try {
            const body = await response.json();
            serverMessage = body?.message || body?.title || JSON.stringify(body);
          } catch {
            serverMessage = await response.text().catch(() => '');
          }
        } else {
          serverMessage = await response.text().catch(() => '');
        }
        const prefix = response.status === 409 ? '' : `HTTP ${response.status} ${response.statusText} `;
        throw new Error(`${prefix}${serverMessage}`.trim());
      }
      const created: Material = await response.json();

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

  const handleCreateNewItem = (itemId: number) => {
    setItems(prev => prev.map(it => 
      it.id === itemId 
        ? { ...it, isNew: true, name: "", type: "", imageUrl: undefined }
        : it
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Use actual user ID from cookie
      const currentUserId = userId ? parseInt(userId) : 1;

      const itemIds = items
        .filter(it => typeof it.materialId === 'number')
        .map(it => it.materialId!)
        .filter((v, idx, arr) => arr.indexOf(v) === idx);

      if (itemIds.length === 0) {
        alert('Vui lòng chọn ít nhất 1 vật tư từ kho trước khi gửi.');
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_HOST}/api/materialrequests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status} ${response.statusText} ${errText}`);
      }

      const result = await response.json();
      console.log("Đề nghị mua vật tư đã tạo:", result);
      alert("Gửi đề nghị thành công!");
      
      // Reset form
      setDepartment("");
      setItems([{ id: 1, name: "", type: "", quantity: "", note: "", isNew: true }]);
      
    } catch (error) {
      console.error('Lỗi khi tạo đề nghị:', error);
      alert('Có lỗi xảy ra khi tạo đề nghị. Vui lòng thử lại!');
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-black">Đề nghị mua vật tư</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Thông tin chung */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Phòng ban</label>
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="VD: Vật tư, Kế toán..."
              className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-700">Ngày đề nghị</label>
            <input
              type="date"
              value={new Date().toISOString().slice(0, 10)}
              readOnly
              disabled
              className="w-full rounded-lg border-2 border-gray-200 bg-gray-100 px-3 py-2 text-black"
            />
          </div>
        </div>

        {/* Danh mục vật tư */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-600">STT</th>
                <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-600">Hình ảnh</th>
                <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-600">Tên vật tư</th>
                <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-600">ĐVT</th>
                <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-600">Số lượng</th>
                <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-600">Ghi chú</th>
                <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-600">Hành động</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((it, idx) => (
                <tr key={it.id}>
                  <td className="px-3 py-2 text-sm text-gray-700">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                      {it.imageUrl ? (
                        <img
                          src={it.imageUrl}
                          alt={it.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 relative">
                    <input
                      type="text"
                      value={it.name}
                      onChange={e => handleNameInputChange(it.id, e.target.value)}
                      placeholder="Nhập tên để tìm..."
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                    {openSearchFor === it.id && (
                      <div className="absolute z-50 mt-1 w-80 max-h-72 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                        {searchLoading ? (
                          <div className="px-3 py-2 text-sm text-gray-500">Đang tìm...</div>
                        ) : (
                          <>
                            {(searchResultsByItem[it.id] && searchResultsByItem[it.id].length > 0) ? (
                              searchResultsByItem[it.id].map(s => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => handlePickSearchedMaterial(it.id, s)}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                                >
                                  <div className="h-8 w-8 overflow-hidden rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                                    {s.imageUrl ? (
                                      <img src={s.imageUrl} alt={s.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <svg className="h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-bold text-gray-900">{s.name}</div>
                                    <div className="truncate text-xs text-gray-500">ĐVT: {s.type} • Tồn: {s.amount.toLocaleString('vi-VN')}</div>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-gray-500">Không tìm thấy kết quả</div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={it.type}
                      onChange={e => handleItemChange(it.id, "type", e.target.value)}
                      placeholder="Cây, Kg, Bao..."
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={it.quantity}
                      onChange={e => handleItemChange(it.id, "quantity", e.target.value)}
                      placeholder="0"
                      className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={it.note ?? ""}
                      onChange={e => handleItemChange(it.id, "note", e.target.value)}
                      placeholder="Ghi chú"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenMaterialSelector(it.id)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-bold text-orange-700 hover:bg-orange-100"
                      >
                        Chọn từ kho
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateNewItem(it.id)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-bold text-gray-700 hover:bg-gray-100"
                      >
                        Tạo mới
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-700 hover:bg-red-100"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-gray-100 bg-gray-50 px-3 py-3">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
            >
              + Thêm dòng
            </button>
          </div>
        </div>

        {/* Hành động */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowCreateMaterial(true)}
            className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-700 hover:bg-orange-100"
          >
            + Thêm vật tư
          </button>
          <button
            type="button"
            onClick={() => {
              setDepartment("");
              setItems([{ id: 1, name: "", type: "", quantity: "", note: "", isNew: true }]);
            }}
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Làm mới
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-5 py-2.5 text-sm font-black text-white shadow hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Đang gửi..." : "Gửi đề nghị"}
          </button>
        </div>
      </form>


      {/* Modal chọn vật tư từ kho */}
      {showMaterialSelector && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowMaterialSelector(false)}></div>
            <div className="relative w-full max-w-4xl rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black text-gray-900">Chọn vật tư từ kho</h2>
                <button
                  onClick={() => setShowMaterialSelector(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingMaterials ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-600">Đang tải danh sách vật tư...</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      onClick={() => handleSelectMaterial(material)}
                      className="cursor-pointer rounded-lg border border-gray-200 p-4 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                          {material.imageUrl ? (
                            <img
                              src={material.imageUrl}
                              alt={material.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{material.name}</h3>
                          <p className="text-sm text-gray-500">ĐVT: {material.type}</p>
                          <p className="text-sm text-gray-500">Tồn kho: {material.amount.toLocaleString('vi-VN')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingMaterials && materials.length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Không có vật tư nào</h3>
                  <p className="mt-1 text-sm text-gray-500">Kho chưa có vật tư nào để chọn.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal tạo vật tư mới */}
      {showCreateMaterial && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCreateMaterial(false)}></div>
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Thêm vật tư mới</h2>
                <button
                  onClick={() => setShowCreateMaterial(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {createError && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateMaterialSubmit} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Tên vật tư</label>
                  <input
                    type="text"
                    value={newMaterial.name}
                    onChange={e => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Thép hộp 20x20"
                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Đơn vị tính</label>
                  <input
                    type="text"
                    value={newMaterial.type}
                    onChange={e => setNewMaterial(prev => ({ ...prev, type: e.target.value }))}
                    placeholder="Cây, Kg, Bao..."
                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Mô tả</label>
                  <textarea
                    rows={3}
                    value={newMaterial.description}
                    onChange={e => setNewMaterial(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Mô tả ngắn về vật tư"
                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">Hình ảnh (URL)</label>
                  <input
                    type="url"
                    value={newMaterial.imageUrl}
                    onChange={e => setNewMaterial(prev => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                  />
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateMaterial(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={creatingMaterial}
                    className="inline-flex items-center rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-4 py-2 text-sm font-bold text-white shadow hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingMaterial ? 'Đang tạo...' : 'Tạo vật tư'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


