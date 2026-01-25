<script setup lang="ts">
import { ref, computed } from 'vue';
import { addTypingRecord, getTypingHistoryByStudentId } from '@/utils/mockDataHelpers';
import type { TypingRecord } from '@/types/student';

interface Props {
  studentId: string;
}

const props = defineProps<Props>();

const formData = ref({
  date: new Date().toISOString().split('T')[0],
  score: 0,
  wpm: 0,
});

const isSubmitting = ref(false);
const submitSuccess = ref(false);
const submitError = ref<string | null>(null);

const typingHistory = computed(() => getTypingHistoryByStudentId(props.studentId));

// 前回のスコアを取得してdiffFromLastを計算
const calculateDiffFromLast = (): number => {
  if (typingHistory.value.length === 0) {
    return 0;
  }
  const lastRecord = typingHistory.value[typingHistory.value.length - 1];
  return formData.value.score - lastRecord.score;
};

const validateForm = (): string | null => {
  if (!formData.value.date) {
    return '日付を入力してください';
  }
  if (formData.value.score < 0) {
    return 'スコアは0以上である必要があります';
  }
  if (formData.value.wpm < 0) {
    return 'WPMは0以上である必要があります';
  }
  if (formData.value.wpm > 200) {
    return 'WPMは200以下である必要があります';
  }
  return null;
};

const handleSubmit = async () => {
  submitError.value = null;
  submitSuccess.value = false;

  const validationError = validateForm();
  if (validationError) {
    submitError.value = validationError;
    return;
  }

  isSubmitting.value = true;

  try {
    const diffFromLast = calculateDiffFromLast();
    const newRecord: TypingRecord = {
      date: formData.value.date,
      score: formData.value.score,
      wpm: formData.value.wpm,
      diffFromLast,
    };

    addTypingRecord(props.studentId, newRecord);

    submitSuccess.value = true;
    formData.value = {
      date: new Date().toISOString().split('T')[0],
      score: 0,
      wpm: 0,
    };

    setTimeout(() => {
      submitSuccess.value = false;
    }, 3000);
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'データの保存に失敗しました';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="typing-form-container">
    <div class="form-card">
      <h3 class="form-title">⌨️ タイピングデータ入力</h3>
      <p class="form-description">生徒のタイピング練習の記録を入力してください</p>

      <form @submit.prevent="handleSubmit" class="form">
        <div class="form-group">
          <label for="typing-date" class="form-label">日付</label>
          <input
            id="typing-date"
            v-model="formData.date"
            type="date"
            class="form-input"
            required
            aria-required="true"
            aria-describedby="typing-date-help"
          />
          <p id="typing-date-help" class="form-help">タイピング練習を行った日付を選択してください</p>
        </div>

        <div class="form-group">
          <label for="typing-score" class="form-label">スコア</label>
          <input
            id="typing-score"
            v-model.number="formData.score"
            type="number"
            min="0"
            step="1"
            class="form-input"
            required
            aria-required="true"
            aria-describedby="typing-score-help"
          />
          <p id="typing-score-help" class="form-help">タイピング練習の合計スコアを入力してください</p>
        </div>

        <div class="form-group">
          <label for="typing-wpm" class="form-label">WPM (Words Per Minute)</label>
          <input
            id="typing-wpm"
            v-model.number="formData.wpm"
            type="number"
            min="0"
            max="200"
            step="0.1"
            class="form-input"
            required
            aria-required="true"
            aria-describedby="typing-wpm-help"
          />
          <p id="typing-wpm-help" class="form-help">1分間あたりのタイピング速度を入力してください（0-200）</p>
        </div>

        <div v-if="submitError" class="error-message" role="alert">
          ⚠️ {{ submitError }}
        </div>

        <div v-if="submitSuccess" class="success-message" role="alert">
          ✅ データが正常に保存されました！
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="submit-button"
          :class="{ submitting: isSubmitting }"
        >
          <span v-if="!isSubmitting">保存</span>
          <span v-else>保存中...</span>
        </button>
      </form>
    </div>

    <!-- 履歴表示 -->
    <div class="history-section">
      <h4 class="history-title">📊 タイピング履歴</h4>
      <div v-if="typingHistory.length > 0" class="history-list">
        <div
          v-for="(record, index) in [...typingHistory].reverse().slice(0, 10)"
          :key="index"
          class="history-item"
        >
          <div class="history-date">{{ record.date }}</div>
          <div class="history-stats">
            <span class="history-stat">スコア: {{ record.score }}</span>
            <span class="history-stat">WPM: {{ record.wpm }}</span>
            <span
              class="history-stat"
              :class="record.diffFromLast >= 0 ? 'positive' : 'negative'"
            >
              {{ record.diffFromLast >= 0 ? '+' : '' }}{{ record.diffFromLast }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="no-history">
        <p>まだタイピング記録がありません</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.typing-form-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1e3a8a;
  margin: 0 0 0.5rem 0;
}

.form-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 1.5rem 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e3a8a;
}

.form-input {
  padding: 0.875rem;
  min-height: 44px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: white;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-help {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
}

.error-message {
  padding: 1rem;
  background: #fee2e2;
  border: 2px solid #fca5a5;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.875rem;
}

.success-message {
  padding: 1rem;
  background: #d1fae5;
  border: 2px solid #6ee7b7;
  border-radius: 8px;
  color: #065f46;
  font-size: 0.875rem;
}

.submit-button {
  padding: 1rem 2rem;
  min-height: 44px;
  min-width: 120px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

@media (hover: hover) and (pointer: fine) {
  .submit-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
  }
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.history-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.history-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1e3a8a;
  margin: 0 0 1rem 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.history-date {
  font-weight: 600;
  color: #1e3a8a;
}

.history-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.history-stat {
  color: #64748b;
}

.history-stat.positive {
  color: #059669;
  font-weight: 600;
}

.history-stat.negative {
  color: #dc2626;
  font-weight: 600;
}

.no-history {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
}

/* レスポンシブ対応 */
@media (max-width: 767.98px) {
  .form-card,
  .history-section {
    padding: 1.5rem;
  }

  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .history-stats {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>

