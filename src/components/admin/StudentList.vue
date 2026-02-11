<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useRepository } from '@/composables/useRepository';
import type { Student } from '@/types/student';
import type { CardData } from '@/types/card';
import AddStudentModal from './modals/AddStudentModal.vue';

const router = useRouter();
const { students: studentsRepo, cards: cardsRepo, sync, isSyncing } =
  useRepository();

/** 同期中のメッセージ（進捗表示用） */
const syncMessage = ref('');

// ---------------------------------------------------------------------------
// データ取得（非同期）
// ---------------------------------------------------------------------------
const studentsList = ref<Student[]>([]);
const allCards = ref<CardData[]>([]);

const fetchData = async () => {
  const [s, c] = await Promise.all([
    studentsRepo.getAll(),
    cardsRepo.getAll(),
  ]);
  studentsList.value = s;
  allCards.value = c;
};

onMounted(fetchData);

const searchQuery = ref('');

// 検索フィルタリング
const filteredStudents = computed(() => {
  if (!searchQuery.value.trim()) {
    return studentsList.value;
  }
  const query = searchQuery.value.toLowerCase();
  return studentsList.value.filter(
    (student) => student.name.toLowerCase().includes(query)
  );
});

// 生徒に紐づくカードかどうか（id / loginId の両方で照合し、既存キャッシュの loginId 混在にも対応）
const isCardForStudent = (c: CardData, student: Student): boolean =>
  c.studentId === student.id || c.studentId === student.loginId;

// 生徒のカード数を取得
const getCardCount = (student: Student): number => {
  return allCards.value.filter((c) => isCardForStudent(c, student)).length;
};

// 最新の活動日を取得
const getLatestActivityDate = (student: Student): string => {
  const cards = allCards.value.filter((c) => isCardForStudent(c, student));
  if (cards.length === 0) return 'なし';

  const dates = cards.map((card) => card.date).sort().reverse();
  return dates[0] || 'なし';
};

// 生徒詳細画面へ遷移
const handleStudentClick = (studentId: string) => {
  router.push(`/admin/students/${studentId}`);
};

// キーボード操作
const handleKeyDown = (e: KeyboardEvent, studentId: string) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleStudentClick(studentId);
  }
};

// 保存後にリストを更新
const handleSave = () => {
  fetchData();
};

/**
 * データを同期し、完了後に一覧を再取得する。
 * キャッシュが DB と一致し、カード数・最新活動日が正しく表示される。
 */
const handleSync = async () => {
  try {
    await sync((msg) => {
      syncMessage.value = msg;
    });
    // 同期完了後に必ず一覧を再取得し、カード数・最新活動日を最新のキャッシュで反映する
    await fetchData();
  } catch (e) {
    console.warn('[StudentList] 同期に失敗しました', e);
  } finally {
    syncMessage.value = '';
  }
};

const showAddModal = ref(false);
</script>

