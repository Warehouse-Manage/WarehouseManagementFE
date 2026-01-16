'use client';

import React from 'react';
import { TableRowActions, ActionItem } from './TableRowActions';

export interface Column<T> {
    key: string;
    header: string;
    render?: (item: T, index: number) => React.ReactNode;
    className?: string;
    headerClassName?: string;
    mobileHidden?: boolean;
    isMain?: boolean; // Flag to show prominently in mobile card
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    isLoading?: boolean;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
    actions?: (item: T) => ActionItem[];
    className?: string;
    disableCardView?: boolean;
}

export function DataTable<T extends { id?: number | string }>({
    data,
    columns,
    isLoading = false,
    emptyMessage = 'Không có dữ liệu',
    onRowClick,
    actions,
    className = '',
    disableCardView = false,
}: DataTableProps<T>) {
    return (
        <div className={`space-y-4 ${className}`}>
            {/* Desktop Table View */}
            <div className={`${disableCardView ? 'block' : 'hidden md:block'} overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm`}>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-600 ${col.headerClassName || ''} ${col.mobileHidden ? 'hidden lg:table-cell' : ''}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                            {actions && (
                                <th scope="col" className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-gray-600 w-16">
                                    Thao tác
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-gray-500">
                                    <div className="flex items-center justify-center space-x-2">
                                        <svg className="h-5 w-5 animate-spin text-orange-600" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Đang tải dữ liệu...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-gray-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => (
                                <tr
                                    key={item.id || index}
                                    onClick={() => onRowClick && onRowClick(item)}
                                    className={`transition-colors hover:bg-orange-50/40 ${onRowClick ? 'cursor-pointer' : ''}`}
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${col.className || ''} ${col.mobileHidden ? 'hidden lg:table-cell' : ''}`}
                                        >
                                            {col.render ? col.render(item, index) : (item as unknown as Record<string, React.ReactNode>)[col.key]}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                                            <TableRowActions actions={actions(item)} />
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            {!disableCardView && (
                <div className="md:hidden space-y-3">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                            <div className="flex flex-col items-center justify-center space-y-3">
                                <svg className="h-8 w-8 animate-spin text-orange-600" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="font-medium">Đang tải dữ liệu...</span>
                            </div>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100 italic">
                            {emptyMessage}
                        </div>
                    ) : (
                        data.map((item, index) => (
                            <div
                                key={item.id || index}
                                onClick={() => onRowClick && onRowClick(item)}
                                className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm active:scale-[0.98] transition-all"
                            >
                                <div className="space-y-3">
                                    {/* Header of card - Main columns */}
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-1">
                                            {columns.filter(c => c.isMain).map(col => (
                                                <div key={col.key}>
                                                    {col.render ? col.render(item, index) : (item as unknown as Record<string, React.ReactNode>)[col.key]}
                                                </div>
                                            ))}
                                        </div>
                                        {actions && (
                                            <div className="flex-shrink-0">
                                                <TableRowActions actions={actions(item)} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Detail lines for other non-hidden columns */}
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-3 pt-3 border-t border-gray-100">
                                        {columns.filter(c => !c.isMain && !c.mobileHidden).map(col => (
                                            <div key={col.key} className="space-y-1">
                                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">
                                                    {col.header}
                                                </p>
                                                <div className="text-sm font-bold text-gray-800 break-words line-clamp-2">
                                                    {col.render ? col.render(item, index) : (item as unknown as Record<string, React.ReactNode>)[col.key]}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
