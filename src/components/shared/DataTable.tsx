'use client';

import React from 'react';
import { TableRowActions, ActionItem } from './TableRowActions';

export interface Column<T> {
    key: string;
    header: string;
    render?: (item: T, index: number) => React.ReactNode;
    className?: string;
    headerClassName?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    isLoading?: boolean;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
    actions?: (item: T) => ActionItem[];
    className?: string;
}

export function DataTable<T extends { id?: number | string }>({
    data,
    columns,
    isLoading = false,
    emptyMessage = 'Không có dữ liệu',
    onRowClick,
    actions,
    className = '',
}: DataTableProps<T>) {
    return (
        <div className={`overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                scope="col"
                                className={`px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-600 ${col.headerClassName || ''}`}
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
                            <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
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
                            <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
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
                                        className={`whitespace-nowrap px-4 py-3 text-sm text-gray-700 ${col.className || ''}`}
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
    );
}
