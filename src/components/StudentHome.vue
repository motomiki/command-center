<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Student } from '@/types/student';
import type { CardData } from '@/types/card';
import SsrCard from './SsrCard.vue';
import CardDetailModal from './CardDetailModal.vue';
import {
  getCardsByStudentId,
  getUnopenedCardsByStudentId,
} from '@/utils/mockDataHelpers';
import {
  calculateMotivation,
  getLatestCards,
  getHighestRarity,
  getTypingStats,
  getMinecraftStats,
} from '@/utils/studentStats';
import { getRarityDisplayName } from '@/utils/rarity';
import { placeholders } from '@/utils/placeholder';

interface Props {
  student: Student;
  onNavigateToGacha?: () => void;
}

const props = defineProps<Props>();

// やる気値
const motivation = computed(() => calculateMotivation(props.student));

// やる気値のアニメーション
const displayedMotivation = ref(0);
onMounted(() => {
  animateMotivation();
});

const animateMotivation = () => {
  const target = motivation.value;
  const duration = 1500;
  const startTime = performance.now();

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    displayedMotivation.value = Math.floor(target * easeOutQuart);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      displayedMotivation.value = target;
    }
  };
  requestAnimationFrame(animate);
};

// やる気値に応じたメッセージと色
const motivationMessage = computed(() => {
  const value = motivation.value;
  if (value >= 80) {
    return 'とってもやるきまんまん！';
  } else if (value >= 60) {
    return 'やるきいっぱい！';
  } else if (value >= 40) {
    return 'もうすこしがんばろう！';
  } else {
    return 'きょうもがんばろう！';
  }
});

const motivationColor = computed(() => {
  const value = motivation.value;
  if (value >= 70) {
    return 'from-green-500 to-emerald-500';
  } else if (value >= 40) {
    return 'from-yellow-500 to-orange-500';
  } else {
    return 'from-red-500 to-pink-500';
  }
});

// 未開封カード
const unopenedCards = computed(() =>
  getUnopenedCardsByStudentId(props.student.id)
);

// 統計情報
const cards = computed(() => getCardsByStudentId(props.student.id));
const highestRarity = computed(() => getHighestRarity(cards.value));
const typingStats = computed(() => getTypingStats(props.student.typingHistory));
const minecraftStats = computed(() => getMinecraftStats(props.student.projects));

// 最近のカード（最新5枚）
const latestCards = computed(() => getLatestCards(props.student.id, 5));

// モーダル管理
const selectedCard = ref<CardData | null>(null);
const isModalOpen = ref(false);

const handleCardClick = (card: CardData) => {
  selectedCard.value = card;
  isModalOpen.value = true;
};

const handleCloseModal = () => {
  isModalOpen.value = false;
  selectedCard.value = null;
};

// ガチャセクションへの移動
const handleNavigateToGacha = () => {
  if (props.onNavigateToGacha) {
    props.onNavigateToGacha();
  }
};
</script>

