'use client';

import { useEffect, useState } from 'react';
import { getCookie, formatNumberInput, parseNumberInput } from '@/lib/ultis';
import { inventoryApi } from '@/api';
import { Product } from '@/types';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Type Product moved to @/types/inventory.ts

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<'product' | 'package'>('product');
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Local state cho "Kiện"
  type PackageRow = {
    id: number;
    name: string;
    productId: number | null;
    productName: string;
    quantity: number; // số lượng ban đầu (kiện)
    quantityProduct: number; // số lượng sản phẩm / kiện
  };
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [pkgName, setPkgName] = useState('');
  const [pkgProductId, setPkgProductId] = useState<number | ''>('');
  const [pkgUnitsPerPackage, setPkgUnitsPerPackage] = useState<number | ''>('');
  const [pkgInitialPackages, setPkgInitialPackages] = useState<number | ''>('');
  const [submittingPackage, setSubmittingPackage] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState<number | null>(null);
  const [loadingPackageDetail, setLoadingPackageDetail] = useState(false);

  const productFormFields: FormField[] = [
    { name: 'name', label: 'Tên sản phẩm', type: 'text', required: true, placeholder: 'Nhập tên sản phẩm...' },
    { name: 'price', label: 'Đơn giá', type: 'number', required: true, placeholder: 'Nhập giá...' },
    { name: 'quantity', label: 'Số lượng ban đầu', type: 'number', required: true, placeholder: 'Nhập số lượng...' },
  ];

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  // apiHost removed, handled in inventoryApi

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
  // formatNumber and parseNumber removed

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryApi.getProducts();
      setProducts(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách sản phẩm');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPackageProducts = async () => {
    setLoadingPackages(true);
    setError(null);
    try {
      const data = await inventoryApi.getPackageProducts();
      // map API -> UI row
      setPackages(
        data.map((p) => ({
          id: p.id,
          name: p.name,
          productId: p.productId,
          productName: products.find((x) => x.id === p.productId)?.name || `#${p.productId}`,
          quantity: p.quantity,
          quantityProduct: p.quantityProduct,
        }))
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách kiện');
    } finally {
      setLoadingPackages(false);
    }
  };

  // Load kiện khi vào tab "Kiện" (và khi đã có products để map tên)
  useEffect(() => {
    if (activeTab !== 'package') return;
    loadPackageProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, products]);

  const openCreatePackageModal = () => {
    setEditingPackageId(null);
    setPkgName('');
    setPkgProductId('');
    setPkgUnitsPerPackage('');
    setPkgInitialPackages('');
    setError(null);
    setShowPackageForm(true);
  };

  const openEditPackageModal = async (id: number) => {
    setEditingPackageId(id);
    setLoadingPackageDetail(true);
    setError(null);
    setShowPackageForm(true);
    try {
      const detail = await inventoryApi.getPackageProduct(id);
      setPkgName(detail.name || '');
      setPkgProductId(detail.productId ?? '');
      setPkgInitialPackages(detail.quantity ?? 0);
      setPkgUnitsPerPackage(detail.quantityProduct ?? 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải chi tiết kiện');
    } finally {
      setLoadingPackageDetail(false);
    }
  };

  // Show blank page if role is not 'Admin' or 'accountance'
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  const handleCreate = async () => {
    if (!name || price === '' || quantity === '') {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    const userId = getCookie('userId');
    if (!userId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await inventoryApi.createProduct({
        name,
        price: Number(price),
        quantity: Number(quantity),
        createdUserId: Number(userId)
      });
      setName('');
      setPrice('');
      setQuantity('');
      setShowForm(false);
      await loadProducts();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo sản phẩm');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePackage = async () => {
    if (!pkgName || pkgProductId === '' || pkgUnitsPerPackage === '' || pkgInitialPackages === '') {
      setError('Vui lòng nhập đầy đủ thông tin kiện');
      return;
    }

    const product = products.find((p) => p.id === Number(pkgProductId));
    if (!product) {
      setError('Không tìm thấy sản phẩm đã chọn');
      return;
    }

    const units = Number(pkgUnitsPerPackage) || 0; // quantityProduct
    const packs = Number(pkgInitialPackages) || 0; // quantity

    setSubmittingPackage(true);
    setError(null);
    try {
      await inventoryApi.createOrUpdatePackageProduct({
        ...(editingPackageId ? { id: editingPackageId } : {}),
        name: pkgName,
        productId: product.id,
        quantity: packs,
        quantityProduct: units,
      });
      // Reload list to keep in sync with backend
      await loadPackageProducts();
      setPkgName('');
      setPkgProductId('');
      setPkgUnitsPerPackage('');
      setPkgInitialPackages('');
      setShowPackageForm(false);
      setEditingPackageId(null);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể lưu kiện');
    } finally {
      setSubmittingPackage(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    try {
      await inventoryApi.deleteProduct(id);
      toast.success('Xóa sản phẩm thành công');
      await loadProducts();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Không thể xóa sản phẩm');
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kiện này?')) return;
    try {
      await inventoryApi.deletePackageProduct(id);
      toast.success('Xóa kiện thành công');
      await loadPackageProducts();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Không thể xóa kiện');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-120px)] gap-6">
        {/* Sidebar - giống "Quản lý vật tư" */}
        <aside className="w-full md:w-72 flex-shrink-0">
          <div className="sticky top-6 flex flex-col bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl p-4 shadow-xl shadow-gray-200/50">
            <div className="px-4 py-4 mb-2">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Quản lý kho</h2>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('product')}
                className={`group w-full text-left flex items-center gap-4 px-4 py-3.5 text-sm font-black rounded-2xl transition-all duration-300 cursor-pointer ${activeTab === 'product'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 translate-x-1'
                  : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                  }`}
              >
                Sản phẩm
                {activeTab === 'product' && (
                  <div className="ml-auto w-1.5 h-1.5 bg-orange-300 rounded-full animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('package')}
                className={`group w-full text-left flex items-center gap-4 px-4 py-3.5 text-sm font-black rounded-2xl transition-all duration-300 cursor-pointer ${activeTab === 'package'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 translate-x-1'
                  : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                  }`}
              >
                Kiện
                {activeTab === 'package' && (
                  <div className="ml-auto w-1.5 h-1.5 bg-orange-300 rounded-full animate-pulse" />
                )}
              </button>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {activeTab === 'product' ? 'Sản phẩm' : 'Kiện'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
                {activeTab === 'product'
                  ? 'Quản lý danh sách thành phẩm gạch và giá bán'
                  : 'Quản lý các kiện hàng theo sản phẩm'}
              </p>
            </div>

            {activeTab === 'product' ? (
              <button
                onClick={() => {
                  setName('');
                  setPrice('');
                  setQuantity('');
                  setError(null);
                  setShowForm(true);
                }}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm cursor-pointer"
              >
                <span className="hidden sm:inline">+ Thêm sản phẩm</span>
                <span className="sm:hidden">+ Thêm</span>
              </button>
            ) : (
              <button
                onClick={openCreatePackageModal}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm cursor-pointer"
              >
                <span className="hidden sm:inline">+ Thêm kiện</span>
                <span className="sm:hidden">+ Kiện</span>
              </button>
            )}
          </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Thêm sản phẩm mới"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
          <DynamicForm
            fields={productFormFields}
            values={{ name, price, quantity }}
            onChange={(field, value) => {
              if (field === 'name') setName(value as string);
              if (field === 'price') setPrice(value as number);
              if (field === 'quantity') setQuantity(value as number);
            }}
            columns={1}
          />
        </div>
      </Modal>

      {/* Modal thêm kiện */}
      <Modal
        isOpen={showPackageForm}
        onClose={() => {
          setShowPackageForm(false);
          setEditingPackageId(null);
        }}
        title={editingPackageId ? 'Sửa kiện' : 'Thêm kiện mới'}
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setShowPackageForm(false);
                setEditingPackageId(null);
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleCreatePackage}
              disabled={submittingPackage || loadingPackageDetail}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {submittingPackage ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">
              {error}
            </div>
          )}
          {loadingPackageDetail && (
            <div className="text-sm font-semibold text-gray-500 bg-gray-50 p-3 rounded border border-gray-100">
              Đang tải chi tiết kiện...
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tên kiện *</label>
              <input
                type="text"
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="Nhập tên kiện..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Sản phẩm *</label>
              <select
                value={pkgProductId}
                onChange={(e) => setPkgProductId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 bg-white"
              >
                <option value="">Chọn sản phẩm...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Số lượng sản phẩm / kiện</label>
              <input
                type="text"
                inputMode="decimal"
                min={0}
                value={formatNumberInput(pkgUnitsPerPackage)}
                onChange={(e) => setPkgUnitsPerPackage(parseNumberInput(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 text-right"
                placeholder="Ví dụ: 100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Số lượng ban đầu (kiện)</label>
              <input
                type="text"
                inputMode="decimal"
                min={0}
                value={formatNumberInput(pkgInitialPackages)}
                onChange={(e) => setPkgInitialPackages(parseNumberInput(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100 text-right"
                placeholder="Ví dụ: 10"
              />
            </div>
          </div>
        </div>
      </Modal>

          <div className="border rounded-lg p-4 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">
                {activeTab === 'product' ? 'Danh sách sản phẩm' : 'Danh sách kiện'}
              </h2>
              {activeTab === 'product' && (
                <button
                  onClick={loadProducts}
                  disabled={loading}
                  className="p-2 sm:px-4 sm:py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Làm mới</span>
                </button>
              )}
            </div>

            {activeTab === 'product' ? (
              <DataTable
                data={products}
                isLoading={loading}
                columns={[
                  {
                    key: 'name',
                    header: 'Tên sản phẩm',
                    isMain: true,
                    className: 'font-black text-gray-900',
                    render: (p) => (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 min-w-[40px] rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="uppercase tracking-tight">{p.name}</span>
                      </div>
                    )
                  },
                  {
                    key: 'price',
                    header: 'Đơn giá',
                    isMain: true,
                    headerClassName: 'text-right',
                    className: 'text-right font-black text-orange-600 md:text-base',
                    render: (p) => <span>{p.price.toLocaleString()}đ</span>
                  },
                  {
                    key: 'quantity',
                    header: 'Tồn kho',
                    headerClassName: 'text-right',
                    className: 'text-right font-bold text-gray-500',
                    render: (p) => {
                      const quantity = p.quantity ?? 0;
                      const quantityPackage = p.quantityPackage ?? 0;
                      const totalQuantity = quantityPackage + quantity;

                      return (
                        <div className="flex flex-col items-end space-y-0.5">
                          <span className="font-black text-gray-900">
                            {totalQuantity.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500">
                            {quantityPackage.toLocaleString()} (kiện) • {quantity.toLocaleString()} viên lẻ
                          </span>
                        </div>
                      );
                    }
                  }
                ]}
                actions={(p) => [
                  {
                    label: 'Xóa',
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: () => handleDeleteProduct(p.id),
                    variant: 'danger'
                  }
                ]}
                emptyMessage="Chưa có dữ liệu sản phẩm"
              />
            ) : (
              <DataTable
                data={packages}
                isLoading={loadingPackages}
                columns={[
                  {
                    key: 'name',
                    header: 'Tên kiện',
                    isMain: true,
                    className: 'font-black text-gray-900',
                    render: (k: PackageRow) => (
                      <div className="flex flex-col">
                        <span className="uppercase tracking-tight">{k.name}</span>
                        <span className="text-xs text-gray-500">Sản phẩm: {k.productName}</span>
                      </div>
                    )
                  },
                  {
                    key: 'productName',
                    header: 'Tên sản phẩm',
                    headerClassName: 'text-left',
                    className: 'text-sm text-gray-700',
                    render: (k: PackageRow) => <span>{k.productName}</span>
                  },
                  {
                    key: 'quantity',
                    header: 'Số lượng',
                    headerClassName: 'text-left',
                    className: 'font-bold text-gray-600',
                    render: (k: PackageRow) => (
                      <span>
                        {k.quantity.toLocaleString()}
                      </span>
                    )
                  },
                ]}
                actions={(k: PackageRow) => [
                  {
                    label: 'Sửa',
                    icon: (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    ),
                    onClick: () => openEditPackageModal(k.id)
                  },
                  {
                    label: 'Xóa',
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: () => handleDeletePackage(k.id),
                    variant: 'danger'
                  }
                ]}
                emptyMessage="Chưa có dữ liệu kiện"
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}


