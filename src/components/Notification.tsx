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
			const granted = await pushNotificationService.requestPermission();

			if (granted) {
				await pushNotificationService.registerServiceWorker();

				const userId = getCookie('userId');
				if (!userId) {
					toast.error('User not authenticated');
					return;
				}

				await pushNotificationService.subscribeToPush(userId);
				await notificationApi.toggleNotifications(userId, true);

				setNotificationPermission('granted');
				setIsSubscribed(true);
				setBackendNotificationEnabled(true);
				toast.success('Đã bật thông báo');
			} else {
				setNotificationPermission('denied');
				toast.error('Permission denied. You can enable notifications in your browser settings.');
			}
		} catch (error) {
			console.error('Error enabling notifications:', error);
			toast.error('Failed to enable notifications');
			await refreshNotificationStatus();
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

			await pushNotificationService.unsubscribeFromPush();

			const result = await notificationApi.unsubscribe({ userId });
			if (result) {
				await notificationApi.toggleNotifications(userId, false);
				setIsSubscribed(false);
				setBackendNotificationEnabled(false);
				toast.success(result.message || 'Đã tắt thông báo');
			}
		} catch (error) {
			console.error('Error disabling notifications:', error);
			toast.error('Failed to disable notifications');
			await refreshNotificationStatus();
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

	const applyNotificationState = useCallback(
		async (permission: NotificationPermission, userStatus: { notificationEnabled: boolean; hasSubscription: boolean }) => {
			setNotificationPermission(permission);
			setBackendNotificationEnabled(userStatus.notificationEnabled);
			const active =
				permission === 'granted' &&
				userStatus.notificationEnabled &&
				userStatus.hasSubscription;
			setIsSubscribed(active);
		},
		[],
	);

	// Refresh notification status from backend
	const refreshNotificationStatus = useCallback(async () => {
		if (!pushNotificationService.isPushSupported()) return;

		const permission = pushNotificationService.getPermissionStatus();
		const userId = getCookie('userId');
		if (!userId) {
			setNotificationPermission(permission);
			if (permission === 'granted') {
				const localSub = await pushNotificationService.getSubscriptionStatus();
				setIsSubscribed(localSub);
			} else {
				setIsSubscribed(false);
			}
			return;
		}

		const userStatus = await fetchUserNotificationStatus(userId);
		await applyNotificationState(permission, userStatus);
	}, [applyNotificationState]);

	const enableBackendNotifications = async () => {
		setIsLoading(true);
		try {
			const userId = getCookie('userId');
			if (!userId) {
				toast.error('User not authenticated');
				return;
			}

			const permission = pushNotificationService.getPermissionStatus();
			const hasLocalSub = permission === 'granted' && (await pushNotificationService.getSubscriptionStatus());

			if (permission !== 'granted' || !hasLocalSub) {
				await showNotification();
				return;
			}

			await notificationApi.toggleNotifications(userId, true);
			setBackendNotificationEnabled(true);
			setIsSubscribed(true);
			toast.success('Đã bật thông báo');
		} catch (error) {
			console.error('Error enabling backend notifications:', error);
			toast.error(error instanceof Error ? error.message : 'Không thể bật thông báo');
			await refreshNotificationStatus();
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

			await refreshNotificationStatus();
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
							onClick={enableBackendNotifications}
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
