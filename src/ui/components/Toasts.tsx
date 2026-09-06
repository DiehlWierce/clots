import { useEffect } from 'react'
import type { Toast } from '@/store/useGame'

interface Props {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return <div className={`toast toast--${toast.tone}`}>{toast.message}</div>
}

export function Toasts({ toasts, onDismiss }: Props) {
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
