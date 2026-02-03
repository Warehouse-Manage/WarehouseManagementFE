'use client';

import React, { useState, useEffect } from 'react';
import { formatNumberInput, parseNumberInput } from '@/lib/ultis';

export type FieldType = 'text' | 'number' | 'date' | 'month' | 'select' | 'checkbox' | 'textarea' | 'tel' | 'datetime-local' | 'time';

export interface FormField {
    name: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    required?: boolean;
    options?: { label: string; value: string | number }[];
    min?: number | string;
    max?: number | string;
    step?: number | string;
}

interface DynamicFormProps {
    fields: FormField[];
    values: Record<string, unknown>;
    onChange: (name: string, value: unknown) => void;
    onSubmit?: () => void;
    isSubmitting?: boolean;
    columns?: 1 | 2;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
    fields,
    values,
    onChange,
    onSubmit,
    isSubmitting = false,
    columns = 1,
}) => {
    // Lưu raw string cho các field number để giữ dấu chấm khi đang gõ
    const [rawNumberValues, setRawNumberValues] = useState<Record<string, string>>({});
    
    // Reset raw values khi values thay đổi từ bên ngoài (không phải từ user input)
    useEffect(() => {
        const numberFields = fields.filter(f => f.type === 'number');
        numberFields.forEach(field => {
            const value = values[field.name];
            const formatted = formatNumberInput(value as number | '' | null | undefined);
            if (rawNumberValues[field.name] !== formatted && !rawNumberValues[field.name]?.endsWith('.')) {
                setRawNumberValues(prev => ({ ...prev, [field.name]: formatted }));
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [values]);
    
    // isSubmitting can be used if we want to disable inputs while submitting
    const renderField = (field: FormField) => {
        const commonClasses = `w-full rounded-lg border-2 border-gray-100 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-100 transition-all ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`;

        switch (field.type) {
            case 'select':
                return (
                    <select
                        value={(values[field.name] as string | number | readonly string[]) || ''}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        className={commonClasses}
                        required={field.required}
                    >
                        <option value="">{field.placeholder || `Chọn ${field.label}`}</option>
                        {field.options?.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );
            case 'textarea':
                return (
                    <textarea
                        value={(values[field.name] as string | number | readonly string[]) || ''}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        className={commonClasses}
                        rows={3}
                        required={field.required}
                    />
                );
            case 'checkbox':
                return (
                    <div className="flex items-center gap-2 py-2">
                        <input
                            type="checkbox"
                            checked={!!values[field.name]}
                            onChange={(e) => onChange(field.name, e.target.checked)}
                            className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{field.label}</span>
                    </div>
                );
            default:
                if (field.type === 'number') {
                    const rawValue = values[field.name] as number | '' | null | undefined;
                    const displayValue = rawNumberValues[field.name] ?? formatNumberInput(rawValue);
                    
                    return (
                        <input
                            type="text"
                            inputMode="decimal"
                            value={displayValue}
                            onChange={(e) => {
                                const inputVal = e.target.value;
                                
                                // Lưu raw string để giữ dấu chấm khi đang gõ
                                setRawNumberValues(prev => ({ ...prev, [field.name]: inputVal }));
                                
                                // Nếu input kết thúc bằng dấu chấm, parse phần trước dấu chấm
                                if (inputVal.endsWith('.') && inputVal.split('.').length === 2) {
                                    const beforeDot = inputVal.slice(0, -1);
                                    const parsed = parseNumberInput(beforeDot);
                                    onChange(field.name, parsed);
                                } else {
                                    // Parse toàn bộ input
                                    const parsed = parseNumberInput(inputVal);
                                    onChange(field.name, parsed);
                                    
                                    // Nếu parse thành công và không kết thúc bằng dấu chấm, format lại
                                    if (parsed !== '' && !inputVal.endsWith('.')) {
                                        setRawNumberValues(prev => ({ ...prev, [field.name]: formatNumberInput(parsed) }));
                                    }
                                }
                            }}
                            onBlur={(e) => {
                                // Khi blur, format lại giá trị cuối cùng
                                const parsed = parseNumberInput(e.target.value);
                                const formatted = formatNumberInput(parsed);
                                setRawNumberValues(prev => ({ ...prev, [field.name]: formatted }));
                            }}
                            placeholder={field.placeholder}
                            className={commonClasses + ' text-right font-semibold'}
                            required={field.required}
                            min={field.min}
                            max={field.max}
                            step={field.step}
                        />
                    );
                }
                return (
                    <input
                        type={field.type}
                        value={values[field.name] === undefined ? '' : (values[field.name] as string | number | readonly string[])}
                        onChange={(e) => onChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                        placeholder={field.placeholder}
                        className={commonClasses}
                        required={field.required}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                    />
                );
        }
    };

    return (
        <form
            onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
            className={`grid gap-4 ${columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1'}`}
        >
            {fields.map((field) => (
                <div key={field.name} className={field.type === 'checkbox' ? '' : 'space-y-1'}>
                    {field.type !== 'checkbox' && (
                        <label className="text-xs font-black uppercase tracking-wider text-gray-500">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                    )}
                    {renderField(field)}
                </div>
            ))}
        </form>
    );
};
