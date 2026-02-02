<script setup lang="ts">
export type DashboardSection = 'home' | 'gacha' | 'gallery' | 'minecraft';

interface Props {
  currentSection: DashboardSection;
}

defineProps<Props>();

const emit = defineEmits<{
  'section-change': [section: DashboardSection];
}>();

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
          :aria-label="`${item.label}セクションに移動`"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </li>
    </ul>
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

.nav-list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  justify-content: center;
  gap: 0.5rem;
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

.nav-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.nav-label {
  font-size: 0.875rem;
  white-space: nowrap;
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .nav-button {
    transition: none;
  }
}
</style>

