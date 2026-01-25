'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export interface ActionItem {
    label?: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
}

interface TableRowActionsProps {
    actions: ActionItem[];
}

export const TableRowActions: React.FC<TableRowActionsProps> = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [menuVisible, setMenuVisible] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Tính toán vị trí dropdown khi mở
    const updateMenuPosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const menuWidth = 192; // w-48 = 192px
            const padding = 8; // padding từ edge
            
            // Tính toán left position: align right với button
            let left = rect.right - menuWidth;
            
            // Đảm bảo không tràn ra ngoài màn hình bên trái
            if (left < padding) {
                left = padding;
            }
            
            // Đảm bảo không tràn ra ngoài màn hình bên phải
            if (rect.right > window.innerWidth - padding) {
                left = window.innerWidth - menuWidth - padding;
            }
            
            setMenuPosition({
                top: rect.bottom + 4,
                left: left,
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateMenuPosition();
            // Đợi một frame để đảm bảo vị trí đã được set, rồi mới hiển thị
            requestAnimationFrame(() => {
                setMenuVisible(true);
            });
        } else {
            setMenuVisible(false);
        }
    }, [isOpen]);

    // Cập nhật vị trí khi resize hoặc scroll
    useEffect(() => {
        if (!isOpen) return;
        
        const handleResize = () => {
            updateMenuPosition();
        };

        const handleScroll = () => {
            updateMenuPosition();
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current && !menuRef.current.contains(target) && 
                buttonRef.current && !buttonRef.current.contains(target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Nếu không có actions thì không hiển thị
    if (!actions || actions.length === 0) {
        return null;
    }

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen && buttonRef.current) {
            // Tính toán vị trí TRƯỚC khi mở menu
            const rect = buttonRef.current.getBoundingClientRect();
            const menuWidth = 192; // w-48 = 192px
            const padding = 8; // padding từ edge
            
            let left = rect.right - menuWidth;
            
            if (left < padding) {
                left = padding;
            }
            
            if (rect.right > window.innerWidth - padding) {
                left = window.innerWidth - menuWidth - padding;
            }
            
            setMenuPosition({
                top: rect.bottom + 4,
                left: left,
            });
        }
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative inline-block text-left">
            <button
                ref={buttonRef}
                type="button"
                onClick={handleToggle}
                className="flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all active:scale-90"
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {isOpen && (
                <div 
                    ref={menuRef}
                    className={`fixed z-[100] w-48 rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none transition-opacity duration-150 ${
                        menuVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ 
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="py-1">
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    action.onClick();
                                }}
                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold transition-colors ${action.variant === 'danger'
                                    ? 'text-red-600 hover:bg-red-50'
                                    : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                                    }`}
                            >
                                <span className="opacity-70 group-hover:opacity-100">{action.icon}</span>
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
