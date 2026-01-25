<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { CardData } from '@/types/card';
import SsrCard from './SsrCard.vue';
import MinecraftViewer from './MinecraftViewer.vue';
import { getRarityDisplayName } from '@/utils/rarity';

interface Props {
  card: CardData;
  isOpen: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

// カウントアップアニメーション用のref
const displayedScore = ref(0);
const displayedWpm = ref(0);
const displayedDiff = ref(0);

// アニメーション中かどうか
const isAnimating = ref(false);

// カウントアップアニメーション
const animateValue = (
  start: number,
  end: number,
  duration: number,
  callback: (value: number) => void
) => {
  const startTime = performance.now();
  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = start + (end - start) * easeOutQuart;
    callback(current);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  requestAnimationFrame(animate);
};

// モーダルが開いた時にアニメーションを開始
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && props.card.typingStats) {
      isAnimating.value = true;
      const stats = props.card.typingStats;

      // スコアのアニメーション
      displayedScore.value = 0;
      animateValue(0, stats.score, 1000, (value) => {
        displayedScore.value = Math.floor(value);
      });

      // WPMのアニメーション
      displayedWpm.value = 0;
      animateValue(0, stats.wpm, 1000, (value) => {
        displayedWpm.value = Math.floor(value);
      });

      // 前回比のアニメーション
      displayedDiff.value = 0;
      animateValue(0, stats.diffScore, 800, (value) => {
        displayedDiff.value = Math.floor(value);
      });

      setTimeout(() => {
        isAnimating.value = false;
      }, 1200);
    }
  },
  { immediate: true }
);

// モーダルを閉じる
const handleClose = () => {
  emit('close');
};

// 背景クリックで閉じる
const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    handleClose();
  }
};

// キーボード操作（Escキーで閉じる）
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    handleClose();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

import { onUnmounted } from 'vue';
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

// 日付のフォーマット
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// 前回比の表示
const diffDisplay = computed(() => {
  if (!props.card.typingStats) return '';
  const diff = displayedDiff.value;
  if (diff > 0) {
    return `+${diff}UP!`;
  } else if (diff < 0) {
    return `${diff}`;
  } else {
    return '±0';
  }
});

// 前回比の色
const diffColor = computed(() => {
  if (!props.card.typingStats) return '';
  const diff = displayedDiff.value;
  if (diff > 0) {
    return 'text-green-400';
  } else if (diff < 0) {
    return 'text-red-400';
  } else {
    return 'text-gray-400';
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click="handleBackdropClick"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div class="modal-container" @click.stop>
          <!-- 閉じるボタン -->
          <button
            @click="handleClose"
            class="close-button"
            aria-label="モーダルを閉じる"
          >
            ✕
          </button>

          <!-- モーダルコンテンツ -->
          <div class="modal-content">
            <!-- カード表示 -->
            <div class="card-section">
              <SsrCard :card="card" />
            </div>

            <!-- 詳細情報 -->
            <div class="details-section">
              <h2 id="modal-title" class="detail-title">{{ card.title }}</h2>
              <p class="detail-description">{{ card.description }}</p>

              <div class="detail-meta">
                <div class="meta-item">
                  <span class="meta-label">レアリティ</span>
                  <span class="meta-value">{{ getRarityDisplayName(card.rarity) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">獲得日</span>
                  <span class="meta-value">{{ formatDate(card.date) }}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">状態</span>
                  <span class="meta-value">
                    {{ card.isOpened ? '開封済み' : '未開封' }}
                  </span>
                </div>
              </div>

              <!-- タイピング記録 -->
              <div v-if="card.typingStats" class="typing-section">
                <h3 class="section-title">⌨️ タイピング記録</h3>
                <div class="typing-stats">
                  <div class="typing-stat-item">
                    <div class="typing-stat-label">スコア</div>
                    <div class="typing-stat-value">{{ displayedScore }}</div>
                  </div>
                  <div class="typing-stat-item">
                    <div class="typing-stat-label">WPM</div>
                    <div class="typing-stat-value">{{ displayedWpm }}</div>
                  </div>
                  <div class="typing-stat-item">
                    <div class="typing-stat-label">前回比</div>
                    <div :class="['typing-stat-value', diffColor]">
                      {{ diffDisplay }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Minecraft成果物 -->
              <div v-if="card.minecraftData" class="minecraft-section">
                <h3 class="section-title">🧱 Minecraft成果物</h3>
                <div class="minecraft-content">
                  <MinecraftViewer
                    v-if="card.minecraftData.modelUrl"
                    :card="card"
                  />
                  <div v-else-if="card.minecraftData.screenshotUrl" class="screenshot-fallback">
                    <img
                      :src="card.minecraftData.screenshotUrl"
                      :alt="card.title"
                      class="screenshot-image"
                    />
                  </div>
                  <div v-if="card.minecraftData.makeCodeUrl" class="makecode-link">
                    <a
                      :href="card.minecraftData.makeCodeUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="makecode-button"
                    >
                      MakeCodeでみる
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  overflow-y: auto;
}

@media (min-width: 640px) {
  .modal-overlay {
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .modal-overlay {
    padding: 2rem;
  }
}

.modal-container {
  position: relative;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  max-width: 1200px;
  width: 100%;
  max-height: 95vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.1);
}

@media (min-width: 640px) {
  .modal-container {
    border-radius: 20px;
    max-height: 92vh;
  }
}

@media (min-width: 1024px) {
  .modal-container {
    border-radius: 24px;
    max-height: 90vh;
  }
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 10;
}

@media (hover: hover) and (pointer: fine) {
  .close-button:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
}

@media (min-width: 640px) {
  .modal-content {
    gap: 2rem;
    padding: 2rem;
  }
}

@media (min-width: 768px) {
  .modal-content {
    flex-direction: row;
    padding: 2.5rem;
  }
}

@media (min-width: 1024px) {
  .modal-content {
    padding: 3rem;
  }
}

.card-section {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.details-section {
  flex: 1;
  color: white;
}

.detail-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (min-width: 640px) {
  .detail-title {
    font-size: 1.75rem;
  }
}

@media (min-width: 1024px) {
  .detail-title {
    font-size: 2rem;
  }
}

.detail-description {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

.meta-value {
  font-size: 1rem;
  font-weight: 500;
  color: white;
}

.typing-section,
.minecraft-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.section-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
  color: white;
}

.typing-stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .typing-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }
}

@media (min-width: 768px) {
  .typing-stats {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .typing-stats {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
}

.typing-stat-item {
  text-align: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.typing-stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
}

.typing-stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.minecraft-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.screenshot-fallback {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
}

.screenshot-image {
  width: 100%;
  height: auto;
  display: block;
}

.makecode-link {
  text-align: center;
}

.makecode-button {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-decoration: none;
  border-radius: 25px;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

@media (hover: hover) and (pointer: fine) {
  .makecode-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  }
}

/* モーダルアニメーション */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
  opacity: 0;
}

.modal-enter-to .modal-container,
.modal-leave-from .modal-container {
  transform: scale(1);
  opacity: 1;
}

/* レスポンシブ対応 */
@media (max-width: 767.98px) {
  .modal-overlay {
    padding: 1rem;
  }

  .modal-container {
    max-height: 95vh;
  }

  .modal-content {
    padding: 1.5rem;
  }

  .detail-title {
    font-size: 1.5rem;
  }

  .typing-stats {
    grid-template-columns: 1fr;
  }
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal-container,
  .modal-leave-active .modal-container {
    transition: none;
  }
}
</style>

