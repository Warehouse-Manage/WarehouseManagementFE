"use client";
import { getCookie } from "@/lib/ultis";
import { pushNotificationService } from "@/lib/pushNotificationService";
import { BellOff, BellRing, Settings } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_HOST || 'https://localhost:7149';

export default function NotificationRequest() {
	const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

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

	const showNotification = async () => {
		if (!pushNotificationService.isPushSupported()) {
			toast.error("Push notifications are not supported in this browser");
			return;
		}

		setIsLoading(true);

		try {
			// Request permission
			const granted = await pushNotificationService.requestPermission();
			
			if (granted) {
				// Register service worker
				await pushNotificationService.registerServiceWorker();
				
				// Subscribe to push notifications
				const userId = getCookie('userId');
				if (userId) {
					await pushNotificationService.subscribeToPush(userId);
					setIsSubscribed(true);
					setNotificationPermission('granted');
					toast.success('Notifications enabled successfully!');
				} else {
					toast.error('User not authenticated');
				}
			} else {
				setNotificationPermission('denied');
				toast.error('Permission denied. You can enable notifications in your browser settings.');
			}
		} catch (error) {
			console.error('Error enabling notifications:', error);
			toast.error('Failed to enable notifications');
		} finally {
			setIsLoading(false);
		}
	};

	const removeNotification = async () => {
		setIsLoading(true);
		
		try {
			const userId = getCookie('userId');
			if (!userId) {
				toast.error('User not authenticated');
				return;
			}

			// Unsubscribe from push notifications
			await pushNotificationService.unsubscribeFromPush();
			
			// Call backend API to unsubscribe
			const success = await unsubscribeFromNotifications(userId);
			if (success) {
				setIsSubscribed(false);
				setNotificationPermission('denied');
				toast.success('Notifications disabled successfully');
			}
		} catch (error) {
			console.error('Error disabling notifications:', error);
			toast.error('Failed to disable notifications');
		} finally {
			setIsLoading(false);
		}
	};


	useEffect(() => {
		// Check notification permission and subscription status
		const checkStatus = async () => {
			if (!pushNotificationService.isPushSupported()) {
				return;
			}

			const permission = pushNotificationService.getPermissionStatus();
			setNotificationPermission(permission);

			if (permission === 'granted') {
				const isSubscribed = await pushNotificationService.getSubscriptionStatus();
				setIsSubscribed(isSubscribed);
			}
		};

		checkStatus();
	}, []);

	// if (isFetching) {
	// 	return null;
	// }
	return (
		<div className="hover:scale-110 cursor-pointer transition-all">
			{!pushNotificationService.isPushSupported() ? (
				<div title="Push notifications not supported in this browser">
					<BellOff className="opacity-50" />
				</div>
			) : notificationPermission === "granted" && isSubscribed ? (
				<div title="Disable notifications">
					<BellRing 
						onClick={removeNotification} 
						className={isLoading ? "animate-pulse" : ""}
					/>
				</div>
			) : notificationPermission === "denied" ? (
				<div title="Notifications blocked - enable in browser settings">
					<Settings className="opacity-50" />
				</div>
			) : (
				<div title="Enable notifications">
					<BellOff 
						onClick={showNotification} 
						className={isLoading ? "animate-pulse" : ""}
					/>
				</div>
			)}
		</div>
	);
}
