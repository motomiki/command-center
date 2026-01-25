<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const { toasts, removeToast } = useToast();

const getIcon = (type: string) => {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '⚠️';
    case 'warning':
      return '🚧';
    default:
      return 'ℹ️';
  }
};
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="`type-${toast.type}`"
          role="alert"
        >
          <div class="toast-icon">{{ getIcon(toast.type) }}</div>
          <div class="toast-content">
            <h4 class="toast-title">{{ toast.title }}</h4>
            <p v-if="toast.message" class="toast-message">{{ toast.message }}</p>
          </div>
          <button
            @click="removeToast(toast.id)"
            class="toast-close"
            aria-label="閉じる"
          >
            ×
          </button>
          
          <!-- Progress bar for auto-dismiss -->
          <div 
            v-if="toast.duration && toast.duration > 0" 
            class="toast-progress" 
            :style="{ animationDuration: `${toast.duration}ms` }"
          ></div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  pointer-events: none; /* Let clicks pass through container */
}

.toast-item {
  pointer-events: auto;
  min-width: 300px;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-left: 4px solid #94a3b8;
  position: relative;
  overflow: hidden;
}

.type-success { border-left-color: #10b981; }
.type-error { border-left-color: #ef4444; }
.type-warning { border-left-color: #f59e0b; }
.type-info { border-left-color: #3b82f6; }

.toast-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  font-size: 0.95rem;
}

.toast-message {
  color: #64748b;
  font-size: 0.85rem;
  margin: 0.25rem 0 0 0;
}

.toast-close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  line-height: 0.5;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.toast-close:hover {
  color: #475569;
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.1);
  width: 100%;
  transform-origin: left;
  animation: shrink linear forwards;
}

@keyframes shrink {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.5);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}
</style>
