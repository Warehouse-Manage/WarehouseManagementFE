"use server";
import webpush from "web-push";
import { cookies } from "next/headers";
import { serverFetch } from "./serverFetch";

const apiBase = process.env.NEXT_PUBLIC_API_HOST || "";

const ensureVapidConfigured = () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
        throw new Error("VAPID keys are not configured on the server");
    }
    webpush.setVapidDetails("mailto:myuserid@email.com", publicKey, privateKey);
};

type WebPushFailure = { statusCode?: number; body?: string };

const clearExpiredSubscription = async (userId: string) => {
    try {
        await serverFetch(`${apiBase}/api/notification/unsubscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ userId }),
        });
        console.log(`Push subscription expired for user ${userId}; cleared from database. User should re-enable notifications.`);
    } catch (clearErr) {
        console.error(`Failed to clear expired subscription for user ${userId}:`, clearErr);
    }
};

type SubscriptionInput = {
    endpoint: string;
    p256dh: string;
    auth: string;
};

const fetchSubscriptionDetail = async (userId: string): Promise<SubscriptionInput | null> => {
    try {
        const res = await serverFetch(`${apiBase}/api/notification/subscription-detail/${userId}`, { cache: "no-store" });
        if (!res.ok) return null;
        const data = await res.json();
        const endpoint = data?.endpoint ?? data?.Endpoint;
        const p256dh = data?.p256dh ?? data?.P256dh;
        const auth = data?.auth ?? data?.Auth;
        if (!endpoint || !p256dh || !auth) return null;
        return { endpoint, p256dh, auth };
    } catch (err) {
        console.error(`Failed to fetch subscription for user ${userId}:`, err);
        return null;
    }
};

type OrderPushMeta = {
    orderId: number;
    orderType: "order" | "place-order";
    url: string;
};

export const sendNotification = async (
    message: string,
    userId: string,
    icon: string,
    title: string,
    subscriptionData?: SubscriptionInput,
    orderMeta?: OrderPushMeta,
) => {
    try {
        ensureVapidConfigured();
    } catch (err) {
        console.warn(err);
        return { error: "VAPID not configured" };
    }

    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get("userId")?.value;
    const resolvedUserId = userId && userId.trim().length > 0 ? userId : (cookieUserId || "");
    if (!resolvedUserId) {
        return { error: "Missing userId" };
    }

    let sub: SubscriptionInput | null = subscriptionData && subscriptionData.endpoint && subscriptionData.p256dh && subscriptionData.auth
        ? subscriptionData
        : null;

    if (!sub) {
        sub = await fetchSubscriptionDetail(resolvedUserId);
    }

    if (!sub) {
        return { error: "Missing subscription data" };
    }

    try {
        await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({
                title,
                body: message,
                icon,
                badge: icon,
                data: {
                    userId: resolvedUserId,
                    timestamp: new Date().toISOString(),
                    ...(orderMeta ?? {}),
                },
            }),
        );
        return { success: true };
    } catch (e: unknown) {
        const err = e as WebPushFailure;
        if (err?.statusCode === 410 || err?.statusCode === 404) {
            await clearExpiredSubscription(resolvedUserId);
            return { error: "Subscription expired", expired: true };
        }
        console.error("Failed to send notification:", e);
        return { error: "Failed to send notification" };
    }
};

type AdminTarget = {
    id: number;
    role: string;
    companyId?: number;
    notificationEnabled?: boolean;
    notificationEndpoint?: string | null;
    notificationP256dh?: string | null;
    notificationAuth?: string | null;
};

export const notifyOrderToAdmins = async (
    creatorName: string,
    orderType: "order" | "place-order",
    orderId: number,
    icon: string,
    companyId: number | null | undefined,
): Promise<{ sent: number; expired: number; failed: number; total: number }> => {
    const orderLabel = orderType === "place-order" ? "đơn đặt hàng" : "đơn hàng";
    const title = `${creatorName} Đã tạo ${orderLabel} mới`;
    const message = "Click vào để xem thêm";
    const path = orderType === "place-order" ? "/place-order" : "/orders";
    const orderMeta: OrderPushMeta = { orderId, orderType, url: `${path}?edit=${orderId}` };
    const counters = { sent: 0, expired: 0, failed: 0, total: 0 };

    try {
        const res = await serverFetch(`${apiBase}/api/notification/users-with-subscriptions`, { cache: "no-store" });
        if (!res.ok) {
            console.error(`[notifyOrderToAdmins] cannot fetch users-with-subscriptions: HTTP ${res.status}`);
            return counters;
        }

        const raw = (await res.json()) as Array<Record<string, unknown>>;
        const users: AdminTarget[] = raw.map((u) => ({
            id: Number(u.id ?? u.Id ?? 0),
            role: String(u.role ?? u.Role ?? ""),
            companyId: u.companyId !== undefined && u.companyId !== null
                ? Number(u.companyId)
                : u.CompanyId !== undefined && u.CompanyId !== null
                    ? Number(u.CompanyId)
                    : undefined,
            notificationEnabled: Boolean(u.notificationEnabled ?? u.NotificationEnabled),
            notificationEndpoint: (u.notificationEndpoint ?? u.NotificationEndpoint) as string | null,
            notificationP256dh: (u.notificationP256dh ?? u.NotificationP256dh) as string | null,
            notificationAuth: (u.notificationAuth ?? u.NotificationAuth) as string | null,
        }));

        console.log(`[notifyOrderToAdmins] companyId=${companyId}, BE trả ${users.length} user có subscription.`);
        if (users.length > 0) {
            console.log(
                `[notifyOrderToAdmins] danh sách user: ${users
                    .map((u) => `#${u.id}(role="${u.role}",companyId=${u.companyId ?? "null"},enabled=${u.notificationEnabled},hasEndpoint=${!!u.notificationEndpoint})`)
                    .join(", ")}`,
            );
        }

        const targets = users.filter((u) => {
            if (!u.notificationEnabled || !u.notificationEndpoint || !u.notificationP256dh || !u.notificationAuth) return false;
            const roleLower = u.role.toLowerCase();
            if (roleLower === "admin") return true; // super admin tổng
            if (roleLower === "admin company") {
                if (companyId === null || companyId === undefined) return false;
                return Number(u.companyId) === Number(companyId);
            }
            return false;
        });

        counters.total = targets.length;
        if (targets.length === 0) {
            console.warn(
                `[notifyOrderToAdmins] không có target nào sau filter (cần role="Admin" hoặc role="admin company" + companyId=${companyId}). ` +
                `Hãy đảm bảo admin đã bật chuông trong app và role/companyId được set đúng.`,
            );
            return counters;
        }

        console.log(`[notifyOrderToAdmins] sẽ gửi tới ${targets.length} admin: ${targets.map((t) => `#${t.id}`).join(", ")}`);

        const results = await Promise.all(
            targets.map((u) =>
                sendNotification(message, String(u.id), icon, title, {
                    endpoint: u.notificationEndpoint!,
                    p256dh: u.notificationP256dh!,
                    auth: u.notificationAuth!,
                }, orderMeta),
            ),
        );

        for (const r of results) {
            if ("success" in r && r.success) counters.sent++;
            else if ("expired" in r && r.expired) counters.expired++;
            else counters.failed++;
        }

        console.log(
            `[notifyOrderToAdmins] kết quả: sent=${counters.sent}, expired=${counters.expired}, failed=${counters.failed}, total=${counters.total}`,
        );

        if (counters.expired > 0) {
            console.log(`[notifyOrderToAdmins] ${counters.expired} subscription(s) đã expired và bị clear — user cần mở app và bật lại chuông.`);
        }
    } catch (err) {
        console.error("[notifyOrderToAdmins] failed:", err);
    }

    return counters;
};
