<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const handleNavigateToStudent = () => {
  router.push('/student/student-1');
};

const handleLogout = async () => {
  try {
    await authStore.signOut();
  } finally {
    // 確実にログイン画面へ移るためフルページ遷移を使用（SPA の router.replace では画面が更新されない環境への対処）
    // タイムアウト時もストアでセッションはクリアされているため、必ず遷移する
    window.location.assign('/login');
  }
};
</script>

<template>
  <div class="admin-layout">
    <!-- ヘッダー -->
    <header class="admin-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="admin-title">
            <span class="title-icon" aria-hidden="true">🚀</span>
            <span class="title-text">コマンドセンター</span>
            <span class="title-sparkle" aria-hidden="true">✦</span>
          </h1>
          <p class="admin-subtitle">
            <span class="subtitle-badge">Campus Club</span>
            みんなのがんばりを ここから見守ろう！
          </p>
        </div>
        <div class="header-right">
          <!-- 一般ユーザーには不要のため非表示。必要な時はコメントを外す -->
          <!--
          <RouterLink
            to="/admin/supabase-test"
            class="header-btn header-btn--outline"
            active-class="header-btn--outline-active"
          >
            🔌 接続テスト
          </RouterLink>
          -->
          <button
            @click="handleNavigateToStudent"
            class="header-btn header-btn--primary"
            aria-label="生徒ホーム画面を表示"
          >
            🏠 ホームへ
          </button>
          <button
            @click="handleLogout"
            class="header-btn header-btn--danger"
            aria-label="ログアウト"
            :disabled="authStore.loading"
          >
            {{ authStore.loading ? '⏳ ログアウト中...' : '🚪 ログアウト' }}
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
  gap: 0.35rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* ── タイトル ── */
.admin-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  line-height: 1.2;
}

.title-icon {
  display: inline-block;
  font-size: 1.6rem;
  animation: float 2.5s ease-in-out infinite;
}

.title-text {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #db2777 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% 200%;
  animation: shimmer 4s ease-in-out infinite;
}

.title-sparkle {
  font-size: 0.9rem;
  color: #f59e0b;
  animation: sparkle-pulse 2s ease-in-out infinite;
}

/* ── サブタイトル ── */
.admin-subtitle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
}

.subtitle-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  background: linear-gradient(135deg, #e0e7ff, #ede9fe);
  color: #4f46e5;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 999px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* ── キーフレーム ── */
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-2px) rotate(-3deg); }
  75% { transform: translateY(1px) rotate(2deg); }
}

@keyframes shimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes sparkle-pulse {
  0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
}

/* ── ヘッダーボタン 共通 ── */
.header-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.625rem 1.125rem;
  min-height: 44px;
  font-size: 0.8125rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.header-btn:active {
  transform: translateY(0);
}

@media (hover: hover) and (pointer: fine) {
  .header-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }
}

/* ── アウトラインバリアント（接続テスト） ── */
.header-btn--outline {
  background: transparent;
  color: #475569;
  border: 1.5px solid #cbd5e1;
}

@media (hover: hover) and (pointer: fine) {
  .header-btn--outline:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
    color: #334155;
  }
}

.header-btn--outline-active {
  background: #e0e7ff;
  border-color: #818cf8;
  color: #4338ca;
}

/* ── プライマリバリアント（ホームへ） ── */
.header-btn--primary {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
}

@media (hover: hover) and (pointer: fine) {
  .header-btn--primary:hover {
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }
}

.header-btn--primary:active {
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
}

/* ── デンジャーバリアント（ログアウト） ── */
.header-btn--danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25);
}

@media (hover: hover) and (pointer: fine) {
  .header-btn--danger:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
  }
}

.header-btn--danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.header-btn--danger:active {
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25);
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

  .title-text {
    font-size: 1.3rem;
  }

  .title-icon {
    font-size: 1.3rem;
  }

  .admin-subtitle {
    flex-wrap: wrap;
    font-size: 0.75rem;
  }

  .header-btn {
    width: 100%;
  }

  .admin-main {
    padding: 1rem;
  }
}
</style>

