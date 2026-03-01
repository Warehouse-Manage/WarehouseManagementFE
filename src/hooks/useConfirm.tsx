'use client';

import { useState, useCallback } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const useConfirm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (resolvePromise) {
      setIsLoading(true);
      try {
        resolvePromise(true);
        setIsOpen(false);
        setOptions(null);
        setResolvePromise(null);
      } finally {
        setIsLoading(false);
      }
    }
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(false);
      setIsOpen(false);
      setOptions(null);
      setResolvePromise(null);
    }
  }, [resolvePromise]);

  const ConfirmDialogComponent = options ? (
    <ConfirmDialog
      isOpen={isOpen}
      title={options.title}
      message={options.message}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      variant={options.variant}
      isLoading={isLoading}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return {
    confirm,
    ConfirmDialog: ConfirmDialogComponent,
  };
};
