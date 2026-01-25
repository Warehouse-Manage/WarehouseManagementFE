'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';
import { inventoryApi, inventoryReceiptApi } from '@/api';
import { Product, PackageProduct } from '@/types';
import { toast } from 'sonner';

interface NhapHangItem {
  id: number;
  tenHang: string;
  soLuong: number;
  userTao: string;
  dateCreated: string;
  selectionKey?: string; // 'p:ID' | 'k:ID'
  productId?: number;
  packageProductId?: number;
}

export default function NhapHangPage() {
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  const [items, setItems] = useState<NhapHangItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<NhapHangItem | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [packageProducts, setPackageProducts] = useState<PackageProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingPackageProducts, setLoadingPackageProducts] = useState(false);
  const [formData, setFormData] = useState({
    selectionKey: '',
    soLuong: '',
  });

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  // Tạo options cho dropdown từ products và packageProducts
  const getProductOptions = () => {
    const options: { label: string; value: string }[] = [];
    
    // Thêm sản phẩm
    products.forEach((product) => {
      options.push({
        label: `Sản phẩm: ${product.name}`,
        value: `p:${product.id}`,
      });
    });
    
    // Thêm kiện
    packageProducts.forEach((pkg) => {
      const product = products.find((p) => p.id === pkg.productId);
      options.push({
        label: `Kiện: ${pkg.name} (${product?.name || ''})`,
        value: `k:${pkg.id}`,
      });
    });
    
    return options;
  };

  // Tạo formFields với options động
  const formFields: FormField[] = [
    { 
      name: 'selectionKey', 
      label: 'Tên hàng', 
      type: 'select', 
      required: true, 
      placeholder: 'Chọn sản phẩm hoặc kiện...',
      options: getProductOptions()
    },
    { 
      name: 'soLuong', 
      label: 'Số lượng', 
      type: 'number', 
      required: true, 
      placeholder: 'Nhập số lượng...',
      min: 1
    },
  ];

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([loadProducts(), loadPackageProducts()]);
    };
    loadAll();
  }, []);

  // Load items sau khi products và packageProducts đã load xong
  useEffect(() => {
    if (products.length > 0 || packageProducts.length > 0) {
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length, packageProducts.length]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await inventoryApi.getProducts();
      setProducts(data);
    } catch (err: unknown) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadPackageProducts = async () => {
    setLoadingPackageProducts(true);
    try {
      const data = await inventoryApi.getPackageProducts();
      setPackageProducts(data);
    } catch (err: unknown) {
      console.error('Failed to load package products:', err);
    } finally {
      setLoadingPackageProducts(false);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await inventoryReceiptApi.getInventoryReceipts();
      console.log(data);
      
      // Map dữ liệu từ API về format hiển thị
      const mappedData: NhapHangItem[] = data.map((receipt) => {
        let tenHang = '';
        let selectionKey = '';
        
        if (receipt.packageProductId) {
          const pkg = packageProducts.find((k) => k.id === receipt.packageProductId);
          if (pkg) {
            const product = products.find((p) => p.id === pkg.productId);
            tenHang = `Kiện: ${pkg.name} (${product?.name || ''})`;
            selectionKey = `k:${pkg.id}`;
          }
        } else if (receipt.productId) {
          const product = products.find((p) => p.id === receipt.productId);
          if (product) {
            tenHang = `Sản phẩm: ${product.name}`;
            selectionKey = `p:${product.id}`;
          }
        }
        
        return {
          id: receipt.id,
          tenHang: tenHang || 'Không xác định',
          soLuong: receipt.quantity,
          userTao: receipt.createdByUser?.userName || 'Unknown',
          dateCreated: receipt.createdDate,
          selectionKey: selectionKey,
          productId: receipt.productId,
          packageProductId: receipt.packageProductId,
        };
      });
      
      setItems(mappedData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Không thể tải danh sách nhập hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTenHangFromSelectionKey = (selectionKey: string): string => {
    if (!selectionKey) return '';
    
    if (selectionKey.startsWith('p:')) {
      const productId = Number(selectionKey.slice(2));
      const product = products.find((p) => p.id === productId);
      return product ? `Sản phẩm: ${product.name}` : '';
    }
    
    if (selectionKey.startsWith('k:')) {
      const packageId = Number(selectionKey.slice(2));
      const pkg = packageProducts.find((k) => k.id === packageId);
      if (pkg) {
        const product = products.find((p) => p.id === pkg.productId);
        return `Kiện: ${pkg.name} (${product?.name || ''})`;
      }
      return '';
    }
    
    return '';
  };

  const handleEdit = (item: NhapHangItem) => {
    setEditingItem(item);
    setFormData({
      selectionKey: item.selectionKey || '',
      soLuong: item.soLuong.toString(),
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({ selectionKey: '', soLuong: '' });
  };

  const handleSubmit = async () => {
    if (!formData.selectionKey) {
      toast.error('Vui lòng chọn sản phẩm hoặc kiện');
      return;
    }

    const soLuong = Number(formData.soLuong);
    if (!soLuong || soLuong <= 0) {
      toast.error('Vui lòng nhập số lượng hợp lệ');
      return;
    }

    const userId = getCookie('userId');
    if (!userId) {
      toast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    setSubmitting(true);
    try {
      // Parse selectionKey để lấy productId và packageProductId
      const isPackage = formData.selectionKey.startsWith('k:');
      let productId: number | undefined;
      let packageProductId: number | undefined;
      
      if (isPackage) {
        packageProductId = Number(formData.selectionKey.slice(2));
        const pkg = packageProducts.find((k) => k.id === packageProductId);
        if (!pkg) {
          toast.error('Không tìm thấy kiện được chọn');
          setSubmitting(false);
          return;
        }
        productId = pkg.productId;
      } else {
        productId = Number(formData.selectionKey.slice(2));
        if (!products.find((p) => p.id === productId)) {
          toast.error('Không tìm thấy sản phẩm được chọn');
          setSubmitting(false);
          return;
        }
      }

      // Gọi API để tạo hoặc cập nhật inventory receipt
      await inventoryReceiptApi.createOrUpdateInventoryReceipt({
        id: editingItem?.id, // Nếu có editingItem thì là update
        productId: isPackage ? undefined : productId,
        packageProductId: isPackage ? packageProductId : undefined,
        quantity: soLuong,
        createdBy: Number(userId),
      });

      toast.success(editingItem ? 'Cập nhật nhập hàng thành công' : 'Thêm nhập hàng thành công');
      handleCloseModal();
      
      // Reload danh sách
      await loadItems();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(errorMessage || `Có lỗi xảy ra khi ${editingItem ? 'cập nhật' : 'thêm'} nhập hàng`);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN');
  };

  // Show blank page if role is not 'Admin' or 'accountance'
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  const columns = [
    {
      key: 'tenHang',
      header: 'Tên hàng',
      isMain: true,
    },
    {
      key: 'soLuong',
      header: 'Số lượng',
      render: (item: NhapHangItem) => (
        <span className="font-semibold">{item.soLuong.toLocaleString('vi-VN')}</span>
      ),
    },
    {
      key: 'userTao',
      header: 'Người tạo',
      mobileHidden: true,
    },
    {
      key: 'dateCreated',
      header: 'Ngày tạo',
      render: (item: NhapHangItem) => formatDateTime(item.dateCreated),
      mobileHidden: true,
    },
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Nhập hàng</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Thêm nhập hàng
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <DataTable
        data={items}
        columns={columns}
        isLoading={loading}
        emptyMessage="Chưa có dữ liệu nhập hàng"
        actions={(item) => [
          {
            label: 'Sửa',
            icon: (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            ),
            onClick: () => handleEdit(item),
          },
        ]}
      />

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingItem ? 'Sửa nhập hàng' : 'Thêm nhập hàng'}
        size="md"
        footer={
          <>
            <button
              onClick={handleCloseModal}
              className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Hủy
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang lưu...' : editingItem ? 'Cập nhật' : 'Lưu'}
            </button>
          </>
        }
      >
        <DynamicForm
          fields={formFields}
          values={formData}
          onChange={(name, value) => {
            setFormData((prev) => ({ ...prev, [name]: value }));
          }}
          isSubmitting={submitting}
        />
      </Modal>
    </div>
  );
}
