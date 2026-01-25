<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CardData } from '@/types/card';
import StudentNavigation, { type DashboardSection } from './StudentNavigation.vue';
import StudentHome from './StudentHome.vue';
import GachaMachine from './GachaMachine.vue';
import CardGallery from './CardGallery.vue';
import MinecraftViewer from './MinecraftViewer.vue';
import { getStudentById } from '@/utils/mockDataHelpers';
import {
  getAllCards,
  getUnopenedCardsByStudentId,
} from '@/utils/mockDataHelpers';
import { getRarityDisplayName } from '@/utils/rarity';

interface Props {
  studentId: string; // 現在の生徒ID
}

const props = defineProps<Props>();

// 生徒データ
const student = computed(() => {
  const studentData = getStudentById(props.studentId);
  if (!studentData) {
    throw new Error(`Student with id ${props.studentId} not found`);
  }
  return studentData;
});

// 現在のセクション
const currentSection = ref<DashboardSection>('home');

// セクション変更ハンドラー
const handleSectionChange = (section: DashboardSection) => {
  currentSection.value = section;
  // セクション変更時にスクロール位置をリセット
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ガチャセクションへの移動（ホーム画面の通知バッジから）
const handleNavigateToGacha = () => {
  currentSection.value = 'gacha';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ガチャ用の未開封カード
const gachaTestCards = computed(() =>
  getUnopenedCardsByStudentId(props.studentId)
);

// 現在選択されているガチャカード
const selectedGachaCard = ref<CardData | undefined>(
  gachaTestCards.value.length > 0 ? gachaTestCards.value[0] : undefined
);

// ガチャ結果のハンドラー
const handleCardOpened = (card: CardData) => {
  console.log('カードが開封されました:', card);
  // カードが開封されたら、ギャラリーセクションに移動するオプション
  // currentSection.value = 'gallery';
};

const handleGachaComplete = (card: CardData) => {
  console.log('ガチャが完了しました:', card);
};

// MinecraftViewer用のカード（minecraftDataを持つカードから取得、最大6枚）
const minecraftCards = computed(() => {
  const allCards = getAllCards();
  return allCards
    .filter((card) => card.studentId === props.studentId && card.minecraftData && card.isOpened)
    .slice(0, 6);
});
</script>

<template>
  <div class="student-dashboard-container">
    <!-- ナビゲーション -->
    <StudentNavigation
      :current-section="currentSection"
      @section-change="handleSectionChange"
    />

    <!-- メインコンテンツ -->
    <div class="dashboard-content">
      <!-- ホームセクション -->
      <Transition name="section-fade" mode="out-in">
        <div v-if="currentSection === 'home'" key="home" class="section-content">
          <StudentHome
            :student="student"
            :on-navigate-to-gacha="handleNavigateToGacha"
          />
        </div>

        <!-- ガチャセクション -->
        <div v-else-if="currentSection === 'gacha'" key="gacha" class="section-content">
          <div class="gacha-section">
            <h2 class="section-header">🎰 ガチャマシン</h2>
            <div v-if="gachaTestCards.length > 0" class="gacha-controls">
              <div class="gacha-cards-selector">
                <button
                  v-for="card in gachaTestCards"
                  :key="card.id"
                  @click="selectedGachaCard = card"
                  :class="[
                    'gacha-select-btn',
                    selectedGachaCard?.id === card.id ? 'active' : '',
                  ]"
                >
                  {{ getRarityDisplayName(card.rarity) }}
                </button>
              </div>
            </div>
            <div class="gacha-machine-wrapper">
              <GachaMachine
                :card="selectedGachaCard"
                @card-opened="handleCardOpened"
                @gacha-complete="handleGachaComplete"
              />
            </div>
            <div class="section-hint">
              <p>💡 レバーを回してガチャを回そう！レアリティによって演出が変わるよ！</p>
              <p class="mt-2">キーボード: Enterキーでガチャ実行、Escキーで閉じる</p>
            </div>
          </div>
        </div>

        <!-- カードギャラリーセクション -->
        <div v-else-if="currentSection === 'gallery'" key="gallery" class="section-content">
          <div class="gallery-section">
            <h2 class="section-header">📚 マイデッキ</h2>
            <CardGallery :student-id="props.studentId" />
          </div>
        </div>

        <!-- Minecraftセクション -->
        <div v-else-if="currentSection === 'minecraft'" key="minecraft" class="section-content">
          <div class="minecraft-section">
            <h2 class="section-header">🎮 まいんくらふと</h2>
            <div v-if="minecraftCards.length > 0" class="minecraft-grid">
              <MinecraftViewer
                v-for="card in minecraftCards"
                :key="card.id"
                :card="card"
              />
            </div>
            <div v-else class="no-minecraft-message">
              <p>まだMinecraft作品がありません</p>
              <p class="sub-message">がんばって作品をつくろう！</p>
            </div>
            <div class="section-hint">
              <p>💡 スクロールすると3Dモデルが順番に読み込まれます。マウスでドラッグしてかいてんさせたり、ホイールでズームできるよ！</p>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.student-dashboard-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
}

/* 横画面（ランドスケープ）対応 */
@media (orientation: landscape) and (max-height: 500px) {
  .dashboard-content {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
  
  .section-header {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
}

/* 大画面（4Kなど）対応 */
@media (min-width: 1536px) {
  .dashboard-content {
    max-width: 1600px;
  }
}

.dashboard-content {
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
}

@media (min-width: 640px) {
  .dashboard-content {
    padding: 1.5rem;
  }
}

@media (min-width: 1024px) {
  .dashboard-content {
    padding: 2rem;
  }
}

.section-content {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-header {
  font-size: 1.75rem;
  font-weight: bold;
  color: white;
  text-align: center;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (min-width: 640px) {
  .section-header {
    font-size: 2rem;
    margin-bottom: 1.75rem;
  }
}

@media (min-width: 1024px) {
  .section-header {
    font-size: 2.5rem;
    margin-bottom: 2rem;
  }
}

/* ガチャセクション */
.gacha-section {
  width: 100%;
}

.gacha-controls {
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
}

.gacha-cards-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.gacha-select-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.3s ease;
}

.gacha-select-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.gacha-select-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.gacha-machine-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

.section-hint {
  margin-top: 2rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
}

/* カードギャラリーセクション */
.gallery-section {
  width: 100%;
}

/* Minecraftセクション */
.minecraft-section {
  width: 100%;
}

.minecraft-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
  justify-items: center;
}

@media (min-width: 640px) {
  .minecraft-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.75rem;
  }
}

@media (min-width: 768px) {
  .minecraft-grid {
    gap: 2rem;
  }
}

@media (min-width: 1024px) {
  .minecraft-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .minecraft-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
}

.no-minecraft-message {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.no-minecraft-message p {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.sub-message {
  font-size: 1rem;
  opacity: 0.8;
}

/* セクション切り替えアニメーション */
.section-fade-enter-active,
.section-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.section-fade-enter-from,
.section-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* レスポンシブ対応: 追加の微調整 */
@media (max-width: 639.98px) {
  .gacha-machine-wrapper {
    padding: 0 0.5rem;
  }
  
  .section-hint {
    font-size: 0.75rem;
    padding: 0 1rem;
  }
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .section-content,
  .section-fade-enter-active,
  .section-fade-leave-active {
    animation: none;
    transition: none;
  }
}
</style>

