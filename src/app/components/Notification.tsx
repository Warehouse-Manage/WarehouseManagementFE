"use client";
// import useUser from "@/app/hook/useUser";
// import { createSupabaseBrowser } from "@/lib/supabase/client";
import { urlB64ToUint8Array, getCookie } from "@/lib/ultis";
// import { useQueryClient } from "@tanstack/react-query";
import { BellOff, BellRing } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_HOST || 'https://localhost:7149';

export default function NotificationRequest() {
	// const { data: user, isFetching } = useUser();
	// const queryClient = useQueryClient();

	const [notificationPermission, setNotificationPermission] = useState<
		"granted" | "denied" | "default"
	>("granted");
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isIOS, setIsIOS] = useState(false);

	// Check permission status when component mounts

	// API functions
	const subscribeToNotifications = async (subscriptionData: {
		userId: string;
		endpoint: string;
		p256dh: string;
		auth: string;
	}) => {
		try {
			const response = await fetch(`${API_BASE_URL}/api/notification/subscribe`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(subscriptionData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to subscribe to notifications');
			}

			const result = await response.json();
			toast.success(result.message || 'Đăng ký thông báo thành công');
			return true;
		} catch (error) {
			console.error('Error subscribing to notifications:', error);
			toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi đăng ký thông báo');
			return false;
		}
	};

	const unsubscribeFromNotifications = async (userId: string) => {
		try {
			const response = await fetch(`${API_BASE_URL}/api/notification/unsubscribe`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ userId }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to unsubscribe from notifications');
			}

			const result = await response.json();
			toast.success(result.message || 'Hủy đăng ký thông báo thành công');
			return true;
		} catch (error) {
			console.error('Error unsubscribing from notifications:', error);
			toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi hủy đăng ký thông báo');
			return false;
		}
	};

	const showNotification = () => {
		// Check if running on iOS
		if (isIOS) {
			toast.info("Push notifications are not fully supported on iOS. Please use Safari for better compatibility.");
			return;
		}
		
		if ("Notification" in window) {
			Notification.requestPermission().then((permission) => {
				setNotificationPermission(permission);
				if (permission === "granted") {
					subscribeUser();
				} else {
					toast.info(
						"please go to setting and enable noitificatoin."
					);
				}
			});
		} else {
			toast.info("This browser does not support notifications.");
		}
	};

	async function subscribeUser() {
		// Get userId from cookies
		const userId = getCookie('userId');
		if (!userId) {
			toast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
			return;
		}

		// Skip service worker registration on iOS
		if (isIOS) {
			toast.info("Push notifications are not fully supported on iOS. Please use Safari for better compatibility.");
			return;
		}

		if ("serviceWorker" in navigator) {
			try {
				// Check if service worker is already registered
				const registration =
					await navigator.serviceWorker.getRegistration();
				if (registration) {
					generateSubscribeEndPoint(registration, userId);
				} else {
					// Register the service worker
					const newRegistration =
						await navigator.serviceWorker.register("/sw.js");
					// Subscribe to push notifications
					generateSubscribeEndPoint(newRegistration, userId);
				}
			} catch (error) {
				console.error("Error during service worker registration or subscription:", error);
				toast.error(
					"Error during service worker registration or subscription"
				);
			}
		} else {
			toast.error("Service workers are not supported in this browser");
		}
	}

	const generateSubscribeEndPoint = async (
		newRegistration: ServiceWorkerRegistration,
		userId: string
	) => {
		// Check if VAPID key is configured
		const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
		if (!vapidKey) {
			toast.error('VAPID key không được cấu hình. Vui lòng kiểm tra file .env.local');
			console.error('NEXT_PUBLIC_VAPID_KEY is not defined in environment variables');
			return;
		}

		const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
			const bytes = new Uint8Array(buffer);
			let binary = "";
			for (let i = 0; i < bytes.byteLength; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			return btoa(binary);
		};

		try {
			const applicationServerKey = urlB64ToUint8Array(vapidKey);
			const options = {
				applicationServerKey,
				userVisibleOnly: true, // This ensures the delivery of notifications that are visible to the user, eliminating silent notifications. (Mandatory in Chrome, and optional in Firefox)
			};
			const subscription = await newRegistration.pushManager.subscribe(
				options as PushSubscriptionOptionsInit
			);
		
			// Extract subscription data
			const endpoint = subscription.endpoint;
			const p256dhKey = subscription.getKey("p256dh");
			const authKey = subscription.getKey("auth");
			const p256dh = p256dhKey ? arrayBufferToBase64(p256dhKey) : null;
			const auth = authKey ? arrayBufferToBase64(authKey) : null;

			// Prepare subscription data for backend
			const subscriptionData = {
				userId: userId,
				endpoint: endpoint,
				p256dh: p256dh || '',
				auth: auth || '',
			};

			// Call backend API to store subscription
			const success = await subscribeToNotifications(subscriptionData);
			if (success) {
				setIsSubscribed(true);
				setNotificationPermission("granted");
			}
		} catch (error) {
			console.error('Error during push subscription:', error);
			toast.error('Có lỗi xảy ra khi đăng ký thông báo push. Vui lòng thử lại.');
		}
	};

	const removeNotification = async () => {
		// Get userId from cookies
		const userId = getCookie('userId');
		if (!userId) {
			toast.error('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
			return;
		}

		// Call backend API to unsubscribe
		const success = await unsubscribeFromNotifications(userId);
		if (success) {
			setNotificationPermission("denied");
			setIsSubscribed(false);
			
			// Also unsubscribe from service worker
			try {
				const registration = await navigator.serviceWorker.getRegistration();
				if (registration) {
					const subscription = await registration.pushManager.getSubscription();
					if (subscription) {
						await subscription.unsubscribe();
						console.log("[PWA] Unsubscribed from push notifications");
					}
				}
			} catch (error) {
				console.error("Error unsubscribing from service worker:", error);
			}
		}
	};

	useEffect(() => {
		// Detect iOS
		const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
		setIsIOS(isIOSDevice);
		
		// Only check notification permission if not iOS
		if (!isIOSDevice && "Notification" in window) {
			setNotificationPermission(Notification.permission);
			
			// Check if user is already subscribed
			const checkSubscriptionStatus = async () => {
				const userId = getCookie('userId');
				if (userId && Notification.permission === 'granted') {
					try {
						const registration = await navigator.serviceWorker.getRegistration();
						if (registration) {
							const subscription = await registration.pushManager.getSubscription();
							if (subscription) {
								setIsSubscribed(true);
							}
						}
					} catch (error) {
						console.error('Error checking subscription status:', error);
					}
				}
			};
			
			checkSubscriptionStatus();
		}
	}, []);

	// if (isFetching) {
	// 	return null;
	// }
	return (
		<div className=" hover:scale-110 cursor-pointer transition-all">
			{isIOS ? (
				<div title="Push notifications not fully supported on iOS">
					<BellOff className="opacity-50" />
				</div>
			) : notificationPermission === "granted" && isSubscribed ? (
				<BellRing onClick={removeNotification} />
			) : (
				<BellOff onClick={showNotification} />
			)}
		</div>
	);
}
