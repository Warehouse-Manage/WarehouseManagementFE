'use client';

import { useEffect, useState } from 'react';
import { getCookie, printHtmlContent, formatNumberInput, parseNumberInput } from '@/lib/ultis';
import { financeApi, inventoryApi } from '@/api';
import { Order, Customer, Deliver, Product, PackageProduct, InventoryForecastResponse } from '@/types';
import { Modal, DataTable } from '@/components/shared';
import { toast } from 'sonner';
import { Printer, Trash2 } from 'lucide-react';

// Types moved to @/types/finance.ts and @/types/inventory.ts

export default function PlaceOrderPage() {
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
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
  const [deliveryDate, setDeliveryDate] = useState<string>('');
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
  const [showForecastWarning, setShowForecastWarning] = useState(false);
  const [forecastData, setForecastData] = useState<InventoryForecastResponse | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);

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

  const formatDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN');
  };

  const loadOrders = async (page: number = currentPage, size: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const result = await financeApi.getPlaceOrdersFilter(page, size);
      setOrders(result.data);
      setTotalCount(result.totalCount);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách đặt hàng');
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

  useEffect(() => {
    loadOrders(1);
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
    setDeliveryDate('');
    setSale(0);
    setAmountCustomerPayment(0);
    setShipCost(0);
    setShipcod(0);
    setProductOrdersInput([{ productId: '', packageProductId: '', selectionKey: '', amount: '', price: '', sale: 0 }]);
    setError(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
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
      const html = await financeApi.printPlaceOrderDeliveryNote(id);
      await printHtmlContent(html);
    } catch (err) {
      toast.error('Không thể tải phiếu xuất kho: ' + getErrorMessage(err));
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa đặt hàng #${order.id}?`)) {
      return;
    }
    try {
      setLoading(true);
      await financeApi.deletePlaceOrder(order.id);
      toast.success('Xóa đặt hàng thành công');
      await loadOrders(currentPage);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || 'Không thể xóa đặt hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (customerId === '' || deliverId === '') {
      setError('Cần nhập CustomerId và DeliverId');
      return;
    }
    if (!deliveryDate) {
      setError('Vui lòng chọn ngày giao hàng');
      return;
    }
    const userId = getCookie('userId');
    if (!userId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    const productsToOrder = productOrdersInput
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
    if (!productsToOrder.length) {
      setError('Cần ít nhất một sản phẩm');
      return;
    }
    setError(null);
    
    try {
      // Convert deliveryDate to ISO string
      const deliveryDateISO = deliveryDate ? new Date(`${deliveryDate}T00:00:00Z`).toISOString() : undefined;
      
      // Tính toán forecast trước khi save
      const forecastRequest = {
        deliveryDate: deliveryDateISO!,
        items: productsToOrder.map(po => ({
          productId: po.productId || undefined,
          packageProductId: po.packageProductId || undefined,
          requiredQuantity: po.amount
        }))
      };
      
      const forecastResult = await financeApi.calculatePlaceOrderForecast(forecastRequest);
      
      // Kiểm tra xem có thiếu hàng không
      if (forecastResult.hasAnyShortage) {
        setForecastData(forecastResult);
        setPendingCreate(true);
        setShowForecastWarning(true);
        return;
      }
      
      // Nếu đủ hàng thì tiếp tục tạo đơn hàng
      await proceedWithCreate(deliveryDateISO, productsToOrder);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo đặt hàng');
    }
  };

  const proceedWithCreate = async (deliveryDateISO: string | undefined, productsToOrder: Array<{ productId: number; packageProductId?: number; amount: number; price: number; sale: number }>) => {
    setSubmitting(true);
    setError(null);
    try {
      const userId = getCookie('userId');
      if (!userId) {
        setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
        return;
      }
      
      const res = await financeApi.createPlaceOrder({
        customerId: Number(customerId),
        deliverId: Number(deliverId),
        sale: Number(sale || 0),
        amountCustomerPayment: Number(amountCustomerPayment || 0),
        shipCost: Number(shipCost || 0),
        placeOrderProductOrders: productsToOrder,
        createdUserId: Number(userId),
        deliveryDate: deliveryDateISO,
      });

      const now = new Date();
      const customer = customers.find((c) => c.id === Number(customerId));

      // Format DD/MM/YYYY HH:MM
      const formatDateTime = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      };

      // Format ngày giao hàng
      const formatDeliveryDate = (dateStr: string | undefined): string => {
        if (!dateStr) return 'Chưa có';
        try {
          const date = new Date(dateStr);
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch {
          return 'Chưa có';
        }
      };

      const deliveryDateFormatted = formatDeliveryDate(deliveryDateISO);
      const customerName = customer?.name || 'Khách hàng';
      
      const receiptModel = {
        Tieu_De: 'PHIẾU THU (ĐẶT HÀNG)',
        Nhan_Doi_Tac: 'Người nộp tiền',
        Ngay_Thang_Nam: formatDateTime(now),
        Doi_Tac: customerName,
        Dia_Chi: customer?.address || '',
        Ly_Do: `Thanh toán cho đặt hàng #${res.id} - Người đặt hàng: ${customerName} - Ngày giao hàng: ${deliveryDateFormatted}`,
        Gia_Tri_Phieu: Number(amountCustomerPayment || 0).toLocaleString('vi-VN'),
        Ngay: now.getDate().toString().padStart(2, '0'),
        Thang: (now.getMonth() + 1).toString().padStart(2, '0'),
        Nam: now.getFullYear().toString(),
        Nhan_Ky_Ten: 'NGƯỜI NỘP TIỀN'
      };

      // Chỉ in phiếu thu (fund receipt)
      const receiptHtml = await financeApi.printPlaceOrderReceiptModel(receiptModel);
      if (receiptHtml) printHtmlContent(receiptHtml);

      resetForm();
      setShowModal(false);
      await loadOrders(currentPage);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo đặt hàng');
    } finally {
      setSubmitting(false);
      setPendingCreate(false);
    }
  };

  const handleConfirmForecastWarning = async () => {
    setShowForecastWarning(false);
    if (pendingCreate && deliveryDate) {
      const deliveryDateISO = new Date(`${deliveryDate}T00:00:00Z`).toISOString();
      const productsToOrder = productOrdersInput
        .filter((p) => p.selectionKey !== '' && p.amount !== '' && p.price !== '')
        .map((p) => {
          const isPackage = p.selectionKey.startsWith('k:');
          return {
            productId: Number(p.productId),
            packageProductId: isPackage ? Number(p.packageProductId) : undefined,
            amount: Number(p.amount),
            price: Number(p.price),
            sale: Number(p.sale || 0),
          };
        });
      await proceedWithCreate(deliveryDateISO, productsToOrder);
    }
  };

  const handleCancelForecastWarning = () => {
    setShowForecastWarning(false);
    setPendingCreate(false);
    setForecastData(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Đặt hàng</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Theo dõi và quản lý các đơn đặt hàng</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl shadow-lg shadow-orange-200 hover:shadow-orange-300 font-bold active:scale-95 transition-all text-sm cursor-pointer"
        >
          <span className="hidden sm:inline">+ Tạo đơn đặt hàng mới</span>
          <span className="sm:hidden">+ Thêm</span>
        </button>
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Tạo đơn đặt hàng mới"
        size="xl"
        footer={
          <>
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 border rounded font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 disabled:opacity-60 cursor-pointer transition-colors disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang lưu...' : 'Lưu đơn đặt hàng'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}

          <div className="space-y-4">
            {/* Row 1: Khách hàng và Người giao hàng */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="w-full">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Khách hàng *</label>
                <div className="flex items-stretch gap-2">
                  <select
                    className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={loadingCustomers}
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.phoneNumber}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setNewCustomerName('');
                      setNewCustomerAddress('');
                      setNewCustomerPhone('');
                      setError(null);
                      setShowCustomerModal(true);
                    }}
                    className="shrink-0 w-10 h-[42px] rounded-lg bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-colors font-bold text-xl leading-none flex items-center justify-center cursor-pointer"
                    title="Thêm khách hàng mới"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="w-full">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Người giao hàng *</label>
                <div className="flex items-stretch gap-2">
                  <select
                    className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    value={deliverId}
                    onChange={(e) => setDeliverId(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={loadingDelivers}
                  >
                    <option value="">-- Chọn người giao hàng --</option>
                    {delivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} - {d.plateNumber}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setNewDeliverName('');
                      setNewDeliverPhone('');
                      setNewDeliverPlate('');
                      setError(null);
                      setShowDeliverModal(true);
                    }}
                    className="shrink-0 w-10 h-[42px] rounded-lg bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-colors font-bold text-xl leading-none flex items-center justify-center cursor-pointer"
                    title="Thêm người giao hàng mới"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Ngày giao hàng */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Ngày giao hàng *</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* Row 3: Các trường khác */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Giảm giá đơn hàng</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  placeholder="0"
                  inputMode="decimal"
                  value={formatNumberInput(sale)}
                  onChange={(e) => setSale(parseNumberInput(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Khách trả</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  placeholder="0"
                  inputMode="decimal"
                  value={formatNumberInput(amountCustomerPayment)}
                  onChange={(e) => setAmountCustomerPayment(parseNumberInput(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Phí giao hàng</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  placeholder="0"
                  inputMode="decimal"
                  value={formatNumberInput(shipCost)}
                  onChange={(e) => setShipCost(parseNumberInput(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Ship COD / Còn lại</label>
                <input
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 font-bold text-orange-600"
                  placeholder="0"
                  type="text"
                  value={formatNumberInput(shipcod)}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-700">Danh sách sản phẩm</h3>
              <button
                onClick={addProductOrderRow}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Thêm sản phẩm
              </button>
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {productOrdersInput.map((p, idx) => {
                const total = calculateProductTotal(p);
                // Tính giá/viên để hiển thị: nếu là kiện thì chia cho quantityProduct, nếu là sản phẩm thì dùng trực tiếp
                const isPackage = p.selectionKey.startsWith('k:');
                const selectedPackage = isPackage ? packageProducts.find((pk) => pk.id === Number(p.packageProductId)) : undefined;
                const displayPrice = isPackage && selectedPackage && selectedPackage.quantityProduct > 0
                  ? Number(p.price || 0) / selectedPackage.quantityProduct
                  : Number(p.price || 0);
                return (
                  <div key={idx} className="relative rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-1">
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Sản phẩm</label>
                        <select
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                          value={p.selectionKey}
                          onChange={(e) => {
                            const key = e.target.value;
                            updateProductOrderKey(idx, key);

                            if (!key) {
                              updateProductOrderField(idx, 'productId', '');
                              updateProductOrderField(idx, 'packageProductId', '');
                              return;
                            }

                            if (key.startsWith('p:')) {
                              const selectedProductId = Number(key.slice(2));
                              const selectedProduct = products.find((pr) => pr.id === selectedProductId);
                              updateProductOrderField(idx, 'productId', selectedProductId);
                              updateProductOrderField(idx, 'packageProductId', '');
                              if (selectedProduct) {
                                updateProductOrderField(idx, 'price', selectedProduct.price);
                              }
                              return;
                            }

                            if (key.startsWith('k:')) {
                              const selectedPackageId = Number(key.slice(2));
                              const selectedPackage = packageProducts.find((pk) => pk.id === selectedPackageId);
                              if (!selectedPackage) return;
                              const baseProduct = products.find((pr) => pr.id === selectedPackage.productId);
                              updateProductOrderField(idx, 'packageProductId', selectedPackageId);
                              updateProductOrderField(idx, 'productId', selectedPackage.productId);
                              if (baseProduct) {
                                updateProductOrderField(
                                  idx,
                                  'price',
                                  baseProduct.price * selectedPackage.quantityProduct
                                );
                              }
                            }
                          }}
                          disabled={loadingProducts || loadingPackageProducts}
                        >
                          <option value="">-- Chọn --</option>
                          <optgroup label="Sản phẩm">
                            {products.map((pr) => (
                              <option key={`p-${pr.id}`} value={`p:${pr.id}`}>
                                {pr.name} ({pr.price.toLocaleString()}đ)
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Kiện">
                            {packageProducts.map((pk) => {
                              const baseProduct = products.find((pr) => pr.id === pk.productId);
                              const label = `${pk.name} - ${baseProduct?.name || `#${pk.productId}`} (${pk.quantityProduct} viên/kiện)`;
                              const packagePrice = baseProduct ? baseProduct.price * pk.quantityProduct : 0;
                              return (
                                <option key={`k-${pk.id}`} value={`k:${pk.id}`}>
                                  {label} ({packagePrice.toLocaleString()}đ/kiện)
                                </option>
                              );
                            })}
                          </optgroup>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Số lượng</label>
                        <input
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                          placeholder="0"
                          inputMode="decimal"
                          value={formatNumberInput(p.amount)}
                          onChange={(e) => updateProductOrderField(idx, 'amount', parseNumberInput(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Giá sản phẩm</label>
                        <input
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                          placeholder="0"
                          inputMode="decimal"
                          value={formatNumberInput(displayPrice)}
                          onChange={(e) => {
                            const newPricePerUnit = parseNumberInput(e.target.value);
                            if (newPricePerUnit === '') return;
                            // Nếu là kiện thì nhân lại với quantityProduct, nếu là sản phẩm thì dùng trực tiếp
                            if (isPackage && selectedPackage && selectedPackage.quantityProduct > 0) {
                              updateProductOrderField(idx, 'price', Number(newPricePerUnit) * selectedPackage.quantityProduct);
                            } else {
                              updateProductOrderField(idx, 'price', Number(newPricePerUnit));
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Thành tiền</label>
                        <div className="font-bold text-sm text-orange-600 pt-1.5">
                          {total > 0 ? total.toLocaleString() + 'đ' : '0đ'}
                        </div>
                      </div>
                    </div>
                    {productOrdersInput.length > 1 && (
                      <button
                        onClick={() => setProductOrdersInput(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors cursor-pointer"
                      >
                        <span className="text-sm">×</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                <div className="text-gray-600">
                  <p>Tổng tiền hàng: <span className="font-bold text-gray-900">{calculateGrandTotal().toLocaleString()}đ</span></p>
                  <p>Giảm giá đơn hàng: <span className="font-bold text-red-600">-{Number(sale || 0).toLocaleString()}đ</span></p>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Tổng cộng sau giảm</p>
                  <p className="text-2xl font-black text-orange-600 leading-none">
                    {calculateOrderTotal().toLocaleString()}đ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal thêm khách hàng */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => {
          setShowCustomerModal(false);
          setNewCustomerName('');
          setNewCustomerAddress('');
          setNewCustomerPhone('');
        }}
        title="Thêm khách hàng mới"
        size="md"
        footer={
          <>
            <button
              onClick={() => {
                setShowCustomerModal(false);
                setNewCustomerName('');
                setNewCustomerAddress('');
                setNewCustomerPhone('');
              }}
              className="px-4 py-2 border rounded font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
              disabled={submittingCustomer}
            >
              Hủy
            </button>
            <button
              onClick={handleCreateCustomer}
              disabled={submittingCustomer}
              className="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 disabled:opacity-60 cursor-pointer transition-colors disabled:cursor-not-allowed"
            >
              {submittingCustomer ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Tên khách hàng *</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Nhập tên khách hàng..."
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Địa chỉ *</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Nhập địa chỉ..."
              value={newCustomerAddress}
              onChange={(e) => setNewCustomerAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Số điện thoại *</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Nhập số điện thoại..."
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Modal thêm người giao hàng */}
      <Modal
        isOpen={showDeliverModal}
        onClose={() => {
          setShowDeliverModal(false);
          setNewDeliverName('');
          setNewDeliverPhone('');
          setNewDeliverPlate('');
        }}
        title="Thêm người giao hàng mới"
        size="md"
        footer={
          <>
            <button
              onClick={() => {
                setShowDeliverModal(false);
                setNewDeliverName('');
                setNewDeliverPhone('');
                setNewDeliverPlate('');
              }}
              className="px-4 py-2 border rounded font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
              disabled={submittingDeliver}
            >
              Hủy
            </button>
            <button
              onClick={handleCreateDeliver}
              disabled={submittingDeliver}
              className="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 disabled:opacity-60 cursor-pointer transition-colors disabled:cursor-not-allowed"
            >
              {submittingDeliver ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Tên người giao hàng *</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Nhập tên..."
              value={newDeliverName}
              onChange={(e) => setNewDeliverName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Số điện thoại *</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Nhập số điện thoại..."
              value={newDeliverPhone}
              onChange={(e) => setNewDeliverPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Biển số xe *</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
              placeholder="Nhập biển số xe..."
              value={newDeliverPlate}
              onChange={(e) => setNewDeliverPlate(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <div className="border rounded-lg p-4 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <h2 className="text-sm sm:text-base font-black text-gray-900 uppercase tracking-wider">Danh sách đơn đặt hàng</h2>
          <button
            onClick={() => loadOrders(currentPage)}
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
          data={orders}
          isLoading={loading}
          enablePagination={true}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={(page) => {
            setCurrentPage(page);
            loadOrders(page);
          }}
          onPageSizeChange={(newPageSize) => {
            setPageSize(newPageSize);
            setCurrentPage(1);
            loadOrders(1, newPageSize);
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
              header: 'Thời gian tạo',
              render: (o) => (
                <div className="text-sm font-bold text-gray-700">
                  {formatDateTime(o.dateCreated)}
                </div>
              )
            },
            {
              key: 'deliveryDate',
              header: 'Ngày giao hàng',
              render: (o: Order & { deliveryDate?: string }) => (
                <div className="text-sm font-bold text-orange-600">
                  {o.deliveryDate ? formatDate(o.deliveryDate) : 'Chưa có'}
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
          emptyMessage="Chưa có dữ liệu đơn đặt hàng"
        />

      </div>

      {/* Modal cảnh báo thiếu hàng */}
      <Modal
        isOpen={showForecastWarning}
        onClose={handleCancelForecastWarning}
        title="Cảnh báo thiếu hàng"
        size="md"
        footer={
          <>
            <button
              onClick={handleCancelForecastWarning}
              className="px-4 py-2 border rounded font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmForecastWarning}
              className="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 cursor-pointer transition-colors"
            >
              Tiếp tục
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-yellow-800 mb-2">
              Có thể không đủ hàng cho đơn đặt hàng này. Bạn có muốn tiếp tục không?
            </p>
          </div>
          
          {forecastData && forecastData.forecasts && (
            <div className="space-y-3">
              {forecastData.forecasts
                .filter((f) => f.hasShortage)
                .map((forecast, idx: number) => (
                  <div key={idx} className="border border-red-200 rounded-lg p-3 bg-red-50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{forecast.productName}</span>
                      <span className="text-red-600 font-black">
                        Thiếu {forecast.shortage.toLocaleString()} {forecast.packageProductId ? 'kiện' : 'sản phẩm'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      <div>Yêu cầu: {forecast.requiredQuantity.toLocaleString()}</div>
                      <div>Dự tính có: {forecast.estimatedQuantity.toLocaleString()}</div>
                      <div>Hiện tại: {forecast.currentQuantity.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
