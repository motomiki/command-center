<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CardData, Rarity } from '@/types/card';
import SsrCard from './SsrCard.vue';
import CardDetailModal from './CardDetailModal.vue';
import {
  getAllCards,
  getCardsByStudentId,
} from '@/utils/mockDataHelpers';
import {
  applyFilters,
  getCardStatistics,
  type FilterState,
} from '@/utils/cardFilters';
import { getRarityDisplayName } from '@/utils/rarity';

interface Props {
  studentId?: string; // 特定の生徒のカードのみ表示（オプション）
  initialFilters?: Partial<FilterState>; // 初期フィルタ状態（オプション）
}

const props = defineProps<Props>();

// 初期フィルタ状態
const defaultFilters: FilterState = {
  rarities: [],
  isOpened: null,
  type: 'all',
  searchQuery: '',
  sortBy: 'date',
  sortOrder: 'desc',
};

const filters = ref<FilterState>({
  ...defaultFilters,
  ...props.initialFilters,
});

// カードデータの取得
const allCards = computed(() => {
  if (props.studentId) {
    return getCardsByStudentId(props.studentId);
  }
  return getAllCards();
});

// フィルタリング・ソートされたカード
const filteredCards = computed(() => {
  return applyFilters(allCards.value, filters.value);
});

// 統計情報
const statistics = computed(() => {
  return getCardStatistics(allCards.value);
});

// モーダル管理
const selectedCard = ref<CardData | null>(null);
const isModalOpen = ref(false);

// カードをクリックした時の処理
const handleCardClick = (card: CardData) => {
  selectedCard.value = card;
  isModalOpen.value = true;
};

// モーダルを閉じる
const handleCloseModal = () => {
  isModalOpen.value = false;
  selectedCard.value = null;
};

// レアリティフィルタの切り替え
const toggleRarityFilter = (rarity: Rarity) => {
  const index = filters.value.rarities.indexOf(rarity);
  if (index === -1) {
    filters.value.rarities.push(rarity);
  } else {
    filters.value.rarities.splice(index, 1);
  }
};

// すべてのレアリティフィルタをクリア
const clearRarityFilters = () => {
  filters.value.rarities = [];
};

// フィルタをリセット
const resetFilters = () => {
  filters.value = { ...defaultFilters };
};

// すべてのレアリティ
const allRarities: Rarity[] = ['UR', 'SR', 'RR', 'R', 'U', 'C'];

// キーボード操作（Escキーでモーダルを閉じる）
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isModalOpen.value) {
    handleCloseModal();
  }
};

