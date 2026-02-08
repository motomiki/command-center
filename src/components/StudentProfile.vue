<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Student } from '@/types/student';
import type { CardData } from '@/types/card';
import { useRepository } from '@/composables/useRepository';
import { placeholders } from '@/utils/placeholder';
import {
  calculateMotivation,
  getTypingStats,
  getMinecraftStats,
} from '@/utils/studentStats';

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

// 統計情報
const motivation = computed(() => calculateMotivation(props.student, cardsData.value));
const typingStats = computed(() => getTypingStats(props.student.typingHistory));
const minecraftStats = computed(() => getMinecraftStats(props.student.projects));

// 日付のフォーマット
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
</script>

<template>
  <div class="student-profile-container">
    <!-- プロフィールヘッダー -->
    <div class="profile-header">
      <div class="avatar-section">
        <div class="avatar-wrapper">
          <img
            :src="student.avatarUrl || placeholders.avatar('アバター')"
            :alt="student.name"
            class="avatar-image"
          />
          <div class="avatar-glow"></div>
        </div>
        <h2 class="student-name">{{ student.name }}</h2>
      </div>
    </div>

    <!-- 統計情報サマリー -->
    <div class="stats-summary">
      <div class="stat-item">
        <div class="stat-icon">📚</div>
        <div class="stat-info">
          <div class="stat-label">カード総数</div>
          <div class="stat-value">{{ cardsData.length }}</div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">⌨️</div>
        <div class="stat-info">
          <div class="stat-label">タイピング記録</div>
          <div class="stat-value">{{ typingStats.totalRecords }}</div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">🧱</div>
        <div class="stat-info">
          <div class="stat-label">Minecraft作品</div>
          <div class="stat-value">{{ minecraftStats.totalProjects }}</div>
        </div>
      </div>
      <div class="stat-item">
        <div class="stat-icon">⚡</div>
        <div class="stat-info">
          <div class="stat-label">やるき</div>
          <div class="stat-value">{{ motivation }}%</div>
        </div>
      </div>
    </div>

    <!-- タイピング記録サマリー -->
    <div v-if="typingStats.totalRecords > 0" class="typing-summary">
      <h3 class="summary-title">⌨️ タイピング記録</h3>
      <div class="typing-details">
        <div class="detail-item">
          <span class="detail-label">さいこうスコア</span>
          <span class="detail-value">{{ typingStats.highestScore }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">へいきんWPM</span>
          <span class="detail-value">{{ typingStats.averageWpm }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">ぜんかいひ</span>
          <span
            :class="[
              'detail-value',
              typingStats.improvement > 0
                ? 'positive'
                : typingStats.improvement < 0
                  ? 'negative'
                  : 'neutral',
            ]"
          >
            {{ typingStats.improvement > 0 ? '+' : '' }}{{ typingStats.improvement }}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">さいきんのちょうせい</span>
          <span
            :class="[
              'detail-value',
              typingStats.recentTrend === 'up'
                ? 'positive'
                : typingStats.recentTrend === 'down'
                  ? 'negative'
                  : 'neutral',
            ]"
          >
            {{
              typingStats.recentTrend === 'up'
                ? '📈 のびている'
                : typingStats.recentTrend === 'down'
                  ? '📉 さがっている'
                  : '➡️ かわらない'
            }}
          </span>
        </div>
      </div>
    </div>

    <!-- Minecraft成果物サマリー -->
    <div v-if="minecraftStats.totalProjects > 0" class="minecraft-summary">
      <h3 class="summary-title">🧱 Minecraft成果物</h3>
      <div class="minecraft-details">
        <div class="detail-item">
          <span class="detail-label">作品総数</span>
          <span class="detail-value">{{ minecraftStats.totalProjects }}</span>
        </div>
        <div v-if="minecraftStats.latestProject" class="latest-project">
          <span class="detail-label">さいしんの作品</span>
          <div class="project-info">
            <div class="project-title">{{ minecraftStats.latestProject.title }}</div>
            <div class="project-date">
              {{ formatDate(minecraftStats.latestProject.createdAt) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.student-profile-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.profile-header {
  margin-bottom: 2rem;
}

.avatar-section {
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

@media (min-width: 640px) {
  .student-name {
    font-size: 1.75rem;
  }
}

@media (min-width: 1024px) {
  .student-name {
    font-size: 2rem;
  }
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (min-width: 640px) {
  .stats-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .stats-summary {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-summary {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
}

.stat-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

@media (hover: hover) and (pointer: fine) {
  .stat-item:hover {
    transform: translateY(-4px);
    border-color: rgba(102, 126, 234, 0.5);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  }
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.typing-summary,
.minecraft-summary {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.summary-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  margin-bottom: 1.5rem;
}

.typing-details,
.minecraft-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
}

.detail-value {
  font-size: 1.125rem;
  font-weight: bold;
  color: white;
}

.detail-value.positive {
  color: #10b981;
}

.detail-value.negative {
  color: #ef4444;
}

.detail-value.neutral {
  color: rgba(255, 255, 255, 0.7);
}

.latest-project {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.project-title {
  font-size: 1.125rem;
  font-weight: bold;
  color: white;
}

.project-date {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
}

/* レスポンシブ対応 */
@media (max-width: 767.98px) {
  .student-profile-container {
    padding: 1rem;
  }

  .stats-summary {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* アクセシビリティ: アニメーションを好まないユーザー向け */
@media (prefers-reduced-motion: reduce) {
  .avatar-glow {
    animation: none;
  }
}
</style>

