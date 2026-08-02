"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, BellRing, Check, ExternalLink, Inbox, Loader2 } from "lucide-react";
import { notificationApi } from "@/api/notificationApi";
import { NotificationHistoryItem } from "@/types";
import { getCookie } from "@/lib/ultis";
import { usePushSubscription } from "./Notification";

const PAGE_SIZE = 8;

function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return date.toLocaleDateString("vi-VN");
}

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [items, setItems] = useState<NotificationHistoryItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const userId = getCookie("userId");
    const push = usePushSubscription();

    const fetchUnreadCount = useCallback(async () => {
        if (!userId) return;
        try {
            const data = await notificationApi.getUnreadCount(userId);
            setUnreadCount(data.unreadCount);
        } catch (err) {
            console.error("Failed to fetch unread count:", err);
        }
    }, [userId]);

    const fetchHistory = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const data = await notificationApi.getHistory(userId, PAGE_SIZE, 0);
            setItems(data);
        } catch (err) {
            console.error("Failed to fetch notification history:", err);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        setIsMounted(true);
        if (!userId) return;
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [userId, fetchUnreadCount]);

    useEffect(() => {
        if (!isOpen) return;
        fetchHistory();
        fetchUnreadCount();
    }, [isOpen, fetchHistory, fetchUnreadCount]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleItemClick = async (item: NotificationHistoryItem) => {
        if (!userId || item.isRead) return;
        try {
            await notificationApi.markRead(item.id, userId);
            setItems((prev) =>
                prev.map((it) => (it.id === item.id ? { ...it, isRead: true, readDate: new Date().toISOString() } : it))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const handleMarkAllRead = async () => {
        if (!userId || unreadCount === 0) return;
        try {
            await notificationApi.markAllRead(userId);
            setItems((prev) => prev.map((it) => ({ ...it, isRead: true, readDate: new Date().toISOString() })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all read:", err);
        }
    };

    if (!isMounted) {
        return (
            <div className="p-1 opacity-50">
                <Bell className="h-5 w-5 text-gray-500" />
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="p-1 opacity-50" title="Chưa đăng nhập">
                <Bell className="h-5 w-5 text-gray-500" />
            </div>
        );
    }

    // Icon chính phản ánh trạng thái push (đang bật thì BellRing, không thì BellOff).
    const pushOn = push.status === "on";

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative p-1 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all"
                title="Thông báo"
                aria-label="Mở danh sách thông báo"
            >
                {pushOn ? (
                    <BellRing className={`h-5 w-5 ${unreadCount > 0 ? "text-orange-600" : "text-gray-700"}`} />
                ) : (
                    <BellOff className="h-5 w-5 text-gray-500" />
                )}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-[380px] max-w-[92vw] origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-orange-600" />
                            <h3 className="text-sm font-bold text-gray-800">Thông báo</h3>
                            {unreadCount > 0 && (
                                <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-full">
                                    {unreadCount} mới
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs font-semibold text-orange-600 hover:text-orange-800 flex items-center gap-1"
                            >
                                <Check className="h-3 w-3" />
                                Đọc tất cả
                            </button>
                        )}
                    </div>

                    {/* Push subscription toggle */}
                    <PushToggleRow push={push} />

                    {/* History list */}
                    <div className="max-h-[360px] overflow-y-auto">
                        {isLoading ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">Đang tải...</div>
                        ) : items.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                                <Inbox className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Chưa có thông báo nào</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {items.map((item) => (
                                    <li key={item.id}>
                                        <NotificationItem item={item} onClick={handleItemClick} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="border-t border-gray-100 bg-gray-50">
                        <Link
                            href="/notifications"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-center gap-1 px-4 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                            Xem tất cả thông báo
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

function PushToggleRow({ push }: { push: ReturnType<typeof usePushSubscription> }) {
    if (!push.isMounted) {
        return (
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 text-xs text-gray-400">
                Đang kiểm tra trạng thái thông báo...
            </div>
        );
    }

    if (push.support === "unsupported") {
        return (
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                Trình duyệt không hỗ trợ thông báo đẩy.
            </div>
        );
    }

    if (push.support === "denied") {
        return (
            <div className="px-4 py-2.5 border-b border-gray-100 bg-amber-50 text-xs text-amber-700">
                Thông báo đang bị chặn. Hãy bật trong cài đặt trình duyệt.
            </div>
        );
    }

    const isOn = push.status === "on";

    return (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 min-w-0">
                {isOn ? (
                    <BellRing className="h-4 w-4 text-orange-600 flex-shrink-0" />
                ) : (
                    <BellOff className="h-4 w-4 text-gray-500 flex-shrink-0" />
                )}
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800">
                        Thông báo đẩy {isOn ? "đang bật" : "đang tắt"}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                        {isOn
                            ? "Bạn sẽ nhận thông báo ngay cả khi đóng trang."
                            : "Bật để nhận thông báo ngay khi có đơn/fund mới."}
                    </p>
                </div>
            </div>

            <button
                onClick={isOn ? push.disable : push.enable}
                disabled={push.isLoading}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                    isOn ? "bg-orange-500" : "bg-gray-300"
                } ${push.isLoading ? "opacity-60 cursor-wait" : ""}`}
                aria-label={isOn ? "Tắt thông báo đẩy" : "Bật thông báo đẩy"}
                title={isOn ? "Tắt thông báo đẩy" : "Bật thông báo đẩy"}
            >
                {push.isLoading ? (
                    <Loader2 className="absolute left-1/2 -translate-x-1/2 h-3 w-3 text-white animate-spin" />
                ) : (
                    <span
                        className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                            isOn ? "translate-x-4" : "translate-x-0.5"
                        }`}
                    />
                )}
            </button>
        </div>
    );
}

function NotificationItem({
    item,
    onClick,
}: {
    item: NotificationHistoryItem;
    onClick: (item: NotificationHistoryItem) => void;
}) {
    const Wrapper: React.ElementType = item.url ? Link : "div";
    const wrapperProps = item.url
        ? { href: item.url, onClick: () => onClick(item) }
        : { onClick: () => onClick(item) };

    return (
        <Wrapper
            {...wrapperProps}
            className={`block px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                item.isRead ? "bg-white" : "bg-orange-50/40"
            }`}
        >
            <div className="flex items-start gap-2">
                {!item.isRead && (
                    <span className="mt-2 h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" aria-label="Chưa đọc" />
                )}
                {item.isRead && <span className="mt-2 h-2 w-2 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                    <p
                        className={`text-sm leading-snug truncate ${
                            item.isRead ? "text-gray-700" : "text-gray-900 font-bold"
                        }`}
                    >
                        {item.title}
                    </p>
                    {item.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.body}</p>}
                    <p className="text-[11px] text-gray-400 mt-1">{formatTime(item.createdDate)}</p>
                </div>
            </div>
        </Wrapper>
    );
}