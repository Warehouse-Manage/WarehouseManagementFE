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
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all active:scale-90"
            >
                <MoreVertical className="h-4 w-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in duration-200">
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
