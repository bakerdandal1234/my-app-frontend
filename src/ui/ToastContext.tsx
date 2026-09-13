import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastVariant = 'success' | 'error';

interface ToastMessage {
  id: number;
  text: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (text: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

/**
 * Lightweight, self-dismissing toast notifications for action confirmations
 * (e.g. "Role assigned") — complements, not replaces, the inline red error
 * banners already used on every form for validation/backend errors. Those
 * stay inline since they're tied to a specific field/action the user needs
 * to fix; toasts are for transient success feedback that had none before.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, variant: ToastVariant = 'success') => {
    const id = nextId++;
    setToasts((current) => [...current, { id, text, variant }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  function dismiss(id: number) {
    setToasts((current) => current.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            onClick={() => dismiss(toast.id)}
            className={`cursor-pointer rounded px-4 py-2 text-sm font-medium text-white shadow-lg ${
              toast.variant === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