<template>
  <div class="student-home-container">
    <!-- アバターとやる気セクション -->
    <div class="avatar-motivation-section mb-8">
      <div class="avatar-container">
        <div class="avatar-wrapper">
          <img
            :src="student.avatarUrl || placeholders.avatar('アバター')"
            :alt="student.name"
            class="avatar-image"
            loading="lazy"
          />
          <div class="avatar-glow"></div>
        </div>
        <h2 class="student-name">{{ student.name }}のダッシュボード</h2>
      </div>

      <div class="motivation-container">
        <div class="motivation-header">
          <span class="motivation-label">きょうのやるき</span>
          <span class="motivation-value">{{ displayedMotivation }}%</span>
        </div>
        <div class="motivation-bar-wrapper">
          <div
            class="motivation-bar"
            :class="`bg-gradient-to-r ${motivationColor}`"
            :style="{ width: `${displayedMotivation}%` }"
          ></div>
        </div>
        <p class="motivation-message">{{ motivationMessage }}</p>
      </div>
    </div>

    <!-- 未開封ガチャ権利の通知 -->
    <div
      v-if="unopenedCards.length > 0"
      class="gacha-notification mb-8"
      @click="handleNavigateToGacha"
    >
      <div class="notification-content">
        <div class="notification-icon">🎰</div>
        <div class="notification-text">
          <div class="notification-title">ガチャがまってるよ！</div>
          <div class="notification-count">
            あたらしいカードが{{ unopenedCards.length }}まいあるよ！
          </div>
        </div>
        <div class="notification-badge">{{ unopenedCards.length }}</div>
      </div>
    </div>

    <!-- 統計情報サマリー -->
    <div class="stats-summary-section mb-8">
      <h3 class="section-title">すうじでみるぼく・わたし</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-label">カード総数</div>
          <div class="stat-value">{{ cards.length }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-label">さいこうレアリティ</div>
          <div class="stat-value rarity-value" v-if="highestRarity">
            {{ getRarityDisplayName(highestRarity) }}
          </div>
          <div class="stat-value" v-else>-</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⌨️</div>
          <div class="stat-label">タイピングさいこうスコア</div>
          <div class="stat-value">{{ typingStats.highestScore }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🧱</div>
          <div class="stat-label">まいんくらふと作品</div>
          <div class="stat-value">{{ minecraftStats.totalProjects }}</div>
        </div>
      </div>
    </div>

    <!-- 最近のカード -->
    <div class="recent-cards-section">
      <h3 class="section-title">さいきんのカード</h3>
      <div v-if="latestCards.length > 0" class="recent-cards-grid">
        <div
          v-for="(card, index) in latestCards"
          :key="card.id"
          class="recent-card-wrapper"
          :style="{ animationDelay: `${index * 0.1}s` }"
          @click="handleCardClick(card)"
        >
          <SsrCard :card="card" />
        </div>
      </div>
      <div v-else class="no-cards-message">
        <p>まだカードがありません</p>
        <p class="sub-message">がんばってカードをあつめよう！</p>
      </div>
    </div>

    <!-- カード詳細モーダル -->
    <CardDetailModal
      v-if="selectedCard"
      :card="selectedCard"
      :is-open="isModalOpen"
      @close="handleCloseModal"
    />
  </div>
</template>

<style scoped>
.student-home-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* アバターとやる気セクション */
.avatar-motivation-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 24px;
  border: 2px solid rgba(102, 126, 234, 0.2);
}

@media (min-width: 768px) {
  .avatar-motivation-section {
    flex-direction: row;
    justify-content: space-around;
  }
}

.avatar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.avatar-wrapper {
  position: relative;
  width: 150px;
  height: 150px;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
}

.avatar-glow {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.5;
  filter: blur(20px);
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.student-name {
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-align: center;
}

.motivation-container {
  flex: 1;
  max-width: 400px;
  width: 100%;
}

.motivation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.motivation-label {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
}

.motivation-value {
  font-size: 2rem;
  font-weight: bold;
  color: white;
}

.motivation-bar-wrapper {
  width: 100%;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 0.5rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.motivation-bar {
  height: 100%;
  border-radius: 12px;
  transition: width 0.3s ease;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  animation: pulse-bar 2s ease-in-out infinite;
}

@keyframes pulse-bar {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
  }
}

.motivation-message {
  font-size: 1.125rem;
  color: white;
  text-align: center;
  font-weight: 500;
}

/* ガチャ通知 */
.gacha-notification {
  background: linear-gradient(135deg, #9333EA 0%, #EC4899 100%);
  border-radius: 20px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(147, 51, 234, 0.4);
  animation: notification-pulse 2s ease-in-out infinite;
}

.gacha-notification:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 40px rgba(147, 51, 234, 0.6);
}

@keyframes notification-pulse {
  0%, 100% {
    box-shadow: 0 10px 30px rgba(147, 51, 234, 0.4);
  }
  50% {
    box-shadow: 0 10px 40px rgba(147, 51, 234, 0.6);
  }
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.notification-icon {
  font-size: 3rem;
  animation: rotate-icon 3s linear infinite;
}

@keyframes rotate-icon {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.notification-text {
  flex: 1;
  color: white;
}

.notification-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.notification-count {
  font-size: 1rem;
  opacity: 0.9;
}

.notification-badge {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: white;
  color: #9333EA;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 統計情報サマリー */
.stats-summary-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  margin-bottom: 1.25rem;
  text-align: center;
}

@media (min-width: 640px) {
  .section-title {
    font-size: 1.75rem;
    margin-bottom: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .section-title {
    font-size: 2rem;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

@media (hover: hover) and (pointer: fine) {
  .stat-card:hover {
    transform: translateY(-4px);
    border-color: rgba(102, 126, 234, 0.5);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  }
  
  .recent-card-wrapper:hover {
    transform: scale(1.05);
  }
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.rarity-value {
  font-size: 1.5rem;
}

/* 最近のカード */
.recent-cards-section {
  margin-top: 2rem;
}

/* タブレット 1280x800 想定: 1列 → 2列 → 3列 */
.recent-cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  margin: 0 auto;
  justify-items: stretch;
}

@media (min-width: 768px) {
  .recent-cards-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .recent-cards-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }
}

/* グリッド項目に幅を渡し、SsrCard の aspect-ratio が正しく効くようにする */
.recent-card-wrapper {
  display: block;
  width: 100%;
  min-width: 0;
  opacity: 0;
  animation: cardSlideIn 0.5s ease-out forwards;
  cursor: pointer;
  transition: transform 0.3s ease;
}


@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.no-cards-message {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.no-cards-message p {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.sub-message {
  font-size: 1rem;
  opacity: 0.8;
}

/* レスポンシブ対応: 追加の微調整 */
@media (max-width: 639.98px) {
  .student-home-container {
    padding: 1rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
  
  .stat-icon {
    font-size: 2rem;
  }
  
  .notification-title {
    font-size: 1.25rem;
  }
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .avatar-glow,
  .motivation-bar,
  .gacha-notification,
  .notification-icon {
    animation: none;
  }

  .recent-card-wrapper {
    animation: none;
    opacity: 1;
  }
}
</style>

