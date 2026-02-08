<script setup lang="ts">
import { onMounted } from 'vue';
import ToastNotification from '@/components/common/ToastNotification.vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

onMounted(async () => {
  // アプリ起動時にセッションを復元
  if (!authStore.initialized) {
    await authStore.initialize();
  }
});
</script>

<template>
  <!-- 初期化完了前はローディング表示 -->
  <template v-if="!authStore.initialized">
    <div class="app-loading">
      <div class="app-loading-spinner"></div>
      <p class="app-loading-text">よみこみちゅう...</p>
    </div>
  </template>

  <template v-else>
    <router-view />
  </template>

  <ToastNotification />
</template>

<style scoped>
.app-loading {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: app-spin 0.7s linear infinite;
}

.app-loading-text {
  color: white;
  font-size: 1rem;
  font-weight: 600;
}

@keyframes app-spin {
  to { transform: rotate(360deg); }
}
</style>

