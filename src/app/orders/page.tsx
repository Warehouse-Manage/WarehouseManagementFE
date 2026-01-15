'use client';

import { useEffect, useState } from 'react';
import { getCookie, printHtmlContent } from '@/lib/ultis';
import { financeApi, inventoryApi } from '@/api';
import { Order, Customer, Deliver, Product } from '@/types';
import { Modal, DataTable } from '@/components/shared';
import { toast } from 'sonner';
import { Printer } from 'lucide-react';

// Types moved to @/types/finance.ts and @/types/inventory.ts

export default function OrdersPage() {
  const [role, setRole] = useState<string | null>(() => getCookie('role'));
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // apiHost removed, handled in API modules
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [delivers, setDelivers] = useState<Deliver[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingDelivers, setLoadingDelivers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [deliverId, setDeliverId] = useState<number | ''>('');
  const [sale, setSale] = useState<number | ''>(0);
  const [amountCustomerPayment, setAmountCustomerPayment] = useState<number | ''>(0);
  const [shipCost, setShipCost] = useState<number | ''>(0);
  const [shipcod, setShipcod] = useState<number | ''>(0);
  const [productOrdersInput, setProductOrdersInput] = useState<
    { productId: number | ''; amount: number | ''; price: number | ''; sale: number | '' }[]
  >([{ productId: '', amount: '', price: '', sale: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const r = getCookie('role');
    setRole(r);
  }, []);

  const getErrorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
  const formatNumber = (value: number | '') => (value === '' ? '' : value.toLocaleString());
  const parseNumber = (input: string) => {
    const cleaned = input.replace(/[.,\s]/g, '');
    const num = Number(cleaned);
    return Number.isNaN(num) ? '' : num;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN');
  };

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await financeApi.getOrders();
      setOrders(data);
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

  useEffect(() => {
    loadOrders();
    loadCustomers();
    loadDelivers();
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateProductOrderField = (index: number, field: string, value: number | '') => {
    setProductOrdersInput((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const calculateProductTotal = (productOrder: { productId: number | ''; amount: number | ''; price: number | ''; sale: number | '' }) => {
    const amount = Number(productOrder.amount || 0);
    const price = Number(productOrder.price || 0);
    const sale = Number(productOrder.sale || 0);
    return (amount * price) - sale;
  };

  const calculateGrandTotal = () => {
    return productOrdersInput.reduce((sum, p) => {
      if (p.productId !== '' && p.amount !== '' && p.price !== '') {
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
    setProductOrdersInput([{ productId: '', amount: '', price: '', sale: 0 }]);
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

  const addProductOrderRow = () => {
    setProductOrdersInput((prev) => [...prev, { productId: '', amount: '', price: '', sale: 0 }]);
  };

  const handlePrintDeliveryNote = async (id: number) => {
    try {
      const html = await financeApi.printOrderDeliveryNote(id);
      await printHtmlContent(html);
    } catch (err) {
      toast.error('Không thể tải phiếu xuất kho: ' + getErrorMessage(err));
    }
  };

  const handleCreate = async () => {
    if (customerId === '' || deliverId === '') {
      setError('Cần nhập CustomerId và DeliverId');
      return;
    }
    const userId = getCookie('userId');
    if (!userId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    const productsToOrder = productOrdersInput
      .filter((p) => p.productId !== '' && p.amount !== '' && p.price !== '')
      .map((p) => ({
        productId: Number(p.productId),
        amount: Number(p.amount),
        price: Number(p.price),
        sale: Number(p.sale || 0),
      }));
    if (!productsToOrder.length) {
      setError('Cần ít nhất một sản phẩm');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await financeApi.createOrder({
        customerId: Number(customerId),
        deliverId: Number(deliverId),
        sale: Number(sale || 0),
        amountCustomerPayment: Number(amountCustomerPayment || 0),
        shipCost: Number(shipCost || 0),
        productOrders: productsToOrder,
        createdUserId: Number(userId),
      });

      if (res && res.id) {
        const receiptRes = financeApi.printOrderReceipt(res.id);
        const receiptHtml = await receiptRes;
        printHtmlContent(receiptHtml);

        const deliveryRes = financeApi.printOrderDeliveryNote(res.id);
        const deliveryHtml = await deliveryRes;
        printHtmlContent(deliveryHtml);
      }

      resetForm();
      setShowModal(false);
      await loadOrders();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tạo đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Đơn hàng</h1>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          + Tạo đơn hàng mới
        </button>
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Tạo đơn hàng mới"
        size="xl"
        footer={
          <>
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 border rounded font-semibold text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 disabled:opacity-60"
            >
              {submitting ? 'Đang lưu...' : 'Lưu đơn hàng'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Khách hàng *</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
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
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Người giao hàng *</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
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
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Giảm giá đơn hàng</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="0"
                inputMode="decimal"
                value={formatNumber(sale)}
                onChange={(e) => setSale(parseNumber(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Khách trả</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="0"
                inputMode="decimal"
                value={formatNumber(amountCustomerPayment)}
                onChange={(e) => setAmountCustomerPayment(parseNumber(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Phí giao hàng</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="0"
                inputMode="decimal"
                value={formatNumber(shipCost)}
                onChange={(e) => setShipCost(parseNumber(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">Ship COD / Còn lại</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 font-bold text-orange-600"
                placeholder="0"
                type="text"
                value={formatNumber(shipcod)}
                readOnly
              />
            </div>
          </div>

          <div className="space-y-3 border-t pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-700">Danh sách sản phẩm</h3>
              <button
                onClick={addProductOrderRow}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
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
                return (
                  <div key={idx} className="relative rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-1">
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Sản phẩm</label>
                        <select
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                          value={p.productId}
                          onChange={(e) => {
                            const selectedProductId = e.target.value === '' ? '' : Number(e.target.value);
                            const selectedProduct = products.find(pr => pr.id === selectedProductId);
                            updateProductOrderField(idx, 'productId', selectedProductId);
                            if (selectedProduct) {
                              updateProductOrderField(idx, 'price', selectedProduct.price);
                            }
                          }}
                          disabled={loadingProducts}
                        >
                          <option value="">-- Chọn --</option>
                          {products.map((pr) => (
                            <option key={pr.id} value={pr.id}>
                              {pr.name} ({pr.price.toLocaleString()}đ)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Số lượng</label>
                        <input
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                          placeholder="0"
                          inputMode="decimal"
                          value={formatNumber(p.amount)}
                          onChange={(e) => updateProductOrderField(idx, 'amount', parseNumber(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Giá</label>
                        <input
                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
                          placeholder="0"
                          inputMode="decimal"
                          value={formatNumber(p.price)}
                          onChange={(e) => updateProductOrderField(idx, 'price', parseNumber(e.target.value))}
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
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
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

      <div className="border rounded-lg p-4 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Danh sách đơn hàng</h2>
          <button
            onClick={loadOrders}
            className="px-3 py-1 border rounded text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Làm mới
          </button>
        </div>

        <DataTable
          data={orders}
          isLoading={loading}
          columns={[
            {
              key: 'customerName',
              header: 'Khách hàng',
              render: (o) => (
                <div>
                  <div className="font-bold text-gray-900">{o.customerName || `Khách #${o.customerId}`}</div>
                  <div className="text-xs text-gray-500">ID: {o.id}</div>
                </div>
              )
            },
            {
              key: 'dateCreated',
              header: 'Thời gian',
              render: (o) => <span className="text-sm text-gray-600">{formatDateTime(o.dateCreated)}</span>
            },
            {
              key: 'totalPrice',
              header: 'Tổng tiền hàng',
              headerClassName: 'text-right',
              className: 'text-right',
              render: (o) => <span className="font-bold">{o.totalPrice.toLocaleString()}</span>
            },
            {
              key: 'sale',
              header: 'Giảm giá',
              headerClassName: 'text-right',
              className: 'text-right',
              render: (o) => <span className="text-red-600 font-semibold">{o.sale.toLocaleString()}</span>
            },
            {
              key: 'amountCustomerPayment',
              header: 'Khách đã trả',
              headerClassName: 'text-right',
              className: 'text-right',
              render: (o) => <span className="text-blue-600 font-bold">{o.amountCustomerPayment.toLocaleString()}</span>
            },
            {
              key: 'remainingAmount',
              header: 'Còn lại',
              headerClassName: 'text-right',
              className: 'text-right',
              render: (o) => (
                <span className={`font-black ${o.remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {o.remainingAmount.toLocaleString()}
                </span>
              )
            }
          ]}
          actions={(o) => [
            {
              label: 'In đơn hàng',
              icon: <Printer className="h-4 w-4" />,
              onClick: () => handlePrintDeliveryNote(o.id)
            }
          ]}
          emptyMessage="Chưa có dữ liệu đơn hàng"
        />

        {orders.length > 0 && !loading && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tổng tiền hàng</p>
              <p className="text-lg font-black text-gray-900">{orders.reduce((sum, o) => sum + o.totalPrice, 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-xs text-red-600 font-bold uppercase tracking-wider">Tổng giảm giá</p>
              <p className="text-lg font-black text-red-600">{orders.reduce((sum, o) => sum + o.sale, 0).toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Tổng khách trả</p>
              <p className="text-lg font-black text-blue-600">{orders.reduce((sum, o) => sum + o.amountCustomerPayment, 0).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


