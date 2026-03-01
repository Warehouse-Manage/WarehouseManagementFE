'use client';

import { Modal } from '@/components/shared';
import { Customer, Deliver, Product, PackageProduct } from '@/types';
import { formatNumberInput, parseNumberInput } from '@/lib/ultis';

interface ProductOrderInput {
  productId: number | '';
  packageProductId: number | '';
  selectionKey: string;
  amount: number | '';
  price: number | '';
  sale: number | '';
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: string | null;
  submitting: boolean;
  customers: Customer[];
  delivers: Deliver[];
  products: Product[];
  packageProducts: PackageProduct[];
  loadingCustomers: boolean;
  loadingDelivers: boolean;
  loadingProducts: boolean;
  loadingPackageProducts: boolean;
  customerId: number | '';
  deliverId: number | '';
  sale: number | '';
  amountCustomerPayment: number | '';
  shipCost: number | '';
  shipcod: number | '';
  productOrdersInput: ProductOrderInput[];
  onCustomerIdChange: (id: number | '') => void;
  onDeliverIdChange: (id: number | '') => void;
  onSaleChange: (value: number | '') => void;
  onAmountCustomerPaymentChange: (value: number | '') => void;
  onShipCostChange: (value: number | '') => void;
  onOpenCustomerModal: () => void;
  onOpenDeliverModal: () => void;
  onAddProductOrderRow: () => void;
  onRemoveProductOrderRow: (index: number) => void;
  onUpdateProductOrderKey: (index: number, key: string) => void;
  onUpdateProductOrderField: (index: number, field: string, value: number | '') => void;
  calculateProductTotal: (p: ProductOrderInput) => number;
  calculateGrandTotal: () => number;
  calculateOrderTotal: () => number;
  onSubmit: () => void;
}

export default function CreateOrderModal({
  isOpen,
  onClose,
  error,
  submitting,
  customers,
  delivers,
  products,
  packageProducts,
  loadingCustomers,
  loadingDelivers,
  loadingProducts,
  loadingPackageProducts,
  customerId,
  deliverId,
  sale,
  amountCustomerPayment,
  shipCost,
  shipcod,
  productOrdersInput,
  onCustomerIdChange,
  onDeliverIdChange,
  onSaleChange,
  onAmountCustomerPaymentChange,
  onShipCostChange,
  onOpenCustomerModal,
  onOpenDeliverModal,
  onAddProductOrderRow,
  onRemoveProductOrderRow,
  onUpdateProductOrderKey,
  onUpdateProductOrderField,
  calculateProductTotal,
  calculateGrandTotal,
  calculateOrderTotal,
  onSubmit
}: CreateOrderModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo đơn hàng mới"
      size="xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors disabled:cursor-not-allowed"
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 disabled:opacity-60 cursor-pointer transition-colors disabled:cursor-not-allowed"
          >
            {submitting ? 'Đang lưu...' : 'Lưu đơn hàng'}
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
                  onChange={(e) => onCustomerIdChange(e.target.value === '' ? '' : Number(e.target.value))}
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
                    onOpenCustomerModal();
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
                  onChange={(e) => onDeliverIdChange(e.target.value === '' ? '' : Number(e.target.value))}
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
                    onOpenDeliverModal();
                  }}
                  className="shrink-0 w-10 h-[42px] rounded-lg bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-colors font-bold text-xl leading-none flex items-center justify-center cursor-pointer"
                  title="Thêm người giao hàng mới"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Các trường khác */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Giảm giá đơn hàng</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="0"
                inputMode="decimal"
                value={formatNumberInput(sale)}
                onChange={(e) => onSaleChange(parseNumberInput(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Khách trả</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="0"
                inputMode="decimal"
                value={formatNumberInput(amountCustomerPayment)}
                onChange={(e) => onAmountCustomerPaymentChange(parseNumberInput(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Phí giao hàng</label>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="0"
                inputMode="decimal"
                value={formatNumberInput(shipCost)}
                onChange={(e) => onShipCostChange(parseNumberInput(e.target.value))}
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
              onClick={onAddProductOrderRow}
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
                          onUpdateProductOrderKey(idx, key);

                          if (!key) {
                            onUpdateProductOrderField(idx, 'productId', '');
                            onUpdateProductOrderField(idx, 'packageProductId', '');
                            return;
                          }

                          if (key.startsWith('p:')) {
                            const selectedProductId = Number(key.slice(2));
                            const selectedProduct = products.find((pr) => pr.id === selectedProductId);
                            onUpdateProductOrderField(idx, 'productId', selectedProductId);
                            onUpdateProductOrderField(idx, 'packageProductId', '');
                            if (selectedProduct) {
                              onUpdateProductOrderField(idx, 'price', selectedProduct.price);
                            }
                            return;
                          }

                          if (key.startsWith('k:')) {
                            const selectedPackageId = Number(key.slice(2));
                            const selectedPackage = packageProducts.find((pk) => pk.id === selectedPackageId);
                            if (!selectedPackage) return;
                            const baseProduct = products.find((pr) => pr.id === selectedPackage.productId);
                            onUpdateProductOrderField(idx, 'packageProductId', selectedPackageId);
                            onUpdateProductOrderField(idx, 'productId', selectedPackage.productId);
                            if (baseProduct) {
                              onUpdateProductOrderField(
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
                        onChange={(e) => onUpdateProductOrderField(idx, 'amount', parseNumberInput(e.target.value))}
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
                          if (isPackage && selectedPackage && selectedPackage.quantityProduct > 0) {
                            onUpdateProductOrderField(idx, 'price', Number(newPricePerUnit) * selectedPackage.quantityProduct);
                          } else {
                            onUpdateProductOrderField(idx, 'price', Number(newPricePerUnit));
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
                      onClick={() => onRemoveProductOrderRow(idx)}
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
  );
}
