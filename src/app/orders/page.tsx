'use client';

import { useEffect, useState } from 'react';
import { getCookie } from '@/lib/ultis';
type Order = {
  id: number;
  customerId: number;
  deliverId: number;
  sale: number;
  amountCustomerPayment: number;
  shipCost?: number;
  productOrders: { productId: number; amount: number; price: number; sale: number }[];
  dateCreated: string;
  customer?: Customer;
  deliver?: Deliver;
};

type Customer = {
  id: number;
  name: string;
  address: string;
  phoneNumber: string;
};

type Deliver = {
  id: number;
  name: string;
  phoneNumber: string;
  plateNumber: string;
};

type Product = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiHost = process.env.NEXT_PUBLIC_API_HOST;

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

  const calculateOrderGoodsTotal = (order: Order) => {
    if (!order.productOrders?.length) return 0;
    return order.productOrders.reduce((sum, p) => sum + p.amount * p.price, 0);
  };

  const formatOrderCode = (id?: number) => (id ? `HD${id.toString().padStart(6, '0')}` : '');

  const loadOrders = async () => {
    if (!apiHost) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiHost}/api/orders`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setOrders(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Không thể tải danh sách đơn hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    if (!apiHost) return;
    setLoadingCustomers(true);
    try {
      const res = await fetch(`${apiHost}/api/customers`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setCustomers(data);
    } catch (err: unknown) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadDelivers = async () => {
    if (!apiHost) return;
    setLoadingDelivers(true);
    try {
      const res = await fetch(`${apiHost}/api/delivers`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      setDelivers(data);
    } catch (err: unknown) {
      console.error('Failed to load delivers:', err);
    } finally {
      setLoadingDelivers(false);
    }
  };

  const loadProducts = async () => {
    if (!apiHost) return;
    setLoadingProducts(true);
    try {
      const res = await fetch(`${apiHost}/api/products`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
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
  }, [apiHost]);

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

  const handleCreate = async () => {
    if (!apiHost) return;
    if (customerId === '' || deliverId === '') {
      setError('Cần nhập CustomerId và DeliverId');
      return;
    }
    const userId = getCookie('userId');
    if (!userId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }
    const products = productOrdersInput
      .filter((p) => p.productId !== '' && p.amount !== '' && p.price !== '')
      .map((p) => ({
        productId: Number(p.productId),
        amount: Number(p.amount),
        price: Number(p.price),
        sale: Number(p.sale || 0),
      }));
    if (!products.length) {
      setError('Cần ít nhất một sản phẩm');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiHost}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: Number(customerId),
            deliverId: Number(deliverId),
            sale: Number(sale || 0),
            amountCustomerPayment: Number(amountCustomerPayment || 0),
            shipCost: Number(shipCost || 0),
            productOrders: products,
            createdUserId: Number(userId),
          }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Tạo đơn hàng mới</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Khách hàng *</label>
                  <select
                    className="border rounded px-3 py-2 w-full"
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
                  <label className="block text-sm font-medium mb-1">Người giao hàng *</label>
                  <select
                    className="border rounded px-3 py-2 w-full"
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
                  <label className="block text-sm font-medium mb-1">Giảm giá đơn hàng</label>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Sale"
                    inputMode="decimal"
                    value={formatNumber(sale)}
                    onChange={(e) => setSale(parseNumber(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Khách trả</label>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Khách trả"
                    inputMode="decimal"
                    value={formatNumber(amountCustomerPayment)}
                    onChange={(e) => setAmountCustomerPayment(parseNumber(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phí giao hàng</label>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Phí giao hàng"
                    inputMode="decimal"
                    value={formatNumber(shipCost)}
                    onChange={(e) => setShipCost(parseNumber(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ship COD / còn lại (tự tính)</label>
                  <input
                    className="border rounded px-3 py-2 w-full bg-gray-50"
                    placeholder="Ship COD / còn lại"
                    type="text"
                    value={formatNumber(shipcod)}
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Sản phẩm</div>
                  <button
                    onClick={addProductOrderRow}
                    className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
                  >
                    + Thêm sản phẩm
                  </button>
                </div>
                <div className="space-y-3">
                  {productOrdersInput.map((p, idx) => {
                    const total = calculateProductTotal(p);
                    return (
                      <div key={idx} className="border rounded p-3 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Sản phẩm</label>
                            <select
                              className="border rounded px-2 py-1 w-full text-sm"
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
                              <option value="">-- Chọn sản phẩm --</option>
                              {products.map((pr) => (
                                <option key={pr.id} value={pr.id}>
                                  {pr.name} - {pr.price.toLocaleString()}đ
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Số lượng</label>
                            <input
                              className="border rounded px-2 py-1 w-full text-sm"
                              placeholder="Số lượng"
                              inputMode="decimal"
                              min="1"
                              value={formatNumber(p.amount)}
                              onChange={(e) => updateProductOrderField(idx, 'amount', parseNumber(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Giá</label>
                            <input
                              className="border rounded px-2 py-1 w-full text-sm"
                              placeholder="Giá"
                              inputMode="decimal"
                              min="0"
                              value={formatNumber(p.price)}
                              onChange={(e) => updateProductOrderField(idx, 'price', parseNumber(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Giảm giá</label>
                            <input
                              className="border rounded px-2 py-1 w-full text-sm"
                              placeholder="Giảm giá"
                              inputMode="decimal"
                              min="0"
                              value={formatNumber(p.sale)}
                              onChange={(e) => updateProductOrderField(idx, 'sale', parseNumber(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Thành tiền</label>
                            <div className="border rounded px-2 py-1 w-full text-sm bg-white font-semibold text-orange-600">
                              {total > 0 ? total.toLocaleString() + 'đ' : '0đ'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="text-sm text-gray-700">
                      <div>Tổng sản phẩm: <span className="font-semibold">{calculateGrandTotal().toLocaleString()}đ</span></div>
                      <div>Giảm giá đơn hàng: <span className="font-semibold text-red-600">{Number(sale || 0).toLocaleString()}đ</span></div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Tổng cộng sau giảm:</div>
                      <div className="text-xl font-bold text-orange-600">
                        {calculateOrderTotal().toLocaleString()}đ
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Còn lại (Ship COD): <span className="font-semibold">{shipcod.toLocaleString()}đ</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-60"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu đơn hàng'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Danh sách</h2>
          <button
            onClick={loadOrders}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
          >
            Làm mới
          </button>
        </div>
        {loading ? (
          <div>Đang tải...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-base">
              <thead>
                <tr className="bg-orange-50">
                  <th className="px-4 py-3 text-left">Khách hàng</th>
                  <th className="px-4 py-3 text-left">Thời gian</th>
                  <th className="px-4 py-3 text-right">Tổng tiền hàng</th>
                  <th className="px-4 py-3 text-right">Giảm giá</th>
                  <th className="px-4 py-3 text-right">Khách đã trả</th>
                </tr>
              </thead>
              <tbody className="text-base">
                {orders.length > 0 && (
                  <tr className="font-semibold bg-gray-50 border-b">
                    <td className="px-4 py-3">Tổng</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right">
                      {orders.reduce((sum, o) => sum + calculateOrderGoodsTotal(o), 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {orders.reduce((sum, o) => sum + o.sale, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {orders.reduce((sum, o) => sum + o.amountCustomerPayment, 0).toLocaleString()}
                    </td>
                  </tr>
                )}
                {orders.map((o) => (
                  <tr key={o.id} className="border-b align-top">
                    <td className="px-4 py-3">
                      {o.customer ? (
                        <div className="font-medium whitespace-nowrap">
                          {o.customer.name}
                        </div>
                      ) : (
                        <div className="font-medium whitespace-nowrap">
                          Khách #{o.customerId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDateTime(o.dateCreated)}</td>
                    <td className="px-4 py-3 text-right">{calculateOrderGoodsTotal(o).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{o.sale.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{o.amountCustomerPayment.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!orders.length && <div className="text-sm text-gray-500 py-3">Chưa có dữ liệu</div>}
          </div>
        )}
      </div>
    </div>
  );
}


