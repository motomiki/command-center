<script setup lang="ts">
import { ref } from 'vue';

export type DashboardSection = 'home' | 'gacha' | 'gallery' | 'minecraft';

interface Props {
  currentSection: DashboardSection;
}

defineProps<Props>();

const emit = defineEmits<{
  'section-change': [section: DashboardSection];
}>();

// ナビゲーション項目
const navItems = [
  { id: 'home' as DashboardSection, label: 'ホーム', icon: '🏠' },
  { id: 'gacha' as DashboardSection, label: 'ガチャ', icon: '🎰' },
  { id: 'gallery' as DashboardSection, label: 'マイデッキ', icon: '📚' },
  { id: 'minecraft' as DashboardSection, label: 'まいんくらふと', icon: '🎮' },
];

// モバイルメニューの開閉
const isMobileMenuOpen = ref(false);

const handleNavClick = (section: DashboardSection) => {
  emit('section-change', section);
  isMobileMenuOpen.value = false;
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
    <!-- デスクトップナビゲーション -->
    <div class="desktop-nav">
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
    </div>

    <!-- モバイルハンバーガーメニュー -->
    <div class="mobile-nav">
      <button
        @click="isMobileMenuOpen = !isMobileMenuOpen"
        class="mobile-menu-button"
        :aria-expanded="isMobileMenuOpen"
        aria-label="メニューを開く"
      >
        <span class="hamburger-icon">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      <Transition name="mobile-menu">
        <div v-if="isMobileMenuOpen" class="mobile-menu-overlay" @click="isMobileMenuOpen = false">
          <div class="mobile-menu-content" @click.stop>
            <div class="mobile-menu-header">
              <h3 class="mobile-menu-title">メニュー</h3>
              <button
                @click="isMobileMenuOpen = false"
                class="mobile-menu-close"
                aria-label="メニューを閉じる"
              >
                ✕
              </button>
            </div>
            <ul class="mobile-nav-list" role="list">
              <li
                v-for="item in navItems"
                :key="item.id"
                class="mobile-nav-item"
                role="listitem"
              >
                <button
                  @click="handleNavClick(item.id)"
                  :class="['mobile-nav-button', { active: currentSection === item.id }]"
                  :aria-current="currentSection === item.id ? 'page' : undefined"
                >
                  <span class="mobile-nav-icon">{{ item.icon }}</span>
                  <span class="mobile-nav-label">{{ item.label }}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </Transition>
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

/* デスクトップナビゲーション */
.desktop-nav {
  display: none;
}

@media (min-width: 768px) {
  .desktop-nav {
    display: block;
  }
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
  padding: 0.875rem 1.5rem;
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

/* モバイルナビゲーション */
.mobile-nav {
  display: block;
}

@media (min-width: 768px) {
  .mobile-nav {
    display: none;
  }
}

.mobile-menu-button {
  width: 100%;
  padding: 1rem;
  min-height: 44px;
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.hamburger-icon {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 24px;
  height: 18px;
}

.hamburger-icon span {
  width: 100%;
  height: 3px;
  background: white;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 1rem;
}

.mobile-menu-content {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  width: 100%;
  max-width: 300px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.mobile-menu-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: white;
  margin: 0;
}

.mobile-menu-close {
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

@media (hover: hover) and (pointer: fine) {
  .mobile-menu-close:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
  
  .nav-button:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }
}

.mobile-nav-list {
  list-style: none;
  margin: 0;
  padding: 0.5rem;
}

.mobile-nav-item {
  margin: 0;
}

.mobile-nav-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  min-height: 44px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  text-align: left;
}

@media (hover: hover) and (pointer: fine) {
  .mobile-nav-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
}

.mobile-nav-button.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.mobile-nav-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.mobile-nav-label {
  font-size: 1rem;
}

/* モバイルメニューのアニメーション */
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.3s ease;
}

.mobile-menu-enter-active .mobile-menu-content,
.mobile-menu-leave-active .mobile-menu-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}

.mobile-menu-enter-from .mobile-menu-content,
.mobile-menu-leave-to .mobile-menu-content {
  transform: translateX(100%);
  opacity: 0;
}

.mobile-menu-enter-to .mobile-menu-content,
.mobile-menu-leave-from .mobile-menu-content {
  transform: translateX(0);
  opacity: 1;
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .nav-button,
  .mobile-nav-button,
  .mobile-menu-enter-active,
  .mobile-menu-leave-active,
  .mobile-menu-enter-active .mobile-menu-content,
  .mobile-menu-leave-active .mobile-menu-content {
    transition: none;
  }
}
</style>

