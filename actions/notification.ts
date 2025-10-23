"use server";
import webpush from "web-push";
import { cookies } from "next/headers";

export const sendNotification = async (
    message: string,
    userId: string,
    icon: string,
    title: string,
    subscriptionData?: {
        endpoint: string;
        p256dh: string;
        auth: string;
    }
) => {
	const vapidKeys = {
		publicKey: process.env.NEXT_PUBLIC_VAPID_KEY!,
		privateKey: process.env.VAPID_PRIVATE_KEY!,
	};
	
	// Setting our previously generated VAPID keys
	webpush.setVapidDetails(
		"mailto:myuserid@email.com",
		vapidKeys.publicKey,
		vapidKeys.privateKey
	);

    try {
        // Resolve userId from cookies if not provided or blank
        const cookieStore = await cookies();
        const cookieUserId = cookieStore.get("userId")?.value;
        const resolvedUserId = (userId && userId.trim().length > 0) ? userId : (cookieUserId || "");

        if (!resolvedUserId) {
            throw new Error("Missing userId in cookies and parameters");
        }

        // Fetch subscription from backend API
        const apiBase = process.env.NEXT_PUBLIC_API_HOST || "";
        let fetchedEndpoint: string | undefined;
        let fetchedP256dh: string | undefined;
        let fetchedAuth: string | undefined;

        try {
            const usersUrl = `${apiBase}/api/notification/users-with-subscriptions`;
            const res = await fetch(usersUrl, { cache: "no-store" });
            if (res.ok) {
                type UserSub = {
                    Id?: number; id?: number; UserId?: number; userId?: number;
                    NotificationEndpoint?: string; notificationEndpoint?: string; endpoint?: string;
                    NotificationP256dh?: string; notificationP256dh?: string; P256dh?: string; p256dh?: string;
                    NotificationAuth?: string; notificationAuth?: string; Auth?: string; auth?: string;
                    keys?: { p256dh?: string; auth?: string };
                };
                const list: UserSub[] = await res.json();
                const numericId = Number(resolvedUserId);
                const match = Array.isArray(list)
                    ? list.find((u: UserSub) => {
                        const idVal = u?.Id ?? u?.id ?? u?.UserId ?? u?.userId;
                        return Number(idVal) === numericId;
                    })
                    : undefined;
                if (match) {
                    fetchedEndpoint = match?.NotificationEndpoint ?? match?.notificationEndpoint ?? match?.endpoint;
                    fetchedP256dh = match?.NotificationP256dh ?? match?.notificationP256dh ?? match?.P256dh ?? match?.p256dh ?? match?.keys?.p256dh;
                    fetchedAuth = match?.NotificationAuth ?? match?.notificationAuth ?? match?.Auth ?? match?.auth ?? match?.keys?.auth;
                }
            }
        } catch (err) {
            console.error("Failed to fetch users-with-subscriptions:", err);
        }

        // Allow explicit subscriptionData to override fetched values if provided
        const endpoint = subscriptionData?.endpoint || fetchedEndpoint;
        const p256dh = subscriptionData?.p256dh || fetchedP256dh;
        const auth = subscriptionData?.auth || fetchedAuth;

        if (!endpoint || !p256dh || !auth) {
            throw new Error("Missing subscription data (endpoint/p256dh/auth)");
        }

        const subscription = {
            endpoint,
            keys: {
                p256dh,
                auth,
            }
        };

		await webpush.sendNotification(
			subscription,
			JSON.stringify({
				title: title,
				body: message,
				icon: icon,
				badge: icon,
				data: {
					userId: resolvedUserId,
					timestamp: new Date().toISOString()
				}
			})
		);
		
		return { success: true };
	} catch (e) {
		console.error('Failed to send notification:', e);
		return { error: "failed to send notification" };
	}
};
