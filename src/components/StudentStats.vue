<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Student } from '@/types/student';
import type { CardData, Rarity } from '@/types/card';
import { useRepository } from '@/composables/useRepository';
import { getCardStatistics } from '@/utils/cardFilters';
import { getTypingStats, getMinecraftStats } from '@/utils/studentStats';
import { getRarityDisplayName } from '@/utils/rarity';

interface Props {
  student: Student;
}

const props = defineProps<Props>();
const { cards: cardsRepo } = useRepository();

// カードデータ（非同期取得）
const cardsData = ref<CardData[]>([]);

const loadCards = async () => {
  cardsData.value = await cardsRepo.getByStudentId(props.student.id);
};

onMounted(loadCards);
watch(() => props.student.id, loadCards);

// カード統計
const cardStats = computed(() => getCardStatistics(cardsData.value));

// タイピング統計
const typingStats = computed(() => getTypingStats(props.student.typingHistory));

// Minecraft統計
const minecraftStats = computed(() => getMinecraftStats(props.student.projects));

// すべてのレアリティ
const allRarities: Rarity[] = ['UR', 'SR', 'RR', 'R', 'U', 'C'];

// タイピング記録のグラフ用データ（最近10件）
const recentTypingData = computed(() => {
  return props.student.typingHistory
    .slice(-10)
    .map((record) => ({
      date: record.date,
      score: record.score,
      wpm: record.wpm,
    }));
});

// 最大スコア（グラフのスケール用）
const maxScore = computed(() => {
  if (recentTypingData.value.length === 0) return 100;
  return Math.max(...recentTypingData.value.map((d) => d.score), 100);
});
</script>

