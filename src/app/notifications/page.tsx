"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, Check, CheckCheck, ExternalLink, Inbox } from "lucide-react";
import { notificationApi } from "@/api/notificationApi";
import { NotificationHistoryItem } from "@/types";
import { getCookie } from "@/lib/ultis";

const PAGE_SIZE = 20;

function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function NotificationsPage() {
    const router = useRouter();
    const userId = getCookie("userId");
    const [items, setItems] = useState<NotificationHistoryItem[]>([]);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [filter, setFilter] = useState<"all" | "unread">("all");

    const fetchUnreadCount = useCallback(async () => {
        if (!userId) return;
        try {
            const data = await notificationApi.getUnreadCount(userId);
            setUnreadCount(data.unreadCount);
        } catch (err) {
            console.error("Failed to fetch unread count:", err);
        }
    }, [userId]);

    const loadMore = useCallback(async () => {
        if (!userId || isLoading || !hasMore) return;
        setIsLoading(true);
        try {
            const data = await notificationApi.getHistory(userId, PAGE_SIZE, skip);
            if (data.length < PAGE_SIZE) setHasMore(false);
            setItems((prev) => [...prev, ...data]);
            setSkip((prev) => prev + data.length);
        } catch (err) {
            console.error("Failed to load notifications:", err);
        } finally {
            setIsLoading(false);
        }
    }, [userId, isLoading, hasMore, skip]);

    useEffect(() => {
        if (!userId) {
            router.replace("/login/company");
            return;
        }
        loadMore();
        fetchUnreadCount();
    }, [userId, router, loadMore, fetchUnreadCount]);

    const handleItemClick = async (item: NotificationHistoryItem) => {
        if (!userId || item.isRead) return;
        try {
            await notificationApi.markRead(item.id, userId);
            setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, isRead: true, readDate: new Date().toISOString() } : it)));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const handleMarkAllRead = async () => {
        if (!userId || unreadCount === 0) return;
        try {
            await notificationApi.markAllRead(userId);
            const now = new Date().toISOString();
            setItems((prev) => prev.map((it) => ({ ...it, isRead: true, readDate: now })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark all read:", err);
        }
    };

    const visibleItems = filter === "unread" ? items.filter((it) => !it.isRead) : items;

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Quay lại"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-700" />
                    </button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-gray-800 flex items-center gap-2">
                            <Bell className="h-6 w-6 text-orange-600" />
                            Tất cả thông báo
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {unreadCount > 0 ? `Có ${unreadCount} thông báo chưa đọc` : "Bạn đã đọc hết thông báo"}
                        </p>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllRead}
                        className="px-3 py-2 rounded-lg bg-orange-100 text-orange-700 text-sm font-bold hover:bg-orange-200 transition-colors flex items-center gap-1"
                    >
                        <CheckCheck className="h-4 w-4" />
                        Đọc tất cả
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 border-b border-gray-200">
                <button
                    onClick={() => setFilter("all")}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                        filter === "all"
                            ? "border-orange-600 text-orange-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Tất cả
                </button>
                <button
                    onClick={() => setFilter("unread")}
                    className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                        filter === "unread"
                            ? "border-orange-600 text-orange-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Chưa đọc
                    {unreadCount > 0 && (
                        <span className="ml-1.5 text-[10px] font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {visibleItems.length === 0 && !isLoading ? (
                    <div className="px-6 py-16 text-center">
                        <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">
                            {filter === "unread" ? "Không có thông báo chưa đọc" : "Chưa có thông báo nào"}
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {items.length === 0 && isLoading ? (
                            <li className="px-6 py-10 text-center text-sm text-gray-500">Đang tải...</li>
                        ) : (
                            visibleItems.map((item) => (
                                <li key={item.id}>
                                    <NotificationRow item={item} onClick={handleItemClick} />
                                </li>
                            ))
                        )}
                    </ul>
                )}

                {hasMore && filter === "all" && items.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 text-center">
                        <button
                            onClick={loadMore}
                            disabled={isLoading}
                            className="text-sm font-bold text-orange-600 hover:text-orange-800 disabled:text-gray-400"
                        >
                            {isLoading ? "Đang tải..." : "Tải thêm"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function NotificationRow({
    item,
    onClick,
}: {
    item: NotificationHistoryItem;
    onClick: (item: NotificationHistoryItem) => void;
}) {
    return (
        <div
            className={`px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors ${item.isRead ? "bg-white" : "bg-orange-50/40"}`}
        >
            <div className="flex items-start gap-3">
                {!item.isRead && (
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-orange-500 flex-shrink-0" aria-label="Chưa đọc" />
                )}
                {item.isRead && <span className="mt-2 h-2.5 w-2.5 flex-shrink-0" />}

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm sm:text-base leading-snug ${item.isRead ? "text-gray-700" : "text-gray-900 font-bold"}`}>
                            {item.title}
                        </p>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(item.createdDate)}</span>
                    </div>

                    {item.body && (
                        <p className={`text-sm mt-1 ${item.isRead ? "text-gray-500" : "text-gray-700"}`}>{item.body}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                        {item.entityType && (
                            <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {item.entityType}
                            </span>
                        )}
                        {item.url && (
                            <Link
                                href={item.url}
                                onClick={() => onClick(item)}
                                className="text-xs font-semibold text-orange-600 hover:text-orange-800 inline-flex items-center gap-1"
                            >
                                Mở chi tiết
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        )}
                        {!item.isRead && (
                            <button
                                onClick={() => onClick(item)}
                                className="text-xs font-semibold text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                            >
                                <Check className="h-3 w-3" />
                                Đánh dấu đã đọc
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
