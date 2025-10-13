'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';

type Material = {
  id: number;
  name: string;
  amount: number;
  imageUrl?: string;
  type: string;
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [requestQuantity, setRequestQuantity] = useState<number>(1);
  const [requestNote, setRequestNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRefs = useRef<{ [key: number]: HTMLElement | null }>({});

  const columns = useMemo(
    () => [
      { key: 'stt', header: 'Số thứ tự' },
      { key: 'image', header: 'Hình ảnh' },
      { key: 'name', header: 'Tên' },
      { key: 'unit', header: 'ĐVT' },
      { key: 'amount', header: 'Số lượng' },
      { key: 'actions', header: 'Hành động' },
    ],
    []
  );

  // Fetch materials from API
  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        setLoading(true);
        setError(null);
        
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
        setError('Không thể tải danh sách vật tư. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, []);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown !== null) {
        const dropdownElement = dropdownRefs.current[openDropdown];
        if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const handleActionClick = (materialId: number) => {
    setOpenDropdown(openDropdown === materialId ? null : materialId);
  };

  const handleEdit = (material: Material) => {
    console.log('Sửa vật tư:', material);
    setOpenDropdown(null);
  };

  const handleDelete = (material: Material) => {
    console.log('Xóa vật tư:', material);
    setOpenDropdown(null);
  };

  const handleRequestUsage = (material: Material) => {
    setSelectedMaterial(material);
    setRequestQuantity(1);
    setRequestNote('');
    setShowConfirmModal(true);
    setOpenDropdown(null);
  };

  const handleConfirmRequest = async () => {
    if (!selectedMaterial) return;
    
    setIsSubmitting(true);
    try {
      // TODO: Gọi API tạo yêu cầu sử dụng
      const requestData = {
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        quantity: requestQuantity,
        note: requestNote,
        requestedAt: new Date().toISOString(),
      };
      
      console.log('Tạo yêu cầu sử dụng:', requestData);
      await new Promise(r => setTimeout(r, 1000)); // Simulate API call
      
      alert('Yêu cầu sử dụng đã được gửi thành công!');
      setShowConfirmModal(false);
      setSelectedMaterial(null);
    } catch (error) {
      console.error('Lỗi khi tạo yêu cầu:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = () => {
    setShowConfirmModal(false);
    setSelectedMaterial(null);
    setRequestQuantity(1);
    setRequestNote('');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-black text-gray-800">Danh sách vật tư</h1>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-600">Đang tải danh sách vật tư...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm font-bold text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Materials - responsive: cards on mobile, table on md+ */}
      {!loading && !error && (
        <>
          {/* Mobile list */}
          <div className="space-y-3 sm:space-y-4 md:hidden">
            {materials.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500">
                Không có vật tư nào
              </div>
            ) : (
              materials.map((m, index) => (
                <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                      {m.imageUrl ? (
                        <img src={m.imageUrl} alt={m.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 13l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-500">#{index + 1}</p>
                        <button
                          onClick={() => handleActionClick(m.id)}
                          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
                          aria-label="Thao tác"
                          ref={el => { dropdownRefs.current[m.id] = el; }}
                        >
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>
                      </div>
                      <h3 className="mt-1 text-base font-black text-gray-900 break-words">{m.name}</h3>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg bg-gray-50 px-3 py-2 font-semibold text-gray-700">ĐVT: {m.type}</div>
                        <div className="rounded-lg bg-gray-50 px-3 py-2 font-semibold text-gray-700">Tồn: {m.amount.toLocaleString('vi-VN')}</div>
                      </div>

                      {/* Inline actions for mobile */}
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleEdit(m)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                        >Sửa</button>
                        <button
                          onClick={() => handleRequestUsage(m)}
                          className="rounded-lg bg-orange-600 px-2 py-2 text-xs font-bold text-white hover:bg-orange-700"
                        >Yêu cầu</button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="rounded-lg border border-red-200 bg-white px-2 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                        >Xóa</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={`px-2 sm:px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-600 ${
                        col.key === 'actions' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-2 sm:px-4 py-8 text-center text-gray-500">
                      Không có vật tư nào
                    </td>
                  </tr>
                ) : (
                  materials.map((m, index) => (
                <tr key={m.id} className="hover:bg-orange-50/40">
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
                      {m.imageUrl ? (
                        <img
                          src={m.imageUrl}
                          alt={m.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 13l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm font-bold text-gray-800">{m.name}</td>
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm font-semibold text-gray-700">{m.type}</td>
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm font-semibold text-gray-700">{m.amount.toLocaleString('vi-VN')}</td>
                  <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm relative">
                    <div className="relative flex justify-center" ref={el => { dropdownRefs.current[m.id] = el; }}>
                      <button
                        type="button"
                        onClick={() => handleActionClick(m.id)}
                        aria-label="Thao tác"
                        className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-200"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>

                      {openDropdown === m.id && (
                        <div className="fixed z-[9999] w-40 sm:w-48 origin-top rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" 
                             style={{
                               left: `${Math.max(8, Math.min((dropdownRefs.current[m.id]?.getBoundingClientRect().left || 0) + (dropdownRefs.current[m.id]?.getBoundingClientRect().width || 0) / 2 - 80, window.innerWidth - 168))}px`,
                               top: `${(dropdownRefs.current[m.id]?.getBoundingClientRect().bottom || 0) + 8}px`
                             }}>
                          <div className="py-1">
                            <button
                              onClick={() => handleEdit(m)}
                              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            >
                              <svg className="mr-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Sửa
                            </button>
                            <button
                              onClick={() => handleRequestUsage(m)}
                              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            >
                              <svg className="mr-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Yêu cầu sử dụng
                            </button>
                            <button
                              onClick={() => handleDelete(m)}
                              className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-900"
                            >
                              <svg className="mr-3 h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Xóa
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal xác nhận yêu cầu sử dụng */}
      {showConfirmModal && selectedMaterial && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleCancelRequest}></div>
            <div className="relative w-full max-w-md mx-4 rounded-xl bg-white p-4 sm:p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-black text-gray-900">Yêu cầu sử dụng vật tư</h2>
                <button
                  onClick={handleCancelRequest}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Thông tin vật tư */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    {selectedMaterial.imageUrl ? (
                      <img
                        src={selectedMaterial.imageUrl}
                        alt={selectedMaterial.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                        <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedMaterial.name}</h3>
                      <p className="text-sm text-gray-600">
                        ĐVT: {selectedMaterial.type} | Tồn kho: {selectedMaterial.amount.toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Số lượng yêu cầu */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Số lượng yêu cầu
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedMaterial.amount}
                    value={requestQuantity}
                    onChange={(e) => setRequestQuantity(Number(e.target.value))}
                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                    placeholder="Nhập số lượng"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Tối đa: {selectedMaterial.amount.toLocaleString('vi-VN')} {selectedMaterial.type}
                  </p>
                </div>

                {/* Ghi chú */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-black focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100"
                    placeholder="Mô tả mục đích sử dụng..."
                  />
                </div>
              </div>

              {/* Nút hành động */}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={handleCancelRequest}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmRequest}
                  disabled={isSubmitting || requestQuantity < 1 || requestQuantity > selectedMaterial.amount}
                  className="inline-flex items-center rounded-lg bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 px-4 py-2 text-sm font-bold text-white shadow hover:from-orange-600 hover:via-orange-700 hover:to-orange-800 focus:outline-none focus:ring-4 focus:ring-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang gửi...
                    </>
                  ) : (
                    'Gửi yêu cầu'
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
