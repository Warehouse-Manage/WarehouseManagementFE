'use client';

import { Modal } from '@/components/shared';
import Select from 'react-select';
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
  deliveryDate: string;
  deliveryAddress: string;
  allowAdditionalQuantity: boolean;
  sale: number | '';
  amountCustomerPayment: number | '';
  productOrdersInput: ProductOrderInput[];
  onCustomerIdChange: (id: number | '') => void;
  onDeliverIdChange: (id: number | '') => void;
  onDeliveryDateChange: (date: string) => void;
  onDeliveryAddressChange: (value: string) => void;
  onAllowAdditionalQuantityChange: (value: boolean) => void;
  onSaleChange: (value: number | '') => void;
  onAmountCustomerPaymentChange: (value: number | '') => void;
  onOpenCustomerModal: () => void;
  onOpenDeliverModal: () => void;
  onAddProductOrderRow: () => void;
  onRemoveProductOrderRow: (index: number) => void;
  onUpdateProductOrderKey: (index: number, key: string) => void;
  onUpdateProductOrderField: (index: number, field: string, value: number | '') => void;
  calculateProductTotal: (p: ProductOrderInput) => number;
  calculateGrandTotal: () => number;
  calculateOrderTotal: () => number;
  title?: string;
  submitLabel?: string;
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
  deliveryDate,
  deliveryAddress,
  allowAdditionalQuantity,
  sale,
  amountCustomerPayment,
  productOrdersInput,
  onCustomerIdChange,
  onDeliverIdChange,
  onDeliveryDateChange,
  onDeliveryAddressChange,
  onAllowAdditionalQuantityChange,
  onSaleChange,
  onAmountCustomerPaymentChange,
  onOpenCustomerModal,
  onOpenDeliverModal,
  onAddProductOrderRow,
  onRemoveProductOrderRow,
  onUpdateProductOrderKey,
  onUpdateProductOrderField,
  calculateProductTotal,
  calculateGrandTotal,
  calculateOrderTotal,
  title = "Tạo đơn đặt hàng mới",
  submitLabel = "Lưu đơn đặt hàng",
  onSubmit
}: CreateOrderModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
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
            {submitting ? 'Đang lưu...' : submitLabel}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {error && <div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded border border-red-100">{error}</div>}

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Khách hàng *</label>
              <div className="flex items-stretch gap-2">
                <Select
                  className="flex-1 min-w-0 text-sm"
                  placeholder="-- Chọn khách hàng --"
                  options={customers.map((c) => ({
                    value: c.id,
                    label: `${c.name} - ${c.phoneNumber}`
                  }))}
                  value={
                    customerId
                      ? {
                        value: customerId,
                        label: customers.find((c) => c.id === customerId)?.name + ' - ' + customers.find((c) => c.id === customerId)?.phoneNumber
                      }
                      : null
                  }
                  onChange={(option) => onCustomerIdChange(option ? option.value : '')}
                  isLoading={loadingCustomers}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: '0.5rem',
                      borderColor: state.isFocused ? '#f97316' : '#d1d5db',
                      boxShadow: state.isFocused ? '0 0 0 2px #ffedd5' : 'none',
                      '&:hover': {
                        borderColor: '#f97316'
                      },
                      minHeight: '42px'
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#ffedd5' : 'white',
                      color: state.isSelected ? 'white' : 'black',
                      '&:active': {
                        backgroundColor: '#f97316'
                      }
                    })
                  }}
                />
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
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Người giao hàng</label>
              <div className="flex items-stretch gap-2">
                <Select
                  className="flex-1 min-w-0 text-sm"
                  placeholder="-- Chọn người giao hàng --"
                  options={delivers.map((d) => ({
                    value: d.id,
                    label: `${d.name} - ${d.plateNumber}`
                  }))}
                  value={
                    deliverId
                      ? {
                        value: deliverId,
                        label: delivers.find((d) => d.id === deliverId)?.name + ' - ' + delivers.find((d) => d.id === deliverId)?.plateNumber
                      }
                      : null
                  }
                  onChange={(option) => onDeliverIdChange(option ? option.value : '')}
                  isLoading={loadingDelivers}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderRadius: '0.5rem',
                      borderColor: state.isFocused ? '#f97316' : '#d1d5db',
                      boxShadow: state.isFocused ? '0 0 0 2px #ffedd5' : 'none',
                      '&:hover': {
                        borderColor: '#f97316'
                      },
                      minHeight: '42px'
                    }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#ffedd5' : 'white',
                      color: state.isSelected ? 'white' : 'black',
                      '&:active': {
                        backgroundColor: '#f97316'
                      }
                    })
                  }}
                />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Ngày giao hàng *</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                value={deliveryDate}
                onChange={(e) => onDeliveryDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1.5">Địa chỉ giao nhận</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="Nhập địa chỉ giao nhận cụ thể"
                value={deliveryAddress}
                onChange={(e) => onDeliveryAddressChange(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              id="allow-additional-quantity"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 accent-orange-600 cursor-pointer"
              checked={allowAdditionalQuantity}
              onChange={(e) => onAllowAdditionalQuantityChange(e.target.checked)}
            />
            <div>
              <label
                htmlFor="allow-additional-quantity"
                className="block text-xs font-semibold text-gray-700 cursor-pointer"
              >
                Thêm số lượng
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Select
                        className="w-full text-[11px]"
                        placeholder="-- Chọn --"
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        options={[
                          {
                            label: 'Sản phẩm',
                            options: products.map((pr) => ({
                              value: `p:${pr.id}`,
                              label: `${pr.name} (${pr.price.toLocaleString('en-US')}đ)`
                            }))
                          },
                          {
                            label: 'Kiện',
                            options: packageProducts.map((pk) => {
                              const baseProduct = products.find((pr) => pr.id === pk.productId);
                              const label = `${pk.name} - ${baseProduct?.name || `#${pk.productId}`} (${pk.quantityProduct} viên/kiện)`;
                              const packagePrice = baseProduct ? baseProduct.price * pk.quantityProduct : 0;
                              return {
                                value: `k:${pk.id}`,
                                label: `${label} (${packagePrice.toLocaleString('en-US')}đ/kiện)`
                              };
                            })
                          }
                        ]}
                        value={
                          p.selectionKey
                            ? (() => {
                              const key = p.selectionKey;
                              if (key.startsWith('p:')) {
                                const pr = products.find((pr) => pr.id === Number(key.slice(2)));
                                return pr ? { value: key, label: `${pr.name} (${pr.price.toLocaleString('en-US')}đ)` } : null;
                              }
                              if (key.startsWith('k:')) {
                                const pk = packageProducts.find((pk) => pk.id === Number(key.slice(2)));
                                if (!pk) return null;
                                const baseProduct = products.find((pr) => pr.id === pk.productId);
                                const label = `${pk.name} - ${baseProduct?.name || `#${pk.productId}`} (${pk.quantityProduct} viên/kiện)`;
                                const packagePrice = baseProduct ? baseProduct.price * pk.quantityProduct : 0;
                                return { value: key, label: `${label} (${packagePrice.toLocaleString('en-US')}đ/kiện)` };
                              }
                              return null;
                            })()
                            : null
                        }
                        onChange={(option) => {
                          const key = option ? option.value : '';
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
                        isLoading={loadingProducts || loadingPackageProducts}
                        styles={{
                          control: (base, state) => ({
                            ...base,
                            borderRadius: '0.5rem',
                            borderColor: state.isFocused ? '#f97316' : '#d1d5db',
                            boxShadow: state.isFocused ? '0 0 0 1px #ffedd5' : 'none',
                            fontSize: '12px',
                            minHeight: '34px',
                            '&:hover': {
                              borderColor: '#f97316'
                            }
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#ffedd5' : 'white',
                            color: state.isSelected ? 'white' : 'black',
                            padding: '4px 8px',
                            fontSize: '11px',
                            '&:active': {
                              backgroundColor: '#f97316'
                            }
                          }),
                          groupHeading: (base) => ({
                            ...base,
                            color: '#6b7280',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }),
                          menuPortal: (base) => ({
                            ...base,
                            zIndex: 9999
                          })
                        }}
                      />
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
                        {total > 0 ? `${total.toLocaleString('en-US')}đ` : '0đ'}
                      </div>
                    </div>
                  </div>
                  {productOrdersInput.length > 1 && (
                    <button
                      onClick={() => onRemoveProductOrderRow(idx)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors cursor-pointer"
                    >
                      <span className="text-sm">x</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
              <div className="text-gray-600">
                <p>Tổng tiền hàng: <span className="font-bold text-gray-900">{calculateGrandTotal().toLocaleString('en-US')}đ</span></p>
                <p>Giảm giá đơn hàng: <span className="font-bold text-red-600">-{Number(sale || 0).toLocaleString('en-US')}đ</span></p>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Tổng cộng sau giảm</p>
                <p className="text-2xl font-black text-orange-600 leading-none">
                  {calculateOrderTotal().toLocaleString('en-US')}đ
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
