'use client';

import { useEffect, useState } from 'react';
import { getCookie, printHtmlContent } from '@/lib/ultis';
import { financeApi, inventoryApi } from '@/api';
import { Order, Customer, Deliver, Product, PackageProduct, InventoryForecastResponse } from '@/types';
import { DataTable } from '@/components/shared';
import { toast } from 'sonner';
import { Printer, Trash2 } from 'lucide-react';
import CreateOrderModal from './modal/CreateOrderModal';
import CustomerModal from './modal/CustomerModal';
import DeliverModal from './modal/DeliverModal';
import ForecastWarningModal from './modal/ForecastWarningModal';
import { useConfirm } from '@/hooks/useConfirm';

// Types moved to @/types/finance.ts and @/types/inventory.ts

export default function PlaceOrderPage() {
  const { confirm, ConfirmDialog } = useConfirm();
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
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [allowAdditionalQuantity, setAllowAdditionalQuantity] = useState<boolean>(true);
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
    setDeliveryAddress('');
    setAllowAdditionalQuantity(true);
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

  const handlePrintOrderForm = async (id: number) => {
    try {
      const html = await financeApi.printPlaceOrderForm(id);
      await printHtmlContent(html);
    } catch (err) {
      toast.error('Không thể tải phiếu đặt hàng: ' + getErrorMessage(err));
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    const confirmed = await confirm({
      message: `Bạn có chắc chắn muốn xóa đặt hàng #${order.id}?`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });
    if (!confirmed) return;
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
      setError('Cần chọn Khách hàng và Người giao hàng');
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
        deliveryAddress,
        allowAdditionalQuantity,
      });

      const now = new Date();
      const customer = customers.find((c) => c.id === Number(customerId));

      // Format DD/MM/YYYY HH:MM
      const formatDateTimeForReceipt = (date: Date): string => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      };

      // Format ngày giao hàng
      const formatDeliveryDateForReceipt = (dateStr: string | undefined): string => {
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

      const deliveryDateFormatted = formatDeliveryDateForReceipt(deliveryDateISO);
      const customerName = customer?.name || 'Khách hàng';

      const receiptModel = {
        Tieu_De: 'PHIẾU THU (ĐẶT HÀNG)',
        Nhan_Doi_Tac: 'Người nộp tiền',
        Ngay_Thang_Nam: formatDateTimeForReceipt(now),
        Doi_Tac: customerName,
        Dia_Chi: customer?.address || '',
        Ly_Do: `Thanh toán cho đặt hàng #${res.id} - Người đặt hàng: ${customerName} - Ngày giao hàng: ${deliveryDateFormatted}`,
        Gia_Tri_Phieu: Number(amountCustomerPayment || 0).toLocaleString('vi-VN'),
        Ngay: now.getDate().toString().padStart(2, '0'),
        Thang: (now.getMonth() + 1).toString().padStart(2, '0'),
        Nam: now.getFullYear().toString(),
        Nhan_Ky_Ten: 'NGƯỜI NỘP TIỀN',
      };

      // In phiếu thu
      const receiptHtml = await financeApi.printPlaceOrderReceiptModel(receiptModel);
      if (receiptHtml) {
        await printHtmlContent(receiptHtml);
      }

      // In phiếu ĐẶT HÀNG (template mới trên BE)
      const orderFormHtml = await financeApi.printPlaceOrderForm(res.id);
      if (orderFormHtml) {
        await printHtmlContent(orderFormHtml);
      }

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

      <CreateOrderModal
        isOpen={showModal}
        onClose={handleCloseModal}
        error={error}
        submitting={submitting}
        deliveryAddress={deliveryAddress}
        allowAdditionalQuantity={allowAdditionalQuantity}
        onDeliveryAddressChange={setDeliveryAddress}
        onAllowAdditionalQuantityChange={setAllowAdditionalQuantity}
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
        deliveryDate={deliveryDate}
        sale={sale}
        amountCustomerPayment={amountCustomerPayment}
        shipCost={shipCost}
        shipcod={shipcod}
        productOrdersInput={productOrdersInput}
        onCustomerIdChange={setCustomerId}
        onDeliverIdChange={setDeliverId}
        onDeliveryDateChange={setDeliveryDate}
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
        onSubmit={handleCreate}
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
              onClick: () => handlePrintOrderForm(o.id)
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

      <ForecastWarningModal
        isOpen={showForecastWarning}
        onClose={handleCancelForecastWarning}
        forecastData={forecastData}
        onConfirm={handleConfirmForecastWarning}
      />
      {ConfirmDialog}
    </div>
  );
}