// キーボードイベントのリスナーを追加
import { onMounted, onUnmounted } from 'vue';
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="card-gallery-container">
    <!-- 統計情報セクション -->
    <div class="statistics-section mb-8">
      <div class="statistics-grid">
        <div class="stat-card">
          <div class="stat-label">カード総数</div>
          <div class="stat-value">{{ statistics.total }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">開封済み</div>
          <div class="stat-value">{{ statistics.opened }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">未開封</div>
          <div class="stat-value">{{ statistics.unopened }}</div>
        </div>
      </div>
      <div class="rarity-stats mt-4">
        <div
          v-for="rarity in allRarities"
          :key="rarity"
          class="rarity-stat-badge"
          :data-rarity="rarity"
        >
          <span class="rarity-stat-label">{{ getRarityDisplayName(rarity) }}</span>
          <span class="rarity-stat-value">{{ statistics.byRarity[rarity] }}</span>
        </div>
      </div>
    </div>

    <!-- フィルタ・ソートセクション -->
    <div class="filters-section mb-8">
      <!-- 検索バー -->
      <div class="search-bar mb-6">
        <div class="search-input-wrapper">
          <input
            v-model="filters.searchQuery"
            type="text"
            placeholder="カードをさがす（タイトルや説明）"
            class="search-input"
            aria-label="カード検索"
          />
          <button
            v-if="filters.searchQuery"
            @click="filters.searchQuery = ''"
            class="search-clear-btn"
            aria-label="検索をクリア"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- レアリティフィルタ -->
      <div class="filter-group mb-4">
        <div class="filter-label">レアリティ</div>
        <div class="rarity-filter-buttons">
          <button
            v-for="rarity in allRarities"
            :key="rarity"
            @click="toggleRarityFilter(rarity)"
            :class="[
              'rarity-filter-btn',
              filters.rarities.includes(rarity) ? 'active' : '',
            ]"
            :data-rarity="rarity"
            :aria-pressed="filters.rarities.includes(rarity)"
          >
            {{ getRarityDisplayName(rarity) }}
          </button>
          <button
            v-if="filters.rarities.length > 0"
            @click="clearRarityFilters"
            class="rarity-filter-btn clear-btn"
            aria-label="レアリティフィルタをクリア"
          >
            すべて
          </button>
        </div>
      </div>

      <!-- 開封状態フィルタ -->
      <div class="filter-group mb-4">
        <div class="filter-label">開封状態</div>
        <div class="toggle-buttons">
          <button
            @click="filters.isOpened = null"
            :class="['toggle-btn', filters.isOpened === null ? 'active' : '']"
            :aria-pressed="filters.isOpened === null ? 'true' : 'false'"
          >
            すべて
          </button>
          <button
            @click="filters.isOpened = true"
            :class="['toggle-btn', filters.isOpened === true ? 'active' : '']"
            :aria-pressed="filters.isOpened === true ? 'true' : 'false'"
          >
            開封済み
          </button>
          <button
            @click="filters.isOpened = false"
            :class="['toggle-btn', filters.isOpened === false ? 'active' : '']"
            :aria-pressed="filters.isOpened === false ? 'true' : 'false'"
          >
            未開封
          </button>
        </div>
      </div>

      <!-- タイプフィルタ -->
      <div class="filter-group mb-4">
        <div class="filter-label">カードタイプ</div>
        <div class="type-filter-buttons">
          <button
            @click="filters.type = 'all'"
            :class="['type-filter-btn', filters.type === 'all' ? 'active' : '']"
            :aria-pressed="filters.type === 'all' ? 'true' : 'false'"
          >
            すべて
          </button>
          <button
            @click="filters.type = 'typing'"
            :class="['type-filter-btn', filters.type === 'typing' ? 'active' : '']"
            :aria-pressed="filters.type === 'typing' ? 'true' : 'false'"
          >
            ⌨️ タイピング
          </button>
          <button
            @click="filters.type = 'minecraft'"
            :class="['type-filter-btn', filters.type === 'minecraft' ? 'active' : '']"
            :aria-pressed="filters.type === 'minecraft' ? 'true' : 'false'"
          >
            🧱 Minecraft
          </button>
          <button
            @click="filters.type = 'both'"
            :class="['type-filter-btn', filters.type === 'both' ? 'active' : '']"
            :aria-pressed="filters.type === 'both' ? 'true' : 'false'"
          >
            ⌨️🧱 両方
          </button>
          <button
            @click="filters.type = 'none'"
            :class="['type-filter-btn', filters.type === 'none' ? 'active' : '']"
            :aria-pressed="filters.type === 'none' ? 'true' : 'false'"
          >
            なし
          </button>
        </div>
      </div>

      <!-- ソート -->
      <div class="filter-group mb-4">
        <div class="filter-label">ならびかえ</div>
        <div class="sort-controls">
          <select
            v-model="filters.sortBy"
            class="sort-select"
            aria-label="ソート基準"
          >
            <option value="date">日付</option>
            <option value="rarity">レアリティ</option>
            <option value="title">タイトル</option>
          </select>
          <button
            @click="filters.sortOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc'"
            class="sort-order-btn"
            :aria-label="filters.sortOrder === 'asc' ? '昇順' : '降順'"
          >
            {{ filters.sortOrder === 'asc' ? '↑' : '↓' }}
          </button>
        </div>
      </div>

      <!-- フィルタリセット -->
      <div class="filter-reset">
        <button @click="resetFilters" class="reset-btn" aria-label="フィルタをリセット">
          フィルタをリセット
        </button>
      </div>
    </div>

    <!-- カードグリッド -->
    <div class="cards-section">
      <div
        v-if="filteredCards.length > 0"
        class="cards-grid"
        role="list"
        aria-label="カード一覧"
      >
        <div
          v-for="(card, index) in filteredCards"
          :key="card.id"
          class="card-wrapper"
          :style="{ animationDelay: `${index * 0.05}s` }"
          role="listitem"
        >
          <div @click="handleCardClick(card)" class="card-clickable">
            <SsrCard :card="card" />
          </div>
        </div>
      </div>

      <!-- 空状態 -->
      <div v-else class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-title">カードが見つかりませんでした</div>
        <div class="empty-message">
          フィルタをかえてもういちどさがしてみてね！
        </div>
        <button @click="resetFilters" class="empty-reset-btn">
          フィルタをリセット
        </button>
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
.card-gallery-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* 統計情報セクション */
.statistics-section {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 20px;
  padding: 2rem;
  border: 2px solid rgba(102, 126, 234, 0.2);
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
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

.rarity-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.rarity-stat-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.rarity-stat-badge[data-rarity="UR"] {
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
  border-color: rgba(147, 51, 234, 0.3);
}

.rarity-stat-badge[data-rarity="SR"] {
  background: linear-gradient(135deg, rgba(255, 140, 0, 0.2) 0%, rgba(255, 165, 0, 0.2) 100%);
  border-color: rgba(255, 140, 0, 0.3);
}

.rarity-stat-badge[data-rarity="RR"] {
  background: linear-gradient(135deg, rgba(0, 102, 255, 0.2) 0%, rgba(0, 150, 255, 0.2) 100%);
  border-color: rgba(0, 102, 255, 0.3);
}

.rarity-stat-badge[data-rarity="R"] {
  background: linear-gradient(135deg, rgba(0, 170, 0, 0.2) 0%, rgba(0, 200, 0, 0.2) 100%);
  border-color: rgba(0, 170, 0, 0.3);
}

.rarity-stat-badge[data-rarity="U"] {
  background: rgba(128, 128, 128, 0.1);
  border-color: rgba(128, 128, 128, 0.2);
}

.rarity-stat-badge[data-rarity="C"] {
  background: rgba(160, 160, 160, 0.1);
  border-color: rgba(160, 160, 160, 0.2);
}

.rarity-stat-label {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.rarity-stat-value {
  color: white;
  font-weight: bold;
  font-size: 1rem;
}

/* フィルタセクション */
.filters-section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.search-bar {
  width: 100%;
}

.search-input-wrapper {
  position: relative;
  max-width: 500px;
  margin: 0 auto;
}

.search-input {
  width: 100%;
  padding: 1rem 3rem 1rem 1.5rem;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50px;
  color: white;
  outline: none;
  transition: all 0.3s ease;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-input:focus {
  border-color: #667eea;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
}

.search-clear-btn {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.search-clear-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-50%) scale(1.1);
}

.filter-group {
  margin-bottom: 1.5rem;
}

.filter-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.rarity-filter-buttons,
.type-filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.rarity-filter-btn,
.type-filter-btn {
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.3s ease;
}

.rarity-filter-btn:hover,
.type-filter-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.rarity-filter-btn.active,
.type-filter-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.rarity-filter-btn.clear-btn {
  background: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.4);
}

.rarity-filter-btn.clear-btn:hover {
  background: rgba(255, 107, 107, 0.3);
}

.rarity-filter-btn[data-rarity="UR"].active {
  background: linear-gradient(135deg, #9333EA 0%, #EC4899 100%);
  border-color: #9333EA;
}

.rarity-filter-btn[data-rarity="SR"].active {
  background: linear-gradient(135deg, #FF8C00 0%, #FFA500 100%);
  border-color: #FF8C00;
}

.rarity-filter-btn[data-rarity="RR"].active {
  background: linear-gradient(135deg, #0066FF 0%, #0096FF 100%);
  border-color: #0066FF;
}

.rarity-filter-btn[data-rarity="R"].active {
  background: linear-gradient(135deg, #00AA00 0%, #00C800 100%);
  border-color: #00AA00;
}

.toggle-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.toggle-btn {
  padding: 0.5rem 1.5rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.3s ease;
}

@media (hover: hover) and (pointer: fine) {
  .toggle-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
  
  .sort-order-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
  
  .reset-btn:hover {
    background: rgba(255, 107, 107, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  }
  
  .card-clickable:hover {
    transform: scale(1.02);
  }
}

.toggle-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.sort-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.sort-select {
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.sort-select:focus {
  border-color: #667eea;
  box-shadow: 0 0 10px rgba(102, 126, 234, 0.3);
}

.sort-order-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}


.filter-reset {
  margin-top: 1.5rem;
  text-align: center;
}

.reset-btn {
  padding: 0.75rem 2rem;
  border-radius: 25px;
  font-size: 0.875rem;
  font-weight: 500;
  background: rgba(255, 107, 107, 0.2);
  border: 2px solid rgba(255, 107, 107, 0.4);
  color: rgba(255, 107, 107, 1);
  cursor: pointer;
  transition: all 0.3s ease;
}


/* カードグリッド */
.cards-section {
  margin-top: 2rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  justify-items: center;
}

@media (min-width: 640px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.75rem;
  }
}

@media (min-width: 768px) {
  .cards-grid {
    gap: 2rem;
  }
}

@media (min-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

.card-wrapper {
  opacity: 0;
  animation: cardFadeIn 0.5s ease-out forwards;
}

.card-clickable {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.card-clickable:hover {
  transform: scale(1.05);
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 空状態 */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: rgba(255, 255, 255, 0.7);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  margin-bottom: 0.5rem;
}

.empty-message {
  font-size: 1rem;
  margin-bottom: 2rem;
}

.empty-reset-btn {
  padding: 0.75rem 2rem;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: 500;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.empty-reset-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

/* レスポンシブ対応: 追加の微調整 */
@media (max-width: 639.98px) {
  .card-gallery-container {
    padding: 1rem;
  }

  .statistics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .rarity-filter-buttons,
  .type-filter-buttons,
  .toggle-buttons {
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .sort-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .card-wrapper {
    animation: none;
    opacity: 1;
  }

  .card-clickable:hover {
    transform: none;
  }
}
</style>