<template>
  <div class="student-stats-container">
    <!-- カード統計 -->
    <div class="stats-section">
      <h3 class="section-title">📚 カード統計</h3>
      <div class="card-stats-grid">
        <div class="stat-card total">
          <div class="stat-label">カード総数</div>
          <div class="stat-value">{{ cardStats.total }}</div>
        </div>
        <div class="stat-card opened">
          <div class="stat-label">開封済み</div>
          <div class="stat-value">{{ cardStats.opened }}</div>
        </div>
        <div class="stat-card unopened">
          <div class="stat-label">未開封</div>
          <div class="stat-value">{{ cardStats.unopened }}</div>
        </div>
      </div>

      <div class="rarity-breakdown">
        <h4 class="subsection-title">レアリティ別</h4>
        <div class="rarity-list">
          <div
            v-for="rarity in allRarities"
            :key="rarity"
            class="rarity-item"
            :data-rarity="rarity"
          >
            <span class="rarity-name">{{ getRarityDisplayName(rarity) }}</span>
            <div class="rarity-bar-wrapper">
              <div
                class="rarity-bar"
                :style="{
                  width: `${
                    cardStats.total > 0
                      ? (cardStats.byRarity[rarity] / cardStats.total) * 100
                      : 0
                  }%`,
                }"
              ></div>
            </div>
            <span class="rarity-count">{{ cardStats.byRarity[rarity] }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- タイピング統計 -->
    <div v-if="typingStats.totalRecords > 0" class="stats-section">
      <h3 class="section-title">⌨️ タイピング統計</h3>
      <div class="typing-stats-grid">
        <div class="stat-card">
          <div class="stat-label">さいこうスコア</div>
          <div class="stat-value">{{ typingStats.highestScore }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">へいきんWPM</div>
          <div class="stat-value">{{ typingStats.averageWpm }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">記録数</div>
          <div class="stat-value">{{ typingStats.totalRecords }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">ぜんかいひ</div>
          <div
            :class="[
              'stat-value',
              typingStats.improvement > 0
                ? 'positive'
                : typingStats.improvement < 0
                  ? 'negative'
                  : 'neutral',
            ]"
          >
            {{ typingStats.improvement > 0 ? '+' : '' }}{{ typingStats.improvement }}
          </div>
        </div>
      </div>

      <!-- スコア推移グラフ -->
      <div v-if="recentTypingData.length > 0" class="score-chart">
        <h4 class="subsection-title">さいきんのスコア</h4>
        <div class="chart-container">
          <div class="chart-bars">
            <div
              v-for="(data, index) in recentTypingData"
              :key="index"
              class="chart-bar-wrapper"
            >
              <div
                class="chart-bar"
                :style="{
                  height: `${(data.score / maxScore) * 100}%`,
                }"
                :title="`${data.date}: ${data.score}`"
              ></div>
              <div class="chart-label">{{ data.score }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Minecraft統計 -->
    <div v-if="minecraftStats.totalProjects > 0" class="stats-section">
      <h3 class="section-title">🧱 Minecraft統計</h3>
      <div class="minecraft-stats-grid">
        <div class="stat-card">
          <div class="stat-label">作品総数</div>
          <div class="stat-value">{{ minecraftStats.totalProjects }}</div>
        </div>
        <div v-if="minecraftStats.latestProject" class="stat-card latest">
          <div class="stat-label">さいしんの作品</div>
          <div class="stat-value project-title">
            {{ minecraftStats.latestProject.title }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.student-stats-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.stats-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.section-title {
  font-size: 1.75rem;
  font-weight: bold;
  color: white;
  margin-bottom: 1.5rem;
  text-align: center;
}

.subsection-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1rem;
  margin-top: 2rem;
}

/* カード統計 */
.card-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (min-width: 640px) {
  .card-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .card-stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1024px) {
  .card-stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

@media (hover: hover) and (pointer: fine) {
  .stat-card:hover {
    transform: translateY(-4px);
    border-color: rgba(102, 126, 234, 0.5);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  }
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

.stat-value.positive {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-value.negative {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-value.neutral {
  color: rgba(255, 255, 255, 0.7);
  background: none;
  -webkit-text-fill-color: rgba(255, 255, 255, 0.7);
}

.stat-value.project-title {
  font-size: 1.25rem;
  word-break: break-word;
}

/* レアリティ別表示 */
.rarity-breakdown {
  margin-top: 2rem;
}

.rarity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rarity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.rarity-name {
  min-width: 120px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

.rarity-bar-wrapper {
  flex: 1;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.rarity-bar {
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s ease;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.rarity-item[data-rarity="UR"] .rarity-bar {
  background: linear-gradient(90deg, #9333EA 0%, #EC4899 100%);
}

.rarity-item[data-rarity="SR"] .rarity-bar {
  background: linear-gradient(90deg, #FF8C00 0%, #FFA500 100%);
}

.rarity-item[data-rarity="RR"] .rarity-bar {
  background: linear-gradient(90deg, #0066FF 0%, #0096FF 100%);
}

.rarity-item[data-rarity="R"] .rarity-bar {
  background: linear-gradient(90deg, #00AA00 0%, #00C800 100%);
}

.rarity-item[data-rarity="U"] .rarity-bar {
  background: linear-gradient(90deg, #eab308 0%, #facc15 100%);
}

.rarity-item[data-rarity="C"] .rarity-bar {
  background: linear-gradient(90deg, #6b7280 0%, #9ca3af 100%);
}

.rarity-count {
  min-width: 40px;
  text-align: right;
  font-size: 0.875rem;
  font-weight: bold;
  color: white;
}

/* タイピング統計 */
.typing-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

/* スコア推移グラフ */
.score-chart {
  margin-top: 2rem;
}

.chart-container {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 0.5rem;
  height: 200px;
  padding: 1rem 0;
}

.chart-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  height: 100%;
}

.chart-bar {
  width: 100%;
  min-height: 4px;
  background: linear-gradient(to top, #667eea 0%, #764ba2 100%);
  border-radius: 4px 4px 0 0;
  transition: all 0.3s ease;
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .chart-bar:hover {
    opacity: 0.8;
    transform: scaleY(1.05);
  }
}

.chart-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
}

/* Minecraft統計 */
.minecraft-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

@media (min-width: 640px) {
  .minecraft-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .minecraft-stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .minecraft-stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

/* レスポンシブ対応 */
@media (max-width: 767.98px) {
  .student-stats-container {
    padding: 1rem;
  }

  .stats-section {
    padding: 1.5rem;
  }

  .card-stats-grid,
  .typing-stats-grid,
  .minecraft-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-bars {
    height: 150px;
    gap: 0.25rem;
  }

  .chart-label {
    font-size: 0.625rem;
  }
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .stat-card,
  .rarity-bar,
  .chart-bar {
    transition: none;
  }
}
</style>

