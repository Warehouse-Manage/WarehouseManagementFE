"use client";
import { getCookie } from "@/lib/ultis";
import { pushNotificationService } from "@/lib/pushNotificationService";
import { BellOff, BellRing, Settings, RefreshCw } from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

// API configuration
import { notificationApi } from "@/api/notificationApi";

export default function NotificationRequest() {
	const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [backendNotificationEnabled, setBackendNotificationEnabled] = useState(true);

	// Check permission status when component mounts

	// API functions
	// API functions (moved to notificationApi)


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

					// Enable notifications in backend
					await toggleNotificationStatus(true);

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
			const result = await notificationApi.unsubscribe({ userId });
			if (result) {
				toast.success(result.message || 'Hủy đăng ký thông báo thành công');
				// Also toggle the notification status in backend
				await toggleNotificationStatus(false);
			}
		} catch (error) {
			console.error('Error disabling notifications:', error);
			toast.error('Failed to disable notifications');
		} finally {
			setIsLoading(false);
		}
	};

	// Fetch user notification status from backend
	const fetchUserNotificationStatus = async (userId: string) => {
		try {
			const data = await notificationApi.getUserStatus(userId);
			return {
				notificationEnabled: data.notificationEnabled || false,
				hasSubscription: data.hasSubscription || false
			};
		} catch (error) {
			console.error('Error fetching user notification status:', error);
			return { notificationEnabled: false, hasSubscription: false };
		}
	};

	// Refresh notification status from backend
	const refreshNotificationStatus = useCallback(async () => {
		const userId = getCookie('userId');
		if (userId) {
			const userStatus = await fetchUserNotificationStatus(userId);
			setIsSubscribed(userStatus.hasSubscription);
			setBackendNotificationEnabled(userStatus.notificationEnabled);
		}
	}, []);

	// Toggle notification status (enable/disable)
	const toggleNotificationStatus = async (enabled: boolean) => {
		setIsLoading(true);

		try {
			const userId = getCookie('userId');
			if (!userId) {
				toast.error('User not authenticated');
				return;
			}

			await notificationApi.toggleNotifications(userId, enabled);

		} catch (error) {
			console.error('Error toggling notification status:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to toggle notification status');
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		// Mark component as mounted to avoid hydration issues
		setIsMounted(true);

		// Check notification permission and subscription status
		const checkStatus = async () => {
			if (!pushNotificationService.isPushSupported()) {
				return;
			}

			const permission = pushNotificationService.getPermissionStatus();
			setNotificationPermission(permission);

			// Fetch user's notification status from backend
			const userId = getCookie('userId');
			if (userId) {
				const userStatus = await fetchUserNotificationStatus(userId);

				// Update subscription status and backend notification status
				setIsSubscribed(userStatus.hasSubscription);
				setBackendNotificationEnabled(userStatus.notificationEnabled);
			} else {
				// Fallback to local subscription status if no userId
				if (permission === 'granted') {
					const isSubscribed = await pushNotificationService.getSubscriptionStatus();
					setIsSubscribed(isSubscribed);
				}
			}
		};

		checkStatus();

		// Set up periodic refresh every 30 seconds to keep status in sync
		const refreshInterval = setInterval(() => {
			refreshNotificationStatus();
		}, 30000);

		// Cleanup interval on unmount
		return () => {
			clearInterval(refreshInterval);
		};
	}, [refreshNotificationStatus]);

	// Prevent hydration mismatch by showing loading state until mounted
	if (!isMounted) {
		return (
			<div className="hover:scale-110 cursor-pointer transition-all">
				<div title="Loading notification settings">
					<BellOff className="opacity-50" />
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<div className="hover:scale-110 cursor-pointer transition-all">
				{!pushNotificationService.isPushSupported() ? (
					<div title="Push notifications not supported in this browser">
						<BellOff className="opacity-50" />
					</div>
				) : notificationPermission === "granted" && isSubscribed && backendNotificationEnabled ? (
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
				) : !backendNotificationEnabled ? (
					<div title="Notifications disabled in settings - click to enable">
						<BellOff
							onClick={() => toggleNotificationStatus(true)}
							className={isLoading ? "animate-pulse" : ""}
						/>
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
			<button
				onClick={refreshNotificationStatus}
				title="Refresh notification status"
				className="hover:scale-110 cursor-pointer transition-all p-1"
			>
				<RefreshCw className={`h-4 w-4 text-gray-500 hover:text-gray-700 ${isLoading ? "animate-spin" : ""}`} />
			</button>
		</div>
	);
}
