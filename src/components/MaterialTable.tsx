import React from 'react';
import Image from 'next/image';
import { Material } from '../types';

interface MaterialTableProps {
    materials: Material[];
    columns: { key: string; header: string }[];
    onActionClick: (id: number) => void;
    openDropdown: number | null;
    dropdownRefs: React.MutableRefObject<{ [key: number]: HTMLElement | null }>;
    handleEdit: (m: Material) => void;
    handleDelete: (m: Material) => void;
    handleRequestUsage: (m: Material) => void;
}

export const MaterialTable: React.FC<MaterialTableProps> = ({
    materials,
    columns,
    onActionClick,
    openDropdown,
    dropdownRefs,
    handleEdit,
    handleDelete,
    handleRequestUsage,
}) => {
    return (
        <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                scope="col"
                                className={`px-2 sm:px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-600 ${col.key === 'actions' ? 'text-center' : 'text-left'}`}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {materials.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-2 sm:px-4 py-8 text-center text-gray-500">
                                Không có vật tư nào
                            </td>
                        </tr>
                    ) : (
                        materials.map((m, index) => (
                            <tr key={m.id} className="hover:bg-orange-50/40">
                                <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                                <td className="whitespace-nowrap px-2 sm:px-4 py-3">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center relative">
                                        {m.imageUrl ? (
                                            <Image src={m.imageUrl} alt={m.name} fill className="object-cover" sizes="48px" />
                                        ) : (
                                            <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 13l3 3 5-5" />
                                            </svg>
                                        )}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm font-bold text-gray-800">{m.name}</td>
                                <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm font-semibold text-gray-700">{m.type}</td>
                                <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm font-semibold text-gray-700">{m.amount.toLocaleString('vi-VN')}</td>
                                <td className="whitespace-nowrap px-2 sm:px-4 py-3 text-sm relative">
                                    <div className="relative flex justify-center" ref={el => { dropdownRefs.current[m.id] = el; }}>
                                        <button
                                            type="button"
                                            onClick={() => onActionClick(m.id)}
                                            className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-200"
                                        >
                                            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </button>

                                        {openDropdown === m.id && (
                                            <div className="fixed z-[9999] w-40 sm:w-48 origin-top rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5"
                                                style={{
                                                    left: `${Math.max(8, Math.min((dropdownRefs.current[m.id]?.getBoundingClientRect().left || 0) + (dropdownRefs.current[m.id]?.getBoundingClientRect().width || 0) / 2 - 80, window.innerWidth - 168))}px`,
                                                    top: `${(dropdownRefs.current[m.id]?.getBoundingClientRect().bottom || 0) + 8}px`
                                                }}>
                                                <div className="py-1">
                                                    <button onClick={() => handleEdit(m)} className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                        Sửa
                                                    </button>
                                                    <button onClick={() => handleRequestUsage(m)} className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                        Yêu cầu sử dụng
                                                    </button>
                                                    <button onClick={() => handleDelete(m)} className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                                        Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )
                        )
                    )}
                </tbody>
            </table>
        </div>
    );
};
