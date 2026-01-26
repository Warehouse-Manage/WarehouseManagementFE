'use client';

import { useEffect, useState, useMemo } from 'react';
import { getCookie, printHtmlContent } from '@/lib/ultis';
import { Modal, DataTable, DynamicForm, FormField } from '@/components/shared';
import { inventoryApi, inventoryReceiptApi, partnerApi, financeApi } from '@/api';
import { Product, PackageProduct, RawMaterial, Partner, RawMaterialImport } from '@/types';
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
  const [activeTab, setActiveTab] = useState<'sanpham' | 'nguyenlieu'>('sanpham');
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  
  // State cho tab Sản phẩm
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
  const [currentPageInventoryReceipt, setCurrentPageInventoryReceipt] = useState(1);
  const [totalCountInventoryReceipt, setTotalCountInventoryReceipt] = useState(0);
  const [pageSizeInventoryReceipt, setPageSizeInventoryReceipt] = useState(10);

  // State cho tab Nguyên liệu
  const [rawMaterialImports, setRawMaterialImports] = useState<RawMaterialImport[]>([]);
  const [loadingRawMaterialImports, setLoadingRawMaterialImports] = useState(false);
  const [currentPageRawMaterialImport, setCurrentPageRawMaterialImport] = useState(1);
  const [totalCountRawMaterialImport, setTotalCountRawMaterialImport] = useState(0);
  const [pageSizeRawMaterialImport, setPageSizeRawMaterialImport] = useState(10);
  const [showNguyenLieuModal, setShowNguyenLieuModal] = useState(false);
  const [editingRawMaterialImport, setEditingRawMaterialImport] = useState<RawMaterialImport | null>(null);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [nguyenLieuFormData, setNguyenLieuFormData] = useState({
    rawMaterialId: '',
    quantity: '',
    unitPrice: '',
    discount: '',
    paidAmount: '',
    partnerId: '',
  });
  const [submittingNguyenLieu, setSubmittingNguyenLieu] = useState(false);

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
      await Promise.all([loadProducts(), loadPackageProducts(), loadRawMaterials(), loadPartners()]);
    };
    loadAll();
  }, []);

  // Load rawMaterialImports khi vào tab nguyên liệu
  useEffect(() => {
    if (activeTab === 'nguyenlieu') {
      setCurrentPageRawMaterialImport(1);
      loadRawMaterialImports(1);
    }
  }, [activeTab]);

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

  const loadRawMaterials = async () => {
    try {
      const data = await inventoryApi.getRawMaterials();
      setRawMaterials(data);
    } catch (err: unknown) {
      console.error('Failed to load raw materials:', err);
    }
  };

  const loadPartners = async () => {
    try {
      const data = await partnerApi.getPartners();
      setPartners(data);
    } catch (err: unknown) {
      console.error('Failed to load partners:', err);
    }
  };

  const loadRawMaterialImports = async (page: number = currentPageRawMaterialImport, size: number = pageSizeRawMaterialImport) => {
    setLoadingRawMaterialImports(true);
    setError(null);
    try {
      const result = await inventoryApi.getRawMaterialImportsFilter(page, size);
      setRawMaterialImports(result.data);
      setTotalCountRawMaterialImport(result.totalCount);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Không thể tải danh sách nhập nguyên liệu');
      console.error(err);
    } finally {
      setLoadingRawMaterialImports(false);
    }
  };

  const loadItems = async (page: number = currentPageInventoryReceipt, size: number = pageSizeInventoryReceipt) => {
    setLoading(true);
    setError(null);
    try {
      const result = await inventoryReceiptApi.getInventoryReceiptsFilter(page, size);
      console.log(result.data);
      
      // Map dữ liệu từ API về format hiển thị
      const mappedData: NhapHangItem[] = result.data.map((receipt) => {
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
      setTotalCountInventoryReceipt(result.totalCount);
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
      await loadItems(currentPageInventoryReceipt);
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

  // Tính tổng tiền từ giá thành, số lượng và giảm giá
  const calculateTotalAmount = () => {
    const unitPrice = Number(nguyenLieuFormData.unitPrice) || 0;
    const quantity = Number(nguyenLieuFormData.quantity) || 0;
    const discount = Number(nguyenLieuFormData.discount) || 0;
    return Math.max(0, unitPrice * quantity - discount);
  };

  const handleNguyenLieuSubmit = async () => {
    if (!nguyenLieuFormData.rawMaterialId) {
      toast.error('Vui lòng chọn nguyên liệu');
      return;
    }

    const quantity = Number(nguyenLieuFormData.quantity);
    if (!quantity || quantity <= 0) {
      toast.error('Vui lòng nhập số lượng hợp lệ');
      return;
    }

    const unitPrice = Number(nguyenLieuFormData.unitPrice) || 0;
    const discount = Number(nguyenLieuFormData.discount) || 0;
    const totalAmount = calculateTotalAmount();
    const paidAmount = Number(nguyenLieuFormData.paidAmount) || 0;

    if (!nguyenLieuFormData.partnerId) {
      toast.error('Vui lòng chọn đối tác');
      return;
    }

    const userId = getCookie('userId');
    if (!userId) {
      toast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    setSubmittingNguyenLieu(true);
    try {
      // Nếu đang edit, gọi API update
      if (editingRawMaterialImport) {
        await inventoryApi.updateRawMaterialImport(editingRawMaterialImport.id, {
          id: editingRawMaterialImport.id,
          rawMaterialId: Number(nguyenLieuFormData.rawMaterialId),
          quantity,
          unitPrice,
          discount,
          totalAmount,
          paidAmount,
          partnerId: Number(nguyenLieuFormData.partnerId),
        });
        toast.success('Cập nhật nhập nguyên liệu thành công');
      } else {
        // Tạo mới
        const result = await inventoryApi.importRawMaterial({
          rawMaterialId: Number(nguyenLieuFormData.rawMaterialId),
          quantity,
          unitPrice,
          discount,
          totalAmount,
          paidAmount,
          partnerId: Number(nguyenLieuFormData.partnerId),
          createdUserId: Number(userId),
        });

        // Nếu đã trả > 0, tạo bản ghi sổ quỹ và in phiếu chi
        if (paidAmount > 0) {
          try {
            const partner = partners.find(p => p.id === Number(nguyenLieuFormData.partnerId));
            if (!partner) {
              throw new Error('Không tìm thấy thông tin đối tác');
            }

            let fundId: number;
            
            // Nếu backend đã tạo fund, dùng fund đó
            if (result.fund && (result.fund as { id: number }).id) {
              fundId = (result.fund as { id: number }).id;
            } else {
              // Nếu chưa có, tạo mới bản ghi sổ quỹ
              const fund = await financeApi.createFund({
                type: 'Chi',
                description: `Thanh toán cho đối tác ${partner.name}`,
                amount: paidAmount,
                category: 'Nguyên liệu',
                objectId: Number(nguyenLieuFormData.partnerId),
                objectType: 'Đối tác',
                objectName: partner.name,
                createdUserId: Number(userId),
              });
              fundId = fund.id;
            }

            // In phiếu chi
            const receiptHtml = await financeApi.printFund(fundId);
            await printHtmlContent(receiptHtml);
          } catch (printErr) {
            console.error('Không thể tạo bản ghi sổ quỹ hoặc in phiếu chi:', printErr);
            // Không throw error để không làm gián đoạn flow
          }
        }
        toast.success('Nhập nguyên liệu thành công');
      }

      setShowNguyenLieuModal(false);
      setEditingRawMaterialImport(null);
      setNguyenLieuFormData({
        rawMaterialId: '',
        quantity: '',
        unitPrice: '',
        discount: '',
        paidAmount: '',
        partnerId: '',
      });
      
      // Reload danh sách
      await loadRawMaterialImports(currentPageRawMaterialImport);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(errorMessage || `Có lỗi xảy ra khi ${editingRawMaterialImport ? 'cập nhật' : 'nhập'} nguyên liệu`);
      console.error(err);
    } finally {
      setSubmittingNguyenLieu(false);
    }
  };

  const handleEditRawMaterialImport = async (item: RawMaterialImport) => {
    try {
      // Load chi tiết với navigation properties
      const detail = await inventoryApi.getRawMaterialImportById(item.id);
      setEditingRawMaterialImport(detail);
      setNguyenLieuFormData({
        rawMaterialId: detail.rawMaterialId.toString(),
        quantity: detail.quantity.toString(),
        unitPrice: detail.unitPrice.toString(),
        discount: detail.discount.toString(),
        paidAmount: detail.paidAmount.toString(),
        partnerId: detail.partnerId.toString(),
      });
      setShowNguyenLieuModal(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(errorMessage || 'Không thể tải thông tin nhập nguyên liệu');
      console.error(err);
    }
  };

  const handleCloseNguyenLieuModal = () => {
    setShowNguyenLieuModal(false);
    setEditingRawMaterialImport(null);
    setNguyenLieuFormData({
      rawMaterialId: '',
      quantity: '',
      unitPrice: '',
      discount: '',
      paidAmount: '',
      partnerId: '',
    });
  };

  // Lấy đơn vị của nguyên liệu được chọn
  const selectedUnit = useMemo(() => {
    if (!nguyenLieuFormData.rawMaterialId) return '';
    const selectedMaterial = rawMaterials.find(rm => rm.id === Number(nguyenLieuFormData.rawMaterialId));
    return selectedMaterial?.unit || '';
  }, [nguyenLieuFormData.rawMaterialId, rawMaterials]);

  const nguyenLieuFormFields: FormField[] = useMemo(() => [
    {
      name: 'rawMaterialId',
      label: 'Nguyên liệu',
      type: 'select',
      required: true,
      placeholder: 'Chọn nguyên liệu...',
      options: rawMaterials.map(rm => ({ value: rm.id, label: rm.name }))
    },
    {
      name: 'quantity',
      label: selectedUnit ? `Số lượng (${selectedUnit})` : 'Số lượng (đơn vị)',
      type: 'number',
      required: true,
      placeholder: 'Nhập số lượng...',
      min: 1
    },
    {
      name: 'unitPrice',
      label: selectedUnit ? `Giá thành (/${selectedUnit})` : 'Giá thành (/đơn vị)',
      type: 'number',
      required: true,
      placeholder: 'Nhập giá thành...',
      min: 0
    },
    {
      name: 'discount',
      label: 'Giảm giá',
      type: 'number',
      required: false,
      placeholder: 'Nhập giảm giá...',
      min: 0
    },
    {
      name: 'partnerId',
      label: 'Đối tác',
      type: 'select',
      required: true,
      placeholder: 'Chọn đối tác...',
      options: partners.map(p => ({ value: p.id, label: p.name }))
    },
    {
      name: 'paidAmount',
      label: 'Đã trả',
      type: 'number',
      required: false,
      placeholder: 'Nhập số tiền đã trả...',
      min: 0
    },
  ], [selectedUnit, rawMaterials, partners]);

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

  const rawMaterialImportColumns = [
    {
      key: 'rawMaterial',
      header: 'Nguyên liệu',
      isMain: true,
      render: (item: RawMaterialImport) => (
        <span className="font-semibold">{item.rawMaterial?.name || 'N/A'}</span>
      ),
    },
    {
      key: 'quantity',
      header: 'Số lượng',
      render: (item: RawMaterialImport) => (
        <span className="font-semibold">
          {item.quantity.toLocaleString('vi-VN')} {item.rawMaterial?.unit || ''}
        </span>
      ),
    },
    {
      key: 'unitPrice',
      header: 'Đơn giá',
      render: (item: RawMaterialImport) => (
        <span>{item.unitPrice.toLocaleString('vi-VN')} đ</span>
      ),
      mobileHidden: true,
    },
    {
      key: 'totalAmount',
      header: 'Tổng tiền',
      render: (item: RawMaterialImport) => (
        <span className="font-semibold text-blue-600">
          {item.totalAmount.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      key: 'partner',
      header: 'Đối tác',
      render: (item: RawMaterialImport) => (
        <span>{item.partner?.name || 'N/A'}</span>
      ),
      mobileHidden: true,
    },
    {
      key: 'createdUser',
      header: 'Người tạo',
      render: (item: RawMaterialImport) => (
        <span>{item.createdUser?.userName || 'N/A'}</span>
      ),
      mobileHidden: true,
    },
    {
      key: 'dateCreated',
      header: 'Ngày tạo',
      render: (item: RawMaterialImport) => formatDateTime(item.dateCreated),
      mobileHidden: true,
    },
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Nhập hàng</h1>
        
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('sanpham')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'sanpham'
                ? 'text-orange-600 border-orange-600'
                : 'text-gray-600 border-transparent hover:text-orange-600'
            }`}
          >
            Sản phẩm
          </button>
          <button
            onClick={() => setActiveTab('nguyenlieu')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'nguyenlieu'
                ? 'text-orange-600 border-orange-600'
                : 'text-gray-600 border-transparent hover:text-orange-600'
            }`}
          >
            Nguyên liệu
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Tab Sản phẩm */}
      {activeTab === 'sanpham' && (
        <>
          <div className="mb-4 flex justify-end">
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

          <DataTable
            data={items}
            columns={columns}
            isLoading={loading}
            enablePagination={true}
            totalCount={totalCountInventoryReceipt}
            currentPage={currentPageInventoryReceipt}
            pageSize={pageSizeInventoryReceipt}
            onPageChange={(page) => {
              setCurrentPageInventoryReceipt(page);
              loadItems(page);
            }}
            onPageSizeChange={(newPageSize) => {
              setPageSizeInventoryReceipt(newPageSize);
              setCurrentPageInventoryReceipt(1);
              loadItems(1, newPageSize);
            }}
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
        </>
      )}

      {/* Tab Nguyên liệu */}
      {activeTab === 'nguyenlieu' && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => {
                setEditingRawMaterialImport(null);
                setNguyenLieuFormData({
                  rawMaterialId: '',
                  quantity: '',
                  unitPrice: '',
                  discount: '',
                  paidAmount: '',
                  partnerId: '',
                });
                setShowNguyenLieuModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nhập nguyên liệu
            </button>
          </div>

          <DataTable
            data={rawMaterialImports}
            columns={rawMaterialImportColumns}
            isLoading={loadingRawMaterialImports}
            enablePagination={true}
            totalCount={totalCountRawMaterialImport}
            currentPage={currentPageRawMaterialImport}
            pageSize={pageSizeRawMaterialImport}
            onPageChange={(page) => {
              setCurrentPageRawMaterialImport(page);
              loadRawMaterialImports(page);
            }}
            onPageSizeChange={(newPageSize) => {
              setPageSizeRawMaterialImport(newPageSize);
              setCurrentPageRawMaterialImport(1);
              loadRawMaterialImports(1, newPageSize);
            }}
            emptyMessage="Chưa có dữ liệu nhập nguyên liệu"
            actions={(item) => [
              {
                label: 'Sửa',
                icon: (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
                onClick: () => handleEditRawMaterialImport(item),
              },
            ]}
          />
        </>
      )}

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

      {/* Modal nhập nguyên liệu */}
      <Modal
        isOpen={showNguyenLieuModal}
        onClose={handleCloseNguyenLieuModal}
        title={editingRawMaterialImport ? 'Sửa nhập nguyên liệu' : 'Nhập nguyên liệu'}
        size="lg"
        footer={
          <>
            <button
              onClick={handleCloseNguyenLieuModal}
              className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Hủy
            </button>
            <button
              onClick={handleNguyenLieuSubmit}
              disabled={submittingNguyenLieu}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingNguyenLieu ? 'Đang lưu...' : editingRawMaterialImport ? 'Cập nhật' : 'Lưu'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <DynamicForm
            fields={nguyenLieuFormFields}
            values={nguyenLieuFormData}
            onChange={(name, value) => {
              setNguyenLieuFormData((prev) => ({ ...prev, [name]: value }));
            }}
            isSubmitting={submittingNguyenLieu}
            columns={2}
          />
          <div className="rounded-lg bg-gray-50 p-4 border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Tổng tiền:</span>
              <span className="text-xl font-bold text-blue-600">{calculateTotalAmount().toLocaleString('vi-VN')} đ</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              (Giá thành × Số lượng - Giảm giá)
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
