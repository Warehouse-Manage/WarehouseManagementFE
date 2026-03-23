'use client';

import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { getCookie, printHtmlContent } from '@/lib/ultis';
import { DataTable, FormField } from '@/components/shared';
import ImportProductModal from './modal/ImportProductModal';
import ImportRawMaterialModal from './modal/ImportRawMaterialModal';
import { inventoryApi, inventoryReceiptApi, partnerApi, financeApi } from '@/api';
import { Product, PackageProduct, RawMaterial, Partner, RawMaterialImport, InventoryReceipt } from '@/types';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

type ChartGranularity = 'day' | 'month';

interface ChartPoint {
  label: string;
  value: number;
  bars?: {
    label: string;
    value: number;
    colorClass: string;
  }[];
}

const CHART_PAGE_SIZE = 10;
const PRODUCT_CHART_SERIES = [
  {
    key: 'brick-b-425',
    label: 'Kiện gạch B 425 viên',
    colorClass: 'bg-orange-500',
  },
  {
    key: 'brick-a-425',
    label: 'Kiện A 425',
    colorClass: 'bg-orange-300',
  },
] as const;

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: `Thang ${index + 1}`,
}));

const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

const getChartPageForDate = (granularity: ChartGranularity, year: number, month: number, targetDate: Date) => {
  const targetYear = targetDate.getFullYear();
  if (year !== targetYear) return 0;

  if (granularity === 'month') {
    return Math.floor(targetDate.getMonth() / CHART_PAGE_SIZE);
  }

  if (month !== targetDate.getMonth() + 1) return 0;

  return Math.floor((targetDate.getDate() - 1) / CHART_PAGE_SIZE);
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const isBrickB425Package = (value: string) => {
  const normalized = normalizeText(value);
  return normalized.includes('b 425') && (normalized.includes('vien') || normalized.includes('gach'));
};

const isBrickA425Package = (value: string) => {
  const normalized = normalizeText(value);
  return normalized.includes('a 425');
};

const createYearOptions = (years: number[]) =>
  years.map((year) => ({
    value: String(year),
    label: String(year),
  }));

const extractYears = <T,>(source: T[], getDate: (item: T) => string | undefined) => {
  const years = new Set<number>([new Date().getFullYear()]);

  source.forEach((item) => {
    const value = getDate(item);
    if (!value) return;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      years.add(date.getFullYear());
    }
  });

  return Array.from(years).sort((a, b) => b - a);
};

