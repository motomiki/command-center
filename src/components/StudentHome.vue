<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Student } from '@/types/student';
import type { CardData } from '@/types/card';
import SsrCard from './SsrCard.vue';
import CardDetailModal from './CardDetailModal.vue';
import { useRepository } from '@/composables/useRepository';
import {
  calculateMotivation,
  getLatestCards,
  getHighestRarity,
  getTypingStats,
} from '@/utils/studentStats';
import { getRarityDisplayName } from '@/utils/rarity';
import { placeholders } from '@/utils/placeholder';

interface Props {
  student: Student;
  onNavigateToGacha?: () => void;
}

const props = defineProps<Props>();
const { cards: cardsRepo } = useRepository();

// ---------------------------------------------------------------------------
// カードデータ（非同期取得）
// ---------------------------------------------------------------------------
const cardsData = ref<CardData[]>([]);

const loadCards = async () => {
  cardsData.value = await cardsRepo.getByStudentId(props.student.id);
};

onMounted(() => {
  loadCards();
  animateMotivation();
});

watch(() => props.student.id, loadCards);

// ---------------------------------------------------------------------------
// やる気値
// ---------------------------------------------------------------------------
const motivation = computed(() => calculateMotivation(props.student, cardsData.value));

// やる気値のアニメーション
const displayedMotivation = ref(0);
/** 表示用（小数点以下なし・子供向け） */
const displayedMotivationRounded = computed(() =>
  Math.round(displayedMotivation.value)
);

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
      displayedMotivation.value = Math.round(target);
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
  if (value >= 40) {
    return 'from-yellow-400 to-orange-500';
  }
  return 'from-red-500 to-pink-500';
});

// ---------------------------------------------------------------------------
// カード派生データ
// ---------------------------------------------------------------------------

// 開封済みカードのみ（ホーム・統計では「獲得したカード」＝ガチャで開封したもののみ表示）
const openedCards = computed(() =>
  cardsData.value.filter((c) => c.isOpened)
);

// 未開封カード（ガチャ通知・バッジ用）
const unopenedCards = computed(() =>
  cardsData.value.filter((c) => !c.isOpened)
);

// 統計情報（開封済みのみで算出）
const highestRarity = computed(() => getHighestRarity(openedCards.value));
const typingStats = computed(() => getTypingStats(props.student.typingHistory));
// まいんくらふと作品数はマインクラフトタブと同じソース（開封済みかつ minecraftData ありのカード）で統一
const minecraftStats = computed(() => {
  const minecraftCards = cardsData.value.filter(
    (card) => card.minecraftData && card.isOpened
  );
  return {
    totalProjects: minecraftCards.length,
    latestProject: null,
    projectsByMonth: {} as Record<string, number>,
  };
});

