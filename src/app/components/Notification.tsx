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
	const [isIOSSafari, setIsIOSSafari] = useState(false);
	const [isIOS16_4Plus, setIsIOS16_4Plus] = useState(false);

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
		// Enhanced iOS detection and messaging
		if (isIOS && !isIOSSafari) {
			toast.info("Push notifications require Safari browser on iOS. Please use Safari instead of Chrome.");
			return;
		}
		
		if (isIOS && isIOSSafari && !isIOS16_4Plus) {
			toast.info("Push notifications require iOS 16.4+ and Safari. Please update your iOS version.");
			return;
		}
		
		if (isIOS && isIOSSafari && isIOS16_4Plus) {
			toast.info("📱 For iPhone users: Add this app to Home Screen and enable notifications in Safari Settings > Websites > Notifications");
		}
		
		if ("Notification" in window) {
			Notification.requestPermission().then((permission) => {
				setNotificationPermission(permission);
				if (permission === "granted") {
					subscribeUser();
				} else {
					toast.info(
						"Please go to settings and enable notifications. For iOS Safari: Settings > Safari > Websites > Notifications"
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

		// Enhanced iOS handling for 16.4+ Safari
		if (isIOS && !isIOSSafari) {
			toast.info("Push notifications require Safari browser on iOS. Please use Safari instead of Chrome.");
			return;
		}
		
		if (isIOS && isIOSSafari && !isIOS16_4Plus) {
			toast.info("Push notifications require iOS 16.4+ and Safari. Please update your iOS version.");
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
		// Enhanced iOS detection with version and browser support
		const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
		const isSafariBrowser = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
		const isIOSSafariDevice = isIOSDevice && isSafariBrowser;
		
		// Check iOS version
		const getIOSVersion = () => {
			const match = navigator.userAgent.match(/OS (\\d+)_(\\d+)/);
			if (match) {
				return parseInt(match[1], 10);
			}
			return 0;
		};
		
		const iosVersion = getIOSVersion();
		const isIOS16_4PlusDevice = isIOSDevice && iosVersion >= 16;
		
		setIsIOS(isIOSDevice);
		setIsIOSSafari(isIOSSafariDevice);
		setIsIOS16_4Plus(isIOS16_4PlusDevice);
		
		// Check notification permission for supported browsers
		if ("Notification" in window && (!isIOSDevice || (isIOSSafariDevice && isIOS16_4PlusDevice))) {
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
			{isIOS && !isIOSSafari ? (
				<div title="Push notifications require Safari browser on iOS">
					<BellOff className="opacity-50" />
				</div>
			) : isIOS && isIOSSafari && !isIOS16_4Plus ? (
				<div title="Push notifications require iOS 16.4+ and Safari">
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