export default function NhapHangPage() {
  const today = useMemo(() => new Date(), []);
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
  const [, setLoadingProducts] = useState(false);
  const [, setLoadingPackageProducts] = useState(false);
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
  const [productChartGranularity, setProductChartGranularity] = useState<'day' | 'month'>('day');
  const [rawMaterialChartGranularity, setRawMaterialChartGranularity] = useState<'day' | 'month'>('day');
  const [chartInventoryReceipts, setChartInventoryReceipts] = useState<InventoryReceipt[]>([]);
  const [chartRawMaterialImports, setChartRawMaterialImports] = useState<RawMaterialImport[]>([]);
  const [productChartYear, setProductChartYear] = useState(String(today.getFullYear()));
  const [productChartMonth, setProductChartMonth] = useState(String(today.getMonth() + 1));
  const [rawMaterialChartYear, setRawMaterialChartYear] = useState(String(today.getFullYear()));
  const [rawMaterialChartMonth, setRawMaterialChartMonth] = useState(String(today.getMonth() + 1));
  const [selectedChartRawMaterialId, setSelectedChartRawMaterialId] = useState('');
  const [productChartPage, setProductChartPage] = useState(0);
  const [rawMaterialChartPage, setRawMaterialChartPage] = useState(0);

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
      await Promise.all([
        loadProducts(),
        loadPackageProducts(),
        loadRawMaterials(),
        loadPartners(),
        loadChartInventoryReceipts(),
        loadChartRawMaterialImports(),
      ]);
    };
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedChartRawMaterialId && rawMaterials.length > 0) {
      setSelectedChartRawMaterialId(String(rawMaterials[0].id));
    }
  }, [rawMaterials, selectedChartRawMaterialId]);

  // Load rawMaterialImports khi vào tab nguyên liệu
  useEffect(() => {
    if (activeTab === 'nguyenlieu') {
      setCurrentPageRawMaterialImport(1);
      loadRawMaterialImports(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const loadChartInventoryReceipts = async () => {
    try {
      const data = await inventoryReceiptApi.getInventoryReceipts();
      setChartInventoryReceipts(data);
    } catch (err: unknown) {
      console.error('Failed to load chart inventory receipts:', err);
    }
  };

  const loadChartRawMaterialImports = async () => {
    try {
      const data = await inventoryApi.getRawMaterialImports();
      setChartRawMaterialImports(data);
    } catch (err: unknown) {
      console.error('Failed to load chart raw material imports:', err);
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
      await Promise.all([loadItems(currentPageInventoryReceipt), loadChartInventoryReceipts()]);
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
      await Promise.all([loadRawMaterialImports(currentPageRawMaterialImport), loadChartRawMaterialImports()]);
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

  const buildChartData = <T,>(
    source: T[],
    getDate: (item: T) => string | undefined,
    getValue: (item: T) => number,
    granularity: ChartGranularity,
    selectedYear: number,
    selectedMonth: number
  ): ChartPoint[] => {
    if (granularity === 'day') {
      const totalDays = getDaysInMonth(selectedYear, selectedMonth);
      const values = Array.from({ length: totalDays }, () => 0);

      source.forEach((item) => {
        const value = getDate(item);
        if (!value) return;
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return;
        if (date.getFullYear() !== selectedYear || date.getMonth() + 1 !== selectedMonth) return;

        values[date.getDate() - 1] += getValue(item);
      });

      return values.map((value, index) => ({
        label: `Ngay ${index + 1}`,
        value,
      }));
    }

    const values = Array.from({ length: 12 }, () => 0);

    source.forEach((item) => {
      const value = getDate(item);
      if (!value) return;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return;
      if (date.getFullYear() !== selectedYear) return;

      values[date.getMonth()] += getValue(item);
    });

    return values.map((value, index) => ({
      label: `Thang ${index + 1}`,
      value,
    }));
  };

  const getVisibleChartData = (data: ChartPoint[], page: number) => {
    const start = page * CHART_PAGE_SIZE;
    return data.slice(start, start + CHART_PAGE_SIZE);
  };

  const productChartSource = useMemo(
    () => chartInventoryReceipts.filter((item) => Boolean(item.packageProductId)),
    [chartInventoryReceipts]
  );

  const productChartSeries = useMemo(() => {
    const brickB425Ids = packageProducts.filter((pkg) => isBrickB425Package(pkg.name)).map((pkg) => pkg.id);
    const brickA425Ids = packageProducts.filter((pkg) => isBrickA425Package(pkg.name)).map((pkg) => pkg.id);

    return PRODUCT_CHART_SERIES.map((series) => ({
      ...series,
      packageIds: series.key === 'brick-b-425' ? brickB425Ids : brickA425Ids,
    }));
  }, [packageProducts]);

  const productYearOptions = useMemo(
    () => createYearOptions(extractYears(productChartSource, (item) => item.createdDate)),
    [productChartSource]
  );

  const productChartData = useMemo(
    () => {
      const groupedValues =
        productChartGranularity === 'day'
          ? Array.from({ length: getDaysInMonth(Number(productChartYear), Number(productChartMonth)) }, () =>
              productChartSeries.map(() => 0)
            )
          : Array.from({ length: 12 }, () => productChartSeries.map(() => 0));

      const packageToSeriesIndex = new Map<number, number>();
      productChartSeries.forEach((series, seriesIndex) => {
        series.packageIds.forEach((packageId) => {
          packageToSeriesIndex.set(packageId, seriesIndex);
        });
      });

      productChartSource.forEach((item) => {
        if (!item.packageProductId) return;

        const seriesIndex = packageToSeriesIndex.get(item.packageProductId);
        if (seriesIndex === undefined) return;

        const date = new Date(item.createdDate);
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== Number(productChartYear)) return;

        if (productChartGranularity === 'day') {
          if (date.getMonth() + 1 !== Number(productChartMonth)) return;
          groupedValues[date.getDate() - 1][seriesIndex] += item.quantity;
          return;
        }

        groupedValues[date.getMonth()][seriesIndex] += item.quantity;
      });

      return groupedValues.map((values, index) => ({
        label: productChartGranularity === 'day' ? `Ngay ${index + 1}` : `Thang ${index + 1}`,
        value: values.reduce((sum, current) => sum + current, 0),
        bars: productChartSeries.map((series, seriesIndex) => ({
          label: series.label,
          value: values[seriesIndex],
          colorClass: series.colorClass,
        })),
      }));
    },
    [productChartSource, productChartGranularity, productChartYear, productChartMonth, productChartSeries]
  );

  const selectedChartRawMaterial = useMemo(
    () => rawMaterials.find((item) => String(item.id) === selectedChartRawMaterialId),
    [rawMaterials, selectedChartRawMaterialId]
  );

  const rawMaterialChartSource = useMemo(() => {
    if (!selectedChartRawMaterialId) return [];
    return chartRawMaterialImports.filter((item) => item.rawMaterialId === Number(selectedChartRawMaterialId));
  }, [chartRawMaterialImports, selectedChartRawMaterialId]);

  const rawMaterialYearOptions = useMemo(
    () => createYearOptions(extractYears(rawMaterialChartSource, (item) => item.dateCreated)),
    [rawMaterialChartSource]
  );

  const rawMaterialChartData = useMemo(
    () =>
      buildChartData(
        rawMaterialChartSource,
        (item) => item.dateCreated,
        (item) => item.quantity,
        rawMaterialChartGranularity,
        Number(rawMaterialChartYear),
        Number(rawMaterialChartMonth)
      ),
    [rawMaterialChartSource, rawMaterialChartGranularity, rawMaterialChartYear, rawMaterialChartMonth]
  );

  const productChartTotalPages = Math.max(1, Math.ceil(productChartData.length / CHART_PAGE_SIZE));
  const rawMaterialChartTotalPages = Math.max(1, Math.ceil(rawMaterialChartData.length / CHART_PAGE_SIZE));

  useEffect(() => {
    setProductChartPage(
      getChartPageForDate(
        productChartGranularity,
        Number(productChartYear),
        Number(productChartMonth),
        today
      )
    );
  }, [productChartGranularity, productChartYear, productChartMonth, today]);

  useEffect(() => {
    setRawMaterialChartPage(
      getChartPageForDate(
        rawMaterialChartGranularity,
        Number(rawMaterialChartYear),
        Number(rawMaterialChartMonth),
        today
      )
    );
  }, [rawMaterialChartGranularity, rawMaterialChartYear, rawMaterialChartMonth, selectedChartRawMaterialId, today]);

  useEffect(() => {
    setProductChartPage((current) => Math.min(current, productChartTotalPages - 1));
  }, [productChartTotalPages]);

  useEffect(() => {
    setRawMaterialChartPage((current) => Math.min(current, rawMaterialChartTotalPages - 1));
  }, [rawMaterialChartTotalPages]);

  const SimpleBarChart = ({
    title,
    data,
    colorClass,
    granularity,
    onGranularityChange,
    unitLabel,
    selectedYear,
    onYearChange,
    yearOptions,
    selectedMonth,
    onMonthChange,
    page,
    totalPages,
    onPrevPage,
    onNextPage,
    extraFilters,
  }: {
    title: string;
    data: ChartPoint[];
    colorClass: string;
    granularity: ChartGranularity;
    onGranularityChange: (value: ChartGranularity) => void;
    unitLabel: string;
    selectedYear: string;
    onYearChange: (value: string) => void;
    yearOptions: { value: string; label: string }[];
    selectedMonth: string;
    onMonthChange: (value: string) => void;
    page: number;
    totalPages: number;
    onPrevPage: () => void;
    onNextPage: () => void;
    extraFilters?: ReactNode;
  }) => {
    const visibleData = getVisibleChartData(data, page);
    const hasGroupedBars = data.some((row) => row.bars && row.bars.length > 0);
    const legendItems = data.find((row) => row.bars && row.bars.length > 0)?.bars ?? [];
    const maxValue = Math.max(
      ...data.flatMap((row) => (row.bars && row.bars.length > 0 ? row.bars.map((bar) => bar.value) : [row.value])),
      0
    );

    return (
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-sm font-bold text-gray-900 sm:text-base">{title}</h3>
            <div className="inline-flex overflow-hidden self-start rounded-lg border border-gray-200">
            <button
              onClick={() => onGranularityChange('day')}
              className={`cursor-pointer px-3 py-1.5 text-xs font-semibold ${granularity === 'day' ? activeTab === 'sanpham' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Theo ngày
            </button>
            <button
              onClick={() => onGranularityChange('month')}
              className={`cursor-pointer px-3 py-1.5 text-xs font-semibold ${granularity === 'month' ? activeTab === 'sanpham' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Theo tháng
            </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[120px]">
                <label className="mb-1 block text-xs font-semibold text-gray-600">Nam</label>
                <select
                  value={selectedYear}
                  onChange={(event) => onYearChange(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                >
                  {yearOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {granularity === 'day' && (
                <div className="min-w-[120px]">
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Thang</label>
                  <select
                    value={selectedMonth}
                    onChange={(event) => onMonthChange(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none"
                  >
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {extraFilters}
            </div>

            <div className="flex items-center gap-2 self-start xl:self-end">
              <button
                type="button"
                onClick={onPrevPage}
                disabled={page === 0}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-[84px] text-center text-xs font-medium text-gray-500">
                {`${page + 1} / ${totalPages}`}
              </div>
              <button
                type="button"
                onClick={onNextPage}
                disabled={page >= totalPages - 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="text-sm text-gray-500">Chưa có dữ liệu để hiển thị biểu đồ.</div>
        ) : (
          <>
            {hasGroupedBars && legendItems.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-600">
                {legendItems.map((item) => (
                  <div key={item.label} className="inline-flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-sm ${item.colorClass}`} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="h-64 overflow-hidden">
              <div className="flex h-full items-end gap-3 border-b border-l border-gray-200 px-3 pb-3">
                {visibleData.map((row) => {
                  const bars = row.bars && row.bars.length > 0 ? row.bars : [{ label: title, value: row.value, colorClass }];
                  return (
                    <div key={row.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                      <div className="mb-1 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-gray-700">
                        {bars.map((bar) => (
                          <span key={bar.label} className="whitespace-nowrap">
                            {bar.value.toLocaleString('vi-VN')}
                          </span>
                        ))}
                      </div>
                      <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-1 self-stretch">
                        {bars.map((bar) => {
                          const height = maxValue > 0 ? (bar.value / maxValue) * 100 : 0;
                          return (
                            <div
                              key={bar.label}
                              className={`min-h-[4px] flex-1 rounded-t-md ${bar.colorClass}`}
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${bar.label}: ${bar.value.toLocaleString('vi-VN')} ${unitLabel}`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-center text-[10px] text-gray-500">{row.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">Đơn vị: {unitLabel}</div>
          </>
        )}
      </div>
    );
  };

  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Nhập hàng</h1>
        
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('sanpham')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'sanpham'
                ? 'text-orange-600 border-orange-600'
                : 'text-gray-600 border-transparent hover:text-orange-600'
            }`}
          >
            Sản phẩm
          </button>
          <button
            onClick={() => setActiveTab('nguyenlieu')}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
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
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Thêm nhập hàng
            </button>
          </div>

          <SimpleBarChart
            title="Biểu đồ nhập hàng (Sản phẩm)"
            data={productChartData}
            colorClass="bg-orange-500"
            granularity={productChartGranularity}
            onGranularityChange={setProductChartGranularity}
            selectedYear={productChartYear}
            onYearChange={setProductChartYear}
            yearOptions={productYearOptions}
            selectedMonth={productChartMonth}
            onMonthChange={setProductChartMonth}
            page={productChartPage}
            totalPages={productChartTotalPages}
            onPrevPage={() => setProductChartPage((current) => Math.max(0, current - 1))}
            onNextPage={() => setProductChartPage((current) => Math.min(productChartTotalPages - 1, current + 1))}
            unitLabel="kiện"
          />

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
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nhập nguyên liệu
            </button>
          </div>

          <SimpleBarChart
            title="Biểu đồ nhập hàng (Nguyên liệu)"
            data={rawMaterialChartData}
            colorClass="bg-blue-500"
            granularity={rawMaterialChartGranularity}
            onGranularityChange={setRawMaterialChartGranularity}
            selectedYear={rawMaterialChartYear}
            onYearChange={setRawMaterialChartYear}
            yearOptions={rawMaterialYearOptions}
            selectedMonth={rawMaterialChartMonth}
            onMonthChange={setRawMaterialChartMonth}
            page={rawMaterialChartPage}
            totalPages={rawMaterialChartTotalPages}
            onPrevPage={() => setRawMaterialChartPage((current) => Math.max(0, current - 1))}
            onNextPage={() => setRawMaterialChartPage((current) => Math.min(rawMaterialChartTotalPages - 1, current + 1))}
            extraFilters={
              <div className="min-w-[180px]">
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Nguyen lieu {selectedChartRawMaterial ? `(${selectedChartRawMaterial.unit})` : ''}
                </label>
                <select
                  value={selectedChartRawMaterialId}
                  onChange={(event) => setSelectedChartRawMaterialId(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  {rawMaterials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.name}
                    </option>
                  ))}
                </select>
              </div>
            }
            unitLabel={selectedChartRawMaterial?.unit || 'đơn vị'}
          />

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

      <ImportProductModal
        isOpen={showModal}
        onClose={handleCloseModal}
        editingItem={editingItem}
        formFields={formFields}
        formData={formData}
        submitting={submitting}
        onFormChange={(name, value) => {
          setFormData((prev) => ({ ...prev, [name]: value }));
        }}
        onSubmit={handleSubmit}
      />

      <ImportRawMaterialModal
        isOpen={showNguyenLieuModal}
        onClose={handleCloseNguyenLieuModal}
        editingRawMaterialImport={editingRawMaterialImport}
        nguyenLieuFormFields={nguyenLieuFormFields}
        nguyenLieuFormData={nguyenLieuFormData}
        submittingNguyenLieu={submittingNguyenLieu}
        onFormChange={(name, value) => {
          setNguyenLieuFormData((prev) => ({ ...prev, [name]: value }));
        }}
        onSubmit={handleNguyenLieuSubmit}
        calculateTotalAmount={calculateTotalAmount}
      />
    </div>
  );
}