// 最近のカード（開封済みのみ・最新6枚）
const latestCards = computed(() => getLatestCards(openedCards.value, 6));

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
    <!-- アバターとやる気セクション（参照: 白カード + ぼかし円 + スレート文字） -->
    <section class="avatar-motivation-section relative bg-white dark:bg-card-dark rounded-3xl p-8 shadow-soft dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden mb-8">
      <div class="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-3xl opacity-50" aria-hidden="true"></div>
      <div class="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-100 dark:bg-purple-900/30 rounded-full blur-3xl opacity-50" aria-hidden="true"></div>
      <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div class="flex flex-col items-center text-center">
          <div class="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 p-1 avatar-pulse">
            <div class="w-full h-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border-4 border-white dark:border-slate-800">
              <img
                :src="student.avatarUrl || placeholders.avatar('アバター')"
                :alt="student.name"
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div class="absolute bottom-0 right-0 bg-accent text-white w-10 h-10 flex items-center justify-center rounded-full border-4 border-white dark:border-slate-800 font-bold shadow-lg">
              {{ openedCards.length }}
            </div>
          </div>
          <h2 class="mt-4 text-2xl font-black tracking-tight text-slate-800 dark:text-white">{{ student.name }}のダッシュボード</h2>
          <span class="text-slate-500 dark:text-slate-400 text-sm font-bold">勇者レベル</span>
        </div>
        <div class="flex-1 w-full md:max-w-xl">
          <div class="flex justify-between items-end mb-2">
            <span class="font-bold text-slate-600 dark:text-slate-300">きょうのやるき</span>
            <span class="text-4xl font-black text-primary drop-shadow-sm">{{ displayedMotivationRounded }}%</span>
          </div>
          <div class="w-full h-6 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner p-1">
            <div
              class="h-full rounded-full relative overflow-hidden motivation-bar-inner"
              :class="`bg-gradient-to-r ${motivationColor}`"
              :style="{ width: `${displayedMotivation}%` }"
            >
              <div class="motivation-bar-shine-el" aria-hidden="true"></div>
            </div>
          </div>
          <div class="mt-3 text-center">
            <span class="inline-block px-4 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-bold border border-yellow-200 dark:border-yellow-800">
              ✨ {{ motivationMessage }} ✨
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 未開封ガチャ権利の通知（参照: CTA バナー風） -->
    <section
      v-if="unopenedCards.length > 0"
      class="gacha-cta-banner relative rounded-3xl overflow-hidden shadow-2xl cursor-pointer mb-8 mt-12"
      @click="handleNavigateToGacha"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-indigo-700 to-purple-800" aria-hidden="true"></div>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-20">
        <h3 class="text-3xl md:text-4xl font-black text-white drop-shadow-md mb-2">
          ガチャがまってるよ！
        </h3>
        <p class="text-indigo-100 text-base md:text-lg font-bold mb-6 max-w-2xl">
          あたらしいカードが{{ unopenedCards.length }}まいあるよ！
        </p>
        <span class="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black py-3 px-6 rounded-full shadow-lg hover:shadow-glow-gold hover:scale-105 transition-all duration-300">
          冒険へ出発！
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </section>

    <!-- 統計情報サマリー（参照: 中央見出し+横線、白カード・下ボーダー色） -->
    <section class="stats-summary-section mb-8">
      <div class="flex items-center justify-center mb-8 relative">
        <h3 class="section-title-with-line text-3xl font-black text-slate-800 dark:text-white relative z-10 px-4 bg-background-light dark:bg-background-dark">
          すうじでみるぼく・わたし
        </h3>
        <div class="absolute w-full h-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent top-1/2" aria-hidden="true"></div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div class="stat-card-ref bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border-b-4 border-cyan-500 hover:-translate-y-1 transition-transform duration-300">
          <div class="flex flex-col items-center">
            <div class="w-14 h-14 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-500 rounded-2xl flex items-center justify-center mb-3 text-2xl" aria-hidden="true">📚</div>
            <span class="text-sm font-bold text-slate-400">カード総数</span>
            <span class="text-3xl font-black text-slate-800 dark:text-white mt-1">{{ openedCards.length }}</span>
          </div>
        </div>
        <div class="stat-card-ref bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border-b-4 border-accent hover:-translate-y-1 transition-transform duration-300">
          <div class="flex flex-col items-center">
            <div class="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/30 text-accent rounded-2xl flex items-center justify-center mb-3 text-2xl" aria-hidden="true">⭐</div>
            <span class="text-sm font-bold text-slate-400">さいこうレアリティ</span>
            <span class="text-xl font-black text-primary mt-1" v-if="highestRarity">{{ getRarityDisplayName(highestRarity) }}</span>
            <span class="text-3xl font-black text-slate-800 dark:text-white mt-1" v-else>-</span>
          </div>
        </div>
        <div class="stat-card-ref bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border-b-4 border-purple-500 hover:-translate-y-1 transition-transform duration-300">
          <div class="flex flex-col items-center">
            <div class="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 text-purple-500 rounded-2xl flex items-center justify-center mb-3 text-2xl" aria-hidden="true">⌨️</div>
            <span class="text-sm font-bold text-slate-400">タイピングさいこうスコア</span>
            <span class="text-3xl font-black text-slate-800 dark:text-white mt-1">{{ typingStats.highestScore }}</span>
          </div>
        </div>
        <div class="stat-card-ref bg-white dark:bg-card-dark p-6 rounded-2xl shadow-sm border-b-4 border-orange-500 hover:-translate-y-1 transition-transform duration-300">
          <div class="flex flex-col items-center">
            <div class="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 text-orange-500 rounded-2xl flex items-center justify-center mb-3 text-2xl" aria-hidden="true">🧱</div>
            <span class="text-sm font-bold text-slate-400">まいんくらふと作品</span>
            <span class="text-3xl font-black text-slate-800 dark:text-white mt-1">{{ minecraftStats.totalProjects }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 最近のカード（参照: 中央見出し＋キラキラアイコン） -->
    <div class="recent-cards-section">
      <div class="flex items-center justify-center mb-10 relative">
        <h3 class="text-3xl font-black text-slate-800 dark:text-white relative z-10 px-4 bg-background-light dark:bg-background-dark flex items-center gap-2">
          <span class="text-accent" aria-hidden="true">✨</span>
          さいきんのカード
          <span class="text-accent" aria-hidden="true">✨</span>
        </h3>
      </div>
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
      <div v-else class="no-cards-message text-slate-600 dark:text-slate-300">
        <p class="font-bold">まだカードがありません</p>
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
/* 参照デザイン用 keyframes */
@keyframes pulse-border {
  0% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(99, 102, 241, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
  }
}

@keyframes shine {
  0% {
    left: -100%;
  }
  20% {
    left: 200%;
  }
  100% {
    left: 200%;
  }
}

.avatar-pulse {
  animation: pulse-border 2s infinite;
}

.motivation-bar-shine {
  animation: shine 2s infinite;
}

.motivation-bar-inner {
  position: relative;
  transition: width 0.3s ease;
}

.motivation-bar-shine-el {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: skewX(-25deg);
  animation: shine 2s infinite;
}

.student-home-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding-top: 2rem;
  padding-bottom: 2rem;
}

/* 統計情報サマリー */
.stats-summary-section {
  margin-bottom: 2rem;
}

/* 最近のカード */
.recent-cards-section {
  margin-top: 2rem;
}

@media (hover: hover) and (pointer: fine) {
  .recent-card-wrapper:hover {
    transform: scale(1.05);
  }
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
}

.no-cards-message p {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.no-cards-message .sub-message {
  font-size: 1rem;
  opacity: 0.9;
}

/* レスポンシブ対応: 小画面でパディング縮小 */
@media (max-width: 639.98px) {
  .student-home-container {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .avatar-glow,
  .avatar-pulse,
  .motivation-bar,
  .motivation-bar-shine,
  .motivation-bar-shine-el {
    animation: none;
  }

  .recent-card-wrapper {
    animation: none;
    opacity: 1;
  }
}
</style>

