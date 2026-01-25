import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

const toasts = ref<Toast[]>([]);

export function useToast() {
  const addToast = (
    title: string,
    message?: string,
    type: ToastType = 'info',
    duration: number = 5000
  ) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const toast: Toast = { id, title, message, type, duration };
    
    toasts.value.push(toast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  };

  return {
    toasts,
    addToast,
    removeToast,
  };
}
