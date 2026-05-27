'use client';

import { useEffect, useRef } from 'react';

export const ORDER_NOTIFICATION_MESSAGE = 'WAREHOUSE_OPEN_ORDER_EDIT';

export type OrderNotificationType = 'order' | 'place-order';

export function getOrderEditUrl(orderType: OrderNotificationType, orderId: number): string {
  const base = orderType === 'place-order' ? '/place-order' : '/orders';
  return `${base}?edit=${orderId}`;
}

/** Mở modal sửa đơn khi click push hoặc mở app qua ?edit=id */
export function useOrderNotificationDeepLink(
  orderType: OrderNotificationType,
  openEdit: (orderId: number) => void | Promise<void>,
) {
  const openEditRef = useRef(openEdit);
  openEditRef.current = openEdit;

  useEffect(() => {
    const pathPrefix = orderType === 'place-order' ? '/place-order' : '/orders';

    const openFromQuery = () => {
      if (!window.location.pathname.startsWith(pathPrefix)) return;
      const editId = new URLSearchParams(window.location.search).get('edit');
      if (!editId) return;
      const id = Number(editId);
      if (!Number.isFinite(id) || id <= 0) return;
      void openEditRef.current(id);
      const url = new URL(window.location.href);
      url.searchParams.delete('edit');
      window.history.replaceState({}, '', url.pathname + url.search);
    };

    openFromQuery();

    const onMessage = (event: MessageEvent) => {
      const d = event.data as { type?: string; orderType?: string; orderId?: number } | undefined;
      if (d?.type !== ORDER_NOTIFICATION_MESSAGE || d.orderType !== orderType) return;
      const id = Number(d.orderId);
      if (Number.isFinite(id) && id > 0) void openEditRef.current(id);
    };

    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [orderType]);
}