<template>
  <div class="student-list-container">
    <div class="page-header">
      <h2 class="page-title">👥 生徒一覧</h2>
      <p class="page-description">生徒を選択してデータを入力・管理できます</p>
    </div>

    <!-- 同期インジケータ -->
    <Transition name="sync-fade">
      <div v-if="isSyncing" class="sync-indicator">
        <div class="sync-spinner"></div>
        <span class="sync-text">{{ syncMessage || 'データを更新中...' }}</span>
      </div>
    </Transition>

    <!-- アクションバー -->
    <div class="action-bar">
      <!-- 検索バー -->
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="🔍 生徒名で検索..."
          class="search-input"
          aria-label="生徒検索"
        />
      </div>

      <div class="action-buttons">
        <!-- データを同期（DB とキャッシュを一致させ、カード数などを最新に反映） -->
        <button
          type="button"
          class="sync-btn"
          :disabled="!!isSyncing"
          aria-label="データを同期"
          @click="handleSync"
        >
          <span class="btn-icon">🔄</span> データを同期
        </button>
        <!-- 新規追加ボタン -->
        <button class="add-student-btn" @click="showAddModal = true">
          <span class="btn-icon">＋</span> 新規生徒を追加
        </button>
      </div>
    </div>

    <!-- 生徒カードグリッド -->
    <div class="students-grid">
      <div
        v-for="student in filteredStudents"
        :key="student.id"
        @click="handleStudentClick(student.loginId ?? student.id)"
        @keydown="(e) => handleKeyDown(e, student.loginId ?? student.id)"
        class="student-card"
        role="button"
        tabindex="0"
        :aria-label="`${student.name}の詳細を表示`"
      >
        <div class="student-avatar">
          <img
            v-if="student.avatarUrl"
            :src="student.avatarUrl"
            :alt="`${student.name}のアバター`"
            class="avatar-image"
            loading="lazy"
          />
          <div v-else class="avatar-placeholder">
            {{ student.name.charAt(0) }}
          </div>
        </div>
        <div class="student-info">
          <h3 class="student-name">{{ student.name }}</h3>
          <div class="student-stats">
            <div class="stat-item">
              <span class="stat-label">カード数</span>
              <span class="stat-value">{{ getCardCount(student) }}枚</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最新活動</span>
              <span class="stat-value">{{ getLatestActivityDate(student) }}</span>
            </div>
          </div>
        </div>
        <div class="card-arrow">→</div>
      </div>
    </div>

    <!-- 検索結果が空の場合 -->
    <div v-if="filteredStudents.length === 0" class="empty-state">
      <p class="empty-message">検索結果が見つかりませんでした</p>
    </div>

    <!-- 新規追加モーダル -->
    <AddStudentModal
      :show="showAddModal"
      @close="showAddModal = false"
      @saved="handleSave"
    />
  </div>
</template>

<style scoped>
.student-list-container {
  width: 100%;
}

.page-header {
  margin-bottom: 2rem;
  text-align: center;
}

.page-title {
  font-size: 1.75rem;
  font-weight: bold;
  color: white;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

@media (min-width: 640px) {
  .page-title {
    font-size: 2rem;
  }
}

@media (min-width: 1024px) {
  .page-title {
    font-size: 2.5rem;
  }
}

.page-description {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.search-bar {
  margin-bottom: 2rem;
}

.search-input {
  width: 100%;
  max-width: 500px;
  padding: 0.875rem 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.action-bar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  width: 100%;
}

@media (min-width: 640px) {
  .action-bar {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.search-bar {
  flex: 1;
  max-width: 500px;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.sync-btn {
  padding: 0.875rem 1.25rem;
  min-height: 44px;
  background: rgba(255, 255, 255, 0.95);
  color: #1e3a8a;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.sync-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 1);
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.25);
}

.sync-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.add-student-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.add-student-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(16, 185, 129, 0.3);
  opacity: 0.9;
}

.add-student-btn:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 1.25rem;
}

.students-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .students-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem;
  }
}

@media (min-width: 768px) {
  .students-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }
}

.student-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
}

@media (hover: hover) and (pointer: fine) {
  .student-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
  }
  
  .student-card:hover .card-arrow {
    color: #3b82f6;
    transform: translateX(4px);
  }
}

.student-card:active {
  transform: translateY(-2px);
}

.student-card:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.student-avatar {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
}

.student-info {
  flex: 1;
  min-width: 0;
}

.student-name {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1e3a8a;
  margin: 0 0 0.5rem 0;
}

.student-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.stat-label {
  color: #64748b;
}

.stat-value {
  color: #1e3a8a;
  font-weight: 600;
}

.card-arrow {
  font-size: 1.5rem;
  color: #94a3b8;
  transition: all 0.3s ease;
}


.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  margin-top: 2rem;
}

.empty-message {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
}

/* 同期インジケータ */
.sync-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  margin-bottom: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(30, 58, 138, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.sync-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: sync-spin 0.8s linear infinite;
}

.sync-text {
  font-size: 0.875rem;
  color: #1e3a8a;
}

@keyframes sync-spin {
  to { transform: rotate(360deg); }
}

.sync-fade-enter-active,
.sync-fade-leave-active {
  transition: opacity 0.3s ease;
}

.sync-fade-enter-from,
.sync-fade-leave-to {
  opacity: 0;
}

/* レスポンシブ対応 */
@media (max-width: 767.98px) {
  .page-title {
    font-size: 2rem;
  }

  .students-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .student-card {
    padding: 1.25rem;
  }

  .student-avatar {
    width: 56px;
    height: 56px;
  }

  .student-name {
    font-size: 1.125rem;
  }
}
</style>

