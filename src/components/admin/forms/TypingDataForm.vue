<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { addTypingRecord, getTypingHistoryByStudentId } from '@/utils/mockDataHelpers';
import { useToast } from '@/composables/useToast';
import type { TypingRecord } from '@/types/student';

interface Props {
  studentId: string;
}

const props = defineProps<Props>();
const { addToast } = useToast();

const DRAFT_KEY = 'typing_form_draft';

const formData = ref({
  date: new Date().toISOString().split('T')[0],
  score: 0,
  wpm: 0,
});

const isSubmitting = ref(false);

const typingHistory = computed(() => getTypingHistoryByStudentId(props.studentId));

// Draft Saving
watch(formData, (newVal) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(newVal));
}, { deep: true });

onMounted(() => {
  const savedDraft = localStorage.getItem(DRAFT_KEY);
  if (savedDraft) {
    try {
      formData.value = { ...formData.value, ...JSON.parse(savedDraft) };
    } catch (e) {
      console.error('Draft restore failed', e);
    }
  }
});

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
  if (formData.value.wpm > 500) { // Relaxed validation
    return 'WPMが異常に高いです(500以下)';
  }
  return null;
};

const handleSubmit = async () => {
  const validationError = validateForm();
  if (validationError) {
    addToast('入力エラー', validationError, 'warning');
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

    const feedback = diffFromLast > 0 ? `前回より ${diffFromLast}UP! 🚀` : '記録を保存しました';
    addToast('保存完了', feedback, 'success');

    formData.value = {
      date: new Date().toISOString().split('T')[0],
      score: 0,
      wpm: 0,
    };
    
    localStorage.removeItem(DRAFT_KEY);

  } catch (error) {
    addToast('エラー', error instanceof Error ? error.message : '保存に失敗しました', 'error');
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
          <label for="typing-date" class="form-label">日付 <span class="required">*</span></label>
          <input
            id="typing-date"
            v-model="formData.date"
            type="date"
            class="form-input"
            required
          />
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label for="typing-score" class="form-label">スコア <span class="required">*</span></label>
            <input
              id="typing-score"
              v-model.number="formData.score"
              type="number"
              min="0"
              step="1"
              class="form-input"
              required
            />
          </div>

          <div class="form-group">
            <label for="typing-wpm" class="form-label">WPM <span class="required">*</span></label>
            <input
              id="typing-wpm"
              v-model.number="formData.wpm"
              type="number"
              min="0"
              max="500"
              step="0.1"
              class="form-input"
              required
            />
          </div>
        </div>

        <div v-if="formData.score > 0" class="score-feedback">
          <p class="feedback-text">
            前回との差分: 
            <span :class="calculateDiffFromLast() >= 0 ? 'pos' : 'neg'">
              {{ calculateDiffFromLast() >= 0 ? '+' : '' }}{{ calculateDiffFromLast() }}
            </span>
          </p>
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="submit-button"
          :class="{ submitting: isSubmitting }"
        >
          <span v-if="!isSubmitting">記録を保存する</span>
          <span v-else>保存中...</span>
        </button>
      </form>
    </div>

    <!-- 履歴表示 -->
    <div class="history-section">
      <h4 class="history-title">📊 最近の履歴 (10件)</h4>
      <div v-if="typingHistory.length > 0" class="history-list">
        <div
          v-for="(record, index) in [...typingHistory].reverse().slice(0, 10)"
          :key="index"
          class="history-item"
        >
          <div class="history-date">{{ record.date }}</div>
          <div class="history-stats">
            <span class="history-stat">Score: <strong>{{ record.score }}</strong></span>
            <span class="history-stat">WPM: <strong>{{ record.wpm }}</strong></span>
            <span
              class="history-diff"
              :class="record.diffFromLast >= 0 ? 'positive' : 'negative'"
            >
              {{ record.diffFromLast >= 0 ? '▲' : '▼' }}{{ Math.abs(record.diffFromLast) }}
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
  border: 1px solid #e2e8f0;
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
  margin: 0 0 2rem 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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

.required {
  color: #ef4444;
}

.form-input {
  padding: 0.875rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.score-feedback {
  background: #f8fafc;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
}

.feedback-text {
  font-size: 0.875rem;
  color: #64748b;
}

.pos { color: #10b981; font-weight: bold; }
.neg { color: #ef4444; font-weight: bold; }

.submit-button {
  padding: 1rem;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px rgba(59, 130, 246, 0.4);
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.history-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.history-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1e3a8a;
  margin: 0 0 1.5rem 0;
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
  font-size: 0.875rem;
}

.history-stats {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.history-stat {
  color: #64748b;
  font-size: 0.875rem;
}

.history-diff {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
}

.history-diff.positive {
  background: #d1fae5;
  color: #065f46;
}

.history-diff.negative {
  background: #fee2e2;
  color: #991b1b;
}

.no-history {
  text-align: center;
  padding: 2rem;
  color: #94a3b8;
}

@media (max-width: 640px) {
  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .history-stats {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

