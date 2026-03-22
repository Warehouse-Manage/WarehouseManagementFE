'use client';

import { useEffect, useState } from 'react';
import { getCookie, printHtmlContent } from '@/lib/ultis';
import { financeApi, inventoryApi } from '@/api';
import { Order, Customer, Deliver, Product, PackageProduct, UpdateOrderFormData, OrderDetailsResponse } from '@/types';
import { DataTable } from '@/components/shared';
import { toast } from 'sonner';
import { CalendarDays, Pencil, Printer, Trash2 } from 'lucide-react';
import CreateOrderModal from './modal/CreateOrderModal';
import CustomerModal from './modal/CustomerModal';
import DeliverModal from './modal/DeliverModal';
import { useConfirm } from '@/hooks/useConfirm';

// Types moved to @/types/finance.ts and @/types/inventory.ts

export default function OrdersPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filterCustomerName, setFilterCustomerName] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  // apiHost removed, handled in API modules
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [delivers, setDelivers] = useState<Deliver[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [packageProducts, setPackageProducts] = useState<PackageProduct[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingDelivers, setLoadingDelivers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingPackageProducts, setLoadingPackageProducts] = useState(false);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [deliverId, setDeliverId] = useState<number | ''>('');
  const [sale, setSale] = useState<number | ''>(0);
  const [amountCustomerPayment, setAmountCustomerPayment] = useState<number | ''>(0);
  const [shipCost, setShipCost] = useState<number | ''>(0);
  const [shipcod, setShipcod] = useState<number | ''>(0);
  const [productOrdersInput, setProductOrdersInput] = useState<
    {
      productId: number | '';
      packageProductId: number | '';
      selectionKey: string; // 'p:ID' | 'k:ID'
      amount: number | '';
      price: number | '';
      sale: number | '';
    }[]
  >([{ productId: '', packageProductId: '', selectionKey: '', amount: '', price: '', sale: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newDeliverName, setNewDeliverName] = useState('');
  const [newDeliverPhone, setNewDeliverPhone] = useState('');
  const [newDeliverPlate, setNewDeliverPlate] = useState('');
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  const [submittingDeliver, setSubmittingDeliver] = useState(false);

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

  const formatDateTime = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN');
  };

  const formatDateFilterDisplay = (value: string) => {
    if (!value) return '';

    const parts = value.split('-');
    if (parts.length !== 3) return value;

    const [year, month, day] = parts;
    if (year.length !== 4 || month.length !== 2 || day.length !== 2) return value;

    return `${day}/${month}/${year}`;
  };

  const loadOrders = async (
    page: number = currentPage,
    size: number = pageSize,
    filters?: { searchTerm?: string; startDate?: string; endDate?: string }
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeApi.getOrdersFilter(page, size, filters);
      setOrders(result.data);
      setTotalCount(result.totalCount);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách đơn hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const data = await financeApi.getCustomers();
      setCustomers(data);
    } catch (err: unknown) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadDelivers = async () => {
    setLoadingDelivers(true);
    try {
      const data = await financeApi.getDelivers();
      setDelivers(data);
    } catch (err: unknown) {
      console.error('Failed to load delivers:', err);
    } finally {
      setLoadingDelivers(false);
    }
  };

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

  const buildOrderFilters = () => {
    const filters: { searchTerm?: string; startDate?: string; endDate?: string } = {};
    if (filterCustomerName.trim()) filters.searchTerm = filterCustomerName.trim();

    if (filterDateFrom) {
      const start = new Date(`${filterDateFrom}T00:00:00`);
      filters.startDate = start.toISOString();
    }

    if (filterDateTo) {
      const end = new Date(`${filterDateTo}T23:59:59.999`);
      filters.endDate = end.toISOString();
    }

    return filters;
  };

  useEffect(() => {
    loadOrders(1, pageSize, buildOrderFilters());
    loadCustomers();
    loadDelivers();
    loadProducts();
    loadPackageProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProductOrderField = (index: number, field: string, value: number | '') => {
    setProductOrdersInput((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateProductOrderKey = (index: number, selectionKey: string) => {
    setProductOrdersInput((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], selectionKey };
      return next;
    });
  };

  const calculateProductTotal = (productOrder: { selectionKey: string; amount: number | ''; price: number | ''; sale: number | '' }) => {
    const amount = Number(productOrder.amount || 0);
    const price = Number(productOrder.price || 0);
    const sale = Number(productOrder.sale || 0);
    return (amount * price) - sale;
  };

  const calculateGrandTotal = () => {
    return productOrdersInput.reduce((sum, p) => {
      if (p.selectionKey && p.amount !== '' && p.price !== '') {
        return sum + calculateProductTotal(p);
      }
      return sum;
    }, 0);
  };

  const calculateOrderTotal = () => {
    const productTotal = calculateGrandTotal();
    const orderSale = Number(sale || 0);
    return productTotal - orderSale;
  };

  // Auto-update shipcod (remaining) based on totals and customer payment
  useEffect(() => {
    const remaining = calculateOrderTotal() - Number(amountCustomerPayment || 0);
    setShipcod(remaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productOrdersInput, sale, amountCustomerPayment]);

  // Show blank page if role is not 'Admin' or 'accountance'
  if (role !== 'Admin' && role !== 'accountance') {
    return null;
  }

  const resetForm = () => {
    setCustomerId('');
    setDeliverId('');
    setSale(0);
    setAmountCustomerPayment(0);
    setShipCost(0);
    setShipcod(0);
    setProductOrdersInput([{ productId: '', packageProductId: '', selectionKey: '', amount: '', price: '', sale: 0 }]);
    setError(null);
    setEditingOrderId(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const hydrateFormFromOrder = (order: OrderDetailsResponse) => {
    setCustomerId(order.customerId);
    setDeliverId(order.deliverId);
    setSale(order.sale);
    setAmountCustomerPayment(order.amountCustomerPayment);
    setShipCost(order.shipCost ?? 0);
    setProductOrdersInput(
      (order.productOrders || []).map((po) => {
        const isPackage = !!po.packageProductId;
        return {
          productId: po.productId ?? '',
          packageProductId: po.packageProductId ?? '',
          selectionKey: isPackage ? `k:${po.packageProductId}` : `p:${po.productId}`,
          amount: po.amount,
          price: po.price,
          sale: po.sale ?? 0
        };
      })
    );
  };

  const handleEditOrder = async (orderId: number) => {
    setError(null);
    setLoading(true);
    try {
      const orderDetail = await financeApi.getOrderById(orderId);
      setEditingOrderId(orderId);
      hydrateFormFromOrder(orderDetail);
      setShowModal(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName || !newCustomerAddress || !newCustomerPhone) {
      setError('Vui lòng nhập đầy đủ thông tin khách hàng');
      return;
    }
    const userId = getCookie('userId');
    if (!userId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    setSubmittingCustomer(true);
    setError(null);
    try {
      const newCustomer = await financeApi.createCustomer({
        name: newCustomerName,
        address: newCustomerAddress,
        phoneNumber: newCustomerPhone,
        createdUserId: Number(userId)
      });
      await loadCustomers();
      setCustomerId(newCustomer.id);
      setNewCustomerName('');
      setNewCustomerAddress('');
      setNewCustomerPhone('');
      setShowCustomerModal(false);
      toast.success('Đã thêm khách hàng mới');
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo khách hàng');
    } finally {
      setSubmittingCustomer(false);
    }
  };

  const handleCreateDeliver = async () => {
    if (!newDeliverName || !newDeliverPhone || !newDeliverPlate) {
      setError('Vui lòng nhập đầy đủ thông tin người giao hàng');
      return;
    }
    const userId = getCookie('userId');
    if (!userId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    setSubmittingDeliver(true);
    setError(null);
    try {
      const newDeliver = await financeApi.createDeliver({
        name: newDeliverName,
        phoneNumber: newDeliverPhone,
        plateNumber: newDeliverPlate,
        createdUserId: Number(userId)
      });
      await loadDelivers();
      setDeliverId(newDeliver.id);
      setNewDeliverName('');
      setNewDeliverPhone('');
      setNewDeliverPlate('');
      setShowDeliverModal(false);
      toast.success('Đã thêm người giao hàng mới');
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo người giao hàng');
    } finally {
      setSubmittingDeliver(false);
    }
  };

  const addProductOrderRow = () => {
    setProductOrdersInput((prev) => [
      ...prev,
      { productId: '', packageProductId: '', selectionKey: '', amount: '', price: '', sale: 0 }
    ]);
  };

  const handlePrintDeliveryNote = async (id: number) => {
    try {
      const html = await financeApi.printOrderDeliveryNote(id);
      printHtmlContent(html);
    } catch (err) {
      toast.error('Không thể tải phiếu xuất kho: ' + getErrorMessage(err));
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    const confirmed = await confirm({
      message: `Bạn có chắc chắn muốn xóa đơn hàng #${order.id}?`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      await financeApi.deleteOrder(order.id);
      toast.success('Xóa đơn hàng thành công');
      await loadOrders(currentPage);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Không thể xóa đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const buildProductsPayload = () => {
    return productOrdersInput
      .filter((p) => p.selectionKey !== '' && p.amount !== '' && p.price !== '')
      .map((p) => {
        const isPackage = p.selectionKey.startsWith('k:');
        return {
          // Luôn gửi productId thật để backend không nhận 0
          productId: Number(p.productId),
          // Nếu là kiện thì thêm packageProductId, nếu không thì bỏ trống
          packageProductId: isPackage ? Number(p.packageProductId) : undefined,
          amount: Number(p.amount),
          price: Number(p.price),
          sale: Number(p.sale || 0),
        };
      });
  };

  const handleSubmitOrder = async () => {
    if (customerId === '' || deliverId === '') {
      setError('Cần chọn Khách hàng và Người giao hàng');
      return;
    }
    const userId = getCookie('userId');
    if (!userId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    const productsToOrder = buildProductsPayload();
    if (!productsToOrder.length) {
      setError('Cần ít nhất một sản phẩm');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editingOrderId) {
        const payload: UpdateOrderFormData = {
          customerId: Number(customerId),
          deliverId: Number(deliverId),
          sale: Number(sale || 0),
          amountCustomerPayment: Number(amountCustomerPayment || 0),
          shipCost: Number(shipCost || 0),
          productOrders: productsToOrder,
        };
        await financeApi.updateOrder(editingOrderId, payload);
        toast.success('Cập nhật đơn hàng thành công');
        resetForm();
        setShowModal(false);
        await loadOrders(currentPage);
        return;
      }

      const res = await financeApi.createOrder({
        customerId: Number(customerId),
        deliverId: Number(deliverId),
        sale: Number(sale || 0),
        amountCustomerPayment: Number(amountCustomerPayment || 0),
        shipCost: Number(shipCost || 0),
        productOrders: productsToOrder,
        createdUserId: Number(userId),
      });

      const now = new Date();
      const customer = customers.find((c) => c.id === Number(customerId));
      const deliver = delivers.find((d) => d.id === Number(deliverId));

      // Format DD/MM/YYYY HH:MM
      const formatDateTime = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      };

      const receiptModel = {
        Tieu_De: 'PHIẾU THU (ĐƠN HÀNG)',
        Nhan_Doi_Tac: 'Người nộp tiền',
        Ngay_Thang_Nam: formatDateTime(now),
        Doi_Tac: customer?.name || 'Khách hàng',
        Dia_Chi: customer?.address || '',
        Ly_Do: `Thanh toán cho đơn hàng #${res.id}`,
        Gia_Tri_Phieu: Number(amountCustomerPayment || 0).toLocaleString('vi-VN'),
        Ngay: now.getDate().toString().padStart(2, '0'),
        Thang: (now.getMonth() + 1).toString().padStart(2, '0'),
        Nam: now.getFullYear().toString(),
        Nhan_Ky_Ten: 'NGƯỜI NỘP TIỀN'
      };

        const deliveryItems = productsToOrder.map((po, idx) => {
          const pkg = po.packageProductId
            ? packageProducts.find((k) => k.id === po.packageProductId)
            : undefined;
          const baseProduct = po.productId
            ? products.find((p) => p.id === po.productId)
            : undefined;
          const isPackage = !!po.packageProductId;
          return {
            STT: idx + 1,
            // Nếu là kiện: luôn hiển thị tên kiện (không fallback sang tên sản phẩm)
            Ten_Hang_Hoa: isPackage ? (pkg?.name || 'Kiện') : (baseProduct?.name || 'Sản phẩm'),
            So_Luong: po.amount,
            ProductId: po.productId && po.productId > 0 ? po.productId : null,
            PackageProductId: po.packageProductId ?? null,
            QuantityProduct: pkg?.quantityProduct ?? null,
            Ten_San_Pham_Goc: baseProduct?.name || 'Sản phẩm',
          };
        });

      const deliveryModel = {
        Ngay_Thang_Nam: formatDateTime(now),
        Khach_Hang: customer?.name || 'Khách hàng',
        Bien_So_Xe: deliver?.plateNumber || '...',
        Doi_Tac_Giao_Hang: deliver?.name || '...',
        SDT_Khach_Hang: customer?.phoneNumber || '...',
        Tong_So_Luong: productsToOrder.reduce((s, po) => s + po.amount, 0).toString(),
        Items: deliveryItems
      };

      const [receiptHtml, deliveryHtml] = await Promise.all([
        financeApi.printOrderReceiptModel(receiptModel),
        financeApi.printOrderDeliveryNoteModel(deliveryModel)
      ]);

      if (receiptHtml) printHtmlContent(receiptHtml);
      if (deliveryHtml) printHtmlContent(deliveryHtml);

      resetForm();
      setShowModal(false);
      await loadOrders(currentPage);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || (editingOrderId ? 'Không thể cập nhật đơn hàng' : 'Không thể tạo đơn hàng'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Đơn hàng</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Theo dõi và quản lý các đơn hàng xuất kho</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm cursor-pointer"
        >
          <span className="hidden sm:inline">+ Tạo đơn hàng mới</span>
          <span className="sm:hidden">+ Thêm</span>
        </button>
      </div>

      <CreateOrderModal
        isOpen={showModal}
        onClose={handleCloseModal}
        error={error}
        submitting={submitting}
        customers={customers}
        delivers={delivers}
        products={products}
        packageProducts={packageProducts}
        loadingCustomers={loadingCustomers}
        loadingDelivers={loadingDelivers}
        loadingProducts={loadingProducts}
        loadingPackageProducts={loadingPackageProducts}
        customerId={customerId}
        deliverId={deliverId}
        sale={sale}
        amountCustomerPayment={amountCustomerPayment}
        shipCost={shipCost}
        shipcod={shipcod}
        productOrdersInput={productOrdersInput}
        onCustomerIdChange={setCustomerId}
        onDeliverIdChange={setDeliverId}
        onSaleChange={setSale}
        onAmountCustomerPaymentChange={setAmountCustomerPayment}
        onShipCostChange={setShipCost}
        onOpenCustomerModal={() => {
          setNewCustomerName('');
          setNewCustomerAddress('');
          setNewCustomerPhone('');
          setError(null);
          setShowCustomerModal(true);
        }}
        onOpenDeliverModal={() => {
          setNewDeliverName('');
          setNewDeliverPhone('');
          setNewDeliverPlate('');
          setError(null);
          setShowDeliverModal(true);
        }}
        onAddProductOrderRow={addProductOrderRow}
        onRemoveProductOrderRow={(idx) => setProductOrdersInput(prev => prev.filter((_, i) => i !== idx))}
        onUpdateProductOrderKey={updateProductOrderKey}
        onUpdateProductOrderField={updateProductOrderField}
        calculateProductTotal={calculateProductTotal}
        calculateGrandTotal={calculateGrandTotal}
        calculateOrderTotal={calculateOrderTotal}
        title={editingOrderId ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng mới'}
        submitLabel={editingOrderId ? 'Cập nhật đơn hàng' : 'Lưu đơn hàng'}
        onSubmit={handleSubmitOrder}
      />

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setNewCustomerName('');
          setNewCustomerAddress('');
          setNewCustomerPhone('');
        }}
        newCustomerName={newCustomerName}
        newCustomerAddress={newCustomerAddress}
        newCustomerPhone={newCustomerPhone}
        error={error}
        submitting={submittingCustomer}
        onNameChange={setNewCustomerName}
        onAddressChange={setNewCustomerAddress}
        onPhoneChange={setNewCustomerPhone}
        onSubmit={handleCreateCustomer}
      />

      <DeliverModal
        isOpen={showDeliverModal}
        onClose={() => {
          setShowDeliverModal(false);
          setNewDeliverName('');
          setNewDeliverPhone('');
          setNewDeliverPlate('');
        }}
        newDeliverName={newDeliverName}
        newDeliverPhone={newDeliverPhone}
        newDeliverPlate={newDeliverPlate}
        error={error}
        submitting={submittingDeliver}
        onNameChange={setNewDeliverName}
        onPhoneChange={setNewDeliverPhone}
        onPlateChange={setNewDeliverPlate}
        onSubmit={handleCreateDeliver}
      />

      <div className="border rounded-lg p-4 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">Danh sách đơn hàng</h2>
          <button
            onClick={() => loadOrders(currentPage, pageSize, buildOrderFilters())}
            disabled={loading}
            className="p-2 sm:px-4 sm:py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>

        <DataTable
          enableFilter
          filterContent={
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Khách hàng</label>
                <input
                  value={filterCustomerName}
                  onChange={(e) => setFilterCustomerName(e.target.value)}
                  placeholder="Nhập tên khách hàng..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Từ ngày</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatDateFilterDisplay(filterDateFrom)}
                    readOnly
                    placeholder="dd/mm/yyyy"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    aria-label="Tá»« ngÃ y"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Đến ngày</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatDateFilterDisplay(filterDateTo)}
                    readOnly
                    placeholder="dd/mm/yyyy"
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    aria-label="Äáº¿n ngÃ y"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </div>
              </div>
              <div className="md:col-span-4 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => {
                    setCurrentPage(1);
                    loadOrders(1, pageSize, buildOrderFilters());
                  }}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lọc
                </button>
                <button
                  onClick={() => {
                    setFilterCustomerName('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                    setCurrentPage(1);
                    loadOrders(1, pageSize, {});
                  }}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Xóa lọc
                </button>
              </div>
            </div>
          }
          data={orders}
          isLoading={loading}
          enablePagination={true}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
            loadOrders(page, pageSize, buildOrderFilters());
          }}
          onPageSizeChange={(newPageSize) => {
            setPageSize(newPageSize);
            setCurrentPage(1);
            loadOrders(1, newPageSize, buildOrderFilters());
          }}
          columns={[
            {
              key: 'customerName',
              header: 'Khách hàng',
              isMain: true,
              render: (o) => (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 min-w-[40px] rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-black text-xs">
                    {(o.customerName || 'K').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-black text-gray-900 hover:text-orange-600 transition-colors uppercase tracking-tight">
                      {o.customerName || `Khách #${o.customerId}`}
                    </div>
                    <div className="text-[10px] text-gray-400 font-bold tracking-widest">#{o.id}</div>
                  </div>
                </div>
              )
            },
            {
              key: 'dateCreated',
              header: 'Thời gian',
              render: (o) => (
                <div className="text-sm font-bold text-gray-700">
                  {formatDateTime(o.dateCreated)}
                </div>
              )
            },
            {
              key: 'totalPrice',
              header: 'Tổng tiền',
              headerClassName: 'text-right',
              className: 'text-right',
              render: (o) => (
                <span className="font-black text-gray-900 md:text-base">
                  {o.totalPrice.toLocaleString()}đ
                </span>
              )
            },
            {
              key: 'sale',
              header: 'Giảm giá',
              mobileHidden: true,
              headerClassName: 'text-right',
              className: 'text-right',
              render: (o) => <span className="text-red-500 font-bold">{o.sale.toLocaleString()}đ</span>
            },
            {
              key: 'amountCustomerPayment',
              header: 'Khách trả',
              mobileHidden: true,
              headerClassName: 'text-right',
              className: 'text-right',
              render: (o) => <span className="text-blue-600 font-bold">{o.amountCustomerPayment.toLocaleString()}đ</span>
            },
            {
              key: 'remainingAmount',
              header: 'Còn nợ',
              headerClassName: 'text-right',
              className: 'text-right',
              render: (o) => (
                <div className="flex flex-col items-end">
                  <span className={`font-black md:text-base ${o.remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {o.remainingAmount.toLocaleString()}đ
                  </span>
                  {o.remainingAmount > 0 && <span className="text-[10px] font-bold text-orange-400 uppercase tracking-tighter md:hidden">Chưa thu</span>}
                </div>
              )
            }
          ]}
          actions={(o) => [
            {
              label: 'Sửa',
              icon: <Pencil className="h-4 w-4" />,
              onClick: () => handleEditOrder(o.id)
            },
            {
              label: 'In đơn hàng',
              icon: <Printer className="h-4 w-4" />,
              onClick: () => handlePrintDeliveryNote(o.id)
            },
            {
              label: 'Xóa',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleDeleteOrder(o),
              variant: 'danger' as const
            }
          ]}
          emptyMessage="Chưa có dữ liệu đơn hàng"
        />
        {ConfirmDialog}
      </div>
    </div>
  );
}


