<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export type DashboardSection = 'home' | 'gacha' | 'gallery' | 'minecraft';

interface Props {
  currentSection: DashboardSection;
  /** タブごとの通知バッジ数（例: { gacha: 1 }） */
  badges?: Record<string, number>;
}

const props = withDefaults(defineProps<Props>(), {
  badges: () => ({}),
});

const emit = defineEmits<{
  'section-change': [section: DashboardSection];
}>();

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = async () => {
  await authStore.signOut();
  await router.replace('/login');
};

// ナビゲーション項目（常に上部に表示）
const navItems = [
  { id: 'home' as DashboardSection, label: 'ホーム', icon: '🏠' },
  { id: 'gacha' as DashboardSection, label: 'ガチャ', icon: '🎰' },
  { id: 'gallery' as DashboardSection, label: 'マイデッキ', icon: '📚' },
  { id: 'minecraft' as DashboardSection, label: 'まいんくらふと', icon: '🎮' },
];

const handleNavClick = (section: DashboardSection) => {
  emit('section-change', section);
};

function getBadgeCount(sectionId: string): number {
  const n = props.badges?.[sectionId];
  return typeof n === 'number' && n > 0 ? n : 0;
}

function getNavAriaLabel(item: { id: DashboardSection; label: string }): string {
  const count = getBadgeCount(item.id);
  if (count > 0) {
    return `${item.label}（未開封${count}まい）セクションに移動`;
  }
  return `${item.label}セクションに移動`;
}

// キーボード操作
const handleKeyDown = (e: KeyboardEvent, section: DashboardSection) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleNavClick(section);
  }
};
</script>

<template>
  <nav class="student-navigation" role="navigation" aria-label="メインナビゲーション">
    <div class="nav-inner">
      <div class="nav-spacer nav-spacer-left" aria-hidden="true"></div>
      <ul class="nav-list" role="list">
        <li
          v-for="item in navItems"
          :key="item.id"
          class="nav-item"
          role="listitem"
        >
          <button
            @click="handleNavClick(item.id)"
            @keydown="(e) => handleKeyDown(e, item.id)"
            :class="['nav-button', { active: currentSection === item.id }]"
            :aria-current="currentSection === item.id ? 'page' : undefined"
            :aria-label="getNavAriaLabel(item)"
          >
            <span class="nav-icon-wrapper">
              <span class="nav-icon">{{ item.icon }}</span>
              <span
                v-if="getBadgeCount(item.id) > 0"
                class="nav-badge"
                :aria-label="`未開封が${getBadgeCount(item.id)}まい`"
              >
                {{ getBadgeCount(item.id) > 99 ? '99+' : getBadgeCount(item.id) }}
              </span>
            </span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </li>
      </ul>
      <div class="nav-spacer nav-spacer-right">
        <button
          @click="handleLogout"
          class="nav-button logout-button"
          aria-label="ログアウト"
        >
          <span class="nav-icon">🚪</span>
          <span class="nav-label">ログアウト</span>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.student-navigation {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.25rem 0.5rem;
}

.nav-spacer {
  flex: 1;
  min-width: 0;
}

.nav-spacer-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.nav-list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  justify-content: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.nav-item {
  margin: 0;
}

.nav-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  min-height: 44px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  position: relative;
}

@media (min-width: 640px) {
  .nav-button {
    padding: 0.875rem 1.5rem;
  }
}

@media (hover: hover) and (pointer: fine) {
  .nav-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    transform: translateY(-2px);
  }
}

.nav-button.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.nav-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 3px;
  background: white;
  border-radius: 2px 2px 0 0;
}

.nav-icon-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.nav-badge {
  position: absolute;
  top: -0.35rem;
  right: -0.5rem;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.25rem;
  color: #fff;
  background: #ef4444;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.nav-label {
  font-size: 0.875rem;
  white-space: nowrap;
}

.logout-button {
  color: rgba(255, 255, 255, 0.5) !important;
}

.logout-button:hover {
  color: #fca5a5 !important;
  background: rgba(239, 68, 68, 0.15) !important;
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .nav-button {
    transition: none;
  }
}
</style>

