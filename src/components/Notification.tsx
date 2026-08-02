"use client";

import { getCookie } from "@/lib/ultis";
import { pushNotificationService } from "@/lib/pushNotificationService";
import { notificationApi } from "@/api/notificationApi";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";

export type PushSupportStatus = "unsupported" | "default" | "denied" | "granted";
export type SubscriptionStatus = "off" | "on";

export interface UsePushSubscription {
    /** Trình duyệt hỗ trợ push + permission hiện tại. */
    support: PushSupportStatus;
    /** Trạng thái subscription thực tế (cả browser + backend đều bật). */
    status: SubscriptionStatus;
    isLoading: boolean;
    isMounted: boolean;
    enable: () => Promise<void>;
    disable: () => Promise<void>;
    refresh: () => Promise<void>;
}

/**
 * Hook quản lý việc bật/tắt push notification của user hiện tại.
 * Tách riêng khỏi UI để có thể tái sử dụng trong dropdown của NotificationCenter.
 */
export function usePushSubscription(): UsePushSubscription {
    const [support, setSupport] = useState<PushSupportStatus>("default");
    const [status, setStatus] = useState<SubscriptionStatus>("off");
    const [isLoading, setIsLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const refresh = useCallback(async () => {
        if (!pushNotificationService.isPushSupported()) {
            setSupport("unsupported");
            setStatus("off");
            return;
        }

        const permission = pushNotificationService.getPermissionStatus();
        setSupport(permission);

        const userId = getCookie("userId");
        if (!userId) {
            const localSub = permission === "granted" && (await pushNotificationService.getSubscriptionStatus());
            setStatus(localSub ? "on" : "off");
            return;
        }

        try {
            const data = await notificationApi.getUserStatus(userId);
            const hasLocalSub = permission === "granted" && (await pushNotificationService.getSubscriptionStatus());
            const active = permission === "granted" && data.notificationEnabled && data.hasSubscription && hasLocalSub;
            setStatus(active ? "on" : "off");
        } catch (err) {
            console.error("Failed to fetch user notification status:", err);
            setStatus("off");
        }
    }, []);

    useEffect(() => {
        setIsMounted(true);
        if (!pushNotificationService.isPushSupported()) {
            setSupport("unsupported");
            return;
        }
        refresh();
        const interval = setInterval(refresh, 30000);
        return () => clearInterval(interval);
    }, [refresh]);

    const enable = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!pushNotificationService.isPushSupported()) {
                toast.error("Trình duyệt không hỗ trợ thông báo đẩy");
                return;
            }

            const userId = getCookie("userId");
            if (!userId) {
                toast.error("Vui lòng đăng nhập");
                return;
            }

            const permission = pushNotificationService.getPermissionStatus();
            const hasLocalSub = permission === "granted" && (await pushNotificationService.getSubscriptionStatus());

            if (permission !== "granted" || !hasLocalSub) {
                const granted = await pushNotificationService.requestPermission();
                if (!granted) {
                    toast.error("Quyền thông báo bị từ chối. Hãy bật trong cài đặt trình duyệt.");
                    await refresh();
                    return;
                }
                await pushNotificationService.registerServiceWorker();
                await pushNotificationService.subscribeToPush(userId);
            }

            await notificationApi.toggleNotifications(userId, true);
            toast.success("Đã bật thông báo đẩy");
            await refresh();
        } catch (err) {
            console.error("Failed to enable notifications:", err);
            toast.error(err instanceof Error ? err.message : "Không thể bật thông báo");
            await refresh();
        } finally {
            setIsLoading(false);
        }
    }, [refresh]);

    const disable = useCallback(async () => {
        setIsLoading(true);
        try {
            const userId = getCookie("userId");
            if (!userId) {
                toast.error("Vui lòng đăng nhập");
                return;
            }

            await pushNotificationService.unsubscribeFromPush();
            await notificationApi.unsubscribe({ userId });
            await notificationApi.toggleNotifications(userId, false);
            toast.success("Đã tắt thông báo đẩy");
            await refresh();
        } catch (err) {
            console.error("Failed to disable notifications:", err);
            toast.error("Không thể tắt thông báo");
            await refresh();
        } finally {
            setIsLoading(false);
        }
    }, [refresh]);

    return { support, status, isLoading, isMounted, enable, disable, refresh };
}