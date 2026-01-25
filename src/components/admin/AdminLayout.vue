<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const handleNavigateToStudent = () => {
  router.push('/student/student-1');
};
</script>

<template>
  <div class="admin-layout">
    <!-- ヘッダー -->
    <header class="admin-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="admin-title">📊 管理画面</h1>
          <p class="admin-subtitle">Nano Banaan Dashboard</p>
        </div>
        <div class="header-right">
          <button
            @click="handleNavigateToStudent"
            class="switch-to-student-btn"
            aria-label="子ども用画面に切り替え"
          >
            👤 子ども用画面
          </button>
        </div>
      </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
}

/* 横画面（ランドスケープ）対応 */
@media (orientation: landscape) and (max-height: 500px) {
  .admin-header {
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
  }
  
  .admin-main {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
}

/* 大画面（4Kなど）対応 */
@media (min-width: 1536px) {
  .header-content,
  .admin-main {
    max-width: 1600px;
  }
}

.admin-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 1.5rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.admin-title {
  font-size: 1.75rem;
  font-weight: bold;
  color: #1e3a8a;
  margin: 0;
}

.admin-subtitle {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.switch-to-student-btn {
  padding: 0.875rem 1.5rem;
  min-height: 44px;
  min-width: 120px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

@media (hover: hover) and (pointer: fine) {
  .switch-to-student-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
  }
}

.switch-to-student-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.admin-main {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

@media (min-width: 640px) {
  .admin-main {
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .admin-main {
    padding: 2rem;
  }
}

@media (min-width: 1280px) {
  .admin-main {
    max-width: 1600px;
  }
}

/* レスポンシブ対応 */
@media (max-width: 767.98px) {
  .admin-header {
    padding: 1rem;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .admin-title {
    font-size: 1.5rem;
  }

  .switch-to-student-btn {
    width: 100%;
  }

  .admin-main {
    padding: 1rem;
  }
}
</style>

