'use client';

import { ReactNode } from 'react';

export default function VatTuLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
            {children}
        </div>
    );
}