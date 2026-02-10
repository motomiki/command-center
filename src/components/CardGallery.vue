<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { CardData, Rarity } from '@/types/card';
import SsrCard from './SsrCard.vue';
import CardDetailModal from './CardDetailModal.vue';
import { useRepository } from '@/composables/useRepository';
import {
  applyFilters,
  getCardStatistics,
  type FilterState,
} from '@/utils/cardFilters';
import { getRarityDisplayName } from '@/utils/rarity';

interface Props {
  studentId?: string; // 特定の生徒のカードのみ表示（オプション）
  initialFilters?: Partial<FilterState>; // 初期フィルタ状態（オプション）
  /** 生徒用マイデッキのとき true。開封済みのみ表示し、開封状態フィルタを非表示にする */
  studentContext?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  studentContext: false,
});

const { cards: cardsRepo } = useRepository();

// 初期フィルタ状態（管理者用は「すべて」、生徒用は「開封済みのみ」）
const defaultFilters: FilterState = {
  rarities: [],
  isOpened: null,
  type: 'all',
  searchQuery: '',
  sortBy: 'date',
  sortOrder: 'desc',
};

/** 生徒コンテキスト時は開封済みのみをデフォルトにした有効な初期値 */
const effectiveDefaultFilters = (): FilterState => ({
  ...defaultFilters,
  ...(props.studentContext ? { isOpened: true } : {}),
});

const filters = ref<FilterState>({
  ...effectiveDefaultFilters(),
  ...props.initialFilters,
});

// カードデータ（非同期取得）
const cardsData = ref<CardData[]>([]);

const loadCards = async () => {
  if (props.studentId) {
    cardsData.value = await cardsRepo.getByStudentId(props.studentId);
  } else {
    cardsData.value = await cardsRepo.getAll();
  }
};

onMounted(loadCards);
watch(() => props.studentId, loadCards);

// 生徒コンテキストが true のときは開封済みのみに強制（未開封を一覧に出さない）
watch(
  () => props.studentContext,
  (isStudent) => {
    if (isStudent && filters.value.isOpened !== true) {
      filters.value = { ...filters.value, isOpened: true };
    }
  },
  { immediate: true }
);

// カードデータの取得
const allCards = computed(() => cardsData.value);

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

// フィルタをリセット（生徒コンテキスト時は開封済みのみに戻す）
const resetFilters = () => {
  filters.value = { ...effectiveDefaultFilters() };
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

      <!-- 開封状態フィルタ（生徒用マイデッキでは非表示・開封済みのみ固定） -->
      <div v-if="!studentContext" class="filter-group mb-4">
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
.card-gallery-outer {
  position: relative;
  min-height: 100vh;
}

/* 画面全体に固定表示する水玉模様（ビューポート全体に表示） */
.dot-bg-fullscreen {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.2;
  background-image:
    radial-gradient(#3B82F6 2px, transparent 2px),
    radial-gradient(#F59E0B 2px, transparent 2px);
  background-size: 30px 30px;
  background-position: 0 0, 15px 15px;
}

.card-gallery-container {
  position: relative;
  z-index: 0;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* 統計情報セクション（ライトテーマ） */
.statistics-section {
  background: #ffffff;
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08);
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-card {
  background: #f8fafc;
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #1e293b;
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
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}

.rarity-stat-badge[data-rarity="UR"] {
  background: #f3e8ff;
  border-color: #e9d5ff;
}

.rarity-stat-badge[data-rarity="SR"] {
  background: #ffedd5;
  border-color: #fed7aa;
}

.rarity-stat-badge[data-rarity="RR"] {
  background: #dbeafe;
  border-color: #bfdbfe;
}

.rarity-stat-badge[data-rarity="R"] {
  background: #dcfce7;
  border-color: #bbf7d0;
}

.rarity-stat-badge[data-rarity="U"] {
  background: #fef9c3;
  border-color: #fde047;
}

.rarity-stat-badge[data-rarity="C"] {
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.rarity-stat-label {
  color: #475569;
  font-weight: 500;
}

.rarity-stat-value {
  color: #1e293b;
  font-weight: bold;
  font-size: 1rem;
}

/* フィルタセクション（ライトテーマ） */
.filters-section {
  background: #ffffff;
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08);
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
  background: #f8fafc;
  border: 2px solid #cbd5e1;
  border-radius: 50px;
  color: #1e293b;
  outline: none;
  transition: all 0.3s ease;
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-input:focus {
  border-color: #6366f1;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.search-clear-btn {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: #e2e8f0;
  border: none;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.search-clear-btn:hover {
  background: #cbd5e1;
  transform: translateY(-50%) scale(1.1);
}

.filter-group {
  margin-bottom: 1.5rem;
}

.filter-label {
  font-size: 0.875rem;
  color: #64748b;
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
  border: 2px solid #e2e8f0;
  background: #f1f5f9;
  color: #334155;
  cursor: pointer;
  transition: all 0.3s ease;
}

.rarity-filter-btn:hover,
.type-filter-btn:hover {
  background: #e2e8f0;
  transform: translateY(-2px);
}

.rarity-filter-btn.active,
.type-filter-btn.active {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.rarity-filter-btn.clear-btn {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.rarity-filter-btn.clear-btn:hover {
  background: #fee2e2;
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

.rarity-filter-btn[data-rarity="U"].active {
  background: linear-gradient(135deg, #eab308 0%, #facc15 100%);
  border-color: #eab308;
}

.rarity-filter-btn[data-rarity="C"].active {
  background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
  border-color: #6b7280;
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
  border: 2px solid #e2e8f0;
  background: #f1f5f9;
  color: #334155;
  cursor: pointer;
  transition: all 0.3s ease;
}

@media (hover: hover) and (pointer: fine) {
  .toggle-btn:hover {
    background: #e2e8f0;
    transform: translateY(-2px);
  }
  
  .sort-order-btn:hover {
    background: #e2e8f0;
    transform: scale(1.1);
  }
  
  .reset-btn:hover {
    background: #fee2e2;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  }
  
  .card-clickable:hover {
    transform: scale(1.02);
  }
}

.toggle-btn.active {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
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
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  color: #1e293b;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.sort-select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.sort-order-btn {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  background: #f1f5f9;
  border: 2px solid #e2e8f0;
  color: #475569;
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
  background: #fef2f2;
  border: 2px solid #fecaca;
  color: #b91c1c;
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
  grid-auto-rows: minmax(0, auto);
  gap: 1.5rem;
  justify-items: center;
  align-items: start;
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

/* タブレット 1280x800 想定: 1024px〜で3列 */
@media (min-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
    justify-items: stretch;
  }
}

/* 大画面で4列 */
@media (min-width: 1536px) {
  .cards-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
}

/* グリッド項目を明示的にブロック化し、カードが潰れないようにする */
.card-wrapper {
  display: block;
  width: 100%;
  min-width: 0;
  opacity: 0;
  animation: cardFadeIn 0.5s ease-out forwards;
}

.card-clickable {
  display: block;
  width: 100%;
  min-width: 0;
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

/* 空状態（ライトテーマ） */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #475569;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.6;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1e293b;
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
  background: #6366f1;
  border: none;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.empty-reset-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
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

